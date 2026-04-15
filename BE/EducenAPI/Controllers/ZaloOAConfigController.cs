using EducenAPI.DTOs.Common;
using EducenAPI.DTOs.ZaloOA;
using EducenAPI.Services.Interface;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace EducenAPI.Controllers
{
    [Route("api/admin/[controller]")]
    [ApiController]
    [Authorize(Roles = "SystemAdmin")]
    public class ZaloOAConfigController : ControllerBase
    {
        private readonly IZaloOANotificationService _zaloService;

        public ZaloOAConfigController(IZaloOANotificationService zaloService)
        {
            _zaloService = zaloService;
        }

        [HttpGet]
        public async Task<IActionResult> GetAll()
        {
            var configs = await _zaloService.GetAllConfigsAsync();
            return Ok(ApiResponse<List<ZaloOAConfigResponse>>.SuccessResponse(configs));
        }

        [HttpGet("{tenantId}")]
        public async Task<IActionResult> GetByTenant(string tenantId)
        {
            var config = await _zaloService.GetConfigAsync(tenantId);
            if (config == null)
                return NotFound(ApiResponse<ZaloOAConfigResponse>.ErrorResponse("Trung tâm chưa cấu hình Zalo OA."));

            return Ok(ApiResponse<ZaloOAConfigResponse>.SuccessResponse(config));
        }

        [HttpPost("{tenantId}")]
        public async Task<IActionResult> Setup(string tenantId, [FromBody] SetupZaloOARequest request)
        {
            try
            {
                var config = await _zaloService.SetupConfigAsync(tenantId, request);
                return Ok(ApiResponse<ZaloOAConfigResponse>.SuccessResponse(config, "Đã thiết lập cấu hình Zalo OA."));
            }
            catch (Exception ex)
            {
                return BadRequest(ApiResponse<ZaloOAConfigResponse>.ErrorResponse(ex.Message));
            }
        }

        [HttpDelete("{tenantId}")]
        public async Task<IActionResult> Delete(string tenantId)
        {
            var result = await _zaloService.DeleteConfigAsync(tenantId);
            if (!result)
                return NotFound(ApiResponse<bool>.ErrorResponse("Không tìm thấy cấu hình Zalo OA."));

            return Ok(ApiResponse<bool>.SuccessResponse(true, "Đã xóa cấu hình Zalo OA."));
        }

        [HttpPost("{tenantId}/verify")]
        public async Task<IActionResult> Verify(string tenantId)
        {
            try
            {
                var result = await _zaloService.VerifyConnectionAsync(tenantId);
                if (result)
                    return Ok(ApiResponse<bool>.SuccessResponse(true, "Kết nối Zalo OA thành công."));

                return BadRequest(ApiResponse<bool>.ErrorResponse("Kết nối Zalo OA thất bại."));
            }
            catch (Exception ex)
            {
                return BadRequest(ApiResponse<object>.ErrorResponse(ex.Message));
            }
        }

        [HttpGet("{tenantId}/debug")]
        public async Task<IActionResult> DebugConfig(string tenantId)
        {
            try
            {
                var result = await _zaloService.TestCredentialsAsync(tenantId);
                return Ok(ApiResponse<object>.SuccessResponse(result, "Thông tin debug Zalo OA config."));
            }
            catch (Exception ex)
            {
                return BadRequest(ApiResponse<object>.ErrorResponse(ex.Message));
            }
        }

        [HttpGet("{tenantId}/auth-url")]
        public IActionResult GetAuthUrl(string tenantId, [FromQuery] string redirectUri)
        {
            if (string.IsNullOrEmpty(redirectUri))
                return BadRequest(ApiResponse<object>.ErrorResponse("redirectUri là bắt buộc."));

            var config = _zaloService.GetAuthorizationUrl(tenantId);
            // Format: https://oauth.zaloapp.com/v4/oa/permission?app_id={appId}&redirect_uri={uri}&state={tenantId}
            // The actual app_id is fetched from the config, so we return a template for the frontend
            return Ok(ApiResponse<object>.SuccessResponse(new { authUrlTemplate = config, redirectUri }));
        }

        [AllowAnonymous]
        [HttpGet("{tenantId}/callback")]
        public async Task<IActionResult> OAuthCallback(string tenantId, [FromQuery] string code, [FromQuery] string state)
        {
            try
            {
                if (string.IsNullOrEmpty(code))
                    return BadRequest(ApiResponse<bool>.ErrorResponse("Không nhận được authorization code từ Zalo."));

                var actualTenantId = !string.IsNullOrEmpty(state) ? state : tenantId;
                var result = await _zaloService.HandleOAuthCallbackAsync(actualTenantId, code);

                return Ok(ApiResponse<bool>.SuccessResponse(true, "Cấp quyền Zalo OA thành công."));
            }
            catch (Exception ex)
            {
                return BadRequest(ApiResponse<object>.ErrorResponse(ex.Message));
            }
        }
    }
}
