using EducenAPI.Persistence.Contexts;
using EducenAPI.Services.Interface;
using EducenAPI.Ultils;
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
    public class MonthlyPerformanceReportService : BackgroundService
    {
        private readonly ILogger<MonthlyPerformanceReportService> _logger;
        private readonly IServiceProvider _serviceProvider;
        private readonly TimeSpan _checkInterval = TimeSpan.FromHours(1);

        public MonthlyPerformanceReportService(
            ILogger<MonthlyPerformanceReportService> logger,
            IServiceProvider serviceProvider)
        {
            _logger = logger;
            _serviceProvider = serviceProvider;
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            _logger.LogInformation("Monthly Performance Report Service is starting.");

            while (!stoppingToken.IsCancellationRequested)
            {
                try
                {
                    var now = DateTime.Now;
                    // Run on the 1st day of the month at 2:00 AM
                    if (now.Day == 1 && now.Hour == 2 && now.Minute < 5)
                    {
                        var previousMonthDate = now.AddMonths(-1);
                        int month = previousMonthDate.Month;
                        int year = previousMonthDate.Year;

                        _logger.LogInformation("Running monthly performance report for {Month}/{Year} at {Time}", month, year, now);
                        await SendMonthlyReportsAsync(month, year);
                    }
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Error occurred while sending monthly performance reports.");
                }

                await Task.Delay(_checkInterval, stoppingToken);
            }

            _logger.LogInformation("Monthly Performance Report Service is stopping.");
        }

        private async Task SendMonthlyReportsAsync(int month, int year)
        {
            using var scope = _serviceProvider.CreateScope();
            var context = scope.ServiceProvider.GetRequiredService<EducenV2Context>();
            var parentService = scope.ServiceProvider.GetRequiredService<IParentService>();
            var mailService = scope.ServiceProvider.GetRequiredService<MailService>();

            try
            {
                // Get all parents who have an email
                var parents = await context.Parents
                    .Include(p => p.ParentNavigation)
                    .Include(p => p.Students)
                        .ThenInclude(s => s.StudentNavigation)
                    .Where(p => p.ParentNavigation.Email != null && p.ParentNavigation.Email != "")
                    .ToListAsync();

                _logger.LogInformation("Found {Count} parents to process for monthly reports.", parents.Count);

                foreach (var parent in parents)
                {
                    foreach (var student in parent.Students)
                    {
                        try
                        {
                            var report = await parentService.GetChildPerformanceReportAsync(student.UserId, month, year);
                            
                            if (report != null && report.ClassSummaries.Any())
                            {
                                string parentEmail = parent.ParentNavigation.Email!;
                                string parentName = parent.ParentNavigation.FullName ?? parent.ParentNavigation.Username ?? "Quý phụ huynh";
                                string childName = student.StudentNavigation?.FullName ?? student.StudentNavigation?.Username ?? "Học sinh";

                                await mailService.SendMonthlyPerformanceReport(parentEmail, parentName, childName, month, year, report);
                                _logger.LogInformation("Sent monthly report for student {StudentId} to parent {ParentId}", student.UserId, parent.UserId);
                            }
                        }
                        catch (Exception ex)
                        {
                            _logger.LogError(ex, "Error sending monthly report for student {StudentId} to parent {ParentId}", student.UserId, parent.UserId);
                        }
                    }
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to send monthly performance reports");
            }
        }
    }
}
