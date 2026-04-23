using EducenAPI.Models;
using EducenAPI.Persistence.Contexts;
using EducenAPI.Services.Payment;
using EducenAPI.Services.Interface;
using Microsoft.EntityFrameworkCore;
using System.Text.Json;

namespace EducenAPI.Services
{
    public class RefundService : IRefundService
    {
        private const string RefundGraceOrServiceIssueMessage = "Chỉ được hoàn tiền trong thời gian gia hạn hoặc khi có sự cố dịch vụ.";

        private readonly AdminDbContext _adminContext;
        private readonly ILogger<RefundService> _logger;
        private readonly IConfiguration _configuration;
        private readonly PaymentGatewayFactory _gatewayFactory;
        private readonly ISubscriptionService _subscriptionService;

        public RefundService(
            AdminDbContext adminContext,
            ILogger<RefundService> logger,
            IConfiguration configuration,
            PaymentGatewayFactory gatewayFactory,
            ISubscriptionService subscriptionService)
        {
            _adminContext = adminContext;
            _logger = logger;
            _configuration = configuration;
            _gatewayFactory = gatewayFactory;
            _subscriptionService = subscriptionService;
        }

        public async Task<Models.RefundRequest> CreateRefundRequestAsync(CreateRefundRequest request)
        {
            _logger.LogInformation("Tạo yêu cầu hoàn tiền. PaymentRecordId={PaymentRecordId}, TenantId={TenantId}, RefundAmount={RefundAmount}, RefundMethod={RefundMethod}, IsServiceIssue={IsServiceIssue}",
                request.PaymentRecordId,
                request.TenantId,
                request.RefundAmount,
                request.RefundMethod,
                request.IsServiceIssue);

            // Validate payment record
            var payment = await _adminContext.PaymentRecords
                .FirstOrDefaultAsync(p => p.PaymentId == request.PaymentRecordId);

            if (payment == null)
                throw new Exception("Không tìm thấy giao dịch thanh toán");

            if (payment.Status != "Paid")
                throw new Exception("Chỉ có thể hoàn tiền cho giao dịch đã thanh toán");

            if (payment.TransactionType != "Subscription")
                throw new Exception("Chỉ hỗ trợ hoàn tiền cho giao dịch gói dịch vụ");

            // Chính sách mới: Chỉ refund trong grace period hoặc khi có sự cố dịch vụ
            var withinGracePeriod = IsWithinGracePeriod(payment.PaymentDate);
            if (!withinGracePeriod && !request.IsServiceIssue)
                throw new Exception(RefundGraceOrServiceIssueMessage);

            // Chính sách mới: KHÔNG hoàn tiền mặt, chỉ quy đổi sang credit
            // Bắt buộc refundMethod = Credit
            if (!string.Equals(request.RefundMethod, "Credit", StringComparison.OrdinalIgnoreCase))
                throw new Exception("Chỉ hỗ trợ hoàn tiền dưới dạng credit, không hoàn tiền mặt");

            // Check if refund already exists
            var existingRefund = await _adminContext.RefundRequests
                .FirstOrDefaultAsync(r => r.PaymentRecordId == request.PaymentRecordId &&
                    (r.Status == "Pending" || r.Status == "Approved" || r.Status == "Processing" || r.Status == "Completed"));

            if (existingRefund != null)
                throw new Exception("Đã tồn tại yêu cầu hoàn tiền cho giao dịch này");

            var effectiveTenantId = string.IsNullOrWhiteSpace(request.TenantId)
                ? payment.TenantId
                : request.TenantId.Trim();

            if (!string.Equals(payment.TenantId, effectiveTenantId, StringComparison.Ordinal))
                throw new Exception("Mã trung tâm không khớp với giao dịch thanh toán");

            var subscriptionId = string.IsNullOrWhiteSpace(request.SubscriptionId)
                ? payment.ReferenceId
                : request.SubscriptionId.Trim();

            var refundAmount = request.RefundAmount;
            if (IsCancellationRequest(subscriptionId, request.Reason))
            {
                if (!string.IsNullOrWhiteSpace(payment.ReferenceId)
                    && !string.IsNullOrWhiteSpace(subscriptionId)
                    && !string.Equals(payment.ReferenceId, subscriptionId, StringComparison.Ordinal))
                    throw new Exception("Gói dịch vụ không khớp với giao dịch thanh toán");

                var subscription = await GetSubscriptionForCancellationAsync(subscriptionId!, effectiveTenantId);
                var unusedCredit = _subscriptionService.CalculateUnusedCredit(subscription);

                if (unusedCredit <= 0)
                    throw new Exception("Gói dịch vụ đã hết hạn hoặc không còn giá trị hoàn lại");

                if (refundAmount > 0 && refundAmount != unusedCredit)
                    throw new Exception("Không hỗ trợ hủy gói một phần. Số tiền hoàn phải bằng giá trị còn lại.");

                refundAmount = unusedCredit;
            }

            // Validate refund amount
            if (refundAmount <= 0 || refundAmount > payment.Amount)
                throw new Exception("Số tiền hoàn không hợp lệ");

            var refundMethod = NormalizeRefundMethod(request.RefundMethod);
            string? gatewayRef = null;

            if (refundMethod == "Cash")
            {
                if (!string.Equals(payment.PaymentMethod, "VNPay", StringComparison.OrdinalIgnoreCase))
                    throw new Exception("Hoàn tiền tiền mặt chỉ hỗ trợ cho giao dịch VNPay");

                gatewayRef = request.GatewayRef;
                if (string.IsNullOrWhiteSpace(gatewayRef))
                {
                    gatewayRef = await _adminContext.PaymentTransactions
                        .Where(t => t.PaymentRecordId == payment.PaymentId && t.Status == "Success")
                        .OrderByDescending(t => t.CompletedAt ?? t.CreatedAt)
                        .Select(t => t.GatewayTransactionId)
                        .FirstOrDefaultAsync();
                }

                if (string.IsNullOrWhiteSpace(gatewayRef))
                    throw new Exception("Thiếu mã tham chiếu cổng thanh toán cho hoàn tiền tiền mặt");
            }

            var refund = new Models.RefundRequest
            {
                RefundId = Guid.NewGuid().ToString(),
                PaymentRecordId = request.PaymentRecordId,
                SubscriptionId = subscriptionId,
                TenantId = effectiveTenantId,
                RequestedBy = request.RequestedBy,
                Reason = request.Reason,
                OriginalAmount = payment.Amount,
                RefundAmount = refundAmount,
                RefundMethod = refundMethod,
                GatewayRef = gatewayRef,
                IsServiceIssue = request.IsServiceIssue,
                Status = "Pending",
                CreatedAt = DateTime.UtcNow
            };

            _adminContext.RefundRequests.Add(refund);
            await _adminContext.SaveChangesAsync();

            _logger.LogInformation("Refund request {RefundId} created for payment {PaymentId}",
                refund.RefundId, request.PaymentRecordId);

            return refund;
        }

