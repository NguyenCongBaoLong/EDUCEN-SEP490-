using EducenAPI.Services.Interface;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace EducenAPI.Controllers
{
    [ApiController]
    [Route("api/revenue-reports")]
    [Authorize]
    public class RevenueReportsController : ControllerBase
    {
        private readonly IRevenueReportService _revenueService;
        private readonly ILogger<RevenueReportsController> _logger;

        public RevenueReportsController(IRevenueReportService revenueService, ILogger<RevenueReportsController> logger)
        {
            _revenueService = revenueService;
            _logger = logger;
        }

        /// <summary>
        /// Tổng quan doanh thu (Admin)
        /// </summary>
        [HttpGet("summary")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> GetRevenueSummary(
            [FromQuery] string tenantId,
            [FromQuery] DateTime fromDate,
            [FromQuery] DateTime toDate)
        {
            try
            {
                var summary = await _revenueService.GetRevenueSummaryAsync(tenantId, fromDate, toDate);
                return Ok(summary);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting revenue summary");
                return BadRequest(new { message = ex.Message });
            }
        }

        /// <summary>
        /// Doanh thu theo tháng (Admin)
        /// </summary>
        [HttpGet("by-month")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> GetRevenueByMonth(
            [FromQuery] string tenantId,
            [FromQuery] int year)
        {
            try
            {
                var data = await _revenueService.GetRevenueByMonthAsync(tenantId, year);
                return Ok(data);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting revenue by month");
                return BadRequest(new { message = ex.Message });
            }
        }

        /// <summary>
        /// Doanh thu theo lớp (Admin)
        /// </summary>
        [HttpGet("by-class")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> GetRevenueByClass(
            [FromQuery] string tenantId,
            [FromQuery] int month,
            [FromQuery] int year)
        {
            try
            {
                var data = await _revenueService.GetRevenueByClassAsync(tenantId, month, year);
                return Ok(data);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting revenue by class");
                return BadRequest(new { message = ex.Message });
            }
        }

        /// <summary>
        /// Danh sách công nợ chưa thu (Admin)
        /// </summary>
        [HttpGet("outstanding")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> GetOutstandingPayments([FromQuery] string tenantId)
        {
            try
            {
                var data = await _revenueService.GetOutstandingPaymentsAsync(tenantId);
                return Ok(data);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting outstanding payments");
                return BadRequest(new { message = ex.Message });
            }
        }

        /// <summary>
        /// Báo cáo tổng hợp hệ thống (System Admin)
        /// </summary>
        [HttpGet("system")]
        [Authorize(Roles = "SystemAdmin")]
        public async Task<IActionResult> GetSystemReport(
            [FromQuery] DateTime fromDate,
            [FromQuery] DateTime toDate)
        {
            try
            {
                var data = await _revenueService.GetSystemRevenueReportAsync(fromDate, toDate);
                return Ok(data);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting system revenue report");
                return BadRequest(new { message = ex.Message });
            }
        }

        /// <summary>
        /// Xuất báo cáo Excel (Admin)
        /// </summary>
        [HttpPost("export")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> ExportReport([FromBody] ExportReportRequest request)
        {
            try
            {
                var bytes = await _revenueService.ExportRevenueReportAsync(new RevenueExportRequest
                {
                    TenantId = request.TenantId,
                    FromDate = request.FromDate,
                    ToDate = request.ToDate,
                    ReportType = request.ReportType
                });

                return File(bytes, "text/csv", $"revenue_report_{DateTime.Now:yyyyMMdd}.csv");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error exporting report");
                return BadRequest(new { message = ex.Message });
            }
        }
    }

    public class ExportReportRequest
    {
        public string TenantId { get; set; } = string.Empty;
        public DateTime FromDate { get; set; }
        public DateTime ToDate { get; set; }
        public string ReportType { get; set; } = "Summary";
    }
}
