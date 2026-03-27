using EducenAPI.Models;
using EducenAPI.Persistence.Contexts;
using EducenAPI.Services.Interface;
using EducenAPI.Ultils;
using Microsoft.EntityFrameworkCore;

namespace EducenAPI.Services
{
    public class PaymentReminderService : IPaymentReminderService
    {
        private readonly EducenV2Context _tenantContext;
        private readonly AdminDbContext _adminContext;
        private readonly MailService _mailService;
        private readonly ILogger<PaymentReminderService> _logger;

        public PaymentReminderService(
            EducenV2Context tenantContext,
            AdminDbContext adminContext,
            MailService mailService,
            ILogger<PaymentReminderService> logger)
        {
            _tenantContext = tenantContext;
            _adminContext = adminContext;
            _mailService = mailService;
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
                throw new Exception("Invoice not found");

            if (invoice.Status == "Paid" || invoice.Status == "Cancelled")
                throw new Exception("Invoice is already paid or cancelled");

            // Get student's parents
            var student = await _tenantContext.Students
                .Include(s => s.Parents)
                    .ThenInclude(p => p.ParentNavigation)
                .FirstOrDefaultAsync(s => s.UserId == invoice.StudentId);

            var parentEmails = student?.Parents
                .Select(p => p.ParentNavigation?.Email)
                .Where(e => !string.IsNullOrEmpty(e))
                .ToList() ?? new List<string?>();

            // Send email
            var emailSubject = $"[Educen] Nhắc nhở thanh toán học phí - Tháng {invoice.InvoiceMonth}/{invoice.InvoiceYear}";
            var emailBody = $@"
                <h2>Nhắc nhở thanh toán học phí</h2>
                <p>Kính gửi Phụ huynh/Học sinh,</p>
                <p>Hệ thống Educen xin nhắc nhở về khoản học phí sắp đến hạn:</p>
                <ul>
                    <li><strong>Học sinh:</strong> {invoice.Student.StudentNavigation?.FullName}</li>
                    <li><strong>Lớp học:</strong> {invoice.Class.ClassName}</li>
                    <li><strong>Tháng:</strong> {invoice.InvoiceMonth}/{invoice.InvoiceYear}</li>
                    <li><strong>Số buổi học:</strong> {invoice.AttendedSessions}</li>
                    <li><strong>Số tiền:</strong> {invoice.FinalAmount:N0} VNĐ</li>
                    <li><strong>Hạn thanh toán:</strong> {invoice.DueDate:dd/MM/yyyy}</li>
                </ul>
                <p>Vui lòng thanh toán trước hạn để tránh bị phạt.</p>
                <p>Trân trọng,<br/>Educen Team</p>
            ";

            foreach (var email in parentEmails)
            {
                if (!string.IsNullOrEmpty(email))
                {
                    try
                    {
                        await _mailService.SendEmailAsync(email, emailSubject, emailBody);
                    }
                    catch (Exception ex)
                    {
                        _logger.LogError(ex, "Failed to send reminder email to {Email}", email);
                    }
                }
            }

            // Create notification for Center Admin
            await CreateSystemNotificationAsync(new CreateNotificationRequest
            {
                TenantId = invoice.TenantId,
                UserId = int.Parse(invoice.CreatedBy ?? "1"), // Default to admin
                Title = "Nhắc nhở thanh toán đã được gửi",
                Message = $"Đã gửi nhắc nhở thanh toán cho hóa đơn {invoice.InvoiceId} - Học sinh: {invoice.Student.StudentNavigation?.FullName}",
                Type = "Info",
                Category = "Payment",
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
                        result.EmailSent++;
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
                Title = request.Title,
                Message = request.Message,
                Type = request.Type,
                Category = request.Category,
                ReferenceId = request.ReferenceId,
                ReferenceType = request.ReferenceType,
                IsRead = false,
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
    }
}
