using EducenAPI.DTOs.AdminDashboard;

namespace EducenAPI.Services.Interface
{
    public interface IAdminDashboardService
    {
        Task<DashboardOverviewResponse> GetOverviewAsync();

        Task<RevenueReportResponse> GetRevenueAsync();

        Task<List<TenantsByPlanResponse>> GetTenantsByPlanAsync();

        Task<List<TopCenterResponse>> GetTopCentersAsync();

        Task<List<ExpiringSubscriptionResponse>> GetExpiringSubscriptionsAsync();
    }
}