using EducenAPI.Services.Interface;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace EducenAPI.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class NotificationsController : ControllerBase
    {
        private readonly IPaymentReminderService _notificationService;
        private readonly ILogger<NotificationsController> _logger;

        public NotificationsController(IPaymentReminderService notificationService, ILogger<NotificationsController> logger)
        {
            _notificationService = notificationService;
            _logger = logger;
        }

        /// <summary>
        /// Lấy danh sách thông báo của user hiện tại
        /// </summary>
        [HttpGet]
        public async Task<IActionResult> GetNotifications(
            [FromQuery] string tenantId,
            [FromQuery] bool unreadOnly = false)
        {
            try
            {
                var userId = GetCurrentUserId();
                var notifications = await _notificationService.GetUserNotificationsAsync(tenantId, userId, unreadOnly);
                return Ok(notifications);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting notifications");
                return BadRequest(new { message = ex.Message });
            }
        }

        /// <summary>
        /// Đánh dấu thông báo đã đọc
        /// </summary>
        [HttpPost("{notificationId}/read")]
        public async Task<IActionResult> MarkAsRead(int notificationId)
        {
            try
            {
                var success = await _notificationService.MarkNotificationAsReadAsync(notificationId);
                if (!success)
                    return NotFound(new { message = "Notification not found" });

                return Ok(new { message = "Notification marked as read" });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error marking notification as read");
                return BadRequest(new { message = ex.Message });
            }
        }

        /// <summary>
        /// Đánh dấu tất cả thông báo đã đọc
        /// </summary>
        [HttpPost("read-all")]
        public async Task<IActionResult> MarkAllAsRead([FromQuery] string tenantId)
        {
            try
            {
                var userId = GetCurrentUserId();
                var notifications = await _notificationService.GetUserNotificationsAsync(tenantId, userId, true);

                foreach (var notification in notifications)
                {
                    await _notificationService.MarkNotificationAsReadAsync(notification.NotificationId);
                }

                return Ok(new { message = $"Marked {notifications.Count} notifications as read" });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error marking all notifications as read");
                return BadRequest(new { message = ex.Message });
            }
        }

        /// <summary>
        /// Xóa thông báo
        /// </summary>
        [HttpDelete("{notificationId}")]
        public async Task<IActionResult> DeleteNotification(int notificationId)
        {
            try
            {
                var success = await _notificationService.DeleteNotificationAsync(notificationId);
                if (!success)
                    return NotFound(new { message = "Notification not found" });

                return Ok(new { message = "Notification deleted" });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error deleting notification");
                return BadRequest(new { message = ex.Message });
            }
        }

        /// <summary>
        /// Gửi nhắc nhở thanh toán cho hóa đơn (Admin)
        /// </summary>
        [HttpPost("send-reminder/{invoiceId}")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> SendReminder(string invoiceId)
        {
            try
            {
                var success = await _notificationService.SendReminderAsync(invoiceId);
                if (!success)
                    return BadRequest(new { message = "Failed to send reminder" });

                return Ok(new { message = "Reminder sent successfully" });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error sending reminder");
                return BadRequest(new { message = ex.Message });
            }
        }

        /// <summary>
        /// Gửi nhắc nhở hàng loạt (Admin/Background job)
        /// </summary>
        [HttpPost("send-batch-reminders")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> SendBatchReminders([FromQuery] int daysBefore = 3)
        {
            try
            {
                var result = await _notificationService.SendBatchRemindersAsync(daysBefore);
                return Ok(result);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error sending batch reminders");
                return BadRequest(new { message = ex.Message });
            }
        }

        /// <summary>
        /// Tạo thông báo mới (Admin)
        /// </summary>
        [HttpPost]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> CreateNotification([FromBody] CreateNotificationApiRequest request)
        {
            try
            {
                var notification = await _notificationService.CreateSystemNotificationAsync(new CreateNotificationRequest
                {
                    TenantId = request.TenantId,
                    UserId = request.UserId,
                    Title = request.Title,
                    Message = request.Message,
                    Type = request.Type,
                    Category = request.Category,
                    ReferenceId = request.ReferenceId,
                    ReferenceType = request.ReferenceType
                });

                return Ok(notification);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error creating notification");
                return BadRequest(new { message = ex.Message });
            }
        }

        private int GetCurrentUserId()
        {
            var userIdClaim = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(userIdClaim) || !int.TryParse(userIdClaim, out var userId))
                throw new Exception("Invalid user ID");
            return userId;
        }
    }

    public class CreateNotificationApiRequest
    {
        public string TenantId { get; set; } = string.Empty;
        public int UserId { get; set; }
        public string Title { get; set; } = string.Empty;
        public string Message { get; set; } = string.Empty;
        public string Type { get; set; } = "Info";
        public string Category { get; set; } = "Payment";
        public string? ReferenceId { get; set; }
        public string? ReferenceType { get; set; }
    }
}
