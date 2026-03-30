using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace EducenAPI.Models
{
    public class TenantPaymentConfigAudit
    {
        [Key]
        public string AuditId { get; set; } = Guid.NewGuid().ToString();

        [Required]
        public string TenantPaymentGatewayConfigId { get; set; } = string.Empty;

        [Required]
        public string TenantId { get; set; } = string.Empty;

        [Required]
        [MaxLength(30)]
        public string Action { get; set; } = "Create";

        [MaxLength(30)]
        public string? OldStatus { get; set; }

        [MaxLength(30)]
        public string? NewStatus { get; set; }

        [MaxLength(500)]
        public string? Reason { get; set; }

        public string? SnapshotData { get; set; }

        public DateTime PerformedAt { get; set; } = DateTime.UtcNow;

        [MaxLength(100)]
        public string? PerformedBy { get; set; }

        [ForeignKey(nameof(TenantPaymentGatewayConfigId))]
        public TenantPaymentGatewayConfig TenantPaymentGatewayConfig { get; set; } = null!;

        [ForeignKey(nameof(TenantId))]
        public Tenant Tenant { get; set; } = null!;
    }
}
