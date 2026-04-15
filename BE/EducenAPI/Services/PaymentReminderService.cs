using EducenAPI.Models;
using EducenAPI.Persistence.Contexts;
using EducenAPI.Services.Interface;
using Microsoft.EntityFrameworkCore;

namespace EducenAPI.Services
{
    public class PaymentReminderService : IPaymentReminderService
    {
        private readonly EducenV2Context _tenantContext;
        private readonly ILogger<PaymentReminderService> _logger;

        public PaymentReminderService(
            EducenV2Context tenantContext,
            ILogger<PaymentReminderService> logger)
        {
            _tenantContext = tenantContext;
            _logger = logger;
        }

        public async Task<bool> SendReminderAsync(string invoiceId)
        {
            var invoice = await _tenantContext.TuitionInvoices
                .Include(i => i.Student)
                    .ThenInclude(s => s.StudentNavigation)
                .Include(i => i.Class)
                .FirstOrDefaultAsync(i => i.InvoiceId == invoiceId);

            if (invoice == null)
                throw new Exception("Không tìm thấy hóa đơn");

            if (invoice.Status == "Paid" || invoice.Status == "Cancelled")
                throw new Exception("Hóa đơn đã được thanh toán hoặc đã hủy");

            await SendToStudentAndParentsAsync(invoice.StudentId, new CreateRoleNotificationRequest
            {
                TenantId = _tenantContext.CurrentTenantId,
                Title = $"Nhắc nhở học phí - {invoice.InvoiceMonth}/{invoice.InvoiceYear}",
                Message = $"Học phí của {invoice.Student.StudentNavigation?.FullName} lớp {invoice.Class.ClassName} đến hạn {invoice.DueDate:dd/MM/yyyy}. Số tiền: {invoice.FinalAmount:N0} VNĐ.",
                Type = "Warning",
                Category = "Invoice",
                ReferenceId = invoice.InvoiceId,
                ReferenceType = "TuitionInvoice"
            });

            _logger.LogInformation("Reminder sent for invoice {InvoiceId}", invoiceId);
            return true;
        }

        public async Task<ReminderBatchResult> SendBatchRemindersAsync(int daysBefore = 3)
        {
            var result = new ReminderBatchResult();

            // Get invoices due in specified days
            var targetDate = DateTime.UtcNow.AddDays(daysBefore).Date;
            var invoices = await _tenantContext.TuitionInvoices
                .Include(i => i.Student)
                    .ThenInclude(s => s.StudentNavigation)
                .Include(i => i.Class)
                .Where(i => i.Status == "Sent" && i.DueDate.Date == targetDate)
                .ToListAsync();

            result.TotalInvoices = invoices.Count;

            foreach (var invoice in invoices)
            {
                try
                {
                    // Send to parents/student
                    var success = await SendReminderAsync(invoice.InvoiceId);
                    if (success)
                    {
                        result.NotificationCreated++;
                    }
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Failed to send reminder for invoice {InvoiceId}", invoice.InvoiceId);
                    result.Errors.Add($"Invoice {invoice.InvoiceId}: {ex.Message}");
                    result.Failed++;
                }
            }

            return result;
        }

        public async Task<Notification> CreateSystemNotificationAsync(CreateNotificationRequest request)
        {
            var notification = new Notification
            {
                TenantId = request.TenantId,
                UserId = request.UserId,
                TargetRole = request.TargetRole ?? string.Empty,
                StudentId = request.StudentId,
                Title = request.Title,
                Message = request.Message,
                Type = request.Type,
                Category = request.Category,
                ReferenceId = request.ReferenceId,
                ReferenceType = request.ReferenceType,
                IsRead = false,
                IsInApp = request.IsInApp,
                IsEmailSent = false,
                IsZaloSent = false,
                CreatedAt = DateTime.UtcNow
            };

            _tenantContext.Notifications.Add(notification);
            await _tenantContext.SaveChangesAsync();

            return notification;
        }

        public async Task<List<Notification>> GetUserNotificationsAsync(string tenantId, int userId, bool unreadOnly = false)
        {
            var query = _tenantContext.Notifications
                .Where(n => n.TenantId == tenantId && n.UserId == userId);

            if (unreadOnly)
                query = query.Where(n => !n.IsRead);

            return await query.OrderByDescending(n => n.CreatedAt).ToListAsync();
        }

