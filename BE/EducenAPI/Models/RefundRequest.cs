using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace EducenAPI.Models
{
    /// <summary>
    /// Yêu cầu hoàn tiền (chỉ áp dụng cho System Admin ↔ Center - Subscription Payment)
    /// </summary>
    public class RefundRequest
    {
        [Key]
        public string RefundId { get; set; } = Guid.NewGuid().ToString();

        [Required]
        public string PaymentRecordId { get; set; } = string.Empty;

        public string? SubscriptionId { get; set; } // Tham chiếu đến subscription

        [Required]
        public string TenantId { get; set; } = string.Empty;

        [Required]
        public int RequestedBy { get; set; } // System Admin user ID

        [Required]
        public string Reason { get; set; } = string.Empty;

        [MaxLength(20)]
        public string RefundMethod { get; set; } = "Credit"; // Credit | Cash

        public bool IsServiceIssue { get; set; } = false;

        [Column(TypeName = "decimal(18,2)")]
        public decimal OriginalAmount { get; set; } // Số tiền gốc đã thanh toán

        [Column(TypeName = "decimal(18,2)")]
        public decimal RefundAmount { get; set; } // Số tiền hoàn lại

        [Required]
        [MaxLength(20)]
        public string Status { get; set; } = "Pending"; // Pending | Approved | Rejected | Processing | Completed | Failed

        public int? ApprovedBy { get; set; } // System Admin phê duyệt

        public DateTime? ApprovedAt { get; set; }

        public DateTime? ProcessedAt { get; set; }

        public string? GatewayRefundId { get; set; } // Mã hoàn tiền từ VNPay

        public string? GatewayRef { get; set; } // Mã giao dịch gốc từ gateway

        public string? GatewayResponse { get; set; } // JSON response từ gateway

        public string? RejectionReason { get; set; } // Lý do từ chối (nếu bị reject)

        public string? ErrorMessage { get; set; } // Lỗi nếu hoàn tiền thất bại

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        public DateTime? UpdatedAt { get; set; }

        // Navigation
        [ForeignKey(nameof(PaymentRecordId))]
        public PaymentRecord PaymentRecord { get; set; } = null!;
    }
}