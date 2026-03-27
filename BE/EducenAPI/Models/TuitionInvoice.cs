using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace EducenAPI.Models
{
    /// <summary>
    /// Hóa đơn học phí - Tính theo số buổi học thực tế
    /// </summary>
    public class TuitionInvoice
    {
        [Key]
        public string InvoiceId { get; set; } = Guid.NewGuid().ToString();

        [Required]
        public string TenantId { get; set; } = string.Empty;

        [Required]
        public int StudentId { get; set; }

        [Required]
        public int ClassId { get; set; }

        [Required]
        public int InvoiceMonth { get; set; } // 1-12

        [Required]
        public int InvoiceYear { get; set; }

        public int TotalSessions { get; set; } // Tổng số buổi học trong tháng

        public int AttendedSessions { get; set; } // Số buổi đã học

        public int AbsentSessions { get; set; } // Số buổi vắng

        public int ExcusedSessions { get; set; } // Số buổi vắng có phép (không tính tiền)

        [Column(TypeName = "decimal(18,2)")]
        public decimal PricePerSession { get; set; } // Giá mỗi buổi (lưu lại để tham khảo)

        [Column(TypeName = "decimal(18,2)")]
        public decimal TotalAmount { get; set; } // Tổng tiền = AttendedSessions * PricePerSession

        [Column(TypeName = "decimal(18,2)")]
        public decimal DiscountAmount { get; set; } = 0; // Giảm giá

        [Column(TypeName = "decimal(18,2)")]
        public decimal FinalAmount { get; set; } // Số tiền cuối cùng phải trả

        [Required]
        [MaxLength(20)]
        public string Status { get; set; } = "Draft"; // Draft | Sent | Paid | Overdue | Cancelled

        [Required]
        public DateTime DueDate { get; set; }

        public DateTime? PaidAt { get; set; }

        public string? PaymentRecordId { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        public DateTime? UpdatedAt { get; set; }

        public string? CreatedBy { get; set; } // UserId ngưởi tạo hóa đơn

        public string? Notes { get; set; }

        // Navigation
        [ForeignKey(nameof(StudentId))]
        public Student Student { get; set; } = null!;

        [ForeignKey(nameof(ClassId))]
        public Class Class { get; set; } = null!;

        public ICollection<TuitionInvoiceItem> Items { get; set; } = new List<TuitionInvoiceItem>();
    }
}
