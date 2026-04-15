using EducenAPI.Services.Interface;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace EducenAPI.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize(Roles = "SystemAdmin")]
    public class RefundsController : ControllerBase
    {
        private readonly IRefundService _refundService;
        private readonly ILogger<RefundsController> _logger;

        public RefundsController(IRefundService refundService, ILogger<RefundsController> logger)
        {
            _refundService = refundService;
            _logger = logger;
        }

        /// <summary>
        /// Tạo yêu cầu hoàn tiền mới
        /// </summary>
        [HttpPost]
        public async Task<IActionResult> CreateRefund([FromBody] CreateRefundApiRequest request)
        {
            try
            {
                var userId = GetCurrentUserId();

                var refund = await _refundService.CreateRefundRequestAsync(new CreateRefundRequest
                {
                    PaymentRecordId = request.PaymentRecordId,
                    SubscriptionId = request.SubscriptionId,
                    TenantId = request.TenantId,
                    RequestedBy = userId,
                    Reason = request.Reason,
                    RefundAmount = request.RefundAmount,
                    RefundMethod = request.RefundMethod,
                    GatewayRef = request.GatewayRef,
                    IsServiceIssue = request.IsServiceIssue
                });

                return Ok(refund);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error creating refund request");
                return BadRequest(new { message = ex.Message });
            }
        }

        /// <summary>
        /// Phê duyệt yêu cầu hoàn tiền
        /// </summary>
        [HttpPost("{refundId}/approve")]
        public async Task<IActionResult> ApproveRefund(string refundId, [FromBody] ApproveRefundRequest request)
        {
            try
            {
                var userId = GetCurrentUserId();
                var refund = await _refundService.ApproveRefundAsync(refundId, userId, request.Notes);
                return Ok(refund);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error approving refund");
                return BadRequest(new { message = ex.Message });
            }
        }

        /// <summary>
        /// Từ chối yêu cầu hoàn tiền
        /// </summary>
        [HttpPost("{refundId}/reject")]
        public async Task<IActionResult> RejectRefund(string refundId, [FromBody] RejectRefundRequest request)
        {
            try
            {
                var userId = GetCurrentUserId();
                var refund = await _refundService.RejectRefundAsync(refundId, request.Reason, userId);
                return Ok(refund);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error rejecting refund");
                return BadRequest(new { message = ex.Message });
            }
        }

        /// <summary>
        /// Xử lý hoàn tiền qua cổng thanh toán
        /// </summary>
        [HttpPost("{refundId}/process")]
        public async Task<IActionResult> ProcessRefund(string refundId)
        {
            try
            {
                var refund = await _refundService.ProcessRefundAsync(refundId);
                return Ok(refund);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error processing refund");
                return BadRequest(new { message = ex.Message });
            }
        }

        /// <summary>
        /// Lấy chi tiết yêu cầu hoàn tiền
        /// </summary>
        [HttpGet("{refundId}")]
        public async Task<IActionResult> GetRefund(string refundId)
        {
            try
            {
                var refund = await _refundService.GetRefundRequestAsync(refundId);
                if (refund == null)
                    return NotFound(new { message = "Không tìm thấy yêu cầu hoàn tiền." });

                return Ok(refund);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting refund");
                return BadRequest(new { message = ex.Message });
            }
        }

        /// <summary>
        /// Lấy danh sách yêu cầu hoàn tiền
        /// </summary>
        [HttpGet]
        public async Task<IActionResult> GetRefunds([FromQuery] RefundFilterApiRequest filter)
        {
            try
            {
                var refunds = await _refundService.GetRefundRequestsAsync(new RefundFilterRequest
                {
                    TenantId = filter.TenantId,
                    Status = filter.Status,
                    RequestedBy = filter.RequestedBy,
                    FromDate = filter.FromDate,
                    ToDate = filter.ToDate
                });

                return Ok(refunds);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting refunds");
                return BadRequest(new { message = ex.Message });
            }
        }

        /// <summary>
        /// Kiểm tra xem payment có thể hoàn tiền không
        /// </summary>
        [HttpGet("can-refund/{paymentRecordId}")]
        public async Task<IActionResult> CanRefund(string paymentRecordId)
        {
            try
            {
                var canRefund = await _refundService.CanRefundAsync(paymentRecordId);
                return Ok(new { canRefund });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error checking refund eligibility");
                return BadRequest(new { message = ex.Message });
            }
        }

        private int GetCurrentUserId()
        {
            var userIdClaim = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(userIdClaim) || !int.TryParse(userIdClaim, out var userId))
                throw new Exception("Mã người dùng không hợp lệ.");
            return userId;
        }
    }

    #region Request Models

    public class CreateRefundApiRequest
    {
        public string PaymentRecordId { get; set; } = string.Empty;
        public string? SubscriptionId { get; set; }
        public string TenantId { get; set; } = string.Empty;
        public string Reason { get; set; } = string.Empty;
        public decimal RefundAmount { get; set; }
        public string? RefundMethod { get; set; }
        public string? GatewayRef { get; set; }
        public bool IsServiceIssue { get; set; } = false;
    }

    public class ApproveRefundRequest
    {
        public string? Notes { get; set; }
    }

    public class RejectRefundRequest
    {
        public string Reason { get; set; } = string.Empty;
    }

    public class RefundFilterApiRequest
    {
        public string? TenantId { get; set; }
        public string? Status { get; set; }
        public int? RequestedBy { get; set; }
        public DateTime? FromDate { get; set; }
        public DateTime? ToDate { get; set; }
    }

    #endregion
}
