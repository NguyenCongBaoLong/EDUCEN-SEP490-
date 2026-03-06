using EducenAPI.DTOs.Auth;
using EducenAPI.Services.Interface;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace EducenAPI.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class AuthController : ControllerBase
    {
        private readonly IAuthService _auth;

        public AuthController(IAuthService auth)
        {
            _auth = auth;
        }

        [HttpPost("register")]
        public async Task<IActionResult> Register(RegisterDto dto)
        {
            try
            {
                await _auth.Register(dto);
                return Ok("Đăng ký thành công");
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpPost("login")]
        public async Task<IActionResult> Login(LoginDto dto)
        {
            try
            {
                var token = await _auth.Login(dto);
                return Ok(token);
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpPost("reset-password")]
        public async Task<IActionResult> RequestResetPassword(ResetPasswordDto dto)
        {
            try
            {
                var result = await _auth.RequestResetPassword(dto);
                return Ok(new { message = result });
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpPost("reset-password/confirm")]
        public async Task<IActionResult> ConfirmResetPassword(ResetPasswordConfirmDto dto)
        {
            try
            {
                var success = await _auth.ConfirmResetPassword(dto);
                if (success)
                    return Ok(new { message = "Password reset successfully" });
                
                return BadRequest(new { message = "Failed to reset password" });
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }
    }
}
