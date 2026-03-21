using EducenAPI.Services.Interface;
using Microsoft.AspNetCore.Mvc;

namespace EducenAPI.Controllers
{
    [ApiController]
    [Route("api/admin/dashboard")]
    public class AdminDashboardController : ControllerBase
    {
        private readonly IAdminDashboardService _dashboardService;

        public AdminDashboardController(IAdminDashboardService dashboardService)
        {
            _dashboardService = dashboardService;
        }

        [HttpGet("overview")]
        public async Task<IActionResult> Overview()
        {
            return Ok(await _dashboardService.GetOverviewAsync());
        }

        [HttpGet("revenue")]
        public async Task<IActionResult> Revenue()
        {
            return Ok(await _dashboardService.GetRevenueAsync());
        }

        [HttpGet("tenants-by-plan")]
        public async Task<IActionResult> TenantsByPlan()
        {
            return Ok(await _dashboardService.GetTenantsByPlanAsync());
        }

        [HttpGet("top-centers")]
        public async Task<IActionResult> TopCenters()
        {
            return Ok(await _dashboardService.GetTopCentersAsync());
        }

        [HttpGet("expiring-subscriptions")]
        public async Task<IActionResult> ExpiringSubscriptions()
        {
            return Ok(await _dashboardService.GetExpiringSubscriptionsAsync());
        }
    }
}