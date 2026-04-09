using EducenAPI.Models;
using EducenAPI.Persistence.Contexts;
using EducenAPI.Services.Interface;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;

namespace EducenAPI.Services.Payment
{
    public class CreditPaymentResult
    {
        public bool Success { get; set; }
        public decimal CreditUsed { get; set; }
        public decimal RemainingAmount { get; set; }
        public string? ErrorMessage { get; set; }
    }
    public interface IPaymentService
    {
        Task<PaymentResult> CreatePaymentAsync(CreatePaymentDto dto);
        Task<PaymentVerificationResult> ProcessCallbackAsync(string gatewayType, Dictionary<string, string> callbackData);
        Task<PaymentTransactionInfo?> GetTransactionAsync(string transactionId);
        Task<List<PaymentTransactionInfo>> GetTransactionsByPaymentIdAsync(string paymentRecordId);
        Task ConfirmPaymentDirectlyAsync(string? orderId);
        Task MarkPaymentAsFailedAsync(string? orderId, string reason, string status = "Failed");
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
        private readonly ISubscriptionChangeService _subscriptionChangeService;

        private async Task<CreditPaymentResult> UseCreditForPaymentAsync(string tenantId, decimal amount)
        {
            var tenant = await _adminDbContext.Tenants.FindAsync(tenantId);
            if (tenant == null)
            {
                return new CreditPaymentResult { Success = false, ErrorMessage = "Tenant not found" };
            }

            if (tenant.CreditBalance <= 0)
            {
                return new CreditPaymentResult { Success = true, CreditUsed = 0, RemainingAmount = amount };
            }

            decimal creditUsed;
            decimal remainingAmount;

            if (tenant.CreditBalance >= amount)
            {
                creditUsed = amount;
                remainingAmount = 0;
                tenant.CreditBalance -= amount;
            }
            else
            {
                creditUsed = tenant.CreditBalance;
                remainingAmount = amount - tenant.CreditBalance;
                tenant.CreditBalance = 0;
            }

            var ledgerEntry = new TenantCreditLedger
            {
                TenantId = tenantId,
                Amount = creditUsed,
                EntryType = "Debit",
                ReferenceType = "SubscriptionPayment",
                BalanceAfter = tenant.CreditBalance,
                Note = $"Used credit for payment"
            };
            _adminDbContext.TenantCreditLedgers.Add(ledgerEntry);

            _logger.LogInformation(
                "Credit used for tenant {TenantId}: {CreditUsed} (Remaining: {RemainingAmount}), New Balance: {NewBalance}",
                tenantId, creditUsed, remainingAmount, tenant.CreditBalance);

            return new CreditPaymentResult
            {
                Success = true,
                CreditUsed = creditUsed,
                RemainingAmount = remainingAmount
            };
        }

        private async Task HandleSubscriptionCreditOnCallbackAsync(string tenantId, decimal gatewayAmount)
        {
            if (gatewayAmount <= 0) return;

            var tenant = await _adminDbContext.Tenants.FindAsync(tenantId);
            if (tenant == null || tenant.CreditBalance <= 0) return;

            var actualCreditUsed = Math.Min(tenant.CreditBalance, gatewayAmount);
            if (actualCreditUsed > 0)
            {
                tenant.CreditBalance -= actualCreditUsed;

                var ledgerEntry = new TenantCreditLedger
                {
                    TenantId = tenantId,
                    Amount = actualCreditUsed,
                    EntryType = "Debit",
                    ReferenceType = "SubscriptionPayment",
                    BalanceAfter = tenant.CreditBalance,
                    Note = $"Used credit for partial payment callback"
                };
                _adminDbContext.TenantCreditLedgers.Add(ledgerEntry);

                _logger.LogInformation(
                    "Credit applied on callback for tenant {TenantId}: {CreditUsed}, new balance: {NewBalance}",
                    tenantId, actualCreditUsed, tenant.CreditBalance);
            }
        }

        public PaymentService(
            AdminDbContext adminDbContext,
            EducenV2Context tenantDbContext,
            PaymentGatewayFactory gatewayFactory,
            ILogger<PaymentService> logger,
            IConfiguration configuration,
            IHttpContextAccessor httpContextAccessor,
            ISubscriptionChangeService subscriptionChangeService)
        {
            _adminDbContext = adminDbContext;
            _tenantDbContext = tenantDbContext;
            _gatewayFactory = gatewayFactory;
            _logger = logger;
            _configuration = configuration;
            _httpContextAccessor = httpContextAccessor;
            _subscriptionChangeService = subscriptionChangeService;
        }

