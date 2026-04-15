using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace EducenAPI.Models
{
    public class TenantContract
    {
        [Key]
        public string ContractId { get; set; } = Guid.NewGuid().ToString();

        [Required]
        public string TenantId { get; set; }

        [Required]
        [MaxLength(200)]
        public string ContractTitle { get; set; }

        [MaxLength(500)]
        public string? Description { get; set; }

        [Required]
        [MaxLength(500)]
        public string FilePath { get; set; }

        [MaxLength(100)]
        public string FileType { get; set; } = "PDF";

        public long FileSize { get; set; }

        [MaxLength(50)]
        public string Status { get; set; } = "Active";

        public DateTime? StartDate { get; set; }
        public DateTime? EndDate { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public string? CreatedBy { get; set; }

        public DateTime? UpdatedAt { get; set; }
        public string? UpdatedBy { get; set; }

        [ForeignKey(nameof(TenantId))]
        public Tenant Tenant { get; set; } = null!;
    }
}