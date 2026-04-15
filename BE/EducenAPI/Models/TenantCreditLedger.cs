using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace EducenAPI.Models
{
    public class TenantCreditLedger
    {
        [Key]
        public string LedgerId { get; set; } = Guid.NewGuid().ToString();

        [Required]
        public string TenantId { get; set; } = string.Empty;

        [Column(TypeName = "decimal(18,2)")]
        public decimal Amount { get; set; }

        [MaxLength(20)]
        public string EntryType { get; set; } = "Credit"; // Credit | Debit

        [MaxLength(200)]
        public string? ReferenceId { get; set; }

        [MaxLength(200)]
        public string? ReferenceType { get; set; }

        [Column(TypeName = "decimal(18,2)")]
        public decimal BalanceAfter { get; set; }

        [MaxLength(500)]
        public string? Note { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        /// <summary>
        /// Ngày hết hạn của credit (null = không có thời hạn)
        /// </summary>
        public DateTime? ExpiredAt { get; set; }

        /// <summary>
        /// Đã hết hạn chưa
        /// </summary>
        [NotMapped]
        public bool IsExpired => ExpiredAt.HasValue && ExpiredAt.Value < DateTime.UtcNow;

        [ForeignKey(nameof(TenantId))]
        public Tenant Tenant { get; set; } = null!;
    }
}
