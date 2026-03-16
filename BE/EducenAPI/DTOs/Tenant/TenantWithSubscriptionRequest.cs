namespace EducenAPI.DTOs.Tenant
{
    public class TenantWithSubscriptionRequest
    {
        public string TenantName { get; set; } = string.Empty;

        public string? PlanName { get; set; }
        public bool IsSubscribed { get; set; }
        public DateTime? ExpiredAt { get; set; }

        public int TotalUsers { get; set; }
        public int TotalStudents { get; set; }
        public int TotalClasses { get; set; }

        public double StorageMB { get; set; }
    }
}
