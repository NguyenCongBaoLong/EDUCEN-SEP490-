namespace EducenAPI.DTOs.Plans
{
    public class PlanDto
    {
        public string PlanId { get; set; } = string.Empty;
        public string PlanName { get; set; } = string.Empty;
        public decimal Price { get; set; }
        public int LimitUsers { get; set; }
        public string? Features { get; set; }
        public int StorageLimit { get; set; }
        public bool IsActive { get; set; }
        public bool IsTrial { get; set; }
        public int TrialDays { get; set; }
        public bool IsDeprecated { get; set; }
    }
}
