using EducenAPI.Models;
using EducenAPI.Persistence.Contexts;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;

namespace EducenAPI.Services.BackgroundServices
{
    public class CreditDeductionService : BackgroundService
    {
        private readonly ILogger<CreditDeductionService> _logger;
        private readonly IServiceProvider _serviceProvider;
        private static readonly int[] ScheduledHours = new[] { 0, 12 };

        public CreditDeductionService(
            ILogger<CreditDeductionService> logger,
            IServiceProvider serviceProvider)
        {
            _logger = logger;
            _serviceProvider = serviceProvider;
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            _logger.LogInformation("Credit Deduction Service is starting.");

            await CheckAndDeductCreditsAsync();

            while (!stoppingToken.IsCancellationRequested)
            {
                try
                {
                    var localNow = DateTime.Now;
                    var delay = GetDelayUntilNextScheduledRun(localNow);
                    var nextRun = localNow.Add(delay);

                    _logger.LogInformation("Next credit deduction scheduled at {NextRun}", nextRun);
                    await Task.Delay(delay, stoppingToken);

                    _logger.LogInformation("Running scheduled credit deduction at {Time}", DateTime.Now);
                    await CheckAndDeductCreditsAsync();
                }
                catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
                {
                    break;
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Error occurred while deducting credits.");
                }
            }

            _logger.LogInformation("Credit Deduction Service is stopping.");
        }

        private async Task CheckAndDeductCreditsAsync()
        {
            try
            {
                using var scope = _serviceProvider.CreateScope();
                var adminDbContext = scope.ServiceProvider.GetRequiredService<AdminDbContext>();

                var now = DateTime.UtcNow.Date;
                var todayStart = now;
                var todayEnd = now.AddDays(1);

                var activeSubscriptions = await adminDbContext.Subscriptions
                    .Include(s => s.Tenant)
                    .Include(s => s.Plan)
                    .Where(s => s.Status == "Active" && s.EndDate > now)
                    .ToListAsync();

                _logger.LogInformation("Processing {Count} active subscriptions for credit deduction", activeSubscriptions.Count);

                foreach (var subscription in activeSubscriptions)
                {
                    try
                    {
                        await ProcessSubscriptionDeductionAsync(adminDbContext, subscription, now, todayStart, todayEnd);
                    }
                    catch (Exception ex)
                    {
                        _logger.LogError(ex, "Failed to process credit deduction for subscription {SubscriptionId}, tenant {TenantId}",
                            subscription.Id, subscription.TenantId);
                    }
                }

                await adminDbContext.SaveChangesAsync();

                _logger.LogInformation("Completed credit deduction for {Count} subscriptions", activeSubscriptions.Count);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to process credit deductions");
            }
        }

        private async Task ProcessSubscriptionDeductionAsync(
            AdminDbContext context,
            Subscription subscription,
            DateTime now,
            DateTime todayStart,
            DateTime todayEnd)
        {
            var todayDeduction = await context.TenantCreditLedgers
                .AnyAsync(l =>
                    l.TenantId == subscription.TenantId &&
                    l.ReferenceId == subscription.Id &&
                    l.EntryType == "DailyDeduction" &&
                    l.CreatedAt >= todayStart &&
                    l.CreatedAt < todayEnd);

            if (todayDeduction)
            {
                _logger.LogDebug("Credit already deducted today for subscription {SubscriptionId}", subscription.Id);
                return;
            }

            var totalDays = (subscription.EndDate - subscription.StartDate).Days;
            if (totalDays <= 0) return;

            var dailyRate = subscription.Plan.Price / totalDays;
            dailyRate = Math.Round(dailyRate, 0, MidpointRounding.AwayFromZero);

            if (dailyRate <= 0) return;

            var tenant = await context.Tenants.FindAsync(subscription.TenantId);
            if (tenant == null) return;

            if (tenant.CreditBalance <= 0)
            {
                await CreateNotificationAsync(context, tenant, subscription, "CreditDepleted");
                return;
            }

            var deductionAmount = Math.Min(dailyRate, tenant.CreditBalance);
            tenant.CreditBalance -= deductionAmount;

            var creditLedger = new TenantCreditLedger
            {
                TenantId = subscription.TenantId,
                Amount = -deductionAmount,
                EntryType = "DailyDeduction",
                ReferenceType = "SubscriptionDeduction",
                ReferenceId = subscription.Id,
                BalanceAfter = tenant.CreditBalance,
                Note = $"Trừ credit hàng ngày cho gói {subscription.Plan.PlanName} (ngày {now:dd/MM/yyyy})"
            };
            context.TenantCreditLedgers.Add(creditLedger);

            _logger.LogInformation("Deducted {Amount} credits for tenant {TenantId}, remaining {Balance}",
                deductionAmount, subscription.TenantId, tenant.CreditBalance);

            if (tenant.CreditBalance < subscription.Plan.Price * 0.1m)
            {
                await CreateNotificationAsync(context, tenant, subscription, "LowCredit");
            }
        }

        private async Task CreateNotificationAsync(
            AdminDbContext context,
            Tenant tenant,
            Subscription subscription,
            string notificationType)
        {
            string title, message;

            switch (notificationType)
            {
                case "CreditDepleted":
                    title = "Cảnh báo: Credit đã hết";
                    message = $"Số dư credit của trung tâm đã về 0. Vui lòng nạp thêm credit để tiếp tục sử dụng dịch vụ.";
                    break;
                case "LowCredit":
                    title = "Cảnh báo: Credit thấp";
                    message = $"Số dư credit còn lại {tenant.CreditBalance:N0} VNĐ. Vui lòng nạp thêm credit để tránh gián đoạn dịch vụ.";
                    break;
                default:
                    return;
            }

            var notification = new PaymentNotification
            {
                TenantId = tenant.TenantId,
                NotificationType = notificationType,
                Title = title,
                Message = message,
                Channel = "System",
                Status = "Pending",
                ScheduledFor = DateTime.UtcNow,
                CreatedAt = DateTime.UtcNow
            };
            context.PaymentNotifications.Add(notification);
        }

        private static TimeSpan GetDelayUntilNextScheduledRun(DateTime localNow)
        {
            var nextRun = ScheduledHours
                .Select(hour => new DateTime(localNow.Year, localNow.Month, localNow.Day, hour, 0, 0, DateTimeKind.Local))
                .FirstOrDefault(candidate => candidate > localNow);

            if (nextRun == default)
            {
                var firstScheduledHourTomorrow = ScheduledHours.Min();
                nextRun = new DateTime(localNow.Year, localNow.Month, localNow.Day, firstScheduledHourTomorrow, 0, 0, DateTimeKind.Local)
                    .AddDays(1);
            }

            var delay = nextRun - localNow;
            return delay > TimeSpan.Zero ? delay : TimeSpan.FromSeconds(1);
        }
    }
}