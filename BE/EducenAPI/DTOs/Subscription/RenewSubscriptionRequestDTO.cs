namespace EducenAPI.DTOs.Subscription
{
    public class RenewSubscriptionRequestDTO
    {
        public string TenantId { get; set; }
        public int Months { get; set; }
    }

    public class ChangePlanRequestDTO
    {
        public string TenantId { get; set; }
        public string NewPlanId { get; set; }
        public int Months { get; set; }
    }
}
