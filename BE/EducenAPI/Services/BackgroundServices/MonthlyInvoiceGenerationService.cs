using EducenAPI.Persistence.Contexts;
using EducenAPI.Services.Interface;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using System;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;

namespace EducenAPI.Services.BackgroundServices
{
    public class MonthlyInvoiceGenerationService : BackgroundService
    {
        private readonly ILogger<MonthlyInvoiceGenerationService> _logger;
        private readonly IServiceProvider _serviceProvider;
        private readonly TimeSpan _checkInterval = TimeSpan.FromHours(1);

        public MonthlyInvoiceGenerationService(
            ILogger<MonthlyInvoiceGenerationService> logger,
            IServiceProvider serviceProvider)
        {
            _logger = logger;
            _serviceProvider = serviceProvider;
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            _logger.LogInformation("Monthly Invoice Generation Service is starting.");

            while (!stoppingToken.IsCancellationRequested)
            {
                try
                {
                    await Task.Delay(_checkInterval, stoppingToken);

                    var now = DateTime.Now;
                    if (IsFirstDayOfMonth(now) && now.Hour == 1 && now.Minute < 5)
                    {
                        _logger.LogInformation("Running monthly invoice generation at {Time}", now);
                        await GenerateMonthlyInvoicesAsync();
                    }
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Error occurred while generating monthly invoices.");
                }
            }

            _logger.LogInformation("Monthly Invoice Generation Service is stopping.");
        }

        private bool IsFirstDayOfMonth(DateTime date)
        {
            return date.Day == 1;
        }

        private async Task GenerateMonthlyInvoicesAsync()
        {
            using var scope = _serviceProvider.CreateScope();
            var context = scope.ServiceProvider.GetRequiredService<EducenV2Context>();

            try
            {
                var now = DateTime.Now;
                var previousMonth = now.AddMonths(-1);
                var month = previousMonth.Month;
                var year = previousMonth.Year;

                _logger.LogInformation("Generating invoices for {Month}/{Year}", month, year);

                var classes = await context.Classes
                    .Where(c => c.PricePerSession.HasValue && c.PricePerSession.Value > 0)
                    .ToListAsync();

                var totalInvoicesCreated = 0;
                var totalErrors = 0;

                foreach (var classEntity in classes)
                {
                    try
                    {
                        var students = await context.Students
                            .Include(s => s.Classes)
                            .Where(s => s.Classes.Any(c => c.ClassId == classEntity.ClassId))
                            .ToListAsync();

                        foreach (var student in students)
                        {
                            try
                            {
                                var existingInvoice = await context.TuitionInvoices
                                    .FirstOrDefaultAsync(i =>
                                        i.StudentId == student.UserId &&
                                        i.ClassId == classEntity.ClassId &&
                                        i.InvoiceMonth == month &&
                                        i.InvoiceYear == year);

                                if (existingInvoice != null)
                                {
                                    _logger.LogDebug("Invoice already exists for student {StudentId}, class {ClassId}", 
                                        student.UserId, classEntity.ClassId);
                                    continue;
                                }

                                var startOfMonth = new DateTime(year, month, 1);
                                var startOfNextMonth = startOfMonth.AddMonths(1);

                                var sessions = await context.ClassSessions
                                    .Include(s => s.Attendances)
                                    .Where(s => s.Schedule.ClassId == classEntity.ClassId &&
                                                s.SessionDate >= startOfMonth &&
                                                s.SessionDate < startOfNextMonth)
                                    .ToListAsync();

                                var attendedSessions = 0;
                                foreach (var session in sessions)
                                {
                                    var attendance = session.Attendances?.FirstOrDefault(a => a.StudentId == student.UserId);
                                    var status = attendance?.Status ?? "Absent";
                                    if (status == "present" || status == "Attended")
                                        attendedSessions++;
                                }

                                if (attendedSessions == 0)
                                {
                                    _logger.LogDebug("Student {StudentId} has no attended sessions, skipping invoice", student.UserId);
                                    continue;
                                }

                                var totalAmount = attendedSessions * classEntity.PricePerSession.Value;
                                var dueDate = new DateTime(now.Year, now.Month, 10);

                                var invoice = new Models.TuitionInvoice
                                {
                                    InvoiceId = Guid.NewGuid().ToString(),
                                    StudentId = student.UserId,
                                    ClassId = classEntity.ClassId,
                                    InvoiceMonth = month,
                                    InvoiceYear = year,
                                    TotalSessions = sessions.Count,
                                    AttendedSessions = attendedSessions,
                                    AbsentSessions = sessions.Count - attendedSessions,
                                    PricePerSession = classEntity.PricePerSession.Value,
                                    TotalAmount = totalAmount,
                                    DiscountAmount = 0,
                                    FinalAmount = totalAmount,
                                    Status = "Draft",
                                    DueDate = dueDate,
                                    CreatedAt = DateTime.UtcNow,
                                    CreatedBy = "System"
                                };

                                context.TuitionInvoices.Add(invoice);
                                totalInvoicesCreated++;

                                _logger.LogInformation("Created invoice for student {StudentId}, class {ClassId}, amount: {Amount}",
                                    student.UserId, classEntity.ClassId, totalAmount);
                            }
                            catch (Exception ex)
                            {
                                _logger.LogError(ex, "Error creating invoice for student {StudentId} in class {ClassId}",
                                    student.UserId, classEntity.ClassId);
                                totalErrors++;
                            }
                        }
                    }
                    catch (Exception ex)
                    {
                        _logger.LogError(ex, "Error processing class {ClassId}", classEntity.ClassId);
                        totalErrors++;
                    }
                }

                await context.SaveChangesAsync();

                if (totalInvoicesCreated > 0)
                {
                    await SendInvoiceNotificationAsync(scope, month, year, totalInvoicesCreated);
                }

                _logger.LogInformation("Monthly invoice generation completed. Created: {Created}, Errors: {Errors}",
                    totalInvoicesCreated, totalErrors);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to generate monthly invoices");
            }
        }

        private async Task SendInvoiceNotificationAsync(IServiceScope scope, int month, int year, int count)
        {
            try
            {
                var notificationService = scope.ServiceProvider.GetRequiredService<IPaymentReminderService>();
                var context = scope.ServiceProvider.GetRequiredService<EducenV2Context>();

                var title = $"Hóa đơn học phí tháng {month}/{year}";
                var message = $"Hệ thống đã tự động tạo {count} hóa đơn học phí cho tháng {month}/{year}. Vui lòng đăng nhập để xem chi tiết.";

                var centerAdmins = await context.Users
                    .Where(u => u.RoleId == 2) // CenterAdmin role
                    .ToListAsync();

                foreach (var admin in centerAdmins)
                {
                    await notificationService.SendToRoleAsync(
                        context.CurrentTenantId,
                        "Admin",
                        new CreateRoleNotificationRequest
                        {
                            TenantId = context.CurrentTenantId,
                            Title = title,
                            Message = message,
                            Type = "Info",
                            Category = "Invoice",
                            ReferenceType = "System"
                        });
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to send invoice notification");
            }
        }
    }
}