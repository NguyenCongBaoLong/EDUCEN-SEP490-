using EducenAPI.Services.Interface;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace EducenAPI.Controllers
{
    [ApiController]
    [Route("api/admin/reports")]
    public class AdminReportController : ControllerBase
    {
        private readonly IAdminReportService _reportService;
        private readonly ILogger<AdminReportController> _logger;

        public AdminReportController(IAdminReportService reportService, ILogger<AdminReportController> logger)
        {
            _reportService = reportService;
            _logger = logger;
        }

        [HttpGet("teacher-statistics")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> GetTeacherStatistics([FromQuery] int month, [FromQuery] int year)
        {
            try
            {
                if (month < 1 || month > 12 || year < 2000)
                    return BadRequest("Tháng hoặc năm không hợp lệ");

                var data = await _reportService.GetTeacherTeachingStatsAsync(month, year);
                return Ok(data);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Lỗi khi lấy thống kê giáo viên");
                return StatusCode(500, "Lỗi hệ thống khi tải báo cáo");
            }
        }

        [HttpGet("teacher-statistics/export")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> ExportTeacherStatistics([FromQuery] int month, [FromQuery] int year)
        {
            try
            {
                if (month < 1 || month > 12 || year < 2000)
                    return BadRequest("Tháng hoặc năm không hợp lệ");

                var bytes = await _reportService.ExportTeacherTeachingStatsToCsvAsync(month, year);
                var fileName = $"ThongKeDayHoc_{month}_{year}.csv";
                
                return File(bytes, "text/csv; charset=utf-8", fileName);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Lỗi khi xuất báo cáo giáo viên");
                return StatusCode(500, "Lỗi hệ thống khi xuất báo cáo");
            }
        }
    }
}
