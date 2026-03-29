using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace EducenAPI.Models
{
    [Table("PaymentRecordTenant")]
    public class PaymentRecordTenant
    {
        [Key]
        public string PaymentId { get; set; } = Guid.NewGuid().ToString();

        [Required]
        public decimal Amount { get; set; }

        [MaxLength(50)]
        public string Status { get; set; } = string.Empty;

        public DateTime PaymentDate { get; set; }

        // === Mở rộng cho hệ thống thanh toán mới ===

        [MaxLength(30)]
        public string? TransactionType { get; set; } // 'Subscription' | 'Tuition'

        public string? ReferenceId { get; set; } // SubscriptionId hoặc InvoiceId

        [MaxLength(20)]
        public string? PaymentMethod { get; set; } // 'VNPay' | 'Cash' | 'Transfer'

        [MaxLength(500)]
        public string? Description { get; set; }

        public string? PaidBy { get; set; } // UserId ngưởi thanh toán

        public string? ProcessedBy { get; set; } // UserId ngưởi xử lý (nếu thanh toán thủ công)

        public ICollection<PaymentTransactionTenant> Transactions { get; set; } = new List<PaymentTransactionTenant>();
    }
}
