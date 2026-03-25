using EducenAPI.DTOs.CenterHome;
using EducenAPI.Services.Interface;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace EducenAPI.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    //[Authorize]
    public class CenterHomeController : ControllerBase
    {
        private readonly ICenterHomeService _centerHomeService;

        public CenterHomeController(ICenterHomeService centerHomeService)
        {
            _centerHomeService = centerHomeService;
        }

        [HttpGet("{tenantId}")]
        [AllowAnonymous] // Cho phép tất cả mọi người (kể cả chưa đăng nhập) xem trang chủ
        public async Task<IActionResult> GetCenterHome(string tenantId)
        {
            try
            {
                if (string.IsNullOrEmpty(tenantId))
                    return BadRequest("TenantId không hợp lệ.");

                // Lấy BaseUrl (Ví dụ: http://localhost:5106)
                var baseUrl = $"{Request.Scheme}://{Request.Host}";

                var result = await _centerHomeService.GetCenterHomeAsync(tenantId, baseUrl);

                if (result == null)
                {
                    // Nếu chưa cấu hình trang chủ, có thể trả về thông báo để Frontend tự hiển thị giao diện mặc định
                    return NotFound(new { message = "Trung tâm chưa cấu hình trang chủ." });
                }

                return Ok(result);
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpPost("save/{tenantId}")]
        public async Task<IActionResult> SaveCenterHome(string tenantId, [FromForm] SaveCenterHomeDto dto) // Đổi sang [FromForm]
        {
            try
            {
                if (string.IsNullOrEmpty(tenantId))
                    return BadRequest("TenantId không hợp lệ");

                var success = await _centerHomeService.SaveCenterHomeAsync(tenantId, dto);

                if (success)
                    return Ok(new { message = "Lưu thông tin trang chủ thành công!" });

                return BadRequest("Có lỗi xảy ra khi lưu dữ liệu.");
            }
            catch (Exception ex)
            {
                // Bóc tách lỗi chi tiết từ Database (Inner Exception)
                string errorMsg = ex.Message;
                if (ex.InnerException != null)
                {
                    errorMsg = ex.InnerException.Message; // Đây mới là lỗi thực sự từ SQL Server
                }

                return BadRequest(new { message = errorMsg }); return BadRequest(new { message = ex.Message });
            }
        }
    }
}