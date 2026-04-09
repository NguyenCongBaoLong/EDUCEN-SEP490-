using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace EducenAPI.Models
{
    public class PackageChangeRequest
    {
        [Key]
        public string RequestId { get; set; } = Guid.NewGuid().ToString();

        [Required]
        public string TenantId { get; set; }

        [Required]
        public string CurrentPlanId { get; set; }

        [Required]
        public string RequestedPlanId { get; set; }

        [MaxLength(50)]
        public string Status { get; set; } = "Pending"; // Pending, Reviewed, Approved, Rejected, Cancelled

        [MaxLength(500)]
        public string? Reason { get; set; }

        public int RequestedMonths { get; set; } = 1;

        public DateTime RequestedAt { get; set; } = DateTime.UtcNow;
        public string? RequestedBy { get; set; }

        public DateTime? ReviewedAt { get; set; }
        public string? ReviewedBy { get; set; }

        [MaxLength(500)]
        public string? ReviewNote { get; set; }

        [ForeignKey(nameof(TenantId))]
        public Tenant Tenant { get; set; } = null!;

        [ForeignKey(nameof(CurrentPlanId))]
        public Plan CurrentPlan { get; set; } = null!;

        [ForeignKey(nameof(RequestedPlanId))]
        public Plan RequestedPlan { get; set; } = null!;

        public ICollection<Invoice> Invoices { get; set; } = new List<Invoice>();
    }

    public class Invoice
    {
        [Key]
        public string InvoiceId { get; set; } = Guid.NewGuid().ToString();

        [Required]
        public string TenantId { get; set; }

        [Required]
        public string PackageChangeRequestId { get; set; }

        [MaxLength(100)]
        public string InvoiceNumber { get; set; }

        [Column(TypeName = "decimal(18,2)")]
        public decimal Amount { get; set; }

        [MaxLength(50)]
        public string Status { get; set; } = "Pending"; // Pending, Paid, Cancelled

        [MaxLength(50)]
        public string PaymentMethod { get; set; } = "Cash"; // Cash, BankTransfer, VNPay

        [MaxLength(200)]
        public string? PaymentNote { get; set; }

        public DateTime? PaidAt { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public string? CreatedBy { get; set; }

        public DateTime DueDate { get; set; }

        [ForeignKey(nameof(TenantId))]
        public Tenant Tenant { get; set; } = null!;

        [ForeignKey(nameof(PackageChangeRequestId))]
        public PackageChangeRequest PackageChangeRequest { get; set; } = null!;
    }

    public class PaymentNotification
    {
        [Key]
        public string NotificationId { get; set; } = Guid.NewGuid().ToString();

        [Required]
        public string TenantId { get; set; }

        [MaxLength(50)]
        public string NotificationType { get; set; } // PackageExpiring, PaymentDue, PaymentReceived

        [MaxLength(200)]
        public string Title { get; set; }

        [MaxLength(1000)]
        public string Message { get; set; }

        [MaxLength(50)]
        public string Channel { get; set; } = "Email"; // Email, SMS, Zalo

        [MaxLength(50)]
        public string Status { get; set; } = "Pending"; // Pending, Sent, Failed

        public DateTime? SentAt { get; set; }

        public DateTime ScheduledFor { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        [ForeignKey(nameof(TenantId))]
        public Tenant Tenant { get; set; } = null!;
    }
}