namespace EducenAPI.DTOs.Subscription
{
    public class ReviewSubscriptionChangeRequestDto
    {
        public bool Approved { get; set; }
        public string? ReviewNote { get; set; }
    }

    public class CreateInvoiceDto
    {
        public int DueDays { get; set; } = 7;
    }

    public class UpdatePaymentDto
    {
        public string PaymentMethod { get; set; } = "Cash"; // Cash, VNPay
        public string? PaymentNote { get; set; }
    }

    public class CreateSubscriptionChangeRequestDto
    {
        public string RequestedPlanId { get; set; } = string.Empty;
        public int Months { get; set; } = 1;
        public string? Reason { get; set; }
    }
}
