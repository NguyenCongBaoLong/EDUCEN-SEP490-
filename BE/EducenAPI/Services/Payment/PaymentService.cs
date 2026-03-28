using EducenAPI.Models;
using EducenAPI.Persistence.Contexts;
using EducenAPI.Services.Interface;
using Microsoft.EntityFrameworkCore;

namespace EducenAPI.Services.Payment
{
    public interface IPaymentService
    {
        Task<PaymentResult> CreatePaymentAsync(CreatePaymentDto dto);
        Task<PaymentVerificationResult> ProcessCallbackAsync(string gatewayType, Dictionary<string, string> callbackData);
        Task<PaymentTransaction?> GetTransactionAsync(string transactionId);
        Task<List<PaymentTransaction>> GetTransactionsByPaymentIdAsync(string paymentRecordId);
    }

    public class PaymentService : IPaymentService
    {
        private readonly AdminDbContext _adminDbContext;
        private readonly EducenV2Context _tenantDbContext;
        private readonly PaymentGatewayFactory _gatewayFactory;
        private readonly ILogger<PaymentService> _logger;
        private readonly IConfiguration _configuration;

        public PaymentService(
            AdminDbContext adminDbContext,
            EducenV2Context tenantDbContext,
            PaymentGatewayFactory gatewayFactory,
            ILogger<PaymentService> logger,
            IConfiguration configuration)
        {
            _adminDbContext = adminDbContext;
            _tenantDbContext = tenantDbContext;
            _gatewayFactory = gatewayFactory;
            _logger = logger;
            _configuration = configuration;
        }

        /// <summary>
        /// Học phí → lưu vào Tenant DB (EducenV2)
        /// Gói dịch vụ → lưu vào Admin DB (EducenAdmin)
        /// </summary>
        private DbContext GetTargetDb(string transactionType)
        {
            return transactionType == "Tuition" ? _tenantDbContext : _adminDbContext;
        }

        public async Task<PaymentResult> CreatePaymentAsync(CreatePaymentDto dto)
        {
            try
            {
                var targetDb = GetTargetDb(dto.TransactionType);

                // Nếu là Subscription → kiểm tra tenant trong Admin DB
                if (dto.TransactionType != "Tuition")
                {
                    var tenant = await _adminDbContext.Tenants.FindAsync(dto.TenantId);
                    if (tenant == null)
                    {
                        if (dto.TenantId == "default-tenant")
                        {
                            tenant = new Tenant
                            {
                                TenantId = "default-tenant",
                                TenantName = "Default Center",
                                Username = "default",
                                Password = "N/A",
                                SubDomain = "default",
                                ConnectionString = _configuration.GetConnectionString("DefaultTenantConnection")
                                    ?? "Server=localhost;Database=EducenV2;Trusted_Connection=True;TrustServerCertificate=True;",
                                IsActive = true
                            };
                            _adminDbContext.Tenants.Add(tenant);
                            await _adminDbContext.SaveChangesAsync();
                        }
                        else
                        {
                            return new PaymentResult
                            {
                                Success = false,
                                ErrorMessage = $"Tenant with ID '{dto.TenantId}' not found"
                            };
                        }
                    }
                }

                // Tạo PaymentRecord trong DB đích
                var paymentRecord = new PaymentRecord
                {
                    PaymentId = Guid.NewGuid().ToString(),
                    TenantId = dto.TenantId,
                    Amount = dto.Amount,
                    Status = "Pending",
                    PaymentDate = DateTime.UtcNow,
                    TransactionType = dto.TransactionType,
                    ReferenceId = dto.ReferenceId,
                    PaymentMethod = dto.GatewayType,
                    Description = dto.Description,
                    PaidBy = dto.PaidBy
                };

                targetDb.Set<PaymentRecord>().Add(paymentRecord);
                await targetDb.SaveChangesAsync();

                // Tạo PaymentTransaction trong cùng DB
                var transaction = new PaymentTransaction
                {
                    PaymentRecordId = paymentRecord.PaymentId,
                    GatewayType = dto.GatewayType,
                    Amount = dto.Amount,
                    Status = "Pending",
                    CreatedAt = DateTime.UtcNow
                };

                targetDb.Set<PaymentTransaction>().Add(transaction);
                await targetDb.SaveChangesAsync();

                // Gọi gateway tạo thanh toán
                var gateway = _gatewayFactory.GetGateway(dto.GatewayType);
                var gatewayRequest = new CreatePaymentRequest
                {
                    OrderId = paymentRecord.PaymentId,
                    Amount = dto.Amount,
                    Description = dto.Description,
                    ReturnUrl = dto.ReturnUrl,
                    IpAddress = dto.IpAddress,
                    CustomerName = dto.CustomerName,
                    CustomerEmail = dto.CustomerEmail,
                    CustomerPhone = dto.CustomerPhone
                };

                var gatewayResponse = await gateway.CreatePaymentAsync(gatewayRequest);

                if (!gatewayResponse.Success)
                {
                    transaction.Status = "Failed";
                    transaction.ErrorMessage = gatewayResponse.ErrorMessage;
                    await targetDb.SaveChangesAsync();

                    return new PaymentResult
                    {
                        Success = false,
                        ErrorMessage = gatewayResponse.ErrorMessage,
                        PaymentRecordId = paymentRecord.PaymentId
                    };
                }

                // Cập nhật gateway transaction ID
                transaction.GatewayTransactionId = gatewayResponse.TransactionId;
                await targetDb.SaveChangesAsync();

                return new PaymentResult
                {
                    Success = true,
                    PaymentRecordId = paymentRecord.PaymentId,
                    TransactionId = transaction.TransactionId,
                    PaymentUrl = gatewayResponse.PaymentUrl,
                    QrCodeUrl = gatewayResponse.QrCodeUrl,
                    Deeplink = gatewayResponse.Deeplink
                };
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error creating payment");
                return new PaymentResult
                {
                    Success = false,
                    ErrorMessage = $"Internal error: {ex.Message}"
                };
            }
        }

