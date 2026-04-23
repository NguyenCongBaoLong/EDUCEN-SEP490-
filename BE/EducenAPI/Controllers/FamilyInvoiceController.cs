using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using EducenAPI.DTOs.Invoice;
using EducenAPI.Models;
using EducenAPI.Services.Interface;
using EducenAPI.Services;
using EducenAPI.Persistence.Contexts;
using System.Security.Claims;
using Microsoft.EntityFrameworkCore;
using System.Text;

namespace EducenAPI.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Route("api/family-invoices")]
    [Authorize]
    public class FamilyInvoiceController : ControllerBase
    {
        private readonly IInvoiceService _invoiceService;
        private readonly ICurrentTenantService _currentTenantService;
        private readonly EducenV2Context _tenantContext;
        private readonly IEInvoiceSandboxService _eInvoiceSandboxService;
        private readonly ILogger<FamilyInvoiceController> _logger;

        public FamilyInvoiceController(
            IInvoiceService invoiceService,
            ICurrentTenantService currentTenantService,
            EducenV2Context tenantContext,
            IEInvoiceSandboxService eInvoiceSandboxService,
            ILogger<FamilyInvoiceController> logger)
        {
            _invoiceService = invoiceService;
            _currentTenantService = currentTenantService;
            _tenantContext = tenantContext;
            _eInvoiceSandboxService = eInvoiceSandboxService;
            _logger = logger;
        }

        /// <summary>
        /// T?o h�a don gia d�nh (g?p nhi?u h�a don con)
        /// Ch? Parent m?i c� th? t?o cho con c?a m�nh
        /// </summary>
        [HttpPost("create-family")]
        [Authorize(Roles = "Parent,Student")]
        public async Task<IActionResult> CreateFamilyInvoice([FromBody] CreateFamilyInvoiceRequest request)
        {
            try
            {
                var tenantId = _currentTenantService.TenantId;
                if (string.IsNullOrWhiteSpace(tenantId))
                    return BadRequest(new { message = "Kh�ng x�c d?nh du?c trung t�m." });

                // Validate type
                if (request.Type != "Student" && request.Type != "Family")
                    return BadRequest(new { message = "Lo?i h�a don kh�ng h?p l?. Ch? ch?p nh?n 'Student' ho?c 'Family'." });

                // Validate StudentIds
                var hasSelectedInvoiceIds = request.SelectedTuitionInvoiceIds != null && request.SelectedTuitionInvoiceIds.Any();

                if (!hasSelectedInvoiceIds && (request.StudentIds == null || !request.StudentIds.Any()))
                    return BadRequest(new { message = "Danh s�ch h?c sinh kh�ng du?c tr?ng." });

                if (request.Type == "Student" && !hasSelectedInvoiceIds && request.StudentIds.Count > 1)
                    return BadRequest(new { message = "G?p h�a don theo con ch? du?c ch?n 1 h?c sinh." });

                var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                if (string.IsNullOrWhiteSpace(userId))
                    return BadRequest(new { message = "Kh�ng x�c d?nh du?c ngu?i d�ng." });

                var requesterRole = User.IsInRole("Parent") ? "Parent" : "Student";
                var result = await _invoiceService.CreateFamilyInvoiceAsync(userId, request, requesterRole);
                
                if (result.Success)
                {
                    return Ok(new 
                    { 
                        message = request.Type == "Student" 
                            ? "�� t?o h�a don g?p theo con th�nh c�ng"
                            : "�� t?o h�a don gia d�nh th�nh c�ng",
                        invoiceId = result.InvoiceId,
                        totalAmount = result.TotalAmount,
                        studentCount = result.StudentCount,
                        type = request.Type
                    });
                }
                else
                {
                    return BadRequest(new { message = result.Message });
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error creating family invoice");
                return BadRequest(new { message = ex.Message });
            }
        }

        /// <summary>
        /// L?y danh s�ch h�a don g?p c?a parent
        /// type=Student: h�a don g?p theo t?ng con
        /// type=Family: h�a don g?p t?t c? con
        /// kh�ng truy?n type: l?y t?t c?
        /// </summary>
        [HttpGet("family-invoices")]
        [Authorize(Roles = "Parent,Student")]
        public async Task<IActionResult> GetFamilyInvoices([FromQuery] string? type = null)
        {
            try
            {
                var tenantId = _currentTenantService.TenantId;
                if (string.IsNullOrWhiteSpace(tenantId))
                    return BadRequest(new { message = "Kh�ng x�c d?nh du?c trung t�m." });

                var userId = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
                
                if (string.IsNullOrWhiteSpace(userId))
                    return BadRequest(new { message = "Kh�ng x�c d?nh du?c ngu?i d�ng." });

                // Validate type if provided
                if (!string.IsNullOrWhiteSpace(type) && type != "Student" && type != "Family")
                    return BadRequest(new { message = "Lo?i h�a don kh�ng h?p l?." });

                var requesterRole = User.IsInRole("Parent") ? "Parent" : "Student";
                var invoices = await _invoiceService.GetFamilyInvoicesAsync(userId, type, requesterRole);
                
                return Ok(invoices);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting family invoices");
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpGet("{invoiceId}")]
        [Authorize(Roles = "Parent,Student")]
        public async Task<IActionResult> GetFamilyInvoiceById(string invoiceId)
        {
            try
            {
                var ownerUserId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                if (string.IsNullOrWhiteSpace(ownerUserId))
                    return BadRequest(new { message = "Không xác định được người dùng." });

                var invoice = await _tenantContext.FamilyInvoices
                    .Include(fi => fi.StudentInvoices)
                    .FirstOrDefaultAsync(fi => fi.InvoiceId == invoiceId && fi.ParentId == ownerUserId);

                if (invoice == null)
                    return NotFound(new { message = "Không tìm thấy hóa đơn gộp." });

                return Ok(invoice);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting family invoice by id {InvoiceId}", invoiceId);
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpGet("{invoiceId}/einvoice/xml")]
        [Authorize(Roles = "Parent,Student")]
        public async Task<IActionResult> DownloadFamilySandboxXml(string invoiceId)
        {
            try
            {
                var tuitionInvoice = await GetRepresentativePaidTuitionInvoiceAsync(invoiceId);
                if (tuitionInvoice == null)
                    return NotFound(new { message = "Không tìm thấy HĐĐT cho hóa đơn gộp này." });

                var tenantName = ResolveTenantName();
                var metadata = _eInvoiceSandboxService.BuildMetadata(tuitionInvoice, tenantName);
                var xml = _eInvoiceSandboxService.BuildXml(tuitionInvoice, tenantName, metadata);
                return File(Encoding.UTF8.GetBytes(xml), "application/xml", $"{metadata.InvoiceNo}.xml");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error downloading family e-invoice xml {InvoiceId}", invoiceId);
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpGet("{invoiceId}/einvoice/representation")]
        [Authorize(Roles = "Parent,Student")]
        public async Task<IActionResult> DownloadFamilySandboxRepresentation(string invoiceId)
        {
            try
            {
                var tuitionInvoice = await GetRepresentativePaidTuitionInvoiceAsync(invoiceId);
                if (tuitionInvoice == null)
                    return NotFound(new { message = "Không tìm thấy HĐĐT cho hóa đơn gộp này." });

                var tenantName = ResolveTenantName();
                var metadata = _eInvoiceSandboxService.BuildMetadata(tuitionInvoice, tenantName);
                var html = _eInvoiceSandboxService.BuildHtmlRepresentation(tuitionInvoice, tenantName, metadata);
                return File(Encoding.UTF8.GetBytes(html), "text/html; charset=utf-8", $"{metadata.InvoiceNo}.html");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error downloading family e-invoice representation {InvoiceId}", invoiceId);
                return BadRequest(new { message = ex.Message });
            }
        }

        /// <summary>
        /// Thanh to�n h�a don gia d�nh
        /// </summary>
        [HttpPost("pay-family/{invoiceId}")]
        [Authorize(Roles = "Parent")]
        public async Task<IActionResult> PayFamilyInvoice(string invoiceId, [FromBody] PayFamilyInvoiceRequest request)
        {
            try
            {
                var tenantId = _currentTenantService.TenantId;
                if (string.IsNullOrWhiteSpace(tenantId))
                    return BadRequest(new { message = "Kh�ng x�c d?nh du?c trung t�m." });

                var parentId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                if (string.IsNullOrWhiteSpace(parentId))
                    return BadRequest(new { message = "Kh�ng x�c d?nh du?c ngu?i d�ng." });

                var success = await _invoiceService.PayFamilyInvoiceAsync(parentId, invoiceId, request.PaymentMethod, request.Notes);
                
                if (success)
                {
                    return Ok(new { message = "Thanh to�n h�a don gia d�nh th�nh c�ng" });
                }
                else
                {
                    return BadRequest(new { message = "Thanh to�n th?t b?i" });
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error paying family invoice {InvoiceId}", invoiceId);
                return BadRequest(new { message = ex.Message });
            }
        }

        /// <summary>
        /// H?y h�a don g?p c?a ch�nh ch? s? h?u (Parent/Student)
        /// </summary>
        [HttpPost("{invoiceId}/cancel")]
        [Authorize(Roles = "Parent,Student")]
        public async Task<IActionResult> CancelFamilyInvoice(string invoiceId, [FromBody] CancelFamilyInvoiceRequest? request)
        {
            try
            {
                var tenantId = _currentTenantService.TenantId;
                if (string.IsNullOrWhiteSpace(tenantId))
                    return BadRequest(new { message = "Kh�ng x�c d?nh du?c trung t�m." });

                var ownerUserId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                if (string.IsNullOrWhiteSpace(ownerUserId))
                    return BadRequest(new { message = "Kh�ng x�c d?nh du?c ngu?i d�ng." });

                var requesterRole = User.IsInRole("Parent") ? "Parent" : "Student";

                var result = await _invoiceService.CancelFamilyInvoiceAsync(ownerUserId, invoiceId, request?.Reason, requesterRole);
                if (!result.Success)
                    return BadRequest(new { message = result.Message });

                return Ok(new
                {
                    message = result.Message,
                    invoiceId = result.InvoiceId
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error cancelling family invoice {InvoiceId}", invoiceId);
                return BadRequest(new { message = ex.Message });
            }
        }

        private async Task<TuitionInvoice?> GetRepresentativePaidTuitionInvoiceAsync(string familyInvoiceId)
        {
            var ownerUserId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrWhiteSpace(ownerUserId))
                return null;

            var family = await _tenantContext.FamilyInvoices
                .Include(fi => fi.StudentInvoices)
                .FirstOrDefaultAsync(fi => fi.InvoiceId == familyInvoiceId && fi.ParentId == ownerUserId);

            if (family == null || !string.Equals(family.Status, "Paid", StringComparison.OrdinalIgnoreCase))
                return null;

            var invoiceIds = family.StudentInvoices.Select(si => si.StudentInvoiceId).ToList();
            if (!invoiceIds.Any())
                return null;

            return await _tenantContext.TuitionInvoices
                .Where(ti => invoiceIds.Contains(ti.InvoiceId) && ti.Status == "Paid")
                .OrderByDescending(ti => ti.PaidAt ?? ti.CreatedAt)
                .FirstOrDefaultAsync();
        }

        private string ResolveTenantName()
        {
            var fromClaim = User.FindFirst("TenantName")?.Value;
            if (!string.IsNullOrWhiteSpace(fromClaim))
                return fromClaim.Trim();

            if (!string.IsNullOrWhiteSpace(_tenantContext.CurrentTenantId))
                return _tenantContext.CurrentTenantId;

            return "Center";
        }
    }

    public class PayFamilyInvoiceRequest
    {
        public string PaymentMethod { get; set; } = "Cash";
        public string? Notes { get; set; }
    }

    public class CancelFamilyInvoiceRequest
    {
        public string? Reason { get; set; }
    }
}
