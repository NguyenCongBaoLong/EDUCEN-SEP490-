using EducenAPI.Services.Interface;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace EducenAPI.Controllers
{
    [ApiController]
    [Route("api/teacher/report")]
    public class TeacherReportController : ControllerBase
    {
        private readonly ITeacherReportService _reportService;

        public TeacherReportController(ITeacherReportService reportService)
        {
            _reportService = reportService;
        }

        [HttpGet("{classId}")]
        [Authorize(Roles = "Teacher,Assistant")]
        public async Task<IActionResult> GetClassReport(int classId)
        {
            var data = await _reportService.GetReportByClassAsync(classId);
            if (data == null) return NotFound();

            return Ok(data);
        }

        [HttpGet("overall")]
        [Authorize(Roles = "Teacher,Assistant")]
        public async Task<IActionResult> GetOverallReport()
        {
            var userIdClaim = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(userIdClaim)) return Unauthorized();

            var data = await _reportService.GetTeacherOverallReportAsync(int.Parse(userIdClaim));
            return Ok(data);
        }
    }
}