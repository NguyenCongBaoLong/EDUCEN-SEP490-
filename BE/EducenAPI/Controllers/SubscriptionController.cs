using EducenAPI.DTOs.Subscription;
using EducenAPI.Persistence.Contexts;
using EducenAPI.Services.Interface;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace EducenAPI.Controllers
{
    [ApiController]
    [Route("api/admin/tenants")]
    [Authorize(Roles = "SystemAdmin")]
    public class SubscriptionController : ControllerBase
    {
        private readonly ISubscriptionService _subscriptionService;
        private readonly AdminDbContext _adminDbContext;
        private readonly ILogger<SubscriptionController> _logger;

        public SubscriptionController(
            ISubscriptionService subscriptionService, 
            AdminDbContext adminDbContext,
            ILogger<SubscriptionController> logger)
        {
            _subscriptionService = subscriptionService;
            _adminDbContext = adminDbContext;
            _logger = logger;
        }

        [HttpPost("subscribe")]
        public async Task<IActionResult> RegisterSubscription([FromBody] RegisterSubscriptionRequestDTO? request)
        {
            try
            {
                _logger.LogInformation("RegisterSubscription called with: {@Request}", request);
                
                if (request == null || string.IsNullOrEmpty(request.TenantId))
                {
                    return BadRequest(new { message = "TenantId là bắt buộc" });
                }
                
                var result = await _subscriptionService.RegisterSubscription(request);
                return Ok(result);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "RegisterSubscription error");
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpPost("{tenantId}/cancel")]
        public async Task<IActionResult> CancelSubscription(string tenantId)
        {
            var result = await _subscriptionService.CancelSubscription(tenantId);
            if (!result) return NotFound(new { message = "Không tìm thấy gói dịch vụ đang hoạt động để hủy." });
            return Ok(new { message = "Đã hủy gói dịch vụ thành công." });
        }

        [HttpPost("renew")]
        public async Task<IActionResult> RenewSubscription(RenewSubscriptionRequestDTO request)
        {
            try
            {
                var result = await _subscriptionService.RenewSubscription(request);

                return Ok(result);
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpPost("change-plan")]
        public async Task<IActionResult> ChangePlan(ChangePlanRequestDTO request)
        {
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

        [HttpGet("{tenantId}/subscription-history")]
        public async Task<IActionResult> GetSubscriptionHistory(string tenantId)
        {
            var payments = await _adminDbContext.PaymentRecords
                .Where(p => p.TenantId == tenantId && p.TransactionType == "Subscription")
                .OrderByDescending(p => p.PaymentDate)
                .Select(p => new
                {
                    paymentId = p.PaymentId,
                    amount = p.Amount,
                    status = p.Status,
                    paymentDate = p.PaymentDate,
                    paymentMethod = p.PaymentMethod,
                    description = p.Description,
                    subscriptionMonths = p.SubscriptionMonths
                })
                .ToListAsync();

            return Ok(payments);
        }
    }
}