using EducenAPI.Services.Interface;
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
        public async Task<IActionResult> GetClassReport(int classId)
        {
            var data = await _reportService.GetReportByClassAsync(classId);
            if (data == null) return NotFound();

            return Ok(data);
        }
    }
}