        public async Task<bool> MarkNotificationAsReadAsync(int notificationId)
        {
            var notification = await _tenantContext.Notifications.FindAsync(notificationId);
            if (notification == null) return false;

            notification.IsRead = true;
            notification.ReadAt = DateTime.UtcNow;
            await _tenantContext.SaveChangesAsync();

            return true;
        }

        public async Task<bool> DeleteNotificationAsync(int notificationId)
        {
            var notification = await _tenantContext.Notifications.FindAsync(notificationId);
            if (notification == null) return false;

            _tenantContext.Notifications.Remove(notification);
            await _tenantContext.SaveChangesAsync();

            return true;
        }

        public async Task<int> MarkAllAsReadAsync(int userId)
        {
            var unread = await _tenantContext.Notifications
                .Where(n => n.UserId == userId && !n.IsRead)
                .ToListAsync();

            foreach (var n in unread) n.IsRead = true;
            await _tenantContext.SaveChangesAsync();
            return unread.Count;
        }

        // === NEW METHODS FOR ROLE-BASED NOTIFICATIONS (Simplified) ===

        public async Task<List<Notification>> SendToStudentAndParentsAsync(int studentId, CreateRoleNotificationRequest request)
        {
            var notifications = new List<Notification>();

            var student = await _tenantContext.Students
                .Include(s => s.Parents)
                    .ThenInclude(p => p.ParentNavigation)
                .FirstOrDefaultAsync(s => s.UserId == studentId);

            if (student == null)
                return notifications;

            // Gửi cho student
            var studentNotif = CreateNotificationForUser(studentId, "Student", request, studentId);
            _tenantContext.Notifications.Add(studentNotif);
            notifications.Add(studentNotif);

            foreach (var parent in student.Parents)
            {
                var parentUserId = parent.ParentNavigation?.UserId ?? parent.UserId;
                var parentNotif = CreateNotificationForUser(parentUserId, "Parent", request, studentId);
                _tenantContext.Notifications.Add(parentNotif);
                notifications.Add(parentNotif);
            }

            if (notifications.Any())
                await _tenantContext.SaveChangesAsync();

            return notifications;
        }

        public async Task<List<Notification>> SendToParentsOfStudentAsync(int studentId, CreateRoleNotificationRequest request)
        {
            var notifications = new List<Notification>();

            var student = await _tenantContext.Students
                .Include(s => s.Parents)
                    .ThenInclude(p => p.ParentNavigation)
                .FirstOrDefaultAsync(s => s.UserId == studentId);

            if (student == null)
                return notifications;

            foreach (var parent in student.Parents)
            {
                var parentUserId = parent.ParentNavigation?.UserId ?? parent.UserId;
                var parentNotif = CreateNotificationForUser(parentUserId, "Parent", request, studentId);
                _tenantContext.Notifications.Add(parentNotif);
                notifications.Add(parentNotif);
            }

            if (notifications.Any())
                await _tenantContext.SaveChangesAsync();

            return notifications;
        }

        public async Task<List<Notification>> SendToClassStudentsAsync(int classId, CreateRoleNotificationRequest request)
        {
            var notifications = new List<Notification>();

            var classEntity = await _tenantContext.Classes
                .Include(c => c.Students)
                .FirstOrDefaultAsync(c => c.ClassId == classId);

            if (classEntity == null)
                return notifications;

            foreach (var student in classEntity.Students)
            {
                var notif = CreateNotificationForUser(student.UserId, "Student", request, student.UserId);
                _tenantContext.Notifications.Add(notif);
                notifications.Add(notif);
            }

            if (notifications.Any())
                await _tenantContext.SaveChangesAsync();

            return notifications;
        }

        public async Task<List<Notification>> SendToClassTeachersAsync(int classId, CreateRoleNotificationRequest request)
        {
            var notifications = new List<Notification>();

            var classEntity = await _tenantContext.Classes
                .FirstOrDefaultAsync(c => c.ClassId == classId);

            if (classEntity?.TeacherId == null)
                return notifications;

            var notif = CreateNotificationForUser(classEntity.TeacherId.Value, "Teacher", request, null);
            _tenantContext.Notifications.Add(notif);
            notifications.Add(notif);

            await _tenantContext.SaveChangesAsync();

            return notifications;
        }

