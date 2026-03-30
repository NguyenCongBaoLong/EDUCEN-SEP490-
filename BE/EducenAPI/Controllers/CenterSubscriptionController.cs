using EducenAPI.Services;
using EducenAPI.Services.Interface;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace EducenAPI.Controllers
{
    [ApiController]
    [Route("api/admin/subscription")]
    [Authorize(Roles = "Admin")]
    public class CenterSubscriptionController : ControllerBase
    {
        private readonly ISubscriptionService _subscriptionService;
        private readonly ICurrentTenantService _currentTenantService;

        public CenterSubscriptionController(ISubscriptionService subscriptionService, ICurrentTenantService currentTenantService)
        {
            _subscriptionService = subscriptionService;
            _currentTenantService = currentTenantService;
        }

        [HttpGet("current")]
        public async Task<IActionResult> GetCurrentSubscription()
        {
            var tenantId = _currentTenantService.TenantId
                ?? User.Claims.FirstOrDefault(c => c.Type == "TenantId")?.Value;

            if (string.IsNullOrWhiteSpace(tenantId))
                return BadRequest(new { message = "Tenant not resolved." });

            var subscription = await _subscriptionService.GetActiveSubscriptionAsync(tenantId);

            return Ok(subscription);
        }
    }
}
