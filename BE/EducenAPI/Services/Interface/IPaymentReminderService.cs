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
