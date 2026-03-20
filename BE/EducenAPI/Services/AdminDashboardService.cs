using EducenAPI.DTOs.AdminDashboard;
using EducenAPI.Persistence.Contexts;
using EducenAPI.Services.Interface;
using Microsoft.EntityFrameworkCore;

namespace EducenAPI.Services
{
    public class AdminDashboardService : IAdminDashboardService
    {
        private readonly AdminDbContext _adminDbContext;
        private readonly IServiceProvider _serviceProvider;

        public AdminDashboardService(
            AdminDbContext adminDbContext,
            IServiceProvider serviceProvider)
        {
            _adminDbContext = adminDbContext;
            _serviceProvider = serviceProvider;
        }

        // ================================
        // 1. OVERVIEW DASHBOARD
        // ================================
        public DashboardOverviewResponse GetOverview()
        {
            var tenants = _adminDbContext.Tenants.ToList();

            int totalUsers = 0;
            int totalStudents = 0;
            int totalClasses = 0;
            double totalStorage = 0;

            foreach (var tenant in tenants)
            {
                using var scope = _serviceProvider.CreateScope();

                var db = scope.ServiceProvider.GetRequiredService<EducenV2Context>();

                db.Database.SetConnectionString(tenant.ConnectionString);

                totalUsers += db.Users.Count();
                totalStudents += db.Students.Count();
                totalClasses += db.Classes.Count();
            }

            var activeTenants = _adminDbContext.Subscriptions
                .Count(s => s.EndDate > DateTime.UtcNow);

            var expiredTenants = _adminDbContext.Subscriptions
                .Count(s => s.EndDate <= DateTime.UtcNow);

            return new DashboardOverviewResponse
            {
                TotalTenants = tenants.Count,
                ActiveTenants = activeTenants,
                ExpiredTenants = expiredTenants,
                TotalUsers = totalUsers,
                TotalStudents = totalStudents,
                TotalClasses = totalClasses,
                TotalStorageMB = totalStorage
            };
        }

        // ================================
        // 2. REVENUE REPORT
        // ================================
        public RevenueReportResponse GetRevenue()
        {
            var payments = _adminDbContext.PaymentRecords.ToList();

            var totalRevenue = payments.Sum(p => p.Amount);

            var thisMonthRevenue = payments
                .Where(p => p.PaymentDate.Month == DateTime.UtcNow.Month &&
                            p.PaymentDate.Year == DateTime.UtcNow.Year)
                .Sum(p => p.Amount);

            var revenueByMonth = payments
                .GroupBy(p => new { p.PaymentDate.Year, p.PaymentDate.Month })
                .Select(g => new RevenueByMonth
                {
                    Month = $"{g.Key.Month}/{g.Key.Year}",
                    Revenue = g.Sum(x => x.Amount)
                })
                .OrderBy(x => x.Month)
                .ToList();

            return new RevenueReportResponse
            {
                TotalRevenue = totalRevenue,
                ThisMonthRevenue = thisMonthRevenue,
                RevenueByMonth = revenueByMonth
            };
        }

        // ================================
        // 3. TENANTS BY PLAN
        // ================================
        public List<TenantsByPlanResponse> GetTenantsByPlan()
        {
            return _adminDbContext.Subscriptions
                .Include(s => s.Plan)
                .GroupBy(s => s.Plan.PlanName)
                .Select(g => new TenantsByPlanResponse
                {
                    PlanName = g.Key,
                    TotalTenants = g.Count()
                })
                .ToList();
        }

        // ================================
        // 4. TOP CENTERS
        // ================================
        public List<TopCenterResponse> GetTopCenters()
        {
            var tenants = _adminDbContext.Tenants.ToList();

            var result = new List<TopCenterResponse>();

            foreach (var tenant in tenants)
            {
                using var scope = _serviceProvider.CreateScope();

                var db = scope.ServiceProvider.GetRequiredService<EducenV2Context>();

                db.Database.SetConnectionString(tenant.ConnectionString);

                result.Add(new TopCenterResponse
                {
                    TenantName = tenant.TenantName,
                    TotalStudents = db.Students.Count(),
                    TotalClasses = db.Classes.Count()
                });
            }

            return result
                .OrderByDescending(x => x.TotalStudents)
                .Take(5)
                .ToList();
        }

        // ================================
        // 5. EXPIRING SUBSCRIPTIONS
        // ================================
        public List<ExpiringSubscriptionResponse> GetExpiringSubscriptions()
        {
            return _adminDbContext.Subscriptions
                .Include(s => s.Plan)
                .Include(s => s.Tenant)
                .Where(s => s.EndDate <= DateTime.UtcNow.AddDays(7))
                .Select(s => new ExpiringSubscriptionResponse
                {
                    TenantName = s.Tenant.TenantName,
                    PlanName = s.Plan.PlanName,
                    ExpiredAt = s.EndDate
                })
                .ToList();
        }
    }
}