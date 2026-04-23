using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace EducenAPI.Models
{
    public class PaymentTransaction
    {
        [Key]
        public string TransactionId { get; set; } = Guid.NewGuid().ToString();

        [Required]
        public string PaymentRecordId { get; set; }

        [Required]
        [MaxLength(20)]
        public string GatewayType { get; set; } = string.Empty; // 'VNPay'

        [Required]
        public decimal Amount { get; set; }

        [Required]
        [MaxLength(20)]
        public string Status { get; set; } = "Pending"; // Pending | Success | Failed | Refunded

        public string? GatewayTransactionId { get; set; } // Mã giao dịch từ cổng thanh toán

        public string? GatewayResponse { get; set; } // JSON response từ gateway

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        public DateTime? CompletedAt { get; set; }

        public string? ErrorMessage { get; set; }

        // Navigation
        [ForeignKey(nameof(PaymentRecordId))]
        public PaymentRecord? PaymentRecord { get; set; }
    }
}