using System.ComponentModel.DataAnnotations;

namespace EducenAPI.Models
{
    public class InvoiceLock
    {
        [Key]
        public int Id { get; set; }

        public int Month { get; set; }

        public int Year { get; set; }

        public bool IsLocked { get; set; }

        public string? LockedBy { get; set; }

        public DateTime? LockedAt { get; set; }

        public DateTime? UnlockedAt { get; set; }
    }
}