        /// <summary>
        /// Học phí → lưu vào Tenant DB (EducenV2)
        /// Gói dịch vụ → lưu vào Admin DB (EducenAdmin)
        /// </summary>
        public async Task<PaymentResult> CreatePaymentAsync(CreatePaymentDto dto)
        {
            try
            {
                // Validate amount
                if (dto.Amount <= 0)
                {
                    return new PaymentResult
                    {
                        Success = false,
                        ErrorMessage = "Số tiền thanh toán phải lớn hơn 0."
                    };
                }

                var isTuition = string.Equals(dto.TransactionType, "Tuition", StringComparison.OrdinalIgnoreCase)
                    || string.Equals(dto.TransactionType, "FamilyTuition", StringComparison.OrdinalIgnoreCase);
                var isSubscriptionInvoice = !isTuition
                    && string.Equals(dto.TransactionType?.Trim(), "SubscriptionInvoice", StringComparison.OrdinalIgnoreCase);
                if (!isTuition && !isSubscriptionInvoice)
                {
                    return new PaymentResult
                    {
                        Success = false,
                        ErrorMessage = "Da ngung thanh toan goi truc tiep. Vui long gui yeu cau doi goi va thanh toan hoa don SubscriptionInvoice."
                    };
                }
                var tenantContext = await ResolveCreateTenantContextAsync(dto, isTuition);
                if (string.IsNullOrWhiteSpace(tenantContext.TenantId))
                {
                    return new PaymentResult
                    {
                        Success = false,
                        ErrorMessage = "Tenant context could not be resolved"
                    };
                }

                var resolvedAmount = dto.Amount;
                if (isTuition)
                {
                    var validation = await ValidateTuitionPaymentRequestAsync(dto);
                    if (!validation.IsValid)
                    {
                        return new PaymentResult
                        {
                            Success = false,
                            ErrorMessage = validation.ErrorMessage
                        };
                    }

                    resolvedAmount = validation.ExpectedAmount;
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
                                ErrorMessage = $"Không tìm thấy trung tâm với ID '{tenantContext.TenantId}'"
                            };
                        }
                    }

                    if (string.IsNullOrWhiteSpace(dto.ReferenceId))
                    {
                        return new PaymentResult
                        {
                            Success = false,
                            ErrorMessage = isSubscriptionInvoice
                                ? "Thiếu InvoiceId cho giao dịch thanh toán hóa đơn đổi gói"
                                : "Thiếu PlanId cho giao dịch thanh toán gói dịch vụ"
                        };
                    }

                    if (isSubscriptionInvoice)
                    {
                        var invoice = await _adminDbContext.Invoices
                            .FirstOrDefaultAsync(i => i.InvoiceId == dto.ReferenceId && i.TenantId == tenantContext.TenantId);

                        if (invoice == null)
                        {
                            return new PaymentResult
                            {
                                Success = false,
                                ErrorMessage = "Không tìm thấy hoá đơn đổi gói"
                            };
                        }

                        if (invoice.Status == "Paid")
                        {
                            return new PaymentResult
                            {
                                Success = false,
                                ErrorMessage = "Hoá đơn đã thanh toán"
                            };
                        }

                        if (invoice.Status == "Cancelled")
                        {
                            return new PaymentResult
                            {
                                Success = false,
                                ErrorMessage = "Hoá đơn đã bị huỷ"
                            };
                        }

                        if (!AmountEquals(dto.Amount, invoice.Amount))
                        {
                            return new PaymentResult
                            {
                                Success = false,
                                ErrorMessage = "Số tiền thanh toán không khớp với hoá đơn"
                            };
                        }

                        resolvedAmount = invoice.Amount;
                    }
                    else
                    {
                        var plan = await _adminDbContext.Plans
                            .FirstOrDefaultAsync(p => p.PlanId == dto.ReferenceId && p.IsActive);
                        if (plan == null)
                        {
                            return new PaymentResult
                            {
                                Success = false,
                                ErrorMessage = "Gói dịch vụ đã chọn không khả dụng"
                            };
                        }
                    }
                }

