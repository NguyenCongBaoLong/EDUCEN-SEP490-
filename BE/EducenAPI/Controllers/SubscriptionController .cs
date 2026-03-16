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
    }
}