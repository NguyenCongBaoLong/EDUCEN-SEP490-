using EducenAPI.Models;

namespace EducenAPI.Services.Interface
{
    /// <summary>
    /// Service gửi nhắc nhở thanh toán tự động
    /// </summary>
    public interface IPaymentReminderService
    {
        /// <summary>
        /// Gửi nhắc nhở thanh toán cho hóa đơn cụ thể
        /// </summary>
        Task<bool> SendReminderAsync(string invoiceId);

        /// <summary>
        /// Gửi nhắc nhở hàng loạt cho các hóa đơn sắp đến hạn
        /// </summary>
        Task<ReminderBatchResult> SendBatchRemindersAsync(int daysBefore = 3);

        /// <summary>
        /// Tạo thông báo trong hệ thống cho Center Admin
        /// </summary>
        Task<Notification> CreateSystemNotificationAsync(CreateNotificationRequest request);

        /// <summary>
        /// Lấy danh sách thông báo của user
        /// </summary>
        Task<List<Notification>> GetUserNotificationsAsync(string tenantId, int userId, bool unreadOnly = false);

        /// <summary>
        /// Đánh dấu thông báo đã đọc
        /// </summary>
        Task<bool> MarkNotificationAsReadAsync(int notificationId);

        /// <summary>
        /// Xóa thông báo
        /// </summary>
        Task<bool> DeleteNotificationAsync(int notificationId);

        /// <summary>
        /// Đánh dấu tất cả thông báo chưa đọc của user là đã đọc
        /// </summary>
        Task<int> MarkAllAsReadAsync(int userId);

        // === NEW METHODS FOR ROLE-BASED NOTIFICATIONS ===

        /// <summary>
        /// Gửi thông báo cho student và tự động cho parent của student đó
        /// </summary>
        Task<List<Notification>> SendToStudentAndParentsAsync(int studentId, CreateRoleNotificationRequest request);

        /// <summary>
        /// Gửi thông báo cho parent của một student
        /// </summary>
        Task<List<Notification>> SendToParentsOfStudentAsync(int studentId, CreateRoleNotificationRequest request);

        /// <summary>
        /// Gửi cho tất cả students trong một lớp
        /// </summary>
        Task<List<Notification>> SendToClassStudentsAsync(int classId, CreateRoleNotificationRequest request);

        /// <summary>
        /// Gửi cho giáo viên được phân công dạy một lớp
        /// </summary>
        Task<List<Notification>> SendToClassTeachersAsync(int classId, CreateRoleNotificationRequest request);

        /// <summary>
        /// Gửi cho parent của tất cả students trong một lớp
        /// </summary>
        Task<List<Notification>> SendToClassParentsAsync(int classId, CreateRoleNotificationRequest request);

        /// <summary>
        /// Gửi thông báo theo role (Student, Parent, Teacher)
        /// </summary>
        Task<List<Notification>> SendToRoleAsync(string tenantId, string role, CreateRoleNotificationRequest request);

        /// <summary>
        /// Đếm thông báo chưa đọc
        /// </summary>
        Task<int> GetUnreadCountAsync(int userId);

        /// <summary>
        /// Lấy cài đặt thông báo của user
        /// </summary>
        Task<NotificationSetting> GetNotificationSettingsAsync(int userId);

        /// <summary>
        /// Cập nhật cài đặt thông báo
        /// </summary>
        Task<NotificationSetting> UpdateNotificationSettingsAsync(int userId, UpdateNotificationSettingsRequest request);
    }

    /// <summary>
    /// Dùng cho role-based notifications
    /// </summary>
    public class CreateRoleNotificationRequest
    {
        public string TenantId { get; set; } = string.Empty;
        public string Title { get; set; } = string.Empty;
        public string Message { get; set; } = string.Empty;
        public string Type { get; set; } = "Info"; // Info, Warning, Success, Error
        public string Category { get; set; } = string.Empty; // invoice, class, assignment, grade, schedule, attendance, submission, system
        public string? ReferenceId { get; set; }
        public string? ReferenceType { get; set; }
    }

    public class UpdateNotificationSettingsRequest
    {
        public bool InvoiceNotif { get; set; } = true;
        public bool AssignmentNotif { get; set; } = true;
        public bool GradeNotif { get; set; } = true;
        public bool ScheduleNotif { get; set; } = true;
        public bool AttendanceNotif { get; set; } = true;
        public bool SubmissionNotif { get; set; } = true;
        public bool EmailEnabled { get; set; } = true;
        public bool ZaloEnabled { get; set; } = false;
        public bool InAppEnabled { get; set; } = true;
    }

    public class CreateNotificationRequest
    {
        public string TenantId { get; set; } = string.Empty;
        public int UserId { get; set; }
        public string Title { get; set; } = string.Empty;
        public string Message { get; set; } = string.Empty;
        public string Type { get; set; } = "Info"; // Info | Warning | Success | Error
        public string Category { get; set; } = "Payment"; // Payment | Invoice | System
        public string? ReferenceId { get; set; }
        public string? ReferenceType { get; set; }
        public string? TargetRole { get; set; }
        public int? StudentId { get; set; }
        public bool IsInApp { get; set; } = true;
    }

    public class ReminderBatchResult
    {
        public int TotalInvoices { get; set; }
        public int EmailSent { get; set; }
        public int NotificationCreated { get; set; }
        public int Failed { get; set; }
        public List<string> Errors { get; set; } = new();
    }
}
