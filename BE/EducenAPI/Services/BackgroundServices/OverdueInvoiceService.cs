using EducenAPI.Services.Interface;
using EducenAPI.Persistence.Contexts;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using System;
using System.Threading;
using System.Threading.Tasks;

namespace EducenAPI.Services.BackgroundServices
{
    public class OverdueInvoiceService : BackgroundService
    {
        private readonly ILogger<OverdueInvoiceService> _logger;
        private readonly IServiceProvider _serviceProvider;
        private readonly TimeSpan _checkInterval = TimeSpan.FromHours(1); // Kiểm tra mỗi giờ

        public OverdueInvoiceService(
            ILogger<OverdueInvoiceService> logger,
            IServiceProvider serviceProvider)
        {
            _logger = logger;
            _serviceProvider = serviceProvider;
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            _logger.LogInformation("Overdue Invoice Service is starting.");

            // Chạy ngay khi start để cập nhật các hóa đơn quá hạn
            await UpdateOverdueInvoicesAsync();

            while (!stoppingToken.IsCancellationRequested)
            {
                try
                {
                    // Kiểm tra mỗi giờ một lần
                    await Task.Delay(_checkInterval, stoppingToken);

                    // Chỉ chạy vào lúc 2:00 AM mỗi ngày để cập nhật
                    var now = DateTime.Now;
                    if (now.Hour == 2 && now.Minute < 5) // Trong 5 phút đầu tiên của giờ 2:00 AM
                    {
                        _logger.LogInformation("Running daily overdue invoice update at {Time}", now);
                        await UpdateOverdueInvoicesAsync();
                    }
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Error occurred while updating overdue invoices.");
                }
            }

            _logger.LogInformation("Overdue Invoice Service is stopping.");
        }

        private async Task UpdateOverdueInvoicesAsync()
        {
            using var scope = _serviceProvider.CreateScope();
            var invoiceService = scope.ServiceProvider.GetRequiredService<IInvoiceService>();
            var notificationService = scope.ServiceProvider.GetRequiredService<IPaymentReminderService>();
            var tenantContext = scope.ServiceProvider.GetRequiredService<EducenV2Context>();

            try
            {
                var overdueInvoices = await tenantContext.TuitionInvoices
                    .Include(i => i.Student)
                        .ThenInclude(s => s.StudentNavigation)
                    .Include(i => i.Class)
                    .Where(i => i.Status == "Sent" && i.DueDate < DateTime.UtcNow)
                    .ToListAsync();

                var updatedCount = await invoiceService.UpdateOverdueInvoicesAsync();
                
                if (updatedCount > 0)
                {
                    _logger.LogInformation("Successfully updated {Count} invoices to overdue status", updatedCount);

                    foreach (var invoice in overdueInvoices)
                    {
                        await notificationService.SendToStudentAndParentsAsync(invoice.StudentId, new CreateRoleNotificationRequest
                        {
                            TenantId = tenantContext.CurrentTenantId,
                            Title = "Hóa đơn học phí quá hạn",
                            Message = $"Hóa đơn học phí {invoice.InvoiceMonth}/{invoice.InvoiceYear} của {invoice.Student.StudentNavigation?.FullName} đã quá hạn. Vui lòng thanh toán sớm.",
                            Type = "Warning",
                            Category = "Invoice",
                            ReferenceId = invoice.InvoiceId,
                            ReferenceType = "TuitionInvoice"
                        });
                    }
                }
                else
                {
                    _logger.LogInformation("No overdue invoices found to update");
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to update overdue invoices");
            }
        }
    }
}