using EducenAPI.Persistence.Contexts;
using EducenAPI.Services.Interface;
using Microsoft.EntityFrameworkCore;

namespace EducenAPI.Services
{
    public class RefundService : IRefundService
    {
        private readonly AdminDbContext _adminContext;
        private readonly ILogger<RefundService> _logger;
        private readonly IConfiguration _configuration;

        public RefundService(
            AdminDbContext adminContext,
            ILogger<RefundService> logger,
            IConfiguration configuration)
        {
            _adminContext = adminContext;
            _logger = logger;
            _configuration = configuration;
        }

        public async Task<Models.RefundRequest> CreateRefundRequestAsync(CreateRefundRequest request)
        {
            // Validate payment record
            var payment = await _adminContext.PaymentRecords
                .FirstOrDefaultAsync(p => p.PaymentId == request.PaymentRecordId);

            if (payment == null)
                throw new Exception("Payment record not found");

            if (payment.Status != "Paid")
                throw new Exception("Only paid payments can be refunded");

            if (payment.TransactionType != "Subscription")
                throw new Exception("Only subscription payments can be refunded");

            if (payment.SubscriptionMonths.GetValueOrDefault() != 1)
                throw new Exception("Only monthly subscription payments can be refunded");

            if (!IsWithinGracePeriod(payment.PaymentDate))
                throw new Exception("Refund grace period has expired");

            // Check if refund already exists
            var existingRefund = await _adminContext.RefundRequests
                .FirstOrDefaultAsync(r => r.PaymentRecordId == request.PaymentRecordId &&
                    (r.Status == "Pending" || r.Status == "Approved" || r.Status == "Processing"));

            if (existingRefund != null)
                throw new Exception("A refund request already exists for this payment");

            // Validate refund amount
            if (request.RefundAmount <= 0 || request.RefundAmount > payment.Amount)
                throw new Exception("Invalid refund amount");

            var refund = new Models.RefundRequest
            {
                RefundId = Guid.NewGuid().ToString(),
                PaymentRecordId = request.PaymentRecordId,
                SubscriptionId = request.SubscriptionId,
                TenantId = request.TenantId,
                RequestedBy = request.RequestedBy,
                Reason = request.Reason,
                OriginalAmount = payment.Amount,
                RefundAmount = request.RefundAmount,
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
                throw new Exception("Refund request not found");

            if (refund.Status != "Pending")
                throw new Exception("Only pending refunds can be approved");

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
                throw new Exception("Refund request not found");

            if (refund.Status != "Pending")
                throw new Exception("Only pending refunds can be rejected");

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
                throw new Exception("Refund request not found");

            if (refund.Status != "Approved")
                throw new Exception("Only approved refunds can be processed");

            refund.Status = "Processing";
            await _adminContext.SaveChangesAsync();

            try
            {
                var tenant = await _adminContext.Tenants
                    .FirstOrDefaultAsync(t => t.TenantId == refund.TenantId);

                if (tenant == null)
                    throw new Exception("Tenant not found");

                tenant.CreditBalance += refund.RefundAmount;

                var ledger = new Models.TenantCreditLedger
                {
                    TenantId = tenant.TenantId,
                    Amount = refund.RefundAmount,
                    EntryType = "Credit",
                    ReferenceId = refund.RefundId,
                    ReferenceType = "Refund",
                    BalanceAfter = tenant.CreditBalance,
                    Note = $"Refund credit for payment {refund.PaymentRecordId}",
                    CreatedAt = DateTime.UtcNow
                };

                _adminContext.TenantCreditLedgers.Add(ledger);

                refund.Status = "Completed";
                refund.ProcessedAt = DateTime.UtcNow;
                refund.UpdatedAt = DateTime.UtcNow;

                if (refund.PaymentRecord != null)
                    refund.PaymentRecord.Status = "Refunded";

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

            if (!IsWithinGracePeriod(payment.PaymentDate))
                return false;

            // Check if refund already exists
            var existingRefund = await _adminContext.RefundRequests
                .AnyAsync(r => r.PaymentRecordId == paymentRecordId &&
                    (r.Status == "Pending" || r.Status == "Approved" || r.Status == "Processing" || r.Status == "Completed"));

            return !existingRefund;
        }

        private bool IsWithinGracePeriod(DateTime paymentDate)
        {
            var graceDays = _configuration.GetValue("RefundPolicy:SubscriptionGraceDays", 7);
            var deadline = paymentDate.AddDays(graceDays);
            return DateTime.UtcNow <= deadline;
        }
    }
}
