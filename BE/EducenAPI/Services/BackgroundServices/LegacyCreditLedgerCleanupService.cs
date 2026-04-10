using EducenAPI.Persistence.Contexts;
using Microsoft.EntityFrameworkCore;

namespace EducenAPI.Services.BackgroundServices
{
    public class LegacyCreditLedgerCleanupService : BackgroundService
    {
        private readonly IServiceProvider _serviceProvider;
        private readonly ILogger<LegacyCreditLedgerCleanupService> _logger;

        public LegacyCreditLedgerCleanupService(
            IServiceProvider serviceProvider,
            ILogger<LegacyCreditLedgerCleanupService> logger)
        {
            _serviceProvider = serviceProvider;
            _logger = logger;
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            try
            {
                using var scope = _serviceProvider.CreateScope();
                var adminDb = scope.ServiceProvider.GetRequiredService<AdminDbContext>();

                var legacyEntries = await adminDb.TenantCreditLedgers
                    .Where(x => x.ReferenceType == "DowngradeRefund" || x.ReferenceType == "GracePeriodCancel")
                    .ToListAsync(stoppingToken);

                if (legacyEntries.Count == 0)
                {
                    _logger.LogInformation("Legacy credit cleanup: no records to remove.");
                    return;
                }

                adminDb.TenantCreditLedgers.RemoveRange(legacyEntries);
                await adminDb.SaveChangesAsync(stoppingToken);

                _logger.LogInformation("Legacy credit cleanup removed {Count} ledger entries.", legacyEntries.Count);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Legacy credit cleanup failed.");
            }
        }
    }
}

