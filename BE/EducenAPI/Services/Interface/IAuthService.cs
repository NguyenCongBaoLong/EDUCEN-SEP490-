using EducenAPI.DTOs;

namespace EducenAPI.Services.Interface
{
    public interface IAuthService
    {
        Task<string> Login(LoginDto dto);
        Task Register(RegisterDto dto);
    }

}