                if (isTuition)
                {
                    // Kiểm tra invoice đã có payment Pending chưa
                    if (!string.IsNullOrWhiteSpace(dto.ReferenceId))
                    {
                        var existingPending = await _tenantDbContext.PaymentRecordTenants
                            .Include(p => p.Transactions)
                            .Where(p => p.ReferenceId == dto.ReferenceId
                                     && p.Status == "Pending"
                                     && p.Transactions.Any(t => t.Status == "Pending"))
                            .OrderByDescending(p => p.PaymentDate)
                            .FirstOrDefaultAsync();

                        if (existingPending != null)
                        {
                            var existingTxn = existingPending.Transactions
                                .FirstOrDefault(t => t.Status == "Pending");
                            if (existingTxn != null)
                            {
                                if (!AmountEquals(existingPending.Amount, resolvedAmount))
                                {
                                    _logger.LogWarning(
                                        "Pending payment amount mismatch for ReferenceId {RefId}. Existing: {ExistingAmount}, Expected: {ExpectedAmount}. Marking old pending as failed.",
                                        dto.ReferenceId,
                                        existingPending.Amount,
                                        resolvedAmount);

                                    existingTxn.Status = "Failed";
                                    existingTxn.ErrorMessage = "Pending payment amount mismatch";
                                    existingPending.Status = "Failed";
                                    await _tenantDbContext.SaveChangesAsync();
                                }
                                else
                                {
                                _logger.LogInformation(
                                    "Existing pending payment found for ReferenceId: {RefId}, PaymentId: {PaymentId}. Reusing.",
                                    dto.ReferenceId, existingPending.PaymentId);

                                // Tạo lại payment URL cho payment cũ
                                var reuseGateway = _gatewayFactory.GetGateway(dto.GatewayType);
                                var reuseRequest = new CreatePaymentRequest
                                {
                                    TenantId = tenantContext.TenantId,
                                    OrderId = existingPending.PaymentId,
                                    Amount = existingPending.Amount,
                                    Description = existingPending.Description,
                                    ReturnUrl = dto.ReturnUrl,
                                    IpAddress = dto.IpAddress,
                                    CustomerName = dto.CustomerName,
                                    CustomerEmail = dto.CustomerEmail,
                                    CustomerPhone = dto.CustomerPhone
                                };

                                var reuseResponse = await reuseGateway.CreatePaymentAsync(reuseRequest);
                                if (reuseResponse.Success)
                                {
                                    return new PaymentResult
                                    {
                                        Success = true,
                                        PaymentRecordId = existingPending.PaymentId,
                                        TransactionId = existingTxn.TransactionId,
                                        PaymentUrl = reuseResponse.PaymentUrl
                                    };
                                }
                                // Nếu tạo URL fail → đánh dấu cũ Failed, tạo mới
                                existingTxn.Status = "Failed";
                                existingTxn.ErrorMessage = "Reused payment URL creation failed";
                                existingPending.Status = "Failed";
                                await _tenantDbContext.SaveChangesAsync();
                                }
                            }
                        }
                    }

                    var paymentRecord = new PaymentRecordTenant
                    {
                        PaymentId = Guid.NewGuid().ToString(),
                        Amount = resolvedAmount,
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
                        Amount = resolvedAmount,
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
                        Amount = resolvedAmount,
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
                    // Kiểm tra subscription đã có payment Pending chưa
                    if (!string.IsNullOrWhiteSpace(dto.ReferenceId))
                    {
                        var existingSubPending = await _adminDbContext.PaymentRecords
                            .Include(p => p.Transactions)
                            .Where(p => p.TenantId == tenantContext.TenantId
                                     && p.ReferenceId == dto.ReferenceId
                                     && p.Status == "Pending"
                                     && p.Transactions.Any(t => t.Status == "Pending"))
                            .OrderByDescending(p => p.PaymentDate)
                            .FirstOrDefaultAsync();

                        if (existingSubPending != null)
                        {
                            var existingSubTxn = existingSubPending.Transactions
                                .FirstOrDefault(t => t.Status == "Pending");
                            if (existingSubTxn != null)
                            {
                                _logger.LogInformation(
                                    "Existing pending subscription found for TenantId: {TenantId}, PlanId: {PlanId}. Reusing.",
                                    tenantContext.TenantId, dto.ReferenceId);

                                var reuseGateway = _gatewayFactory.GetGateway(dto.GatewayType);
                                var reuseRequest = new CreatePaymentRequest
                                {
                                    TenantId = null,
                                    OrderId = existingSubPending.PaymentId,
                                    Amount = existingSubPending.Amount,
                                    Description = existingSubPending.Description,
                                    ReturnUrl = dto.ReturnUrl,
                                    IpAddress = dto.IpAddress,
                                    CustomerName = dto.CustomerName,
                                    CustomerEmail = dto.CustomerEmail,
                                    CustomerPhone = dto.CustomerPhone
                                };

                                var reuseResponse = await reuseGateway.CreatePaymentAsync(reuseRequest);
                                if (reuseResponse.Success)
                                {
                                    return new PaymentResult
                                    {
                                        Success = true,
                                        PaymentRecordId = existingSubPending.PaymentId,
                                        TransactionId = existingSubTxn.TransactionId,
                                        PaymentUrl = reuseResponse.PaymentUrl
                                    };
                                }
                                existingSubTxn.Status = "Failed";
                                existingSubTxn.ErrorMessage = "Reused payment URL creation failed";
                                existingSubPending.Status = "Failed";
                                await _adminDbContext.SaveChangesAsync();
                            }
                        }
                    }

                    var paymentRecord = new PaymentRecord
                    {
                        PaymentId = Guid.NewGuid().ToString(),
                        TenantId = tenantContext.TenantId,
                        Amount = resolvedAmount,
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
                        Amount = resolvedAmount,
                        Status = "Pending",
                        CreatedAt = DateTime.UtcNow
                    };

                    _adminDbContext.PaymentTransactions.Add(transaction);

                    var creditUsed = 0m;
                    var gatewayAmount = resolvedAmount;
                    if (!isSubscriptionInvoice)
                    {
                        var creditResult = await UseCreditForPaymentAsync(tenantContext.TenantId, resolvedAmount);
                        creditUsed = creditResult.CreditUsed;
                        gatewayAmount = creditResult.RemainingAmount;
                    }
                    string? paymentUrl = null;
                    string? qrCodeUrl = null;
                    string? deeplink = null;

                    if (gatewayAmount > 0)
                    {
                        var gateway = _gatewayFactory.GetGateway(dto.GatewayType);
                        var gatewayRequest = new CreatePaymentRequest
                        {
                            TenantId = null,
                            OrderId = paymentRecord.PaymentId,
                            Amount = gatewayAmount,
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
                        paymentUrl = gatewayResponse.PaymentUrl;
                        qrCodeUrl = gatewayResponse.QrCodeUrl;
                        deeplink = gatewayResponse.Deeplink;
                    }
                    else
                    {
                        transaction.Status = "Paid";
                        transaction.CompletedAt = DateTime.UtcNow;
                        paymentRecord.Status = "Paid";
                        paymentRecord.PaymentDate = DateTime.UtcNow;
                        await _adminDbContext.SaveChangesAsync();
                        if (!isSubscriptionInvoice)
                        {
                            await ActivateSubscriptionFromPaymentAsync(paymentRecord);
                        }
                    }

                    await _adminDbContext.SaveChangesAsync();

                    if (creditUsed > 0)
                    {
                        _logger.LogInformation(
                            "Subscription payment {PaymentId} used credit: {CreditUsed}, remaining gateway: {GatewayAmount}",
                            paymentRecord.PaymentId, creditUsed, gatewayAmount);
                    }

                    return new PaymentResult
                    {
                        Success = true,
                        PaymentRecordId = paymentRecord.PaymentId,
                        TransactionId = transaction.TransactionId,
                        PaymentUrl = paymentUrl,
                        QrCodeUrl = qrCodeUrl,
                        Deeplink = deeplink
                    };
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error creating payment");
                return new PaymentResult
                {
                    Success = false,
                    ErrorMessage = $"Lỗi hệ thống nội bộ: {ex.Message}"
                };
            }
        }

        public async Task<PaymentVerificationResult> ProcessCallbackAsync(string gatewayType, Dictionary<string, string> callbackData)
        {
            try
            {
                var orderId = ExtractOrderId(callbackData);

                // Tìm transaction TRƯỚC để xác định loại payment và config cần dùng
                PaymentTransactionTenant? tenantTransaction = null;
                PaymentTransaction? adminTransaction = null;

                if (!string.IsNullOrWhiteSpace(orderId))
                {
                    tenantTransaction = await _tenantDbContext.PaymentTransactionTenants
                        .Include(t => t.PaymentRecord)
                        .FirstOrDefaultAsync(t => t.PaymentRecordId == orderId);

                    if (tenantTransaction == null)
                    {
                        adminTransaction = await _adminDbContext.PaymentTransactions
                            .Include(t => t.PaymentRecord)
                            .FirstOrDefaultAsync(t => t.PaymentRecordId == orderId);
                    }
                }

                // Xác định tenantId cho config resolution
                // Subscription (AdminDB) → dùng global config (default-tenant)
                // Tuition (TenantDB) → dùng per-tenant config của center
                string? configTenantId;
                if (adminTransaction != null)
                {
                    // Subscription payment → tiền về SystemAdmin → dùng global config
                    configTenantId = null;
                }
                else if (tenantTransaction != null)
                {
                    // Tuition payment → dùng config của tenant
                    configTenantId = (await ResolveCallbackTenantContextAsync(callbackData)).TenantId;
                }
                else
                {
                    configTenantId = (await ResolveCallbackTenantContextAsync(callbackData)).TenantId;
                }

                if (!string.IsNullOrWhiteSpace(configTenantId))
                {
                    callbackData["tenantId"] = configTenantId;
                }

                _logger.LogInformation(
                    "Callback config resolved. Gateway: {Gateway}, TenantId: {TenantId}, OrderId: {OrderId}, IsSubscription: {IsSubscription}",
                    gatewayType,
                    configTenantId,
                    orderId ?? "N/A",
                    adminTransaction != null);

                var gateway = _gatewayFactory.GetGateway(gatewayType);
                var verification = await gateway.VerifyCallbackAsync(callbackData);

                if (!verification.IsValid)
                {
                    _logger.LogWarning("Invalid callback from {Gateway}: {Message}", gatewayType, verification.Message);
                    return verification;
                }

                // Tìm transaction nếu chưa tìm được
                if (tenantTransaction == null && adminTransaction == null)
                {
                    tenantTransaction = await _tenantDbContext.PaymentTransactionTenants
                        .Include(t => t.PaymentRecord)
                        .FirstOrDefaultAsync(t => t.PaymentRecordId == verification.OrderId);

                    if (tenantTransaction == null)
                    {
                        adminTransaction = await _adminDbContext.PaymentTransactions
                            .Include(t => t.PaymentRecord)
                            .FirstOrDefaultAsync(t => t.PaymentRecordId == verification.OrderId);
                    }
                }

                if (tenantTransaction == null && adminTransaction == null)
                {
                    _logger.LogError("Transaction not found for OrderId: {OrderId}", verification.OrderId);
                    return new PaymentVerificationResult
                    {
                        IsValid = false,
                        Message = "Không tìm thấy giao dịch"
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
                    Message = $"Lỗi xử lý: {ex.Message}"
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
                        if (adminTransaction.PaymentRecord.TenantId != null)
                        {
                            var tenant = await _adminDbContext.Tenants.FindAsync(adminTransaction.PaymentRecord.TenantId);
                            if (tenant != null && tenant.CreditBalance > 0)
                            {
                                await HandleSubscriptionCreditOnCallbackAsync(
                                    adminTransaction.PaymentRecord.TenantId,
                                    adminTransaction.Amount);
                            }
                        }
                        await ActivateSubscriptionFromPaymentAsync(adminTransaction.PaymentRecord);
                    }
                    else if (adminTransaction.PaymentRecord.TransactionType == "SubscriptionInvoice"
                        && !string.IsNullOrWhiteSpace(adminTransaction.PaymentRecord.ReferenceId))
                    {
                        await UpdateSubscriptionInvoiceAsync(
                            adminTransaction.PaymentRecord.ReferenceId,
                            adminTransaction.PaymentRecord.PaymentId,
                            "VNPay");
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
                    else if (tenantTransaction.PaymentRecord.TransactionType == "FamilyTuition"
                        && !string.IsNullOrWhiteSpace(tenantTransaction.PaymentRecord.ReferenceId))
                    {
                        await UpdateFamilyInvoiceAsync(
                            tenantTransaction.PaymentRecord.ReferenceId,
                            tenantTransaction.PaymentRecord.PaymentId);
                    }
                }
                await _tenantDbContext.SaveChangesAsync();
                _logger.LogInformation("Payment {OrderId} confirmed directly in TenantDB", orderId);
            }
        }

        /// <summary>
        /// Đánh dấu payment thất bại/hủy bỏ (khi hash verify fail nhưng VNPay báo hủy/thất bại)
        /// </summary>
        public async Task MarkPaymentAsFailedAsync(string? orderId, string reason, string status = "Failed")
        {
            if (string.IsNullOrWhiteSpace(orderId)) return;

            // Try Admin DB first (Subscription)
            var adminTransaction = await _adminDbContext.PaymentTransactions
                .Include(t => t.PaymentRecord)
                .FirstOrDefaultAsync(t => t.PaymentRecordId == orderId);

            if (adminTransaction != null && adminTransaction.Status != "Success" && adminTransaction.Status != "Failed" && adminTransaction.Status != "Cancelled")
            {
                adminTransaction.Status = status;
                adminTransaction.CompletedAt = DateTime.UtcNow;
                adminTransaction.ErrorMessage = reason;
                if (adminTransaction.PaymentRecord != null)
                {
                    adminTransaction.PaymentRecord.Status = status;
                }
                await _adminDbContext.SaveChangesAsync();
                _logger.LogInformation("Payment {OrderId} marked as {Status} in AdminDB. Reason: {Reason}", orderId, status, reason);
                return;
            }

            // Try Tenant DB (Tuition)
            var tenantTransaction = await _tenantDbContext.PaymentTransactionTenants
                .Include(t => t.PaymentRecord)
                .FirstOrDefaultAsync(t => t.PaymentRecordId == orderId);

            if (tenantTransaction != null && tenantTransaction.Status != "Success" && tenantTransaction.Status != "Failed" && tenantTransaction.Status != "Cancelled")
            {
                tenantTransaction.Status = status;
                tenantTransaction.CompletedAt = DateTime.UtcNow;
                tenantTransaction.ErrorMessage = reason;
                if (tenantTransaction.PaymentRecord != null)
                {
                    tenantTransaction.PaymentRecord.Status = status;
                }
                await _tenantDbContext.SaveChangesAsync();
                _logger.LogInformation("Payment {OrderId} marked as {Status} in TenantDB. Reason: {Reason}", orderId, status, reason);
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

        private async Task<(bool IsValid, decimal ExpectedAmount, string ErrorMessage)> ValidateTuitionPaymentRequestAsync(CreatePaymentDto dto)
        {
            if (string.IsNullOrWhiteSpace(dto.ReferenceId))
            {
                return (false, 0, "ReferenceId là bắt buộc cho thanh toán học phí.");
            }

            var (currentUserId, roleSet) = GetCurrentUserContext();
            var normalizedType = dto.TransactionType?.Trim();

            if (string.Equals(normalizedType, "Tuition", StringComparison.OrdinalIgnoreCase))
            {
                var tuitionInvoice = await _tenantDbContext.TuitionInvoices
                    .AsNoTracking()
                    .FirstOrDefaultAsync(i => i.InvoiceId == dto.ReferenceId);

                if (tuitionInvoice == null)
                {
                    return (false, 0, "Không tìm thấy hóa đơn học phí cần thanh toán.");
                }

                if (tuitionInvoice.Status == "Paid")
                {
                    return (false, 0, "Hóa đơn này đã được thanh toán trước đó.");
                }

                if (tuitionInvoice.Status != "Sent" && tuitionInvoice.Status != "Overdue")
                {
                    return (false, 0, "Chỉ có thể thanh toán hóa đơn ở trạng thái Sent hoặc Overdue.");
                }

                var canAccess = await CanAccessStudentInvoiceAsync(tuitionInvoice.StudentId, currentUserId, roleSet);
                if (!canAccess)
                {
                    _logger.LogWarning(
                        "Tuition payment ownership denied. UserId: {UserId}, Roles: {Roles}, StudentId: {StudentId}, InvoiceId: {InvoiceId}",
                        currentUserId ?? "N/A",
                        string.Join(',', roleSet),
                        tuitionInvoice.StudentId,
                        dto.ReferenceId);
                    return (false, 0, "Bạn không có quyền thanh toán hóa đơn này.");
                }

                if (!AmountEquals(dto.Amount, tuitionInvoice.FinalAmount))
                {
                    _logger.LogWarning(
                        "Tuition payment amount mismatch. InvoiceId: {InvoiceId}, RequestedAmount: {RequestedAmount}, ExpectedAmount: {ExpectedAmount}",
                        dto.ReferenceId,
                        dto.Amount,
                        tuitionInvoice.FinalAmount);
                    return (false, 0, "Số tiền thanh toán không khớp với hóa đơn.");
                }

                return (true, tuitionInvoice.FinalAmount, string.Empty);
            }

            if (string.Equals(normalizedType, "FamilyTuition", StringComparison.OrdinalIgnoreCase))
            {
                var familyInvoice = await _tenantDbContext.FamilyInvoices
                    .AsNoTracking()
                    .FirstOrDefaultAsync(fi => fi.InvoiceId == dto.ReferenceId);

                if (familyInvoice == null)
                {
                    return (false, 0, "Không tìm thấy hóa đơn gộp cần thanh toán.");
                }

                if (familyInvoice.Status == "Paid")
                {
                    return (false, 0, "Hóa đơn gộp này đã được thanh toán trước đó.");
                }

                if (familyInvoice.Status != "Pending")
                {
                    return (false, 0, "Chỉ có thể thanh toán hóa đơn gộp ở trạng thái Pending.");
                }

                if (!CanAccessFamilyInvoice(familyInvoice, currentUserId, roleSet))
                {
                    _logger.LogWarning(
                        "Family payment ownership denied. UserId: {UserId}, Roles: {Roles}, ParentId: {ParentId}, InvoiceId: {InvoiceId}",
                        currentUserId ?? "N/A",
                        string.Join(',', roleSet),
                        familyInvoice.ParentId,
                        dto.ReferenceId);
                    return (false, 0, "Bạn không có quyền thanh toán hóa đơn gộp này.");
                }

                if (!AmountEquals(dto.Amount, familyInvoice.TotalAmount))
                {
                    _logger.LogWarning(
                        "Family payment amount mismatch. InvoiceId: {InvoiceId}, RequestedAmount: {RequestedAmount}, ExpectedAmount: {ExpectedAmount}",
                        dto.ReferenceId,
                        dto.Amount,
                        familyInvoice.TotalAmount);
                    return (false, 0, "Số tiền thanh toán không khớp với hóa đơn gộp.");
                }

                return (true, familyInvoice.TotalAmount, string.Empty);
            }

            return (false, 0, "Loại giao dịch học phí không hợp lệ.");
        }

        private (string? UserId, HashSet<string> Roles) GetCurrentUserContext()
        {
            var user = _httpContextAccessor.HttpContext?.User;
            var userId = user?.FindFirst(ClaimTypes.NameIdentifier)?.Value;

            var roles = user?.FindAll(ClaimTypes.Role)
                .Select(r => r.Value)
                .Where(v => !string.IsNullOrWhiteSpace(v))
                .ToHashSet(StringComparer.OrdinalIgnoreCase)
                ?? new HashSet<string>(StringComparer.OrdinalIgnoreCase);

            foreach (var role in user?.FindAll("role") ?? Enumerable.Empty<Claim>())
            {
                if (!string.IsNullOrWhiteSpace(role.Value))
                {
                    roles.Add(role.Value);
                }
            }

            return (userId, roles);
        }

        private async Task<bool> CanAccessStudentInvoiceAsync(int studentId, string? currentUserId, HashSet<string> roles)
        {
            if (roles.Contains("Admin"))
            {
                return true;
            }

            if (!int.TryParse(currentUserId, out var currentUserInt))
            {
                return false;
            }

            if (roles.Contains("Student"))
            {
                return currentUserInt == studentId;
            }

            if (roles.Contains("Parent"))
            {
                return await _tenantDbContext.Set<Dictionary<string, object>>("ParentStudent")
                    .AnyAsync(ps => EF.Property<int>(ps, "ParentsUserId") == currentUserInt
                                 && EF.Property<int>(ps, "StudentsUserId") == studentId);
            }

            return false;
        }

        private static bool CanAccessFamilyInvoice(FamilyInvoice familyInvoice, string? currentUserId, HashSet<string> roles)
        {
            if (roles.Contains("Admin"))
            {
                return true;
            }

            if (roles.Contains("Parent"))
            {
                return !string.IsNullOrWhiteSpace(currentUserId)
                    && string.Equals(familyInvoice.ParentId, currentUserId, StringComparison.Ordinal);
            }

            return false;
        }

        private static bool AmountEquals(decimal left, decimal right)
        {
            return decimal.Round(left, 2, MidpointRounding.AwayFromZero)
                == decimal.Round(right, 2, MidpointRounding.AwayFromZero);
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
                    Message = $"Giao dịch đã được xử lý trước đó với trạng thái: {transaction.Status}"
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
                else if (transaction.PaymentRecord?.TransactionType == "FamilyTuition"
                    && !string.IsNullOrEmpty(transaction.PaymentRecord.ReferenceId))
                {
                    await UpdateFamilyInvoiceAsync(
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
                    Message = $"Giao dịch đã được xử lý trước đó với trạng thái: {transaction.Status}"
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
                    if (transaction.PaymentRecord.TenantId != null)
                    {
                        var tenant = await _adminDbContext.Tenants.FindAsync(transaction.PaymentRecord.TenantId);
                        if (tenant != null && tenant.CreditBalance > 0)
                        {
                            await HandleSubscriptionCreditOnCallbackAsync(
                                transaction.PaymentRecord.TenantId,
                                transaction.Amount);
                        }
                    }
                    await ActivateSubscriptionFromPaymentAsync(transaction.PaymentRecord);
                }
                else if (transaction.PaymentRecord?.TransactionType == "SubscriptionInvoice"
                    && !string.IsNullOrEmpty(transaction.PaymentRecord.ReferenceId))
                {
                    await UpdateSubscriptionInvoiceAsync(
                        transaction.PaymentRecord.ReferenceId,
                        transaction.PaymentRecord.PaymentId,
                        "VNPay");
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

                // Lấy thông tin tenant
                var tenant = await _adminDbContext.Tenants.FindAsync(paymentRecord.TenantId);

                var activeSubscription = await _adminDbContext.Subscriptions
                    .Where(s => s.TenantId == paymentRecord.TenantId && s.Status == "Active" && s.EndDate > now)
                    .OrderByDescending(s => s.EndDate)
                    .FirstOrDefaultAsync();

                if (activeSubscription != null && activeSubscription.PlanId == plan.PlanId)
                {
                    activeSubscription.EndDate = activeSubscription.EndDate.AddMonths(months);
                    paymentRecord.ReferenceId = activeSubscription.Id;
                    
                    // Tạo credit khi gia hạn gói - có thời hạn 12 tháng
                    if (tenant != null)
                    {
                        var creditExpirationMonths = 12;
                        tenant.CreditBalance += paymentRecord.Amount;
                        var creditLedger = new TenantCreditLedger
                        {
                            TenantId = tenant.TenantId,
                            Amount = paymentRecord.Amount,
                            EntryType = "Credit",
                            ReferenceType = "SubscriptionRenew",
                            ReferenceId = activeSubscription.Id,
                            BalanceAfter = tenant.CreditBalance,
                            ExpiredAt = DateTime.UtcNow.AddMonths(creditExpirationMonths),
                            Note = $"Gia hạn gói {plan.PlanName} - Tạo credit (hết hạn sau {creditExpirationMonths} tháng)"
                        };
                        _adminDbContext.TenantCreditLedgers.Add(creditLedger);
                    }
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

                // Tạo credit cho tenant bằng với giá gói đã mua - có thời hạn 12 tháng
                if (tenant != null)
                {
                    var creditExpirationMonths = 12;
                    tenant.CreditBalance += paymentRecord.Amount;
                    var creditLedger = new TenantCreditLedger
                    {
                        TenantId = tenant.TenantId,
                        Amount = paymentRecord.Amount,
                        EntryType = "Credit",
                        ReferenceType = "SubscriptionPayment",
                        ReferenceId = newSubscription.Id,
                        BalanceAfter = tenant.CreditBalance,
                        ExpiredAt = DateTime.UtcNow.AddMonths(creditExpirationMonths),
                        Note = $"Đăng ký gói {plan.PlanName} - Tạo credit (hết hạn sau {creditExpirationMonths} tháng)"
                    };
                    _adminDbContext.TenantCreditLedgers.Add(creditLedger);
                }
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

        /// <summary>
        /// Cập nhật FamilyInvoice + tất cả TuitionInvoice con sau khi thanh toán gia đình thành công.
        /// </summary>
        private async Task UpdateFamilyInvoiceAsync(string familyInvoiceId, string paymentRecordId)
        {
            try
            {
                var familyInvoice = await _tenantDbContext.FamilyInvoices
                    .Include(fi => fi.StudentInvoices)
                    .FirstOrDefaultAsync(fi => fi.InvoiceId == familyInvoiceId);

                if (familyInvoice == null)
                {
                    _logger.LogWarning("FamilyInvoice {InvoiceId} not found when updating after payment", familyInvoiceId);
                    return;
                }

                if (familyInvoice.Status == "Paid")
                {
                    _logger.LogInformation("FamilyInvoice {InvoiceId} already marked as Paid", familyInvoiceId);
                    return;
                }

                if (familyInvoice.Status == "Cancelled")
                {
                    _logger.LogWarning(
                        "Skip confirm paid for cancelled FamilyInvoice {InvoiceId} from callback. PaymentRecordId: {PaymentRecordId}",
                        familyInvoiceId,
                        paymentRecordId);
                    return;
                }

                // Update FamilyInvoice
                familyInvoice.Status = "Paid";
                familyInvoice.PaidAt = DateTime.UtcNow;
                familyInvoice.PaymentRecordId = paymentRecordId;
                familyInvoice.UpdatedAt = DateTime.UtcNow;

                // Update all child TuitionInvoices
                foreach (var item in familyInvoice.StudentInvoices)
                {
                    var tuitionInvoice = await _tenantDbContext.TuitionInvoices
                        .FirstOrDefaultAsync(i => i.InvoiceId == item.StudentInvoiceId);

                    if (tuitionInvoice != null && tuitionInvoice.Status != "Paid")
                    {
                        tuitionInvoice.Status = "Paid";
                        tuitionInvoice.PaidAt = DateTime.UtcNow;
                        tuitionInvoice.PaymentRecordId = paymentRecordId;
                        tuitionInvoice.UpdatedAt = DateTime.UtcNow;
                        tuitionInvoice.Notes = "Thanh toán qua hóa đơn gộp gia đình";
                    }

                    item.Status = "Paid";
                    item.PaidAt = DateTime.UtcNow;
                }

                await _tenantDbContext.SaveChangesAsync();

                _logger.LogInformation(
                    "FamilyInvoice {InvoiceId} ({Type}) marked as Paid with PaymentRecord {PaymentRecordId}, {Count} child invoices updated",
                    familyInvoiceId, familyInvoice.Type, paymentRecordId, familyInvoice.StudentInvoices.Count);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to update FamilyInvoice {InvoiceId} after payment", familyInvoiceId);
            }
        }

        private async Task UpdateSubscriptionInvoiceAsync(string invoiceId, string paymentRecordId, string paymentMethod)
        {
            try
            {
                await _subscriptionChangeService.ConfirmInvoicePaidAndApplyAsync(
                    invoiceId,
                    paymentMethod,
                    $"Thanh toan online thanh cong. PaymentRecordId: {paymentRecordId}",
                    "VNPayCallback",
                    paymentRecordId);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to update subscription invoice {InvoiceId} after payment", invoiceId);
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
