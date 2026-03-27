using EducenAPI.Persistence.Contexts;
using EducenAPI.Services.Interface;
using EducenAPI.Services.Payment;
using Microsoft.EntityFrameworkCore;

namespace EducenAPI.Services
{
    public class RefundService : IRefundService
    {
        private readonly AdminDbContext _adminContext;
        private readonly PaymentGatewayFactory _gatewayFactory;
        private readonly ILogger<RefundService> _logger;

        public RefundService(
            AdminDbContext adminContext,
            PaymentGatewayFactory gatewayFactory,
            ILogger<RefundService> logger)
        {
            _adminContext = adminContext;
            _gatewayFactory = gatewayFactory;
            _logger = logger;
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
                // Get original transaction to find gateway
                var transaction = await _adminContext.PaymentTransactions
                    .FirstOrDefaultAsync(t => t.PaymentRecordId == refund.PaymentRecordId && t.Status == "Success");

                if (transaction == null)
                    throw new Exception("Original transaction not found");

                // Process refund through gateway
                var gateway = _gatewayFactory.GetGateway(transaction.GatewayType);
                var refundRequest = new Interface.RefundRequest
                {
                    OriginalTransactionId = transaction.GatewayTransactionId ?? transaction.TransactionId,
                    OrderId = refund.PaymentRecordId,
                    Amount = refund.RefundAmount,
                    Reason = refund.Reason
                };

                var result = await gateway.ProcessRefundAsync(refundRequest);

                if (result.Success)
                {
                    refund.Status = "Completed";
                    refund.GatewayRefundId = result.RefundTransactionId;
                    refund.GatewayResponse = System.Text.Json.JsonSerializer.Serialize(result.AdditionalData);
                    refund.ProcessedAt = DateTime.UtcNow;
                    refund.UpdatedAt = DateTime.UtcNow;

                    // Update payment record
                    refund.PaymentRecord.Status = "Refunded";
                }
                else
                {
                    refund.Status = "Failed";
                    refund.ErrorMessage = result.ErrorMessage;
                    refund.UpdatedAt = DateTime.UtcNow;
                }

                await _adminContext.SaveChangesAsync();

                _logger.LogInformation("Refund {RefundId} processed with status: {Status}",
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

            // Check if refund already exists
            var existingRefund = await _adminContext.RefundRequests
                .AnyAsync(r => r.PaymentRecordId == paymentRecordId &&
                    (r.Status == "Pending" || r.Status == "Approved" || r.Status == "Processing" || r.Status == "Completed"));

            return !existingRefund;
        }
    }
}
