using System.Threading.Tasks;
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

        [HttpGet]
        [AllowAnonymous] // Cho phép tất cả mọi người (kể cả chưa đăng nhập) xem trang chủ
        public async Task<IActionResult> GetCenterHome()
        {
            try
            {

                // Lấy BaseUrl (Ví dụ: http://localhost:5106)
                var baseUrl = $"{Request.Scheme}://{Request.Host}";

                var result = await _centerHomeService.GetCenterHomeAsync(baseUrl);

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

        [HttpPost("save")]
        public async Task<IActionResult> SaveCenterHome([FromForm] SaveCenterHomeDto dto) // Đổi sang [FromForm]
        {
            try
            {

                var baseUrl = $"{Request.Scheme}://{Request.Host}";
                var result = await _centerHomeService.SaveCenterHomeAsync(dto, baseUrl);
                
                if (result != null)
                    return Ok(result);
                
                return BadRequest(new { message = "Có lỗi xảy ra khi lưu dữ liệu." });
            }
            catch (Exception ex)
            {
                string errorMsg = ex.InnerException?.Message ?? ex.Message;
                return BadRequest(new { message = errorMsg });
            }
        }

        [HttpGet("classes")]
        [AllowAnonymous]
        public async Task<IActionResult> GetUpcomingClasses()
        {
            try
            {
                var result = await _centerHomeService.GetUpcomingClassesAsync();
                return Ok(result);
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }
    }
}
