using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace EducenAPI.Models
{
    public class TenantPaymentGatewayConfig
    {
        [Key]
        public string ConfigId { get; set; } = Guid.NewGuid().ToString();

        [Required]
        public string TenantId { get; set; } = string.Empty;

        [Required]
        [MaxLength(50)]
        public string GatewayType { get; set; } = string.Empty;

        [MaxLength(150)]
        public string? DisplayName { get; set; }

        [Required]
        public string ConfigData { get; set; } = string.Empty;

        [Required]
        [MaxLength(30)]
        public string Status { get; set; } = "Draft";

        public DateTime? SubmittedAt { get; set; }

        public DateTime? ApprovedAt { get; set; }

        public DateTime? ActivatedAt { get; set; }

        public DateTime? DeactivatedAt { get; set; }

        [MaxLength(500)]
        public string? StatusReason { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        [MaxLength(100)]
        public string? CreatedBy { get; set; }

        public DateTime? UpdatedAt { get; set; }

        [MaxLength(100)]
        public string? UpdatedBy { get; set; }

        public bool IsDeleted { get; set; } = false;

        public DateTime? DeletedAt { get; set; }

        [MaxLength(100)]
        public string? DeletedBy { get; set; }

        [Timestamp]
        public byte[] RowVersion { get; set; } = Array.Empty<byte>();

        [ForeignKey(nameof(TenantId))]
        public Tenant Tenant { get; set; } = null!;

        public ICollection<TenantPaymentConfigAudit> AuditLogs { get; set; } = new List<TenantPaymentConfigAudit>();
    }
}
