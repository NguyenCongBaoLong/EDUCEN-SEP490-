using EducenAPI.DTOs.CenterHome;

namespace EducenAPI.Services.Interface
{
    public interface ICenterHomeService
    {
        Task<bool> SaveCenterHomeAsync(string tenantId, SaveCenterHomeDto dto);
        Task<CenterHomeResponseDto?> GetCenterHomeAsync(string tenantId, string baseUrl);
    }
}
