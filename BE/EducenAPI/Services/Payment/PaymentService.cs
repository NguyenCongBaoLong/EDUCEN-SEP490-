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

        public async Task<PaymentResult> CreatePaymentAsync(CreatePaymentDto dto)
        {
            try
            {
                // Ensure tenant exists in Admin DB
                // For "default-tenant", auto-create a placeholder record if it doesn't exist
                // (FK constraint on PaymentRecords.TenantId requires a valid Tenants record)
                var tenant = await _adminDbContext.Tenants.FindAsync(dto.TenantId);
                if (tenant == null)
                {
                    if (dto.TenantId == "default-tenant")
                    {
                        // Create a minimal tenant record for the default database
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

                // Create PaymentRecord
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

                _adminDbContext.PaymentRecords.Add(paymentRecord);
                await _adminDbContext.SaveChangesAsync();

                // Create PaymentTransaction
                var transaction = new PaymentTransaction
                {
                    PaymentRecordId = paymentRecord.PaymentId,
                    GatewayType = dto.GatewayType,
                    Amount = dto.Amount,
                    Status = "Pending",
                    CreatedAt = DateTime.UtcNow
                };

                _adminDbContext.PaymentTransactions.Add(transaction);
                await _adminDbContext.SaveChangesAsync();

                // Call gateway to create payment
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
                    // Update transaction status to failed
                    transaction.Status = "Failed";
                    transaction.ErrorMessage = gatewayResponse.ErrorMessage;
                    await _adminDbContext.SaveChangesAsync();

                    return new PaymentResult
                    {
                        Success = false,
                        ErrorMessage = gatewayResponse.ErrorMessage,
                        PaymentRecordId = paymentRecord.PaymentId
                    };
                }

                // Update transaction with gateway info
                transaction.GatewayTransactionId = gatewayResponse.TransactionId;
                await _adminDbContext.SaveChangesAsync();

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

                // Find transaction
                var transaction = await _adminDbContext.PaymentTransactions
                    .Include(t => t.PaymentRecord)
                    .FirstOrDefaultAsync(t => t.PaymentRecordId == verification.OrderId);

                if (transaction == null)
                {
                    _logger.LogError("Transaction not found for OrderId: {OrderId}", verification.OrderId);
                    return new PaymentVerificationResult
                    {
                        IsValid = false,
                        Message = "Transaction not found"
                    };
                }

                // Idempotency check: nếu callback đã được xử lý trước đó, trả về kết quả hiện có
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

                // Update transaction
                transaction.GatewayResponse = System.Text.Json.JsonSerializer.Serialize(callbackData);
                transaction.CompletedAt = DateTime.UtcNow;

                // Update payment record
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

                await _adminDbContext.SaveChangesAsync();

                _logger.LogInformation("Payment {PaymentId} processed with status: {Status}",
                    verification.OrderId, verification.IsSuccessful ? "Success" : "Failed");

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
            return await _adminDbContext.PaymentTransactions
                .Include(t => t.PaymentRecord)
                .FirstOrDefaultAsync(t => t.TransactionId == transactionId);
        }

        public async Task<List<PaymentTransaction>> GetTransactionsByPaymentIdAsync(string paymentRecordId)
        {
            return await _adminDbContext.PaymentTransactions
                .Where(t => t.PaymentRecordId == paymentRecordId)
                .OrderByDescending(t => t.CreatedAt)
                .ToListAsync();
        }

        /// <summary>
        /// Cập nhật TuitionInvoice sau khi thanh toán học phí thành công.
        /// IgnoreQueryFilters vì IPN callback từ VNPay không có tenant header.
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
                // Không throw — payment đã thành công, invoice update có thể retry sau
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
