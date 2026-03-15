namespace EducenAPI.DTOs.Subscription
{
    public class SubscriptionResponseDTO
    {
        public string SubscriptionId { get; set; }
        public string TenantId { get; set; }
        public string TenantName { get; set; }

        public string PlanId { get; set; }
        public string PlanName { get; set; }

        public DateTime StartDate { get; set; }
        public DateTime EndDate { get; set; }

        public string Status { get; set; }
    }
}
