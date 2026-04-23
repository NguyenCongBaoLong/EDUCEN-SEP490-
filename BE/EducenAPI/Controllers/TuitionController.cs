using EducenAPI.Persistence.Contexts;
using EducenAPI.Services.Interface;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Text;

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
        private readonly IEInvoiceSandboxService _eInvoiceSandboxService;
        private readonly EducenV2Context _tenantContext;
        private readonly AdminDbContext _adminContext;
        private readonly ILogger<TuitionController> _logger;

        public TuitionController(
            ITuitionService tuitionService,
            IInvoiceService invoiceService,
            IInvoiceLockService invoiceLockService,
            IEInvoiceSandboxService eInvoiceSandboxService,
            EducenV2Context tenantContext,
            AdminDbContext adminContext,
            ILogger<TuitionController> logger)
        {
            _tuitionService = tuitionService;
            _invoiceService = invoiceService;
            _invoiceLockService = invoiceLockService;
            _eInvoiceSandboxService = eInvoiceSandboxService;
            _tenantContext = tenantContext;
            _adminContext = adminContext;
            _logger = logger;
        }

        #region Admin Endpoints

        /// <summary>
        /// T?nh to?n h?c ph? cho m?t h?c sinh
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
        /// T?nh to?n h?c ph? cho c? l?p
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
        /// T?o h?a don h?c ph? cho m?t h?c sinh
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
                        message = $"?? h?t th?i gian ch?nh s?a h?a don th?ng {request.Month}/{request.Year}. Vui l?ng ch?nh s?a tru?c ng?y {lockInfo?.UnlockDate:dd/MM/yyyy}.",
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
        /// T?o h?a don h?ng lo?t cho c? l?p
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
                        message = $"?? h?t th?i gian ch?nh s?a h?a don th?ng {request.Month}/{request.Year}. Vui l?ng ch?nh s?a tru?c ng?y {lockInfo?.UnlockDate:dd/MM/yyyy}.",
                        lockInfo = lockInfo
                    });
                }

                // Log d? debug validation
                _logger.LogInformation("CreateBatchInvoices called: ClassId={ClassId}, Month={Month}, Year={Year}",
                    request?.ClassId, request?.Month, request?.Year);

                if (request == null)
                    return BadRequest(new { message = "D? li?u y?u c?u tr?ng." });

                if (request.ClassId <= 0)
                    return BadRequest(new { message = "Vui l?ng ch?n l?p h?c" });

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
        /// L?y danh s?ch h?a don theo filter
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
        /// L?y chi ti?t h?a don
        /// </summary>
        [HttpGet("invoices/{invoiceId}")]
        [Authorize(Roles = "Admin,Student,Parent")]
        public async Task<IActionResult> GetInvoice(string invoiceId)
        {
            try
            {
                var invoice = await _invoiceService.GetInvoiceAsync(invoiceId);
                if (invoice == null)
                    return NotFound(new { message = "Kh?ng t?m th?y h?a don." });

                // Kh?ng cho Student/Parent xem ho? don nh?p
                var userRole = User.FindFirst(System.Security.Claims.ClaimTypes.Role)?.Value;
                if (userRole != "Admin" && invoice.Status == "Draft")
                    return NotFound(new { message = "Kh?ng t?m th?y h?a don." });

                return Ok(invoice);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting invoice");
                return BadRequest(new { message = ex.Message });
            }
        }

        /// <summary>
        /// G?i h?a don cho h?c sinh/ph? huynh
        /// </summary>
        [HttpPost("invoices/{invoiceId}/send")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> SendInvoice(string invoiceId)
        {
            try
            {
                var success = await _invoiceService.SendInvoiceAsync(invoiceId);
                if (!success)
                    return BadRequest(new { message = "G?i h?a don th?t b?i." });

                return Ok(new { message = "?? g?i h?a don th?nh c?ng." });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error sending invoice");
                return BadRequest(new { message = ex.Message });
            }
        }

        /// <summary>
        /// H?y h?a don
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
                        message = $"?? h?t th?i gian ch?nh s?a h?a don th?ng {invoice.InvoiceMonth}/{invoice.InvoiceYear}. Vui l?ng ch?nh s?a tru?c ng?y {lockInfo?.UnlockDate:dd/MM/yyyy}.",
                        lockInfo = lockInfo
                    });
                }

                var success = await _invoiceService.CancelInvoiceAsync(invoiceId, request.Reason);
                if (!success)
                    return BadRequest(new { message = "H?y h?a don th?t b?i." });

                return Ok(new { message = "?? h?y h?a don th?nh c?ng." });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error cancelling invoice");
                return BadRequest(new { message = ex.Message });
            }
        }

        /// <summary>
        /// Admin thu ti?n h?c ph? m?t
        /// </summary>
        [HttpPost("invoices/{invoiceId}/mark-as-paid")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> MarkInvoiceAsPaid(string invoiceId, [FromBody] MarkAsPaidRequest request)
        {
            try
            {
                var success = await _invoiceService.MarkInvoiceAsPaidAsync(invoiceId, request.PaymentMethod, request.Notes);
                if (!success)
                    return BadRequest(new { message = "X?c nh?n d? thanh to?n th?t b?i." });

                return Ok(new { message = "?? x?c nh?n thanh to?n th?nh c?ng." });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error marking invoice as paid");
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpPost("invoices/{invoiceId}/einvoice/issue")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> IssueSandboxEInvoice(string invoiceId)
        {
            try
            {
                var invoice = await _invoiceService.GetInvoiceAsync(invoiceId);
                if (invoice == null)
                    return NotFound(new { message = "Kh?ng t?m th?y h?a don." });

                if (!string.Equals(invoice.Status, "Paid", StringComparison.OrdinalIgnoreCase))
                    return BadRequest(new { message = "Ch? ph?t h?nh H??T cho h?a don d? thanh to?n." });

                var tenantName = ResolveTenantName();
                var metadata = _eInvoiceSandboxService.BuildMetadata(invoice, tenantName);

                return Ok(new
                {
                    invoiceId = invoice.InvoiceId,
                    invoiceNo = metadata.InvoiceNo,
                    lookupCode = metadata.LookupCode,
                    issuedAt = metadata.IssuedAt
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error issuing sandbox e-invoice for {InvoiceId}", invoiceId);
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpGet("invoices/{invoiceId}/einvoice/xml")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> DownloadSandboxEInvoiceXml(string invoiceId)
        {
            try
            {
                var invoice = await _invoiceService.GetInvoiceAsync(invoiceId);
                if (invoice == null)
                    return NotFound(new { message = "Kh?ng t?m th?y h?a don." });

                if (!string.Equals(invoice.Status, "Paid", StringComparison.OrdinalIgnoreCase))
                    return BadRequest(new { message = "H?a don chua thanh to?n." });

                var tenantName = ResolveTenantName();
                var metadata = _eInvoiceSandboxService.BuildMetadata(invoice, tenantName);
                var xml = _eInvoiceSandboxService.BuildXml(invoice, tenantName, metadata);
                return File(Encoding.UTF8.GetBytes(xml), "application/xml", $"{metadata.InvoiceNo}.xml");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error downloading sandbox xml for {InvoiceId}", invoiceId);
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpGet("invoices/{invoiceId}/einvoice/representation")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> DownloadSandboxEInvoiceRepresentation(string invoiceId)
        {
            try
            {
                var invoice = await _invoiceService.GetInvoiceAsync(invoiceId);
                if (invoice == null)
                    return NotFound(new { message = "Kh?ng t?m th?y h?a don." });

                if (!string.Equals(invoice.Status, "Paid", StringComparison.OrdinalIgnoreCase))
                    return BadRequest(new { message = "H?a don chua thanh to?n." });

                var tenantName = ResolveTenantName();
                var metadata = _eInvoiceSandboxService.BuildMetadata(invoice, tenantName);
                var html = _eInvoiceSandboxService.BuildHtmlRepresentation(invoice, tenantName, metadata);
                return File(Encoding.UTF8.GetBytes(html), "text/html; charset=utf-8", $"{metadata.InvoiceNo}.html");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error downloading sandbox representation for {InvoiceId}", invoiceId);
                return BadRequest(new { message = ex.Message });
            }
        }

        /// <summary>
        /// C?p nh?t t? d?ng c?c h?a don qu? h?n
        /// Endpoint n?y c? th? du?c g?i b?i scheduled job ho?c manual trigger
        /// </summary>
        [HttpPost("update-overdue")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> UpdateOverdueInvoices()
        {
            try
            {
                var updatedCount = await _invoiceService.UpdateOverdueInvoicesAsync();
                return Ok(new { 
                    message = "C?p nh?t h?a don qu? h?n th?nh c?ng",
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
        /// Kh?a ch?nh s?a h?a don th?ng (th? c?ng)
        /// </summary>
        [HttpPost("lock")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> LockMonth([FromBody] LockMonthRequest request)
        {
            try
            {
                var success = await _invoiceLockService.LockMonthAsync(request.Month, request.Year, User.Identity?.Name ?? "Admin");
                if (!success)
                    return BadRequest(new { message = "Kh?a th?ng th?t b?i." });

                return Ok(new { message = $"?? kh?a ch?nh s?a h?a don th?ng {request.Month}/{request.Year}." });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error locking month");
                return BadRequest(new { message = ex.Message });
            }
        }

        /// <summary>
        /// M? kh?a ch?nh s?a h?a don th?ng
        /// </summary>
        [HttpPost("unlock")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> UnlockMonth([FromBody] LockMonthRequest request)
        {
            try
            {
                var success = await _invoiceLockService.UnlockMonthAsync(request.Month, request.Year);
                if (!success)
                    return BadRequest(new { message = "M? kh?a th?t b?i." });

                return Ok(new { message = $"?? m? kh?a ch?nh s?a h?a don th?ng {request.Month}/{request.Year}." });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error unlocking month");
                return BadRequest(new { message = ex.Message });
            }
        }

        /// <summary>
        /// L?y th?ng tin kh?a c?a th?ng
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
        /// L?y danh s?ch h?a don c?a h?c sinh hi?n t?i
        /// (Parent: tr? v? h?a don c?a T?T C? con)
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
        /// L?y danh s?ch h?a don chua thanh to?n
        /// (Parent: tr? v? h?a don c?a T?T C? con)
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

        [HttpGet("my-invoices/{invoiceId}/einvoice/xml")]
        [Authorize(Roles = "Student,Parent")]
        public async Task<IActionResult> DownloadMySandboxEInvoiceXml(string invoiceId)
        {
            try
            {
                var invoice = await GetMyPaidInvoiceOrNull(invoiceId);
                if (invoice == null)
                    return NotFound(new { message = "Kh?ng t?m th?y h?a don." });

                var tenantName = ResolveTenantName();
                var metadata = _eInvoiceSandboxService.BuildMetadata(invoice, tenantName);
                var xml = _eInvoiceSandboxService.BuildXml(invoice, tenantName, metadata);
                return File(Encoding.UTF8.GetBytes(xml), "application/xml", $"{metadata.InvoiceNo}.xml");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error downloading my sandbox xml for {InvoiceId}", invoiceId);
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpGet("my-invoices/{invoiceId}/einvoice/representation")]
        [Authorize(Roles = "Student,Parent")]
        public async Task<IActionResult> DownloadMySandboxEInvoiceRepresentation(string invoiceId)
        {
            try
            {
                var invoice = await GetMyPaidInvoiceOrNull(invoiceId);
                if (invoice == null)
                    return NotFound(new { message = "Kh?ng t?m th?y h?a don." });

                var tenantName = ResolveTenantName();
                var metadata = _eInvoiceSandboxService.BuildMetadata(invoice, tenantName);
                var html = _eInvoiceSandboxService.BuildHtmlRepresentation(invoice, tenantName, metadata);
                return File(Encoding.UTF8.GetBytes(html), "text/html; charset=utf-8", $"{metadata.InvoiceNo}.html");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error downloading my sandbox representation for {InvoiceId}", invoiceId);
                return BadRequest(new { message = ex.Message });
            }
        }

        #endregion

        private int GetCurrentUserId()
        {
            var userIdClaim = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(userIdClaim) || !int.TryParse(userIdClaim, out var userId))
                throw new Exception("ID ngu?i d?ng kh?ng h?p l?.");
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
        /// L?y danh s?ch StudentId t? UserId trong JWT claims.
        /// - Student: UserId ch?nh l? StudentId
        /// - Parent: Query b?ng ParentStudent d? t?m T?T C? h?c sinh
        /// </summary>
        private async Task<List<int>> GetStudentIdsFromUserAsync(int userId)
        {
            var role = User.FindFirst(System.Security.Claims.ClaimTypes.Role)?.Value;

            if (role == "Student")
            {
                var studentExists = await _tenantContext.Students
                    .AnyAsync(s => s.UserId == userId);

                if (!studentExists)
                    throw new Exception($"Kh?ng t?m th?y h?c sinh cho m? ngu?i d?ng {userId}");

                return new List<int> { userId };
            }

            if (role == "Parent")
            {
                var studentIds = await _tenantContext.Set<Dictionary<string, object>>("ParentStudent")
                    .Where(ps => EF.Property<int>(ps, "ParentsUserId") == userId)
                    .Select(ps => EF.Property<int>(ps, "StudentsUserId"))
                    .ToListAsync();

                if (!studentIds.Any())
                    throw new Exception("Kh?ng t?m th?y h?c sinh n?o cho t?i kho?n ph? huynh n?y.");

                return studentIds;
            }

            throw new Exception($"Vai tr? '{role}' kh?ng du?c h? tr? d? tra c?u h?c ph?.");
        }
        private string ResolveTenantName()
        {
            var centerName = _tenantContext.CenterProfiles
                .AsNoTracking()
                .Select(cp => cp.Name)
                .FirstOrDefault();
            if (!string.IsNullOrWhiteSpace(centerName))
                return centerName.Trim();

            if (!string.IsNullOrWhiteSpace(_tenantContext.CurrentTenantId))
            {
                var tenantName = _adminContext.Tenants
                    .AsNoTracking()
                    .Where(t => t.TenantId == _tenantContext.CurrentTenantId)
                    .Select(t => t.TenantName)
                    .FirstOrDefault();
                if (!string.IsNullOrWhiteSpace(tenantName))
                    return tenantName.Trim();
            }

            var fromClaim = User.FindFirst("TenantName")?.Value;
            if (!string.IsNullOrWhiteSpace(fromClaim))
                return fromClaim.Trim();

            if (!string.IsNullOrWhiteSpace(_tenantContext.CurrentTenantId))
                return _tenantContext.CurrentTenantId;

            return "Center";
        }

        private async Task<EducenAPI.Models.TuitionInvoice?> GetMyPaidInvoiceOrNull(string invoiceId)
        {
            var userId = GetCurrentUserId();
            var studentIds = await GetStudentIdsFromUserAsync(userId);
            var studentSet = studentIds.ToHashSet();

            var invoice = await _tenantContext.TuitionInvoices
                .Include(i => i.Student)
                .Include(i => i.Class)
                .FirstOrDefaultAsync(i => i.InvoiceId == invoiceId);

            if (invoice == null)
                return null;

            if (!studentSet.Contains(invoice.StudentId))
                return null;

            if (!string.Equals(invoice.Status, "Paid", StringComparison.OrdinalIgnoreCase))
                return null;

            return invoice;
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
