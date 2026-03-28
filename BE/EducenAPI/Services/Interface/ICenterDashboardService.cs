using EducenAPI.DTOs.CenterDashboard;

namespace EducenAPI.Services.Interface
{
    public interface ICenterDashboardService
    {
        Task<CenterDashboardResponse> GetDashboardAsync();
    }
}