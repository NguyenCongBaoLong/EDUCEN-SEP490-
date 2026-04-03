using System.ComponentModel.DataAnnotations;

namespace EducenAPI.Models
{
    public class FamilyInvoice
    {
        [Key]
        public string InvoiceId { get; set; } = Guid.NewGuid().ToString();
        
        [Required]
        public string ParentId { get; set; }

        /// <summary>
        /// Loại hóa đơn gộp:
        /// "Student" = Gộp hóa đơn của 1 con (nhiều lớp trong 1 tháng)
        /// "Family" = Gộp hóa đơn tất cả con (nhiều con trong 1 tháng)
        /// </summary>
        [Required]
        public string Type { get; set; } = "Family"; // Student | Family

        [Required]
        public int Month { get; set; }
        
        [Required]
        public int Year { get; set; }
        
        [Required]
        public decimal TotalAmount { get; set; }
        
        public int StudentCount { get; set; } // Always 1 when Type = "Student"
        
        public string Status { get; set; } = "Pending"; // Pending | Paid | Cancelled
        
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        
        public DateTime? PaidAt { get; set; }
        
        public string? PaymentRecordId { get; set; }
        
        public string? Notes { get; set; }
        
        // Navigation properties
        public virtual ICollection<FamilyInvoiceItem> StudentInvoices { get; set; } = new List<FamilyInvoiceItem>();
    }

    public class FamilyInvoiceItem
    {
        [Key]
        public string ItemId { get; set; } = Guid.NewGuid().ToString();
        
        [Required]
        public string FamilyInvoiceId { get; set; }
        
        [Required]
        public string StudentInvoiceId { get; set; }
        
        [Required]
        public int StudentId { get; set; }
        
        [Required]
        public string StudentName { get; set; }
        
        [Required]
        public decimal Amount { get; set; }
        
        [Required]
        public string Status { get; set; } = "Pending"; // Pending | Paid
        
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        
        public DateTime? PaidAt { get; set; }
        
        // Navigation property
        public virtual FamilyInvoice FamilyInvoice { get; set; }
    }
}
