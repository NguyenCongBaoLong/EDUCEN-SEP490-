namespace EducenAPI.DTOs.Tenant
{
    public class TenantWithSubscriptionRequest
    {
        public string TenantId { get; set; } = string.Empty;
        public string TenantName { get; set; } = string.Empty;
        public string SubDomain { get; set; } = string.Empty;
        public bool IsActive { get; set; }

        // Contact info
        public string? ContactPerson { get; set; }
        public string? Email { get; set; }
        public string? PhoneNumber { get; set; }
        public string? Address { get; set; }

        // Subscription info
        public string? PlanName { get; set; }
        public bool IsSubscribed { get; set; }
        public DateTime? ExpiredAt { get; set; }

        // Plan limits (từ gói đang đăng ký)
        public int? LimitUsers { get; set; }
        public int? StorageLimit { get; set; }

        // Usage stats
        public int TotalUsers { get; set; }
        public int TotalStudents { get; set; }
        public int TotalClasses { get; set; }
        public double StorageMB { get; set; }
    }
}