        public async Task<Models.RefundRequest> ApproveRefundAsync(string refundId, int approvedBy, string? notes = null)
        {
            var refund = await _adminContext.RefundRequests.FindAsync(refundId);
            if (refund == null)
                throw new Exception("Không tìm thấy yêu cầu hoàn tiền");

            if (refund.Status != "Pending")
                throw new Exception("Chỉ có thể duyệt yêu cầu hoàn tiền ở trạng thái chờ xử lý");

            refund.Status = "Approved";
            refund.ApprovedBy = approvedBy;
            refund.ApprovedAt = DateTime.UtcNow;
            refund.UpdatedAt = DateTime.UtcNow;

            await _adminContext.SaveChangesAsync();

            _logger.LogInformation("Refund {RefundId} approved by user {UserId}", refundId, approvedBy);

            return refund;
        }

        public async Task<Models.RefundRequest> RejectRefundAsync(string refundId, string reason, int rejectedBy)
        {
            var refund = await _adminContext.RefundRequests.FindAsync(refundId);
            if (refund == null)
                throw new Exception("Không tìm thấy yêu cầu hoàn tiền");

            if (refund.Status != "Pending")
                throw new Exception("Chỉ có thể từ chối yêu cầu hoàn tiền ở trạng thái chờ xử lý");

            refund.Status = "Rejected";
            refund.RejectionReason = reason;
            refund.UpdatedAt = DateTime.UtcNow;

            await _adminContext.SaveChangesAsync();

            _logger.LogInformation("Refund {RefundId} rejected by user {UserId}: {Reason}",
                refundId, rejectedBy, reason);

            return refund;
        }