        public async Task<PaymentVerificationResult> ProcessCallbackAsync(string gatewayType, Dictionary<string, string> callbackData)
        {
            try
            {
                var gateway = _gatewayFactory.GetGateway(gatewayType);
                var verification = await gateway.VerifyCallbackAsync(callbackData);

                if (!verification.IsValid)
                {
                    _logger.LogWarning("Invalid callback from {Gateway}: {Message}", gatewayType, verification.Message);
                    return verification;
                }

                // Tìm transaction trong CẢ 2 DB (vì không biết TransactionType từ callback)
                PaymentTransaction? transaction = null;
                DbContext? targetDb = null;

                // Thử Tenant DB trước (Tuition - phổ biến hơn)
                transaction = await _tenantDbContext.PaymentTransactions
                    .Include(t => t.PaymentRecord)
                    .FirstOrDefaultAsync(t => t.PaymentRecordId == verification.OrderId);

                if (transaction != null)
                {
                    targetDb = _tenantDbContext;
                }
                else
                {
                    // Thử Admin DB (Subscription)
                    transaction = await _adminDbContext.PaymentTransactions
                        .Include(t => t.PaymentRecord)
                        .FirstOrDefaultAsync(t => t.PaymentRecordId == verification.OrderId);

                    if (transaction != null)
                        targetDb = _adminDbContext;
                }

                if (transaction == null || targetDb == null)
                {
                    _logger.LogError("Transaction not found for OrderId: {OrderId}", verification.OrderId);
                    return new PaymentVerificationResult
                    {
                        IsValid = false,
                        Message = "Transaction not found"
                    };
                }

                // Idempotency check
                if (transaction.Status == "Success" || transaction.Status == "Failed")
                {
                    _logger.LogInformation("Callback already processed for OrderId: {OrderId}, Status: {Status}. Skipping.",
                        verification.OrderId, transaction.Status);
                    return new PaymentVerificationResult
                    {
                        IsValid = true,
                        IsSuccessful = transaction.Status == "Success",
                        OrderId = verification.OrderId,
                        Amount = transaction.Amount,
                        Message = $"Already processed with status: {transaction.Status}"
                    };
                }

                // Cập nhật transaction
                transaction.GatewayResponse = System.Text.Json.JsonSerializer.Serialize(callbackData);
                transaction.CompletedAt = DateTime.UtcNow;
                transaction.PaymentRecord.PaymentDate = DateTime.UtcNow;

                if (verification.IsSuccessful)
                {
                    transaction.Status = "Success";
                    transaction.PaymentRecord.Status = "Paid";

                    // Cập nhật TuitionInvoice nếu thanh toán học phí
                    if (transaction.PaymentRecord.TransactionType == "Tuition"
                        && !string.IsNullOrEmpty(transaction.PaymentRecord.ReferenceId))
                    {
                        await UpdateTuitionInvoiceAsync(
                            transaction.PaymentRecord.ReferenceId,
                            transaction.PaymentRecord.PaymentId);
                    }
                }
                else
                {
                    transaction.Status = "Failed";
                    transaction.PaymentRecord.Status = "Failed";
                    transaction.ErrorMessage = verification.Message;
                }

                await targetDb.SaveChangesAsync();

                _logger.LogInformation("Payment {PaymentId} processed in {DbType} with status: {Status}",
                    verification.OrderId,
                    targetDb == _tenantDbContext ? "TenantDB" : "AdminDB",
                    verification.IsSuccessful ? "Success" : "Failed");

                return verification;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error processing callback from {Gateway}", gatewayType);
                return new PaymentVerificationResult
                {
                    IsValid = false,
                    Message = $"Processing error: {ex.Message}"
                };
            }
        }

