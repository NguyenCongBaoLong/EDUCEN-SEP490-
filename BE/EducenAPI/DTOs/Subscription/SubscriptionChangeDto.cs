namespace EducenAPI.DTOs.Subscription
{
    public class SubscriptionInvoiceListItemDto
    {
        public string InvoiceId { get; set; } = string.Empty;
        public string TenantId { get; set; } = string.Empty;
        public string PackageChangeRequestId { get; set; } = string.Empty;
        public string InvoiceNumber { get; set; } = string.Empty;
        public decimal Amount { get; set; }
        public string Status { get; set; } = string.Empty;
        public string PaymentMethod { get; set; } = string.Empty;
        public string? PaymentNote { get; set; }
        public DateTime DueDate { get; set; }
        public DateTime CreatedAt { get; set; }
        public string CreatedBy { get; set; } = string.Empty;
        public DateTime? PaidAt { get; set; }
        public SubscriptionInvoiceTenantDto? Tenant { get; set; }
        public SubscriptionInvoiceRequestDto? PackageChangeRequest { get; set; }
    }

    public class SubscriptionInvoiceTenantDto
    {
        public string TenantId { get; set; } = string.Empty;
        public string TenantName { get; set; } = string.Empty;
        public string? Email { get; set; }
        public string? PhoneNumber { get; set; }
        public string? ContactPerson { get; set; }
    }

    public class SubscriptionInvoiceRequestDto
    {
        public string RequestId { get; set; } = string.Empty;
        public string CurrentPlanId { get; set; } = string.Empty;
        public string RequestedPlanId { get; set; } = string.Empty;
        public int RequestedMonths { get; set; }
        public string Status { get; set; } = string.Empty;
        public string? Reason { get; set; }
        public string? ReviewNote { get; set; }
        public DateTime RequestedAt { get; set; }
        public DateTime? ReviewedAt { get; set; }
        public string? RequestedBy { get; set; }
        public string? ReviewedBy { get; set; }
        public SubscriptionInvoicePlanDto? RequestedPlan { get; set; }
    }

    public class SubscriptionInvoicePlanDto
    {
        public string PlanId { get; set; } = string.Empty;
        public string PlanName { get; set; } = string.Empty;
        public decimal Price { get; set; }
        public bool IsTrial { get; set; }
    }

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
