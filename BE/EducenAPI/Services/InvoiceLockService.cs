using EducenAPI.Models;
using EducenAPI.Persistence.Contexts;
using EducenAPI.Services.Interface;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using System;
using System.Threading.Tasks;

namespace EducenAPI.Services
{
    public class InvoiceLockService : IInvoiceLockService
    {
        private readonly EducenV2Context _context;
        private readonly ILogger<InvoiceLockService> _logger;

        public InvoiceLockService(EducenV2Context context, ILogger<InvoiceLockService> logger)
        {
            _context = context;
            _logger = logger;
        }

        public bool IsEditingLocked(int month, int year)
        {
            var now = DateTime.Now;
            var currentMonth = now.Month;
            var currentYear = now.Year;

            if (year < currentYear || (year == currentYear && month < currentMonth))
                return false;

            if (year > currentYear || (year == currentYear && month > currentMonth))
                return false;

            var lastDayOfMonth = new DateTime(year, month, 1).AddMonths(1).AddDays(-1);
            var lockDeadline = lastDayOfMonth.AddDays(-1);

            return now > lockDeadline;
        }

        public async Task<bool> LockMonthAsync(int month, int year, string lockedBy)
        {
            try
            {
                var lockRecord = await _context.InvoiceLocks
                    .FirstOrDefaultAsync(l => l.Month == month && l.Year == year);

                if (lockRecord == null)
                {
                    lockRecord = new InvoiceLock
                    {
                        Month = month,
                        Year = year,
                        IsLocked = true,
                        LockedBy = lockedBy,
                        LockedAt = DateTime.UtcNow
                    };
                    _context.InvoiceLocks.Add(lockRecord);
                }
                else
                {
                    lockRecord.IsLocked = true;
                    lockRecord.LockedBy = lockedBy;
                    lockRecord.LockedAt = DateTime.UtcNow;
                }

                await _context.SaveChangesAsync();

                _logger.LogInformation("Locked invoice editing for {Month}/{Year} by {LockedBy}", month, year, lockedBy);
                return true;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error locking month {Month}/{Year}", month, year);
                return false;
            }
        }

        public async Task<bool> UnlockMonthAsync(int month, int year)
        {
            try
            {
                var lockRecord = await _context.InvoiceLocks
                    .FirstOrDefaultAsync(l => l.Month == month && l.Year == year);

                if (lockRecord == null)
                    return true;

                lockRecord.IsLocked = false;
                lockRecord.UnlockedAt = DateTime.UtcNow;

                await _context.SaveChangesAsync();

                _logger.LogInformation("Unlocked invoice editing for {Month}/{Year}", month, year);
                return true;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error unlocking month {Month}/{Year}", month, year);
                return false;
            }
        }

        public async Task<InvoiceLockInfo?> GetLockInfoAsync(int month, int year)
        {
            var lockRecord = await _context.InvoiceLocks
                .FirstOrDefaultAsync(l => l.Month == month && l.Year == year);

            var now = DateTime.Now;
            var lastDayOfMonth = new DateTime(year, month, 1).AddMonths(1).AddDays(-1);
            var lockDeadline = lastDayOfMonth.AddDays(-1);
            var isAutoLocked = now > lockDeadline;

            return new InvoiceLockInfo
            {
                Month = month,
                Year = year,
                IsLocked = isAutoLocked || (lockRecord?.IsLocked ?? false),
                LockedBy = lockRecord?.LockedBy,
                LockedAt = lockRecord?.LockedAt,
                UnlockDate = lockDeadline,
                Message = isAutoLocked 
                    ? $"Đã khóa chỉnh sửa tự động từ ngày {lockDeadline:dd/MM/yyyy}"
                    : (lockRecord?.IsLocked == true ? "Đã khóa bởi admin" : "Có thể chỉnh sửa")
            };
        }
    }
}