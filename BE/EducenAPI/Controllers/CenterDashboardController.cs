using Microsoft.AspNetCore.Mvc;
using EducenAPI.Services.Interface;

namespace EducenAPI.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class CenterDashboardController : ControllerBase
    {
        private readonly ICenterDashboardService _dashboardService;

        public CenterDashboardController(ICenterDashboardService dashboardService)
        {
            _dashboardService = dashboardService;
        }

        [HttpGet]
        public async Task<IActionResult> GetDashboard()
        {
            var result = await _dashboardService.GetDashboardAsync();
            return Ok(result);
        }

    }
}