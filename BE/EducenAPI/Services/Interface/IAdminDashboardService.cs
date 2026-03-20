using EducenAPI.DTOs.AdminDashboard;

namespace EducenAPI.Services.Interface
{
    public interface IAdminDashboardService
    {
        DashboardOverviewResponse GetOverview();

        RevenueReportResponse GetRevenue();

        List<TenantsByPlanResponse> GetTenantsByPlan();

        List<TopCenterResponse> GetTopCenters();

        List<ExpiringSubscriptionResponse> GetExpiringSubscriptions();
    }
}