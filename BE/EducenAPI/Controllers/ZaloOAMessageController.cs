using System.Security.Claims;
using EducenAPI.DTOs.Common;
using EducenAPI.DTOs.ZaloOA;
using EducenAPI.Services;
using EducenAPI.Services.Interface;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace EducenAPI.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize(Roles = "Admin")]
    public class ZaloOAMessageController : ControllerBase
    {
        private readonly IZaloOANotificationService _zaloService;
        private readonly ICurrentTenantService _tenantService;

        public ZaloOAMessageController(
            IZaloOANotificationService zaloService,
            ICurrentTenantService tenantService)
        {
            _zaloService = zaloService;
            _tenantService = tenantService;
        }

        private int GetCurrentUserId()
        {
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value
                ?? User.FindFirst("UserId")?.Value
                ?? User.FindFirst("userId")?.Value;

            if (string.IsNullOrEmpty(userIdClaim) || !int.TryParse(userIdClaim, out var userId))
                throw new UnauthorizedAccessException("Không xác định được UserId từ token.");

            return userId;
        }

        [HttpGet("status")]
        public async Task<IActionResult> GetStatus()
        {
            var tenantId = _tenantService.TenantId;
            if (string.IsNullOrEmpty(tenantId))
                return BadRequest(ApiResponse<ZaloOAStatusResponse>.ErrorResponse("Không xác định được tenant."));

            var status = await _zaloService.GetStatusAsync(tenantId);
            return Ok(ApiResponse<ZaloOAStatusResponse>.SuccessResponse(status));
        }

        [HttpPost("send-batch")]
        public async Task<IActionResult> SendBatch([FromBody] SendZaloMessageRequest request)
        {
            try
            {
                var tenantId = _tenantService.TenantId;
                if (string.IsNullOrEmpty(tenantId))
                    return BadRequest(ApiResponse<SendZaloMessageResponse>.ErrorResponse("Không xác định được tenant."));

                var userId = GetCurrentUserId();
                var result = await _zaloService.SendBatchMessageAsync(tenantId, userId, request);
                return Ok(ApiResponse<SendZaloMessageResponse>.SuccessResponse(result,
                    $"Đã gửi: {result.Sent}/{result.TotalRecipients}"));
            }
            catch (Exception ex)
            {
                return BadRequest(ApiResponse<SendZaloMessageResponse>.ErrorResponse(ex.Message));
            }
        }

        [HttpGet("followers")]
        public async Task<IActionResult> GetFollowers()
        {
            var tenantId = _tenantService.TenantId;
            if (string.IsNullOrEmpty(tenantId))
                return BadRequest(ApiResponse<List<ZaloOAFollowerResponse>>.ErrorResponse("Không xác định được tenant."));

            var followers = await _zaloService.GetFollowersAsync(tenantId);
            return Ok(ApiResponse<List<ZaloOAFollowerResponse>>.SuccessResponse(followers));
        }

        [HttpGet("message-history")]
        public async Task<IActionResult> GetMessageHistory()
        {
            var tenantId = _tenantService.TenantId;
            if (string.IsNullOrEmpty(tenantId))
                return BadRequest(ApiResponse<List<ZaloMessageHistoryResponse>>.ErrorResponse("Không xác định được tenant."));

            var history = await _zaloService.GetMessageHistoryAsync(tenantId);
            return Ok(ApiResponse<List<ZaloMessageHistoryResponse>>.SuccessResponse(history));
        }

        [AllowAnonymous]
        [HttpPost("webhook")]
        public async Task<IActionResult> Webhook([FromBody] ZaloWebhookPayload payload)
        {
            try
            {
                await _zaloService.HandleWebhookAsync(payload);
                return Ok(new { error = 0, message = "Success" });
            }
            catch (Exception ex)
            {
                return Ok(new { error = 1, message = ex.Message });
            }
        }
    }
}
