using EducenAPI.DTOs.Auth;

namespace EducenAPI.Services.Interface
{
    public interface IAuthService
    {
        Task<string> Login(LoginDto dto);
        Task Register(RegisterDto dto);
        Task<string> RequestResetPassword(ResetPasswordDto dto);
        Task<bool> ConfirmResetPassword(ResetPasswordConfirmDto dto);
        Task<GeneratedAccountDto> GenerateStudentAccount(int studentId);
    }
}