        public async Task<Models.RefundRequest> ProcessRefundAsync(string refundId)
        {
            var refund = await _adminContext.RefundRequests
                .Include(r => r.PaymentRecord)
                .FirstOrDefaultAsync(r => r.RefundId == refundId);

            if (refund == null)
                throw new Exception("Không tìm thấy yêu cầu hoàn tiền");

            if (refund.Status != "Approved")
                throw new Exception("Chỉ có thể xử lý yêu cầu hoàn tiền đã được duyệt");

            refund.Status = "Processing";
            refund.UpdatedAt = DateTime.UtcNow;
            await _adminContext.SaveChangesAsync();

            try
            {
                Subscription? cancellationSubscription = null;
                var isCancellationRefund = IsCancellationRequest(refund.SubscriptionId, refund.Reason);
                if (isCancellationRefund)
                {
                    if (string.IsNullOrWhiteSpace(refund.SubscriptionId))
                        throw new Exception("Thiếu mã gói dịch vụ để hủy");

                    if (refund.PaymentRecord != null
                        && !string.IsNullOrWhiteSpace(refund.PaymentRecord.ReferenceId)
                        && !string.Equals(refund.PaymentRecord.ReferenceId, refund.SubscriptionId, StringComparison.Ordinal))
                        throw new Exception("Gói dịch vụ không khớp với giao dịch thanh toán");

                    cancellationSubscription = await GetSubscriptionForCancellationAsync(refund.SubscriptionId, refund.TenantId);
                    var unusedCredit = _subscriptionService.CalculateUnusedCredit(cancellationSubscription);

                    if (unusedCredit <= 0)
                        throw new Exception("Gói dịch vụ đã hết hạn hoặc không còn giá trị hoàn lại");

                    if (refund.RefundAmount != unusedCredit)
                    {
                        _logger.LogInformation(
                            "Adjust refund amount for cancellation refund {RefundId} from {OldAmount} to {NewAmount}",
                            refund.RefundId, refund.RefundAmount, unusedCredit);
                        refund.RefundAmount = unusedCredit;
                    }
                }

if (string.Equals(refund.RefundMethod, "Cash", StringComparison.OrdinalIgnoreCase))
                {
                    var refundPayment = refund.PaymentRecord ?? throw new Exception("Không tìm thấy giao dịch thanh toán");

if (!string.Equals(refundPayment.PaymentMethod, "VNPay", StringComparison.OrdinalIgnoreCase))
                        throw new Exception("Hoàn tiền tiền mặt chỉ hỗ trợ cho giao dịch VNPay");

                    if (string.IsNullOrWhiteSpace(refund.GatewayRef))
                        throw new Exception("Thiếu mã tham chiếu cổng thanh toán cho hoàn tiền tiền mặt");

                    var gateway = _gatewayFactory.GetGateway("VNPay");
var gatewayResponse = await gateway.ProcessRefundAsync(new EducenAPI.Services.Interface.RefundRequest
                    {
                        TenantId = refund.TenantId,
                        OriginalTransactionId = refund.GatewayRef,
                        OrderId = refundPayment.PaymentId,
                        Amount = refund.RefundAmount,
                        Reason = refund.Reason
                    });

                    refund.GatewayRefundId = gatewayResponse.RefundTransactionId;
                    refund.GatewayResponse = gatewayResponse.AdditionalData == null
                        ? null
                        : JsonSerializer.Serialize(gatewayResponse.AdditionalData);

                    if (!gatewayResponse.Success)
                        throw new Exception(gatewayResponse.ErrorMessage ?? "Hoàn tiền thất bại");

                    refund.Status = "Completed";
                    refund.ProcessedAt = DateTime.UtcNow;
                    refund.UpdatedAt = DateTime.UtcNow;

                    UpdatePaymentStatusForRefund(refundPayment, refund.RefundAmount);

if (cancellationSubscription != null)
                        ApplyCancellation(cancellationSubscription!);

                    await _adminContext.SaveChangesAsync();

                    _logger.LogInformation("Refund {RefundId} processed as cash with status: {Status}",
                        refundId, refund.Status);

                    return refund;
                }

                var tenant = await _adminContext.Tenants
                    .FirstOrDefaultAsync(t => t.TenantId == refund.TenantId);

                if (tenant == null)
                    throw new Exception("Không tìm thấy trung tâm");

                var payment = refund.PaymentRecord ?? throw new Exception("Không tìm thấy giao dịch thanh toán");
                if (!string.IsNullOrWhiteSpace(payment.ReferenceId))
                {
                    var originalCredit = await _adminContext.TenantCreditLedgers
                        .Where(l => l.TenantId == tenant.TenantId
                                 && l.EntryType == "Credit"
                                 && l.ReferenceId == payment.ReferenceId
                                 && (l.ReferenceType == "SubscriptionPayment" || l.ReferenceType == "SubscriptionRenew"))
                        .OrderByDescending(l => l.CreatedAt)
                        .FirstOrDefaultAsync();

                    if (originalCredit != null)
                    {
                        var reversedTotal = await _adminContext.TenantCreditLedgers
                            .Where(l => l.TenantId == tenant.TenantId
                                     && l.EntryType == "Debit"
                                     && l.ReferenceType == "SubscriptionCreditReversal"
                                     && l.ReferenceId == originalCredit.LedgerId)
                            .SumAsync(l => l.Amount);

                        var remainingReversible = originalCredit.Amount - reversedTotal;
                        if (remainingReversible > 0)
                        {
                            var reversalAmount = Math.Min(refund.RefundAmount, remainingReversible);
                            tenant.CreditBalance -= reversalAmount;

                            var reversalLedger = new Models.TenantCreditLedger
                            {
                                TenantId = tenant.TenantId,
                                Amount = reversalAmount,
                                EntryType = "Debit",
                                ReferenceId = originalCredit.LedgerId,
                                ReferenceType = "SubscriptionCreditReversal",
                                BalanceAfter = tenant.CreditBalance,
                                Note = $"Reverse subscription credit for payment {refund.PaymentRecordId}",
                                CreatedAt = DateTime.UtcNow
                            };

                            _adminContext.TenantCreditLedgers.Add(reversalLedger);
                        }
                        else
                        {
                            _logger.LogInformation(
                                "Refund {RefundId} already reversed subscription credit for payment {PaymentId}",
                                refund.RefundId, refund.PaymentRecordId);
                        }
                    }
                    else
                    {
                        _logger.LogWarning(
                            "Refund {RefundId} could not find subscription credit ledger for payment {PaymentId}",
                            refund.RefundId, refund.PaymentRecordId);
                    }
                }
                else
                {
                    _logger.LogWarning(
                        "Refund {RefundId} missing payment reference to locate credit ledger for payment {PaymentId}",
                        refund.RefundId, refund.PaymentRecordId);
                }

                refund.Status = "Completed";
                refund.ProcessedAt = DateTime.UtcNow;
                refund.UpdatedAt = DateTime.UtcNow;

                if (refund.PaymentRecord != null)
                    UpdatePaymentStatusForRefund(refund.PaymentRecord, refund.RefundAmount);

if (cancellationSubscription != null)
                    ApplyCancellation(cancellationSubscription!);

                await _adminContext.SaveChangesAsync();

                _logger.LogInformation("Refund {RefundId} processed as credit with status: {Status}",
                    refundId, refund.Status);

                return refund;
            }
            catch (Exception ex)
            {
                refund.Status = "Failed";
                refund.ErrorMessage = ex.Message;
                refund.UpdatedAt = DateTime.UtcNow;
                await _adminContext.SaveChangesAsync();

                _logger.LogError(ex, "Error processing refund {RefundId}", refundId);
                throw;
            }
        }

