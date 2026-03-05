using EducenAPI.DTOs.Profile;
using EducenAPI.Models;

namespace EducenAPI.Services.Interface
{
    public interface IProfileService
    {
        Task<User?> GetUserByIdAsync(int userId);
        Task<bool> UpdateProfileAsync(int userId, UpdateProfileRequest request);
        Task<bool> ChangePasswordAsync(int userId, ChangePasswordRequest request);
    }
}
