using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace EducenAPI.Models
{
    /// <summary>
    /// Thông báo trong hệ thống - hỗ trợ Student, Parent, Teacher
    /// </summary>
    public class Notification
    {
        [Key]
        public int NotificationId { get; set; }

        [Required]
        public string TenantId { get; set; } = string.Empty;

        [Required]
        public int UserId { get; set; } // User nhận thông báo

        [MaxLength(50)]
        public string TargetRole { get; set; } = string.Empty; // Student, Parent, Teacher, Admin, Staff

        public int? StudentId { get; set; } // Link to student (dùng cho Parent nhận notification của con)

        [Required]
        [MaxLength(100)]
        public string Title { get; set; } = string.Empty;

        [Required]
        public string Message { get; set; } = string.Empty;

        [MaxLength(50)]
        public string Type { get; set; } = "Info"; // Info, Warning, Success, Error

        [MaxLength(50)]
        public string Category { get; set; } = string.Empty; // invoice, class, assignment, grade, schedule, attendance, submission, system

        public string? ReferenceId { get; set; } // ID tham chiếu

        public string? ReferenceType { get; set; } // Assignment, Submission, TuitionInvoice, ClassSession

        public bool IsRead { get; set; } = false;

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        public DateTime? ReadAt { get; set; }

        // Kênh gửi
        public bool IsInApp { get; set; } = true;
        public bool IsEmailSent { get; set; } = false;
        public bool IsZaloSent { get; set; } = false;

        // Navigation
        [ForeignKey(nameof(UserId))]
        public User User { get; set; } = null!;
    }

    /// <summary>
    /// Cài đặt nhận thông báo của user
    /// </summary>
    public class NotificationSetting
    {
        [Key]
        public int Id { get; set; }

        [Required]
        public string TenantId { get; set; } = string.Empty;

        [Required]
        public int UserId { get; set; }

        // Các loại thông báo
        public bool InvoiceNotif { get; set; } = true;
        public bool AssignmentNotif { get; set; } = true;
        public bool GradeNotif { get; set; } = true;
        public bool ScheduleNotif { get; set; } = true;
        public bool AttendanceNotif { get; set; } = true;
        public bool SubmissionNotif { get; set; } = true;

        // Kênh nhận
        public bool EmailEnabled { get; set; } = true;
        public bool ZaloEnabled { get; set; } = false;
        public bool InAppEnabled { get; set; } = true;

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime? UpdatedAt { get; set; }
    }
}
