using System.ComponentModel.DataAnnotations;
using EducenAPI.DTOs.Subscription;
using EducenAPI.Persistence.Contexts;
using EducenAPI.Services;
using EducenAPI.Services.Interface;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace EducenAPI.Controllers
{
    [ApiController]
    [Route("api/admin/subscription")]
    [Authorize(Roles = "Admin")]
    public class CenterSubscriptionController : ControllerBase
    {
        private readonly ISubscriptionService _subscriptionService;
        private readonly ICurrentTenantService _currentTenantService;
        private readonly AdminDbContext _adminDbContext;
        private readonly IRefundService _refundService;

        public CenterSubscriptionController(
            ISubscriptionService subscriptionService, 
            ICurrentTenantService currentTenantService,
            AdminDbContext adminDbContext,
            IRefundService refundService)
        {
            _subscriptionService = subscriptionService;
            _currentTenantService = currentTenantService;
            _adminDbContext = adminDbContext;
            _refundService = refundService;
        }

        private string GetTenantId()
        {
            var currentTenant = _currentTenantService.TenantId;
            var claimTenant = User.Claims.FirstOrDefault(c => c.Type == "TenantId")?.Value;
            
            Console.WriteLine($"[DEBUG] CurrentTenantService.TenantId: {currentTenant}");
            Console.WriteLine($"[DEBUG] User.Claims TenantId: {claimTenant}");
            Console.WriteLine($"[DEBUG] User.Identity.IsAuthenticated: {User.Identity.IsAuthenticated}");
            
            return currentTenant ?? claimTenant;
        }

        [HttpGet("current")]
        public async Task<IActionResult> GetCurrentSubscription()
        {
            var tenantId = GetTenantId();

            if (string.IsNullOrWhiteSpace(tenantId))
                return BadRequest(new { message = "Không xác định được trung tâm." });

            var subscription = await _subscriptionService.GetActiveSubscriptionAsync(tenantId);

            return Ok(subscription);
        }

        /// <summary>
        /// Đổi gói dịch vụ (upgrade/downgrade)
        /// </summary>
        [HttpPost("change-plan")]
        public async Task<IActionResult> ChangePlan([FromBody] ChangePlanRequestDTO request)
        {
            var tenantId = GetTenantId();

            if (string.IsNullOrWhiteSpace(tenantId))
                return BadRequest(new { message = "Không xác định được trung tâm." });

            request.TenantId = tenantId;

            try
            {
                var result = await _subscriptionService.ChangePlan(request);
                return Ok(result);
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        /// <summary>
        /// Lấy số dư credit của center hiện tại
        /// </summary>
        [HttpGet("credit-balance")]
        public async Task<IActionResult> GetCreditBalance()
        {
            var tenantId = GetTenantId();

            if (string.IsNullOrWhiteSpace(tenantId))
                return BadRequest(new { message = "Không xác định được trung tâm." });

            var tenant = await _adminDbContext.Tenants.FindAsync(tenantId);
            if (tenant == null)
                return NotFound(new { message = "Không tìm thấy trung tâm" });

            return Ok(new
            {
                tenantId = tenant.TenantId,
                tenantName = tenant.TenantName,
                creditBalance = tenant.CreditBalance,
                updatedAt = tenant.UpdatedAt
            });
        }

        /// <summary>
        /// Lấy lịch sử credit của center hiện tại
        /// </summary>
        [HttpGet("credit-ledger")]
        public async Task<IActionResult> GetCreditLedger([FromQuery] int page = 1, [FromQuery] int pageSize = 20)
        {
            var tenantId = GetTenantId();

            if (string.IsNullOrWhiteSpace(tenantId))
                return BadRequest(new { message = "Không xác định được trung tâm." });

            var ledger = await _adminDbContext.TenantCreditLedgers
                .Where(l => l.TenantId == tenantId)
                .OrderByDescending(l => l.CreatedAt)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync();

            return Ok(ledger);
        }

        /// <summary>
        /// Hủy gói dịch vụ - effective end of period (không refund)
        /// </summary>
        [HttpPost("cancel")]
        public async Task<IActionResult> CancelSubscription([FromBody] CancelSubscriptionRequest request)
        {
            var tenantId = GetTenantId();

            if (string.IsNullOrWhiteSpace(tenantId))
                return BadRequest(new { message = "Không xác định được trung tâm." });

            try
            {
                // immediate = false → hủy cuối kỳ, không refund
                // immediate = true → hủy ngay, tạo credit hoàn lại
                var result = await _subscriptionService.CancelSubscription(
                    tenantId, 
                    request.Immediate,
                    request.Immediate); // createCredit = immediate

                if (!result)
                    return BadRequest(new { message = "Không tìm thấy gói dịch vụ đang hoạt động." });

                return Ok(new
                {
                    message = request.Immediate 
                        ? "Đã hủy gói dịch vụ ngay lập tức. Credit đã được hoàn lại vào tài khoản."
                        : "Đã hủy gói dịch vụ. Sẽ hết hiệu lực khi hết kỳ thanh toán.",
                    cancelledAt = DateTime.UtcNow
                });
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        /// <summary>
        /// Tính toán số tiền hoàn lại khi hủy gói
        /// </summary>
        [HttpGet("estimate-refund")]
        public async Task<IActionResult> EstimateRefund()
        {
            var tenantId = GetTenantId();

            if (string.IsNullOrWhiteSpace(tenantId))
                return BadRequest(new { message = "Không xác định được trung tâm." });

            try
            {
                var subscription = await _subscriptionService.GetActiveSubscriptionAsync(tenantId);
                if (subscription == null)
                    return BadRequest(new { message = "Không tìm thấy gói dịch vụ đang hoạt động." });

                // Get the subscription entity to calculate refund
                var subEntity = await _adminDbContext.Subscriptions
                    .Include(s => s.Plan)
                    .FirstOrDefaultAsync(s => s.Id == subscription.SubscriptionId && s.TenantId == tenantId);

                if (subEntity == null)
                    return BadRequest(new { message = "Không tìm thấy gói dịch vụ." });

                var unusedCredit = _subscriptionService.CalculateUnusedCredit(subEntity);

                // Kiểm tra grace period
                var daysSinceStart = (DateTime.UtcNow - subEntity.StartDate).Days;
                const int GRACE_PERIOD_DAYS = 7;
                var withinGracePeriod = daysSinceStart <= GRACE_PERIOD_DAYS;

                return Ok(new
                {
                    subscriptionId = subscription.SubscriptionId,
                    planName = subscription.PlanName,
                    planPrice = subscription.PlanPrice,
                    startDate = subscription.StartDate,
                    endDate = subscription.EndDate,
                    daysRemaining = Math.Max(0, (subEntity.EndDate - DateTime.UtcNow).Days),
                    withinGracePeriod = withinGracePeriod,
                    gracePeriodDaysRemaining = Math.Max(0, GRACE_PERIOD_DAYS - daysSinceStart),
                    estimatedRefundAmount = unusedCredit,
                    canRequestRefund = withinGracePeriod,
                    message = withinGracePeriod 
                        ? $"Có thể hoàn tiền trong {GRACE_PERIOD_DAYS - daysSinceStart} ngày grace period còn lại."
                        : "Ngoài grace period - không thể yêu cầu hoàn tiền."
                });
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        /// <summary>
        /// Yêu cầu hủy gói và hoàn tiền (refund to credit)
        /// </summary>
        [HttpPost("request-cancel-refund")]
        public async Task<IActionResult> RequestCancelWithRefund([FromBody] RequestCancelRefundRequest request)
        {
            var tenantId = GetTenantId();

            if (string.IsNullOrWhiteSpace(tenantId))
                return BadRequest(new { message = "Không xác định được trung tâm." });

            try
            {
                var subscription = await _subscriptionService.GetActiveSubscriptionAsync(tenantId);
                if (subscription == null)
                    return BadRequest(new { message = "Không tìm thấy gói dịch vụ đang hoạt động." });

                // Get the subscription entity
                var subEntity = await _adminDbContext.Subscriptions
                    .Include(s => s.Plan)
                    .FirstOrDefaultAsync(s => s.Id == subscription.SubscriptionId && s.TenantId == tenantId);

                if (subEntity == null)
                    return BadRequest(new { message = "Không tìm thấy gói dịch vụ." });

                // Check grace period
                var daysSinceStart = (DateTime.UtcNow - subEntity.StartDate).Days;
                const int GRACE_PERIOD_DAYS = 7;

                if (daysSinceStart > GRACE_PERIOD_DAYS)
                    return BadRequest(new { message = "Chỉ được hoàn tiền trong 7 ngày grace period đầu tiên." });

                var unusedCredit = _subscriptionService.CalculateUnusedCredit(subEntity);
                if (unusedCredit <= 0)
                    return BadRequest(new { message = "Gói dịch vụ không còn giá trị hoàn lại." });

                // Find the payment record for this subscription
                var payment = await _adminDbContext.PaymentRecords
                    .Where(p => p.TenantId == tenantId 
                        && p.ReferenceId == subscription.SubscriptionId 
                        && p.Status == "Paid"
                        && p.TransactionType == "Subscription")
                    .OrderByDescending(p => p.PaymentDate)
                    .FirstOrDefaultAsync();

                if (payment == null)
                    return BadRequest(new { message = "Không tìm thấy giao dịch thanh toán." });

                // Check if refund already exists
                var existingRefund = await _adminDbContext.RefundRequests
                    .FirstOrDefaultAsync(r => r.PaymentRecordId == payment.PaymentId &&
                        (r.Status == "Pending" || r.Status == "Approved" || r.Status == "Processing" || r.Status == "Completed"));

                if (existingRefund != null)
                    return BadRequest(new { message = "Đã tồn tại yêu cầu hoàn tiền cho gói dịch vụ này." });

                // Create refund request (refund to credit only)
                var refundRequest = new EducenAPI.Services.Interface.CreateRefundRequest
                {
                    PaymentRecordId = payment.PaymentId,
                    TenantId = tenantId,
                    SubscriptionId = subscription.SubscriptionId,
                    RequestedBy = int.TryParse(User.FindFirst("UserId")?.Value, out var userId) ? userId : 0,
                    Reason = $"Hủy gói dịch vụ: {request.Reason}",
                    RefundAmount = unusedCredit,
                    RefundMethod = "Credit",
                    IsServiceIssue = false
                };

                var refund = await _refundService.CreateRefundRequestAsync(refundRequest);

                return Ok(new
                {
                    refundId = refund.RefundId,
                    message = "Yêu cầu hủy gói và hoàn tiền đã được gửi. Vui lòng chờ admin xử lý.",
                    estimatedRefundAmount = unusedCredit,
                    status = refund.Status
                });
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        /// <summary>
        /// Gia hạn/gói mở rộng (extend/renew với nhiều tháng hơn)
        /// </summary>
        [HttpPost("extend")]
        public async Task<IActionResult> ExtendSubscription([FromBody] ExtendSubscriptionRequest request)
        {
            var tenantId = GetTenantId();

            if (string.IsNullOrWhiteSpace(tenantId))
                return BadRequest(new { message = "Không xác định được trung tâm." });

            if (request.Months < 1 || request.Months > 120)
                return BadRequest(new { message = "Số tháng gia hạn phải từ 1 đến 120." });

            try
            {
                var subscription = await _subscriptionService.GetActiveSubscriptionAsync(tenantId);
                if (subscription == null)
                {
                    return BadRequest(new { message = "Không tìm thấy gói dịch vụ đang hoạt động. Vui lòng đăng ký gói mới." });
                }

                var subEntity = await _adminDbContext.Subscriptions
                    .Include(s => s.Plan)
                    .FirstOrDefaultAsync(s => s.Id == subscription.SubscriptionId && s.TenantId == tenantId);

                if (subEntity == null || subEntity.Plan == null)
                    return BadRequest(new { message = "Không tìm thấy gói dịch vụ." });

                var totalAmount = subEntity.Plan.Price * request.Months;
                var tenant = await _adminDbContext.Tenants.FindAsync(tenantId);
                var creditBalance = tenant?.CreditBalance ?? 0;
                var amountToCharge = Math.Max(0, totalAmount - creditBalance);

                return Ok(new
                {
                    subscriptionId = subscription.SubscriptionId,
                    planId = subEntity.PlanId,
                    planName = subEntity.Plan.PlanName,
                    planPrice = subEntity.Plan.Price,
                    currentEndDate = subscription.EndDate,
                    extendMonths = request.Months,
                    newEndDate = subEntity.EndDate.AddMonths(request.Months),
                    totalAmount = totalAmount,
                    creditBalance = creditBalance,
                    amountToCharge = amountToCharge,
                    requiresPayment = amountToCharge > 0,
                    message = amountToCharge > 0 
                        ? $"Cần thanh toán {amountToCharge} VNĐ để gia hạn {request.Months} tháng."
                        : $"Đủ credit để gia hạn {request.Months} tháng miễn phí."
                });
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        /// <summary>
        /// Xác nhận gia hạn và thanh toán (sau khi thanh toán VNPay thành công)
        /// </summary>
        [HttpPost("extend-confirm")]
        public async Task<IActionResult> ConfirmExtend([FromBody] ExtendConfirmRequest request)
        {
            var tenantId = GetTenantId();

            if (string.IsNullOrWhiteSpace(tenantId))
                return BadRequest(new { message = "Không xác định được trung tâm." });

            try
            {
                var subscription = await _subscriptionService.GetActiveSubscriptionAsync(tenantId);
                if (subscription == null)
                    return BadRequest(new { message = "Không tìm thấy gói dịch vụ đang hoạt động." });

                var subEntity = await _adminDbContext.Subscriptions
                    .Include(s => s.Plan)
                    .Include(s => s.Tenant)
                    .FirstOrDefaultAsync(s => s.Id == subscription.SubscriptionId && s.TenantId == tenantId);

                if (subEntity == null || subEntity.Plan == null)
                    return BadRequest(new { message = "Không tìm thấy gói dịch vụ." });

                var totalAmount = subEntity.Plan.Price * request.Months;
                var tenant = await _adminDbContext.Tenants.FindAsync(tenantId);
                var creditBalance = tenant?.CreditBalance ?? 0;
                var amountToCharge = Math.Max(0, totalAmount - creditBalance);

                if (amountToCharge > 0 && string.IsNullOrWhiteSpace(request.PaymentRecordId))
                    return BadRequest(new { message = "Thiếu thông tin thanh toán." });

                if (amountToCharge > 0 && !string.IsNullOrWhiteSpace(request.PaymentRecordId))
                {
                    var payment = await _adminDbContext.PaymentRecords.FindAsync(request.PaymentRecordId);
                    if (payment == null || payment.Status != "Paid")
                        return BadRequest(new { message = "Thanh toán chưa hoàn tất." });

                    var unusedCredit = _subscriptionService.CalculateUnusedCredit(subEntity);
                    if (unusedCredit > 0)
                    {
                        tenant.CreditBalance = Math.Max(0, creditBalance - amountToCharge);
                    }
                    else
                    {
                        tenant.CreditBalance = Math.Max(0, creditBalance - totalAmount);
                    }
                }
                else if (amountToCharge == 0)
                {
                    var unusedCredit = _subscriptionService.CalculateUnusedCredit(subEntity);
                    if (unusedCredit > 0)
                    {
                        var daysRemaining = (subEntity.EndDate - DateTime.UtcNow).Days;
                        if (daysRemaining > 0)
                        {
                            var dailyValue = subEntity.Plan.Price / 30;
                            var remainingValue = dailyValue * daysRemaining;
                            var newCredit = creditBalance - remainingValue;
                            tenant.CreditBalance = Math.Max(0, newCredit);
                        }
                        else
                        {
                            tenant.CreditBalance = 0;
                        }
                    }
                }

                subEntity.EndDate = subEntity.EndDate.AddMonths(request.Months);

                var paymentRecord = new Models.PaymentRecord
                {
                    TenantId = tenantId,
                    Amount = request.Months > 0 ? subEntity.Plan.Price * request.Months : 0,
                    Status = amountToCharge > 0 ? "Paid" : "Free",
                    PaymentDate = DateTime.UtcNow,
                    TransactionType = "SubscriptionExtend",
                    ReferenceId = subEntity.Id,
                    PaymentMethod = amountToCharge > 0 ? "VNPay" : "Credit",
                    SubscriptionMonths = request.Months
                };
                _adminDbContext.PaymentRecords.Add(paymentRecord);

                await _adminDbContext.SaveChangesAsync();

                return Ok(new
                {
                    success = true,
                    subscriptionId = subEntity.Id,
                    planName = subEntity.Plan.PlanName,
                    extendMonths = request.Months,
                    newEndDate = subEntity.EndDate,
                    message = "Gia hạn gói dịch vụ thành công!"
                });
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }
    }

    public class ExtendConfirmRequest
    {
        public int Months { get; set; }
        public string? PaymentRecordId { get; set; }
    }

    /// <summary>
    /// Request model cho hủy subscription
    /// </summary>
    public class CancelSubscriptionRequest
    {
        /// <summary>
        /// Hủy ngay lập tức (true) hay cuối kỳ (false)
        /// </summary>
        public bool Immediate { get; set; } = false;
    }

    /// <summary>
    /// Request model cho yêu cầu hủy + refund
    /// </summary>
    public class RequestCancelRefundRequest
    {
        /// <summary>
        /// Lý do hủy gói
        /// </summary>
        public string Reason { get; set; } = "Yêu cầu hủy gói dịch vụ";
    }

    /// <summary>
    /// Request model cho gia hạn/mở rộng gói
    /// </summary>
    public class ExtendSubscriptionRequest
    {
        /// <summary>
        /// Số tháng muốn gia hạn
        /// </summary>
        [Range(1, 120, ErrorMessage = "Số tháng phải từ 1 đến 120")]
        public int Months { get; set; }
    }
}
