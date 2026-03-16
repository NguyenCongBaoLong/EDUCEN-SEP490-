using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace EducenAPI.Models
{
    public class PaymentRecord
    {
        [Key]
        public string PaymentId { get; set; } = Guid.NewGuid().ToString();

        [Required]
        public string TenantId { get; set; }

        [Required]
        public decimal Amount { get; set; }

        [MaxLength(50)]
        public string Status { get; set; } 

        public DateTime PaymentDate { get; set; }

        // Navigation
        [ForeignKey(nameof(TenantId))]
        public Tenant Tenant { get; set; } = null!;

    }
}