        public async Task<Models.RefundRequest?> GetRefundRequestAsync(string refundId)
        {
            return await _adminContext.RefundRequests
                .Include(r => r.PaymentRecord)
                .FirstOrDefaultAsync(r => r.RefundId == refundId);
        }

        public async Task<List<Models.RefundRequest>> GetRefundRequestsAsync(RefundFilterRequest filter)
        {
            var query = _adminContext.RefundRequests
                .Include(r => r.PaymentRecord)
                .AsQueryable();

            if (!string.IsNullOrEmpty(filter.TenantId))
                query = query.Where(r => r.TenantId == filter.TenantId);

            if (!string.IsNullOrEmpty(filter.Status))
                query = query.Where(r => r.Status == filter.Status);

            if (filter.RequestedBy.HasValue)
                query = query.Where(r => r.RequestedBy == filter.RequestedBy.Value);

            if (filter.FromDate.HasValue)
                query = query.Where(r => r.CreatedAt >= filter.FromDate.Value);

            if (filter.ToDate.HasValue)
                query = query.Where(r => r.CreatedAt <= filter.ToDate.Value);

            return await query.OrderByDescending(r => r.CreatedAt).ToListAsync();
        }

        public async Task<bool> CanRefundAsync(string paymentRecordId)
        {
            var payment = await _adminContext.PaymentRecords.FindAsync(paymentRecordId);
            if (payment == null || payment.Status != "Paid" || payment.TransactionType != "Subscription")
                return false;

            if (payment.SubscriptionMonths.GetValueOrDefault() != 1)
                return false;

            // Check if refund already exists
            var existingRefund = await _adminContext.RefundRequests
                .AnyAsync(r => r.PaymentRecordId == paymentRecordId &&
                    (r.Status == "Pending" || r.Status == "Approved" || r.Status == "Processing" || r.Status == "Completed"));

            return !existingRefund;
        }

