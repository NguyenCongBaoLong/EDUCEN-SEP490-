using EducenAPI.DTOs.AdminDashboard;

namespace EducenAPI.Services.Interface
{
    public interface IAdminDashboardService
    {
        Task<AdminDashboardResponse> GetDashboardAsync();
    }
}