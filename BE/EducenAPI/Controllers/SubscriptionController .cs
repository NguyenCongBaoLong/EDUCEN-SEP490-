using EducenAPI.DTOs.Subscription;
using EducenAPI.Services.Interface;
using Microsoft.AspNetCore.Mvc;

namespace EducenAPI.Controllers
{
    [ApiController]
    [Route("api/tenants")]
    public class SubscriptionController : ControllerBase
    {
        private readonly ISubscriptionService _subscriptionService;

        public SubscriptionController(ISubscriptionService subscriptionService)
        {
            _subscriptionService = subscriptionService;
        }

        [HttpPost("subscribe")]
        public async Task<IActionResult> RegisterSubscription(RegisterSubscriptionRequestDTO request)
        {
            var result = await _subscriptionService.RegisterSubscription(request);
            return Ok(result);
        }

        [HttpPost("{tenantId}/cancel")]
        public async Task<IActionResult> CancelSubscription(string tenantId)
        {
            var result = await _subscriptionService.CancelSubscription(tenantId);
            if (!result) return NotFound(new { message = "Không tìm thấy gói dịch vụ đang hoạt động để hủy." });
            return Ok(new { message = "Đã hủy gói dịch vụ thành công." });
        }
    }
}