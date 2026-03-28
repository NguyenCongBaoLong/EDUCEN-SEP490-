using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace EducenAPI.Models
{
    /// <summary>
    /// Chi tiết từng buổi học trong hóa đơn
    /// </summary>
    public class TuitionInvoiceItem
    {
        [Key]
        public int ItemId { get; set; }

        [Required]
        public string InvoiceId { get; set; } = string.Empty;

        [Required]
        public int SessionId { get; set; } // ClassSession.Id

        [Required]
        public DateTime SessionDate { get; set; }

        [Required]
        [MaxLength(20)]
        public string Status { get; set; } = string.Empty; // Attended | Absent | Excused

        [Column(TypeName = "decimal(18,2)")]
        public decimal Amount { get; set; } // = 0 nếu Excused, = PricePerSession nếu Attended

        public string? Notes { get; set; }

        // Navigation
        [ForeignKey(nameof(InvoiceId))]
        public TuitionInvoice Invoice { get; set; } = null!;
    }
}