        public async Task<PaymentTransaction?> GetTransactionAsync(string transactionId)
        {
            // Tìm trong Tenant DB trước
            var transaction = await _tenantDbContext.PaymentTransactions
                .Include(t => t.PaymentRecord)
                .FirstOrDefaultAsync(t => t.TransactionId == transactionId);

            if (transaction != null) return transaction;

            // Tìm trong Admin DB
            return await _adminDbContext.PaymentTransactions
                .Include(t => t.PaymentRecord)
                .FirstOrDefaultAsync(t => t.TransactionId == transactionId);
        }

        public async Task<List<PaymentTransaction>> GetTransactionsByPaymentIdAsync(string paymentRecordId)
        {
            // Tìm trong Tenant DB trước
            var tenantTransactions = await _tenantDbContext.PaymentTransactions
                .Where(t => t.PaymentRecordId == paymentRecordId)
                .OrderByDescending(t => t.CreatedAt)
                .ToListAsync();

            if (tenantTransactions.Any()) return tenantTransactions;

            // Tìm trong Admin DB
            return await _adminDbContext.PaymentTransactions
                .Where(t => t.PaymentRecordId == paymentRecordId)
                .OrderByDescending(t => t.CreatedAt)
                .ToListAsync();
        }

        /// <summary>
        /// Cập nhật TuitionInvoice sau khi thanh toán học phí thành công.
        /// </summary>
        private async Task UpdateTuitionInvoiceAsync(string invoiceId, string paymentRecordId)
        {
            try
            {
                var invoice = await _tenantDbContext.TuitionInvoices
                    .IgnoreQueryFilters()
                    .FirstOrDefaultAsync(i => i.InvoiceId == invoiceId);

                if (invoice == null)
                {
                    _logger.LogWarning("TuitionInvoice {InvoiceId} not found when updating after payment", invoiceId);
                    return;
                }

                if (invoice.Status == "Paid")
                {
                    _logger.LogInformation("TuitionInvoice {InvoiceId} already marked as Paid", invoiceId);
                    return;
                }

                invoice.Status = "Paid";
                invoice.PaidAt = DateTime.UtcNow;
                invoice.PaymentRecordId = paymentRecordId;
                invoice.UpdatedAt = DateTime.UtcNow;

                await _tenantDbContext.SaveChangesAsync();

                _logger.LogInformation("TuitionInvoice {InvoiceId} marked as Paid with PaymentRecord {PaymentRecordId}",
                    invoiceId, paymentRecordId);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to update TuitionInvoice {InvoiceId} after payment", invoiceId);
            }
        }
    }

    public class CreatePaymentDto
    {
        public string TenantId { get; set; } = string.Empty;
        public decimal Amount { get; set; }
        public string GatewayType { get; set; } = string.Empty; // VNPay
        public string TransactionType { get; set; } = string.Empty; // Subscription | Tuition
        public string? ReferenceId { get; set; }
        public string Description { get; set; } = string.Empty;
        public string ReturnUrl { get; set; } = string.Empty;
        public string IpAddress { get; set; } = string.Empty;
        public string? CustomerName { get; set; }
        public string? CustomerEmail { get; set; }
        public string? CustomerPhone { get; set; }
        public string? PaidBy { get; set; }
    }

    public class PaymentResult
    {
        public bool Success { get; set; }
        public string? PaymentRecordId { get; set; }
        public string? TransactionId { get; set; }
        public string? PaymentUrl { get; set; }
        public string? QrCodeUrl { get; set; }
        public string? Deeplink { get; set; }
        public string? ErrorMessage { get; set; }
    }
}