        public async Task<List<Notification>> SendToClassParentsAsync(int classId, CreateRoleNotificationRequest request)
        {
            var notifications = new List<Notification>();

            var classEntity = await _tenantContext.Classes
                .Include(c => c.Students)
                    .ThenInclude(s => s.Parents)
                        .ThenInclude(p => p.ParentNavigation)
                .FirstOrDefaultAsync(c => c.ClassId == classId);

            if (classEntity == null)
                return notifications;

            foreach (var student in classEntity.Students)
            {
                foreach (var parent in student.Parents)
                {
                    var parentUserId = parent.ParentNavigation?.UserId ?? parent.UserId;
                    var notif = CreateNotificationForUser(parentUserId, "Parent", request, student.UserId);
                    _tenantContext.Notifications.Add(notif);
                    notifications.Add(notif);
                }
            }

            if (notifications.Any())
                await _tenantContext.SaveChangesAsync();

            return notifications;
        }

        public async Task<List<Notification>> SendToRoleAsync(string tenantId, string role, CreateRoleNotificationRequest request)
        {
            var notifications = new List<Notification>();

            // Gửi cho tất cả users với RoleId cụ thể
            // 1 = Admin, 2 = Teacher, 3 = Student, 4 = Parent (cần xác định đúng)
            int roleId = role switch
            {
                "Admin" => 1,
                "Teacher" => 2,
                "Student" => 3,
                "Parent" => 4,
                "Staff" => 5,
                _ => 0
            };

            if (roleId > 0)
            {
                var users = await _tenantContext.Users
                    .Where(u => u.RoleId == roleId)
                    .ToListAsync();

                foreach (var user in users)
                {
                    var notif = new Notification
                    {
                        TenantId = request.TenantId,
                        UserId = user.UserId,
                        TargetRole = role,
                        StudentId = null,
                        Title = request.Title,
                        Message = request.Message,
                        Type = request.Type,
                        Category = request.Category,
                        ReferenceId = request.ReferenceId,
                        ReferenceType = request.ReferenceType,
                        IsInApp = true,
                        CreatedAt = DateTime.UtcNow
                    };
                    _tenantContext.Notifications.Add(notif);
                    notifications.Add(notif);
                }

                if (notifications.Any())
                    await _tenantContext.SaveChangesAsync();
            }

            return notifications;
        }

        public async Task<int> GetUnreadCountAsync(int userId)
        {
            return await _tenantContext.Notifications
                .CountAsync(n => n.UserId == userId && !n.IsRead);
        }

        public async Task<NotificationSetting> GetNotificationSettingsAsync(int userId)
        {
            var setting = await _tenantContext.NotificationSettings
                .FirstOrDefaultAsync(s => s.UserId == userId);

            if (setting == null)
            {
                setting = new NotificationSetting
                {
                    TenantId = "",
                    UserId = userId
                };
                _tenantContext.NotificationSettings.Add(setting);
                await _tenantContext.SaveChangesAsync();
            }

            return setting;
        }

        public async Task<NotificationSetting> UpdateNotificationSettingsAsync(int userId, UpdateNotificationSettingsRequest request)
        {
            var setting = await _tenantContext.NotificationSettings
                .FirstOrDefaultAsync(s => s.UserId == userId);

            if (setting == null)
            {
                setting = new NotificationSetting
                {
                    TenantId = "",
                    UserId = userId
                };
                _tenantContext.NotificationSettings.Add(setting);
            }

            setting.InvoiceNotif = request.InvoiceNotif;
            setting.AssignmentNotif = request.AssignmentNotif;
            setting.GradeNotif = request.GradeNotif;
            setting.ScheduleNotif = request.ScheduleNotif;
            setting.AttendanceNotif = request.AttendanceNotif;
            setting.SubmissionNotif = request.SubmissionNotif;
            setting.EmailEnabled = request.EmailEnabled;
            setting.ZaloEnabled = request.ZaloEnabled;
            setting.InAppEnabled = request.InAppEnabled;
            setting.UpdatedAt = DateTime.UtcNow;

            await _tenantContext.SaveChangesAsync();
            return setting;
        }

        private static Notification CreateNotificationForUser(int userId, string role, CreateRoleNotificationRequest request, int? studentId)
        {
            return new Notification
            {
                TenantId = request.TenantId,
                UserId = userId,
                TargetRole = role,
                StudentId = studentId,
                Title = request.Title,
                Message = request.Message,
                Type = request.Type,
                Category = request.Category,
                ReferenceId = request.ReferenceId,
                ReferenceType = request.ReferenceType,
                IsInApp = true,
                IsRead = false,
                CreatedAt = DateTime.UtcNow
            };
        }
    }
}
