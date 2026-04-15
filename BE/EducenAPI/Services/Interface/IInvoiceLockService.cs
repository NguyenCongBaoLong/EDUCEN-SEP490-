using EducenAPI.Models;
using System;
using System.Threading.Tasks;

namespace EducenAPI.Services.Interface
{
    public interface IInvoiceLockService
    {
        bool IsEditingLocked(int month, int year);
        Task<bool> LockMonthAsync(int month, int year, string lockedBy);
        Task<bool> UnlockMonthAsync(int month, int year);
        Task<InvoiceLockInfo?> GetLockInfoAsync(int month, int year);
    }

    public class InvoiceLockInfo
    {
        public int Month { get; set; }
        public int Year { get; set; }
        public bool IsLocked { get; set; }
        public string? LockedBy { get; set; }
        public DateTime? LockedAt { get; set; }
        public DateTime? UnlockDate { get; set; }
        public string? Message { get; set; }
    }
}