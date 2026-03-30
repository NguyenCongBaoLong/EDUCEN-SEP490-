using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace EducenAPI.Models
{
    /// <summary>
    /// Thông báo trong hệ thống cho Center Admin
    /// </summary>
    public class Notification
    {
        [Key]
        public int NotificationId { get; set; }

        [Required]
        public string TenantId { get; set; } = string.Empty;

        [Required]
        public int UserId { get; set; } // Admin/Staff nhận thông báo

        [Required]
        [MaxLength(100)]
        public string Title { get; set; } = string.Empty;

        [Required]
        public string Message { get; set; } = string.Empty;

        [MaxLength(50)]
        public string Type { get; set; } = "Info"; // Info | Warning | Success | Error

        [MaxLength(50)]
        public string Category { get; set; } = string.Empty; // 'Payment' | 'Invoice' | 'System'

        public string? ReferenceId { get; set; } // ID tham chiếu (InvoiceId, SubscriptionId...)

        public string? ReferenceType { get; set; } // 'TuitionInvoice' | 'Subscription' | 'Refund'

        public bool IsRead { get; set; } = false;

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        public DateTime? ReadAt { get; set; }

        // Navigation
        [ForeignKey(nameof(UserId))]
        public User User { get; set; } = null!;
    }
}
