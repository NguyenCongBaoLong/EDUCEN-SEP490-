using EducenAPI.DTOs.Auth;
using EducenAPI.DTOs.Common;
using EducenAPI.Services.Interface;
using Microsoft.AspNetCore.Authorization;
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
        [AllowAnonymous]
        public async Task<IActionResult> Register(RegisterDto dto)
        {
            try
            {
                await _auth.Register(dto);
                return Ok(ApiResponse<string>.SuccessResponse("Đăng ký thành công", "Registration successful"));
            }
            catch (Exception ex)
            {
                return BadRequest(ApiResponse<string>.ErrorResponse(ex.Message));
            }
        }

        [HttpPost("login")]
        [AllowAnonymous]
        public async Task<IActionResult> Login(LoginDto dto)
        {
            try
            {
                var token = await _auth.Login(dto);
                return Ok(ApiResponse<string>.SuccessResponse(token, "Login successful"));
            }
            catch (Exception ex)
            {
                return BadRequest(ApiResponse<string>.ErrorResponse(ex.Message));
            }
        }

        [HttpPost("reset-password")]
        public async Task<IActionResult> RequestResetPassword(ResetPasswordDto dto)
        {
            try
            {
                var result = await _auth.RequestResetPassword(dto);
                return Ok(ApiResponse<string>.SuccessResponse(result, "Password reset request processed"));
            }
            catch (Exception ex)
            {
                return BadRequest(ApiResponse<string>.ErrorResponse(ex.Message));
            }
        }

        [HttpPost("reset-password/confirm")]
        public async Task<IActionResult> ConfirmResetPassword(ResetPasswordConfirmDto dto)
        {
            try
            {
                var success = await _auth.ConfirmResetPassword(dto);
                if (success)
                    return Ok(ApiResponse<bool>.SuccessResponse(true, "Password reset successfully"));
                
                return BadRequest(ApiResponse<bool>.ErrorResponse("Failed to reset password"));
            }
            catch (Exception ex)
            {
                return BadRequest(ApiResponse<string>.ErrorResponse(ex.Message));
            }
        }

        [HttpPost("generate-student-account/{studentId}")]
        public async Task<IActionResult> GenerateStudentAccount(int studentId)
        {
            try
            {
                var result = await _auth.GenerateStudentAccount(studentId);
                return Ok(ApiResponse<GeneratedAccountDto>.SuccessResponse(result, "Student account generated"));
            }
            catch (Exception ex)
            {
                return BadRequest(ApiResponse<string>.ErrorResponse(ex.Message));
            }
        }
    }
}
