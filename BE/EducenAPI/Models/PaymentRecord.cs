using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace EducenAPI.Models
{
    public class PaymentRecord
    {
        [Key]
        [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        public string PaymentId { get; set; }

        [Required]
        public string TenantId { get; set; }

        [Required]
        public decimal Amount { get; set; }

        [MaxLength(50)]
        public string Status { get; set; } 

        public DateTime PaymentDate { get; set; }

        // Navigation
        public Tenant Tenant { get; set; }

    }
}
