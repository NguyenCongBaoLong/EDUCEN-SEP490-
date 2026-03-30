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
        Task<PaymentTransactionInfo?> GetTransactionAsync(string transactionId);
        Task<List<PaymentTransactionInfo>> GetTransactionsByPaymentIdAsync(string paymentRecordId);
        Task ConfirmPaymentDirectlyAsync(string? orderId);
    }

    public class PaymentService : IPaymentService
    {
        private const string DefaultTenantId = "default-tenant";

        private readonly AdminDbContext _adminDbContext;
        private readonly EducenV2Context _tenantDbContext;
        private readonly PaymentGatewayFactory _gatewayFactory;
        private readonly ILogger<PaymentService> _logger;
        private readonly IConfiguration _configuration;
        private readonly IHttpContextAccessor _httpContextAccessor;

        public PaymentService(
            AdminDbContext adminDbContext,
            EducenV2Context tenantDbContext,
            PaymentGatewayFactory gatewayFactory,
            ILogger<PaymentService> logger,
            IConfiguration configuration,
            IHttpContextAccessor httpContextAccessor)
        {
            _adminDbContext = adminDbContext;
            _tenantDbContext = tenantDbContext;
            _gatewayFactory = gatewayFactory;
            _logger = logger;
            _configuration = configuration;
            _httpContextAccessor = httpContextAccessor;
        }

        /// <summary>
        /// Học phí → lưu vào Tenant DB (EducenV2)
        /// Gói dịch vụ → lưu vào Admin DB (EducenAdmin)
        /// </summary>
        public async Task<PaymentResult> CreatePaymentAsync(CreatePaymentDto dto)
        {
            try
            {
                var isTuition = dto.TransactionType == "Tuition";
                var tenantContext = await ResolveCreateTenantContextAsync(dto, isTuition);
                if (string.IsNullOrWhiteSpace(tenantContext.TenantId))
                {
                    return new PaymentResult
                    {
                        Success = false,
                        ErrorMessage = "Tenant context could not be resolved"
                    };
                }

                _logger.LogInformation(
                    "Create payment tenant context resolved. TransactionType: {TransactionType}, TenantId: {TenantId}, Source: {Source}, ReferenceId: {ReferenceId}",
                    dto.TransactionType,
                    tenantContext.TenantId,
                    tenantContext.Source,
                    dto.ReferenceId ?? "N/A");

                var subscriptionMonths = dto.SubscriptionMonths.GetValueOrDefault(1);
                if (subscriptionMonths <= 0)
                    subscriptionMonths = 1;

                //Nếu là Subscription → kiểm tra tenant trong Admin DB
                if (!isTuition)
                {
                    var tenant = await _adminDbContext.Tenants.FindAsync(tenantContext.TenantId);
                    if (tenant == null)
                    {
                        if (tenantContext.TenantId == DefaultTenantId)
                        {
                            tenant = new Tenant
                            {
                                TenantId = DefaultTenantId,
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
                                ErrorMessage = $"Tenant with ID '{tenantContext.TenantId}' not found"
                            };
                        }
                    }

                    if (string.IsNullOrWhiteSpace(dto.ReferenceId))
                    {
                        return new PaymentResult
                        {
                            Success = false,
                            ErrorMessage = "PlanId is required for subscription payment"
                        };
                    }

                    var plan = await _adminDbContext.Plans
                        .FirstOrDefaultAsync(p => p.PlanId == dto.ReferenceId && p.IsActive);
                    if (plan == null)
                    {
                        return new PaymentResult
                        {
                            Success = false,
                            ErrorMessage = "Selected plan is not available"
                        };
                    }
                }

                if (isTuition)
                {
                    var paymentRecord = new PaymentRecordTenant
                    {
                        PaymentId = Guid.NewGuid().ToString(),
                        Amount = dto.Amount,
                        Status = "Pending",
                        PaymentDate = DateTime.UtcNow,
                        TransactionType = dto.TransactionType,
                        ReferenceId = dto.ReferenceId,
                        PaymentMethod = dto.GatewayType,
                        Description = dto.Description,
                        PaidBy = dto.PaidBy
                    };

                    _tenantDbContext.PaymentRecordTenants.Add(paymentRecord);
                    await _tenantDbContext.SaveChangesAsync();

                    var transaction = new PaymentTransactionTenant
                    {
                        PaymentRecordId = paymentRecord.PaymentId,
                        GatewayType = dto.GatewayType,
                        Amount = dto.Amount,
                        Status = "Pending",
                        CreatedAt = DateTime.UtcNow
                    };

                    _tenantDbContext.PaymentTransactionTenants.Add(transaction);
                    await _tenantDbContext.SaveChangesAsync();

                    var gateway = _gatewayFactory.GetGateway(dto.GatewayType);
                    var gatewayRequest = new CreatePaymentRequest
                    {
                        TenantId = tenantContext.TenantId,
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
                        await _tenantDbContext.SaveChangesAsync();

                        return new PaymentResult
                        {
                            Success = false,
                            ErrorMessage = gatewayResponse.ErrorMessage,
                            PaymentRecordId = paymentRecord.PaymentId
                        };
                    }

                    transaction.GatewayTransactionId = gatewayResponse.TransactionId;
                    await _tenantDbContext.SaveChangesAsync();

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
                else
                {
                    var paymentRecord = new PaymentRecord
                    {
                        PaymentId = Guid.NewGuid().ToString(),
                        TenantId = tenantContext.TenantId,
                        Amount = dto.Amount,
                        Status = "Pending",
                        PaymentDate = DateTime.UtcNow,
                        TransactionType = dto.TransactionType,
                        ReferenceId = dto.ReferenceId,
                        PaymentMethod = dto.GatewayType,
                        Description = dto.Description,
                        PaidBy = dto.PaidBy,
                        SubscriptionMonths = subscriptionMonths
                    };

                    _adminDbContext.PaymentRecords.Add(paymentRecord);
                    await _adminDbContext.SaveChangesAsync();

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

                    var gateway = _gatewayFactory.GetGateway(dto.GatewayType);
                    var gatewayRequest = new CreatePaymentRequest
                    {
                        TenantId = paymentRecord.TenantId,
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
                        await _adminDbContext.SaveChangesAsync();

                        return new PaymentResult
                        {
                            Success = false,
                            ErrorMessage = gatewayResponse.ErrorMessage,
                            PaymentRecordId = paymentRecord.PaymentId
                        };
                    }

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
                var callbackTenantContext = await ResolveCallbackTenantContextAsync(callbackData);

                if (!string.IsNullOrWhiteSpace(callbackTenantContext.TenantId))
                {
                    callbackData["tenantId"] = callbackTenantContext.TenantId;
                }

                _logger.LogInformation(
                    "Callback tenant context resolved. Gateway: {Gateway}, TenantId: {TenantId}, Source: {Source}, OrderId: {OrderId}",
                    gatewayType,
                    callbackTenantContext.TenantId,
                    callbackTenantContext.Source,
                    callbackTenantContext.OrderId ?? "N/A");

                var gateway = _gatewayFactory.GetGateway(gatewayType);
                var verification = await gateway.VerifyCallbackAsync(callbackData);

                if (!verification.IsValid)
                {
                    _logger.LogWarning("Invalid callback from {Gateway}: {Message}", gatewayType, verification.Message);
                    return verification;
                }

                // Tìm transaction trong CẢ 2 DB (vì không biết TransactionType từ callback)
                PaymentTransactionTenant? tenantTransaction = null;
                PaymentTransaction? adminTransaction = null;

                // Thử Tenant DB trước (Tuition - phổ biến hơn)
                tenantTransaction = await _tenantDbContext.PaymentTransactionTenants
                    .Include(t => t.PaymentRecord)
                    .FirstOrDefaultAsync(t => t.PaymentRecordId == verification.OrderId);

                if (tenantTransaction == null)
                {
                    adminTransaction = await _adminDbContext.PaymentTransactions
                        .Include(t => t.PaymentRecord)
                        .FirstOrDefaultAsync(t => t.PaymentRecordId == verification.OrderId);
                }

                if (tenantTransaction == null && adminTransaction == null)
                {
                    _logger.LogError("Transaction not found for OrderId: {OrderId}", verification.OrderId);
                    return new PaymentVerificationResult
                    {
                        IsValid = false,
                        Message = "Transaction not found"
                    };
                }

                if (tenantTransaction != null)
                {
                    var idempotentResult = await ApplyVerificationToTenantAsync(tenantTransaction, callbackData, verification);
                    if (idempotentResult != null) return idempotentResult;

                    _logger.LogInformation("Payment {PaymentId} processed in {DbType} with status: {Status}",
                        verification.OrderId,
                        "TenantDB",
                        verification.IsSuccessful ? "Success" : "Failed");
                }
                else if (adminTransaction != null)
                {
                    var idempotentResult = await ApplyVerificationToAdminAsync(adminTransaction, callbackData, verification);
                    if (idempotentResult != null) return idempotentResult;

                    _logger.LogInformation("Payment {PaymentId} processed in {DbType} with status: {Status}",
                        verification.OrderId,
                        "AdminDB",
                        verification.IsSuccessful ? "Success" : "Failed");
                }

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

        public async Task<PaymentTransactionInfo?> GetTransactionAsync(string transactionId)
        {
            var tenantTransaction = await _tenantDbContext.PaymentTransactionTenants
                .Include(t => t.PaymentRecord)
                .FirstOrDefaultAsync(t => t.TransactionId == transactionId);

            if (tenantTransaction != null)
                return MapTransaction(tenantTransaction);

            var adminTransaction = await _adminDbContext.PaymentTransactions
                .Include(t => t.PaymentRecord)
                .FirstOrDefaultAsync(t => t.TransactionId == transactionId);

            return adminTransaction == null ? null : MapTransaction(adminTransaction);
        }

        public async Task<List<PaymentTransactionInfo>> GetTransactionsByPaymentIdAsync(string paymentRecordId)
        {
            var tenantTransactions = await _tenantDbContext.PaymentTransactionTenants
                .Where(t => t.PaymentRecordId == paymentRecordId)
                .OrderByDescending(t => t.CreatedAt)
                .ToListAsync();

            if (tenantTransactions.Any())
                return tenantTransactions.Select(MapTransaction).ToList();

            var adminTransactions = await _adminDbContext.PaymentTransactions
                .Where(t => t.PaymentRecordId == paymentRecordId)
                .OrderByDescending(t => t.CreatedAt)
                .ToListAsync();

                return adminTransactions.Select(MapTransaction).ToList();
        }

        /// <summary>
        /// Directly confirm payment without gateway verification (used when hash verify fails but VNPay reports success)
        /// </summary>
        public async Task ConfirmPaymentDirectlyAsync(string? orderId)
        {
            if (string.IsNullOrWhiteSpace(orderId)) return;

            // Try Admin DB first
            var adminTransaction = await _adminDbContext.PaymentTransactions
                .Include(t => t.PaymentRecord)
                .FirstOrDefaultAsync(t => t.PaymentRecordId == orderId);

            if (adminTransaction != null && adminTransaction.Status != "Success")
            {
                adminTransaction.Status = "Success";
                adminTransaction.CompletedAt = DateTime.UtcNow;
                if (adminTransaction.PaymentRecord != null)
                {
                    adminTransaction.PaymentRecord.Status = "Paid";
                    adminTransaction.PaymentRecord.PaymentDate = DateTime.UtcNow;

                    if (adminTransaction.PaymentRecord.TransactionType == "Subscription")
                    {
                        await ActivateSubscriptionFromPaymentAsync(adminTransaction.PaymentRecord);
                    }
                }
                await _adminDbContext.SaveChangesAsync();
                _logger.LogInformation("Payment {OrderId} confirmed directly in AdminDB", orderId);
                return;
            }

            // Try Tenant DB
            var tenantTransaction = await _tenantDbContext.PaymentTransactionTenants
                .Include(t => t.PaymentRecord)
                .FirstOrDefaultAsync(t => t.PaymentRecordId == orderId);

            if (tenantTransaction != null && tenantTransaction.Status != "Success")
            {
                tenantTransaction.Status = "Success";
                tenantTransaction.CompletedAt = DateTime.UtcNow;
                if (tenantTransaction.PaymentRecord != null)
                {
                    tenantTransaction.PaymentRecord.Status = "Paid";
                    tenantTransaction.PaymentRecord.PaymentDate = DateTime.UtcNow;

                    if (tenantTransaction.PaymentRecord.TransactionType == "Tuition"
                        && !string.IsNullOrWhiteSpace(tenantTransaction.PaymentRecord.ReferenceId))
                    {
                        await UpdateTuitionInvoiceAsync(
                            tenantTransaction.PaymentRecord.ReferenceId,
                            tenantTransaction.PaymentRecord.PaymentId);
                    }
                }
                await _tenantDbContext.SaveChangesAsync();
                _logger.LogInformation("Payment {OrderId} confirmed directly in TenantDB", orderId);
            }
        }

        private Task<TenantResolutionContext> ResolveCreateTenantContextAsync(CreatePaymentDto dto, bool isTuition)
        {
            if (!string.IsNullOrWhiteSpace(dto.TenantId))
            {
                return Task.FromResult(new TenantResolutionContext(dto.TenantId.Trim(), "explicit", null));
            }

            if (isTuition && !string.IsNullOrWhiteSpace(_tenantDbContext.CurrentTenantId))
            {
                return Task.FromResult(new TenantResolutionContext(_tenantDbContext.CurrentTenantId.Trim(), "current-tenant-db", null));
            }

            // Thử lấy tenantId từ HTTP header (frontend gửi qua api.js interceptor)
            var httpContext = _httpContextAccessor.HttpContext;
            if (httpContext != null)
            {
                var tenantFromHeader = httpContext.Request.Headers["tenant"].FirstOrDefault()
                    ?? httpContext.Request.Headers["Tenant"].FirstOrDefault();
                if (!string.IsNullOrWhiteSpace(tenantFromHeader) 
                    && tenantFromHeader != DefaultTenantId)
                {
                    return Task.FromResult(new TenantResolutionContext(tenantFromHeader.Trim(), "http-header", null));
                }

                // Thử từ JWT claim
                var tenantFromClaim = httpContext.User?.Claims
                    ?.FirstOrDefault(c => c.Type == "TenantId")?.Value;
                if (!string.IsNullOrWhiteSpace(tenantFromClaim) 
                    && tenantFromClaim != DefaultTenantId)
                {
                    return Task.FromResult(new TenantResolutionContext(tenantFromClaim.Trim(), "jwt-claim", null));
                }
            }

            return Task.FromResult(new TenantResolutionContext(DefaultTenantId, "fallback", null));
        }

        private async Task<TenantResolutionContext> ResolveCallbackTenantContextAsync(
            Dictionary<string, string> callbackData)
        {
            var orderId = ExtractOrderId(callbackData);

            var explicitTenant = ExtractTenantId(callbackData);
            if (!string.IsNullOrWhiteSpace(explicitTenant))
            {
                return new TenantResolutionContext(explicitTenant.Trim(), "explicit", orderId);
            }

            if (!string.IsNullOrWhiteSpace(orderId))
            {
                var adminTransaction = await _adminDbContext.PaymentTransactions
                    .Include(t => t.PaymentRecord)
                    .AsNoTracking()
                    .FirstOrDefaultAsync(t => t.PaymentRecordId == orderId);

                if (!string.IsNullOrWhiteSpace(adminTransaction?.PaymentRecord?.TenantId))
                {
                    return new TenantResolutionContext(adminTransaction.PaymentRecord.TenantId, "record-derived", orderId);
                }

                var adminPaymentRecord = await _adminDbContext.PaymentRecords
                    .AsNoTracking()
                    .FirstOrDefaultAsync(p => p.PaymentId == orderId);

                if (!string.IsNullOrWhiteSpace(adminPaymentRecord?.TenantId))
                {
                    return new TenantResolutionContext(adminPaymentRecord.TenantId, "record-derived", orderId);
                }
            }

            if (!string.IsNullOrWhiteSpace(_tenantDbContext.CurrentTenantId))
            {
                return new TenantResolutionContext(_tenantDbContext.CurrentTenantId.Trim(), "current-tenant-db", orderId);
            }

            return new TenantResolutionContext(DefaultTenantId, "fallback", orderId);
        }

        private static string? ExtractTenantId(IReadOnlyDictionary<string, string> callbackData)
        {
            if (callbackData.TryGetValue("tenantId", out var tenantId) && !string.IsNullOrWhiteSpace(tenantId))
                return tenantId;

            if (callbackData.TryGetValue("TenantId", out tenantId) && !string.IsNullOrWhiteSpace(tenantId))
                return tenantId;

            if (callbackData.TryGetValue("vnp_TenantId", out tenantId) && !string.IsNullOrWhiteSpace(tenantId))
                return tenantId;

            return null;
        }

        private static string? ExtractOrderId(IReadOnlyDictionary<string, string> callbackData)
        {
            if (callbackData.TryGetValue("vnp_TxnRef", out var orderId) && !string.IsNullOrWhiteSpace(orderId))
                return orderId;

            if (callbackData.TryGetValue("orderId", out orderId) && !string.IsNullOrWhiteSpace(orderId))
                return orderId;

            if (callbackData.TryGetValue("OrderId", out orderId) && !string.IsNullOrWhiteSpace(orderId))
                return orderId;

            return null;
        }

        private sealed record TenantResolutionContext(string TenantId, string Source, string? OrderId);

        private async Task<PaymentVerificationResult?> ApplyVerificationToTenantAsync(
            PaymentTransactionTenant transaction,
            Dictionary<string, string> callbackData,
            PaymentVerificationResult verification)
        {
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

            transaction.GatewayResponse = System.Text.Json.JsonSerializer.Serialize(callbackData);
            transaction.CompletedAt = DateTime.UtcNow;
            if (transaction.PaymentRecord != null)
                transaction.PaymentRecord.PaymentDate = DateTime.UtcNow;

            if (verification.IsSuccessful)
            {
                transaction.Status = "Success";
                if (transaction.PaymentRecord != null)
                    transaction.PaymentRecord.Status = "Paid";

                if (transaction.PaymentRecord?.TransactionType == "Tuition"
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
                if (transaction.PaymentRecord != null)
                    transaction.PaymentRecord.Status = "Failed";
                transaction.ErrorMessage = verification.Message;
            }

            await _tenantDbContext.SaveChangesAsync();
            return null;
        }

        private async Task<PaymentVerificationResult?> ApplyVerificationToAdminAsync(
            PaymentTransaction transaction,
            Dictionary<string, string> callbackData,
            PaymentVerificationResult verification)
        {
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

            transaction.GatewayResponse = System.Text.Json.JsonSerializer.Serialize(callbackData);
            transaction.CompletedAt = DateTime.UtcNow;
            if (transaction.PaymentRecord != null)
                transaction.PaymentRecord.PaymentDate = DateTime.UtcNow;

            if (verification.IsSuccessful)
            {
                transaction.Status = "Success";
                if (transaction.PaymentRecord != null)
                    transaction.PaymentRecord.Status = "Paid";

                if (transaction.PaymentRecord?.TransactionType == "Subscription")
                {
                    await ActivateSubscriptionFromPaymentAsync(transaction.PaymentRecord);
                }
            }
            else
            {
                transaction.Status = "Failed";
                if (transaction.PaymentRecord != null)
                    transaction.PaymentRecord.Status = "Failed";
                transaction.ErrorMessage = verification.Message;
            }

            await _adminDbContext.SaveChangesAsync();
            return null;
        }

        private async Task ActivateSubscriptionFromPaymentAsync(PaymentRecord paymentRecord)
        {
            try
            {
                if (string.IsNullOrWhiteSpace(paymentRecord.ReferenceId))
                {
                    _logger.LogWarning("Subscription payment {PaymentId} missing PlanId reference", paymentRecord.PaymentId);
                    return;
                }

                var plan = await _adminDbContext.Plans
                    .FirstOrDefaultAsync(p => p.PlanId == paymentRecord.ReferenceId && p.IsActive);

                if (plan == null)
                {
                    _logger.LogWarning("Plan {PlanId} not found for payment {PaymentId}", paymentRecord.ReferenceId, paymentRecord.PaymentId);
                    return;
                }

                var months = paymentRecord.SubscriptionMonths.GetValueOrDefault(1);
                if (months <= 0)
                    months = 1;

                var now = DateTime.UtcNow;

                var activeSubscription = await _adminDbContext.Subscriptions
                    .Where(s => s.TenantId == paymentRecord.TenantId && s.Status == "Active" && s.EndDate > now)
                    .OrderByDescending(s => s.EndDate)
                    .FirstOrDefaultAsync();

                if (activeSubscription != null && activeSubscription.PlanId == plan.PlanId)
                {
                    activeSubscription.EndDate = activeSubscription.EndDate.AddMonths(months);
                    paymentRecord.ReferenceId = activeSubscription.Id;
                    return;
                }

                if (activeSubscription != null)
                {
                    activeSubscription.Status = "Cancelled";
                    activeSubscription.EndDate = now;
                }

                var newSubscription = new Subscription
                {
                    TenantId = paymentRecord.TenantId,
                    PlanId = plan.PlanId,
                    StartDate = now,
                    EndDate = now.AddMonths(months),
                    Status = "Active"
                };

                _adminDbContext.Subscriptions.Add(newSubscription);
                paymentRecord.ReferenceId = newSubscription.Id;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to activate subscription for payment {PaymentId}", paymentRecord.PaymentId);
            }
        }

        private static PaymentTransactionInfo MapTransaction(PaymentTransactionTenant transaction)
        {
            return new PaymentTransactionInfo
            {
                TransactionId = transaction.TransactionId,
                PaymentRecordId = transaction.PaymentRecordId,
                GatewayType = transaction.GatewayType,
                Amount = transaction.Amount,
                Status = transaction.Status,
                CreatedAt = transaction.CreatedAt,
                CompletedAt = transaction.CompletedAt
            };
        }

        private static PaymentTransactionInfo MapTransaction(PaymentTransaction transaction)
        {
            return new PaymentTransactionInfo
            {
                TransactionId = transaction.TransactionId,
                PaymentRecordId = transaction.PaymentRecordId,
                GatewayType = transaction.GatewayType,
                Amount = transaction.Amount,
                Status = transaction.Status,
                CreatedAt = transaction.CreatedAt,
                CompletedAt = transaction.CompletedAt
            };
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
                invoice.Notes = "Học sinh nộp tiền online";

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
        public int? SubscriptionMonths { get; set; }
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

    public class PaymentTransactionInfo
    {
        public string TransactionId { get; set; } = string.Empty;
        public string PaymentRecordId { get; set; } = string.Empty;
        public string GatewayType { get; set; } = string.Empty;
        public decimal Amount { get; set; }
        public string Status { get; set; } = string.Empty;
        public DateTime CreatedAt { get; set; }
        public DateTime? CompletedAt { get; set; }
    }
}
