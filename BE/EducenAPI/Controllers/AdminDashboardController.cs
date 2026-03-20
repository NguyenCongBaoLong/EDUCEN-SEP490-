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
        public IActionResult Overview()
        {
            return Ok(_dashboardService.GetOverview());
        }

        [HttpGet("revenue")]
        public IActionResult Revenue()
        {
            return Ok(_dashboardService.GetRevenue());
        }

        [HttpGet("tenants-by-plan")]
        public IActionResult TenantsByPlan()
        {
            return Ok(_dashboardService.GetTenantsByPlan());
        }

        [HttpGet("top-centers")]
        public IActionResult TopCenters()
        {
            return Ok(_dashboardService.GetTopCenters());
        }

        [HttpGet("expiring-subscriptions")]
        public IActionResult ExpiringSubscriptions()
        {
            return Ok(_dashboardService.GetExpiringSubscriptions());
        }
    }
}