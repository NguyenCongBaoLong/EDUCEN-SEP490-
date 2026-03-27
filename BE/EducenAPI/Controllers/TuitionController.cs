using EducenAPI.Services.Interface;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace EducenAPI.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class TuitionController : ControllerBase
    {
        private readonly ITuitionService _tuitionService;
        private readonly IInvoiceService _invoiceService;
        private readonly ILogger<TuitionController> _logger;

        public TuitionController(
            ITuitionService tuitionService,
            IInvoiceService invoiceService,
            ILogger<TuitionController> logger)
        {
            _tuitionService = tuitionService;
            _invoiceService = invoiceService;
            _logger = logger;
        }

        #region Admin Endpoints

        /// <summary>
        /// Tính toán học phí cho một học sinh
        /// </summary>
        [HttpPost("calculate")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> CalculateTuition([FromBody] CalculateTuitionRequest request)
        {
            try
            {
                var result = await _tuitionService.CalculateTuitionAsync(
                    request.StudentId, request.ClassId, request.Month, request.Year);
                return Ok(result);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error calculating tuition");
                return BadRequest(new { message = ex.Message });
            }
        }

        /// <summary>
        /// Tính toán học phí cho cả lớp
        /// </summary>
        [HttpPost("calculate-class")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> CalculateClassTuition([FromBody] CalculateClassTuitionRequest request)
        {
            try
            {
                var results = await _tuitionService.CalculateClassTuitionAsync(
                    request.ClassId, request.Month, request.Year);
                return Ok(results);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error calculating class tuition");
                return BadRequest(new { message = ex.Message });
            }
        }

        /// <summary>
        /// Tạo hóa đơn học phí cho một học sinh
        /// </summary>
        [HttpPost("invoices")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> CreateInvoice([FromBody] CreateInvoiceApiRequest request)
        {
            try
            {
                var invoice = await _invoiceService.CreateInvoiceAsync(new CreateInvoiceRequest
                {
                    TenantId = request.TenantId,
                    StudentId = request.StudentId,
                    ClassId = request.ClassId,
                    Month = request.Month,
                    Year = request.Year,
                    DiscountAmount = request.DiscountAmount,
                    Notes = request.Notes,
                    CreatedBy = User.Identity?.Name ?? "System"
                });

                return Ok(invoice);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error creating invoice");
                return BadRequest(new { message = ex.Message });
            }
        }

        /// <summary>
        /// Tạo hóa đơn hàng loạt cho cả lớp
        /// </summary>
        [HttpPost("invoices/batch")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> CreateBatchInvoices([FromBody] CreateBatchInvoicesRequest request)
        {
            try
            {
                var result = await _invoiceService.CreateBatchInvoicesAsync(new BatchInvoiceRequest
                {
                    TenantId = request.TenantId,
                    ClassId = request.ClassId,
                    Month = request.Month,
                    Year = request.Year,
                    CreatedBy = User.Identity?.Name ?? "System"
                });

                return Ok(result);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error creating batch invoices");
                return BadRequest(new { message = ex.Message });
            }
        }

        /// <summary>
        /// Lấy danh sách hóa đơn theo filter
        /// </summary>
        [HttpGet("invoices")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> GetInvoices([FromQuery] InvoiceFilterApiRequest filter)
        {
            try
            {
                var invoices = await _invoiceService.GetInvoicesAsync(new InvoiceFilterRequest
                {
                    TenantId = filter.TenantId,
                    StudentId = filter.StudentId,
                    ClassId = filter.ClassId,
                    Month = filter.Month,
                    Year = filter.Year,
                    Status = filter.Status,
                    FromDate = filter.FromDate,
                    ToDate = filter.ToDate,
                    IsOverdue = filter.IsOverdue
                });

                return Ok(invoices);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting invoices");
                return BadRequest(new { message = ex.Message });
            }
        }

        /// <summary>
        /// Lấy chi tiết hóa đơn
        /// </summary>
        [HttpGet("invoices/{invoiceId}")]
        [Authorize(Roles = "Admin,Student,Parent")]
        public async Task<IActionResult> GetInvoice(string invoiceId)
        {
            try
            {
                var invoice = await _invoiceService.GetInvoiceAsync(invoiceId);
                if (invoice == null)
                    return NotFound(new { message = "Invoice not found" });

                return Ok(invoice);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting invoice");
                return BadRequest(new { message = ex.Message });
            }
        }

        /// <summary>
        /// Gửi hóa đơn cho học sinh/phụ huynh
        /// </summary>
        [HttpPost("invoices/{invoiceId}/send")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> SendInvoice(string invoiceId)
        {
            try
            {
                var success = await _invoiceService.SendInvoiceAsync(invoiceId);
                if (!success)
                    return BadRequest(new { message = "Failed to send invoice" });

                return Ok(new { message = "Invoice sent successfully" });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error sending invoice");
                return BadRequest(new { message = ex.Message });
            }
        }

        /// <summary>
        /// Hủy hóa đơn
        /// </summary>
        [HttpPost("invoices/{invoiceId}/cancel")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> CancelInvoice(string invoiceId, [FromBody] CancelInvoiceRequest request)
        {
            try
            {
                var success = await _invoiceService.CancelInvoiceAsync(invoiceId, request.Reason);
                if (!success)
                    return BadRequest(new { message = "Failed to cancel invoice" });

                return Ok(new { message = "Invoice cancelled successfully" });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error cancelling invoice");
                return BadRequest(new { message = ex.Message });
            }
        }

        #endregion

        #region Student/Parent Endpoints

        /// <summary>
        /// Lấy danh sách hóa đơn của học sinh hiện tại
        /// </summary>
        [HttpGet("my-invoices")]
        [Authorize(Roles = "Student,Parent")]
        public async Task<IActionResult> GetMyInvoices([FromQuery] string tenantId)
        {
            try
            {
                // TODO: Get current user ID from claims
                var userId = GetCurrentUserId();

                // TODO: Get student ID from user
                var studentId = await GetStudentIdFromUserAsync(userId);

                var invoices = await _tuitionService.GetStudentPaymentHistoryAsync(studentId);
                return Ok(invoices);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting my invoices");
                return BadRequest(new { message = ex.Message });
            }
        }

        /// <summary>
        /// Lấy danh sách hóa đơn chưa thanh toán
        /// </summary>
        [HttpGet("outstanding")]
        [Authorize(Roles = "Student,Parent")]
        public async Task<IActionResult> GetOutstandingInvoices([FromQuery] string tenantId)
        {
            try
            {
                var userId = GetCurrentUserId();
                var studentId = await GetStudentIdFromUserAsync(userId);

                var invoices = await _tuitionService.GetOutstandingInvoicesAsync(studentId);
                return Ok(invoices);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting outstanding invoices");
                return BadRequest(new { message = ex.Message });
            }
        }

        #endregion

        private int GetCurrentUserId()
        {
            var userIdClaim = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(userIdClaim) || !int.TryParse(userIdClaim, out var userId))
                throw new Exception("Invalid user ID");
            return userId;
        }

        private async Task<int> GetStudentIdFromUserAsync(int userId)
        {
            // TODO: Implement logic to get student ID from user ID
            // This should be implemented based on your user-student mapping
            return userId; // Placeholder
        }
    }

    #region Request Models

    public class CalculateTuitionRequest
    {
        public int StudentId { get; set; }
        public int ClassId { get; set; }
        public int Month { get; set; }
        public int Year { get; set; }
    }

    public class CalculateClassTuitionRequest
    {
        public int ClassId { get; set; }
        public int Month { get; set; }
        public int Year { get; set; }
    }

    public class CreateInvoiceApiRequest
    {
        public string TenantId { get; set; } = string.Empty;
        public int StudentId { get; set; }
        public int ClassId { get; set; }
        public int Month { get; set; }
        public int Year { get; set; }
        public decimal? DiscountAmount { get; set; }
        public string? Notes { get; set; }
    }

    public class CreateBatchInvoicesRequest
    {
        public string TenantId { get; set; } = string.Empty;
        public int ClassId { get; set; }
        public int Month { get; set; }
        public int Year { get; set; }
    }

    public class InvoiceFilterApiRequest
    {
        public string? TenantId { get; set; }
        public int? StudentId { get; set; }
        public int? ClassId { get; set; }
        public int? Month { get; set; }
        public int? Year { get; set; }
        public string? Status { get; set; }
        public DateTime? FromDate { get; set; }
        public DateTime? ToDate { get; set; }
        public bool? IsOverdue { get; set; }
    }

    public class CancelInvoiceRequest
    {
        public string Reason { get; set; } = string.Empty;
    }

    #endregion
}
