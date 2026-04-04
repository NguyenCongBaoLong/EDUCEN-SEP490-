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

        public CenterSubscriptionController(
            ISubscriptionService subscriptionService, 
            ICurrentTenantService currentTenantService,
            AdminDbContext adminDbContext)
        {
            _subscriptionService = subscriptionService;
            _currentTenantService = currentTenantService;
            _adminDbContext = adminDbContext;
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
}