        private bool IsWithinGracePeriod(DateTime paymentDate)
        {
            var graceDays = GetGraceDays();
            var deadline = paymentDate.AddDays(graceDays);
            return DateTime.UtcNow <= deadline;
        }

        private int GetGraceDays()
        {
            var configuredDays = _configuration.GetValue("RefundPolicy:SubscriptionGraceDays", 7);
            if (configuredDays < 3) return 3;
            if (configuredDays > 7) return 7;
            return configuredDays;
        }

        private static string NormalizeRefundMethod(string? refundMethod)
        {
            if (string.IsNullOrWhiteSpace(refundMethod))
                return "Credit";

            return refundMethod.Trim().Equals("Cash", StringComparison.OrdinalIgnoreCase)
                ? "Cash"
                : "Credit";
        }

        private static void UpdatePaymentStatusForRefund(Models.PaymentRecord paymentRecord, decimal refundAmount)
        {
            if (refundAmount < paymentRecord.Amount)
            {
                paymentRecord.Status = "PartialRefunded";
                return;
            }

            paymentRecord.Status = "Refunded";
        }

        private async Task<Models.Subscription> GetSubscriptionForCancellationAsync(string subscriptionId, string tenantId)
        {
            var subscription = await _adminContext.Subscriptions
                .Include(s => s.Plan)
                .FirstOrDefaultAsync(s => s.Id == subscriptionId && s.TenantId == tenantId);

            if (subscription == null)
                throw new Exception("Không tìm thấy gói dịch vụ cần hủy");

            return subscription;
        }

        private static bool IsCancellationRequest(string? subscriptionId, string? reason)
        {
            if (string.IsNullOrWhiteSpace(subscriptionId) || string.IsNullOrWhiteSpace(reason))
                return false;

            return reason.Contains("cancel", StringComparison.OrdinalIgnoreCase)
                || reason.Contains("huy", StringComparison.OrdinalIgnoreCase)
                || reason.Contains("hủy", StringComparison.OrdinalIgnoreCase);
        }

        private static void ApplyCancellation(Models.Subscription subscription)
        {
            subscription.Status = "Cancelled";
            subscription.EndDate = DateTime.UtcNow;
        }
    }
}