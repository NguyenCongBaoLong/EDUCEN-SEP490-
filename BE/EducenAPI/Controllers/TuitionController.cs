using EducenAPI.Persistence.Contexts;
using EducenAPI.Services.Interface;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace EducenAPI.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class TuitionController : ControllerBase
    {
        private readonly ITuitionService _tuitionService;
        private readonly IInvoiceService _invoiceService;
        private readonly IInvoiceLockService _invoiceLockService;
        private readonly EducenV2Context _tenantContext;
        private readonly ILogger<TuitionController> _logger;

        public TuitionController(
            ITuitionService tuitionService,
            IInvoiceService invoiceService,
            IInvoiceLockService invoiceLockService,
            EducenV2Context tenantContext,
            ILogger<TuitionController> logger)
        {
            _tuitionService = tuitionService;
            _invoiceService = invoiceService;
            _invoiceLockService = invoiceLockService;
            _tenantContext = tenantContext;
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
                if (_invoiceLockService.IsEditingLocked(request.Month, request.Year))
                {
                    var lockInfo = await _invoiceLockService.GetLockInfoAsync(request.Month, request.Year);
                    return BadRequest(new { 
                        message = $"Đã hết thời gian chỉnh sửa hóa đơn tháng {request.Month}/{request.Year}. Vui lòng chỉnh sửa trước ngày {lockInfo?.UnlockDate:dd/MM/yyyy}.",
                        lockInfo = lockInfo
                    });
                }

                var invoice = await _invoiceService.CreateInvoiceAsync(new CreateInvoiceRequest
                {
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
                if (_invoiceLockService.IsEditingLocked(request.Month, request.Year))
                {
                    var lockInfo = await _invoiceLockService.GetLockInfoAsync(request.Month, request.Year);
                    return BadRequest(new { 
                        message = $"Đã hết thời gian chỉnh sửa hóa đơn tháng {request.Month}/{request.Year}. Vui lòng chỉnh sửa trước ngày {lockInfo?.UnlockDate:dd/MM/yyyy}.",
                        lockInfo = lockInfo
                    });
                }

                // Log để debug validation
                _logger.LogInformation("CreateBatchInvoices called: ClassId={ClassId}, Month={Month}, Year={Year}",
                    request?.ClassId, request?.Month, request?.Year);

                if (request == null)
                    return BadRequest(new { message = "Dữ liệu yêu cầu trống." });

                if (request.ClassId <= 0)
                    return BadRequest(new { message = "Vui lòng chọn lớp học" });

                var result = await _invoiceService.CreateBatchInvoicesAsync(new BatchInvoiceRequest
                {
                    ClassId = request.ClassId,
                    Month = request.Month,
                    Year = request.Year,
                    CreatedBy = User.Identity?.Name ?? "System",
                    StudentIds = request.StudentIds
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
                    StudentId = NormalizePositiveInt(filter.StudentId),
                    ClassId = NormalizePositiveInt(filter.ClassId),
                    Month = NormalizePositiveInt(filter.Month),
                    Year = NormalizePositiveInt(filter.Year),
                    Status = NormalizeString(filter.Status),
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
                    return NotFound(new { message = "Không tìm thấy hóa đơn." });

                // Không cho Student/Parent xem hoá đơn nháp
                var userRole = User.FindFirst(System.Security.Claims.ClaimTypes.Role)?.Value;
                if (userRole != "Admin" && invoice.Status == "Draft")
                    return NotFound(new { message = "Không tìm thấy hóa đơn." });

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
                    return BadRequest(new { message = "Gửi hóa đơn thất bại." });

                return Ok(new { message = "Đã gửi hóa đơn thành công." });
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
                var invoice = await _invoiceService.GetInvoiceAsync(invoiceId);
                if (invoice != null && _invoiceLockService.IsEditingLocked(invoice.InvoiceMonth, invoice.InvoiceYear))
                {
                    var lockInfo = await _invoiceLockService.GetLockInfoAsync(invoice.InvoiceMonth, invoice.InvoiceYear);
                    return BadRequest(new { 
                        message = $"Đã hết thời gian chỉnh sửa hóa đơn tháng {invoice.InvoiceMonth}/{invoice.InvoiceYear}. Vui lòng chỉnh sửa trước ngày {lockInfo?.UnlockDate:dd/MM/yyyy}.",
                        lockInfo = lockInfo
                    });
                }

                var success = await _invoiceService.CancelInvoiceAsync(invoiceId, request.Reason);
                if (!success)
                    return BadRequest(new { message = "Hủy hóa đơn thất bại." });

                return Ok(new { message = "Đã hủy hóa đơn thành công." });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error cancelling invoice");
                return BadRequest(new { message = ex.Message });
            }
        }

        /// <summary>
        /// Admin thu tiền học phí mặt
        /// </summary>
        [HttpPost("invoices/{invoiceId}/mark-as-paid")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> MarkInvoiceAsPaid(string invoiceId, [FromBody] MarkAsPaidRequest request)
        {
            try
            {
                var success = await _invoiceService.MarkInvoiceAsPaidAsync(invoiceId, request.PaymentMethod, request.Notes);
                if (!success)
                    return BadRequest(new { message = "Xác nhận đã thanh toán thất bại." });

                return Ok(new { message = "Đã xác nhận thanh toán thành công." });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error marking invoice as paid");
                return BadRequest(new { message = ex.Message });
            }
        }

        /// <summary>
        /// Cập nhật tự động các hóa đơn quá hạn
        /// Endpoint này có thể được gọi bởi scheduled job hoặc manual trigger
        /// </summary>
        [HttpPost("update-overdue")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> UpdateOverdueInvoices()
        {
            try
            {
                var updatedCount = await _invoiceService.UpdateOverdueInvoicesAsync();
                return Ok(new { 
                    message = "Cập nhật hóa đơn quá hạn thành công",
                    updatedCount = updatedCount,
                    timestamp = DateTime.UtcNow
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error updating overdue invoices");
                return BadRequest(new { message = ex.Message });
            }
        }

        /// <summary>
        /// Khóa chỉnh sửa hóa đơn tháng (thủ công)
        /// </summary>
        [HttpPost("lock")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> LockMonth([FromBody] LockMonthRequest request)
        {
            try
            {
                var success = await _invoiceLockService.LockMonthAsync(request.Month, request.Year, User.Identity?.Name ?? "Admin");
                if (!success)
                    return BadRequest(new { message = "Khóa tháng thất bại." });

                return Ok(new { message = $"Đã khóa chỉnh sửa hóa đơn tháng {request.Month}/{request.Year}." });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error locking month");
                return BadRequest(new { message = ex.Message });
            }
        }

        /// <summary>
        /// Mở khóa chỉnh sửa hóa đơn tháng
        /// </summary>
        [HttpPost("unlock")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> UnlockMonth([FromBody] LockMonthRequest request)
        {
            try
            {
                var success = await _invoiceLockService.UnlockMonthAsync(request.Month, request.Year);
                if (!success)
                    return BadRequest(new { message = "Mở khóa thất bại." });

                return Ok(new { message = $"Đã mở khóa chỉnh sửa hóa đơn tháng {request.Month}/{request.Year}." });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error unlocking month");
                return BadRequest(new { message = ex.Message });
            }
        }

        /// <summary>
        /// Lấy thông tin khóa của tháng
        /// </summary>
        [HttpGet("lock/{month}/{year}")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> GetLockInfo(int month, int year)
        {
            try
            {
                var lockInfo = await _invoiceLockService.GetLockInfoAsync(month, year);
                return Ok(lockInfo);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting lock info");
                return BadRequest(new { message = ex.Message });
            }
        }

        #endregion

        #region Student/Parent Endpoints

        /// <summary>
        /// Lấy danh sách hóa đơn của học sinh hiện tại
        /// (Parent: trả về hóa đơn của TẤT CẢ con)
        /// </summary>
        [HttpGet("my-invoices")]
        [Authorize(Roles = "Student,Parent")]
        public async Task<IActionResult> GetMyInvoices()
        {
            try
            {
                var userId = GetCurrentUserId();
                var studentIds = await GetStudentIdsFromUserAsync(userId);

                var allInvoices = new List<EducenAPI.Models.TuitionInvoice>();
                foreach (var studentId in studentIds)
                {
                    var invoices = await _tuitionService.GetStudentPaymentHistoryAsync(studentId);
                    allInvoices.AddRange(invoices);
                }

                return Ok(allInvoices.OrderByDescending(i => i.CreatedAt));
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting my invoices");
                return BadRequest(new { message = ex.Message });
            }
        }

        /// <summary>
        /// Lấy danh sách hóa đơn chưa thanh toán
        /// (Parent: trả về hóa đơn của TẤT CẢ con)
        /// </summary>
        [HttpGet("outstanding")]
        [Authorize(Roles = "Student,Parent")]
        public async Task<IActionResult> GetOutstandingInvoices()
        {
            try
            {
                var userId = GetCurrentUserId();
                var studentIds = await GetStudentIdsFromUserAsync(userId);

                var allInvoices = new List<EducenAPI.Models.TuitionInvoice>();
                foreach (var studentId in studentIds)
                {
                    var invoices = await _tuitionService.GetOutstandingInvoicesAsync(studentId);
                    allInvoices.AddRange(invoices);
                }

                return Ok(allInvoices.OrderBy(i => i.DueDate));
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
                throw new Exception("ID người dùng không hợp lệ.");
            return userId;
        }

        private static int? NormalizePositiveInt(int? value)
        {
            if (!value.HasValue || value.Value <= 0)
                return null;
            return value.Value;
        }

        private static string? NormalizeString(string? value)
        {
            if (string.IsNullOrWhiteSpace(value))
                return null;
            return value.Trim();
        }

        /// <summary>
        /// Lấy danh sách StudentId từ UserId trong JWT claims.
        /// - Student: UserId chính là StudentId
        /// - Parent: Query bảng ParentStudent để tìm TẤT CẢ học sinh
        /// </summary>
        private async Task<List<int>> GetStudentIdsFromUserAsync(int userId)
        {
            var role = User.FindFirst(System.Security.Claims.ClaimTypes.Role)?.Value;

            if (role == "Student")
            {
                var studentExists = await _tenantContext.Students
                    .AnyAsync(s => s.UserId == userId);

                if (!studentExists)
                    throw new Exception($"Không tìm thấy học sinh cho mã người dùng {userId}");

                return new List<int> { userId };
            }

            if (role == "Parent")
            {
                var studentIds = await _tenantContext.Set<Dictionary<string, object>>("ParentStudent")
                    .Where(ps => EF.Property<int>(ps, "ParentsUserId") == userId)
                    .Select(ps => EF.Property<int>(ps, "StudentsUserId"))
                    .ToListAsync();

                if (!studentIds.Any())
                    throw new Exception("Không tìm thấy học sinh nào cho tài khoản phụ huynh này.");

                return studentIds;
            }

            throw new Exception($"Vai trò '{role}' không được hỗ trợ để tra cứu học phí.");
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
        public int StudentId { get; set; }
        public int ClassId { get; set; }
        public int Month { get; set; }
        public int Year { get; set; }
        public decimal? DiscountAmount { get; set; }
        public string? Notes { get; set; }
    }

    public class CreateBatchInvoicesRequest
    {
        public int ClassId { get; set; }
        public int Month { get; set; }
        public int Year { get; set; }
        public List<int>? StudentIds { get; set; }
    }

    public class InvoiceFilterApiRequest
    {
        public int? StudentId { get; set; }
        public int? ClassId { get; set; }
        public int? Month { get; set; }
        public int? Year { get; set; }
        public string? Status { get; set; }
        public DateTime? FromDate { get; set; }
        public DateTime? ToDate { get; set; }
        public bool? IsOverdue { get; set; }
    }

    public class MarkAsPaidRequest
    {
        public string PaymentMethod { get; set; } = "Cash";
        public string? Notes { get; set; }
    }

    public class CancelInvoiceRequest
    {
        public string Reason { get; set; } = string.Empty;
    }

    public class LockMonthRequest
    {
        public int Month { get; set; }
        public int Year { get; set; }
    }

    #endregion
}
