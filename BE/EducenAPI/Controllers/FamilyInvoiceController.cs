using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using EducenAPI.DTOs.Invoice;
using EducenAPI.Models;
using EducenAPI.Services.Interface;
using EducenAPI.Services;
using System.Security.Claims;

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
        private readonly ILogger<FamilyInvoiceController> _logger;

        public FamilyInvoiceController(
            IInvoiceService invoiceService,
            ICurrentTenantService currentTenantService,
            ILogger<FamilyInvoiceController> logger)
        {
            _invoiceService = invoiceService;
            _currentTenantService = currentTenantService;
            _logger = logger;
        }

        /// <summary>
        /// Tạo hóa đơn gia đình (gộp nhiều hóa đơn con)
        /// Chỉ Parent mới có thể tạo cho con của mình
        /// </summary>
        [HttpPost("create-family")]
        [Authorize(Roles = "Parent,Student")]
        public async Task<IActionResult> CreateFamilyInvoice([FromBody] CreateFamilyInvoiceRequest request)
        {
            try
            {
                var tenantId = _currentTenantService.TenantId;
                if (string.IsNullOrWhiteSpace(tenantId))
                    return BadRequest(new { message = "Không xác định được trung tâm." });

                // Validate type
                if (request.Type != "Student" && request.Type != "Family")
                    return BadRequest(new { message = "Loại hóa đơn không hợp lệ. Chỉ chấp nhận 'Student' hoặc 'Family'." });

                // Validate StudentIds
                var hasSelectedInvoiceIds = request.SelectedTuitionInvoiceIds != null && request.SelectedTuitionInvoiceIds.Any();

                if (!hasSelectedInvoiceIds && (request.StudentIds == null || !request.StudentIds.Any()))
                    return BadRequest(new { message = "Danh sách học sinh không được trống." });

                if (request.Type == "Student" && !hasSelectedInvoiceIds && request.StudentIds.Count > 1)
                    return BadRequest(new { message = "Gộp hóa đơn theo con chỉ được chọn 1 học sinh." });

                var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                if (string.IsNullOrWhiteSpace(userId))
                    return BadRequest(new { message = "Không xác định được người dùng." });

                var requesterRole = User.IsInRole("Parent") ? "Parent" : "Student";
                var result = await _invoiceService.CreateFamilyInvoiceAsync(userId, request, requesterRole);
                
                if (result.Success)
                {
                    return Ok(new 
                    { 
                        message = request.Type == "Student" 
                            ? "Đã tạo hóa đơn gộp theo con thành công"
                            : "Đã tạo hóa đơn gia đình thành công",
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
        /// Lấy danh sách hóa đơn gộp của parent
        /// type=Student: hóa đơn gộp theo từng con
        /// type=Family: hóa đơn gộp tất cả con
        /// không truyền type: lấy tất cả
        /// </summary>
        [HttpGet("family-invoices")]
        [Authorize(Roles = "Parent,Student")]
        public async Task<IActionResult> GetFamilyInvoices([FromQuery] string? type = null)
        {
            try
            {
                var tenantId = _currentTenantService.TenantId;
                if (string.IsNullOrWhiteSpace(tenantId))
                    return BadRequest(new { message = "Không xác định được trung tâm." });

                var userId = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
                
                if (string.IsNullOrWhiteSpace(userId))
                    return BadRequest(new { message = "Không xác định được người dùng." });

                // Validate type if provided
                if (!string.IsNullOrWhiteSpace(type) && type != "Student" && type != "Family")
                    return BadRequest(new { message = "Loại hóa đơn không hợp lệ." });

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

        /// <summary>
        /// Thanh toán hóa đơn gia đình
        /// </summary>
        [HttpPost("pay-family/{invoiceId}")]
        [Authorize(Roles = "Parent")]
        public async Task<IActionResult> PayFamilyInvoice(string invoiceId, [FromBody] PayFamilyInvoiceRequest request)
        {
            try
            {
                var tenantId = _currentTenantService.TenantId;
                if (string.IsNullOrWhiteSpace(tenantId))
                    return BadRequest(new { message = "Không xác định được trung tâm." });

                var parentId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                if (string.IsNullOrWhiteSpace(parentId))
                    return BadRequest(new { message = "Không xác định được người dùng." });

                var success = await _invoiceService.PayFamilyInvoiceAsync(parentId, invoiceId, request.PaymentMethod, request.Notes);
                
                if (success)
                {
                    return Ok(new { message = "Thanh toán hóa đơn gia đình thành công" });
                }
                else
                {
                    return BadRequest(new { message = "Thanh toán thất bại" });
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error paying family invoice {InvoiceId}", invoiceId);
                return BadRequest(new { message = ex.Message });
            }
        }

        /// <summary>
        /// Hủy hóa đơn gộp của chính chủ sở hữu (Parent/Student)
        /// </summary>
        [HttpPost("{invoiceId}/cancel")]
        [Authorize(Roles = "Parent,Student")]
        public async Task<IActionResult> CancelFamilyInvoice(string invoiceId, [FromBody] CancelFamilyInvoiceRequest? request)
        {
            try
            {
                var tenantId = _currentTenantService.TenantId;
                if (string.IsNullOrWhiteSpace(tenantId))
                    return BadRequest(new { message = "Không xác định được trung tâm." });

                var ownerUserId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                if (string.IsNullOrWhiteSpace(ownerUserId))
                    return BadRequest(new { message = "Không xác định được người dùng." });

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
