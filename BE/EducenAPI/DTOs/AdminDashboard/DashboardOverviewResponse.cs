using System;
using System.Collections.Generic;

namespace EducenAPI.DTOs.AdminDashboard
{
    public class DashboardOverviewResponse
    {
        public int TotalTenants { get; set; }

        public int ActiveTenants { get; set; }

        public int ExpiredTenants { get; set; }

        public int TotalUsers { get; set; }

        public int TotalStudents { get; set; }

        public int TotalClasses { get; set; }

        public double TotalStorageMB { get; set; }
    }
    public class RevenueReportResponse
    {
        public decimal TotalRevenue { get; set; }

        public decimal ThisMonthRevenue { get; set; }

        public List<RevenueByMonth> RevenueByMonth { get; set; }
    }

    public class RevenueByMonth
    {
        public string Month { get; set; }

        public decimal Revenue { get; set; }
    }
    public class TenantsByPlanResponse
    {
        public string PlanName { get; set; }

        public int TotalTenants { get; set; }
    }
    public class TopCenterResponse
    {
        public string TenantName { get; set; }

        public int TotalStudents { get; set; }

        public int TotalClasses { get; set; }
    }
    public class ExpiringSubscriptionResponse
    {
        public string TenantName { get; set; }
        public string SubDomain { get; set; }
        public string PlanName { get; set; }
        public DateTime ExpiredAt { get; set; }
    }
}
