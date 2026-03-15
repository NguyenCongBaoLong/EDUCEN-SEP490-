using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace EducenAPI.Models
{
    public class Subscription
    {
        [Key]
        [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        public string Id { get; set; }

        [Required]
        public string TenantId { get; set; }

        [Required]
        public string PlanId { get; set; }

        public DateTime StartDate { get; set; }

        public DateTime EndDate { get; set; }

        [MaxLength(50)]
        public string Status { get; set; } // Active, Expired, Cancelled

        // Navigation
        [ForeignKey(nameof(TenantId))]
        public Tenant Tenant { get; set; }

        [ForeignKey(nameof(PlanId))]
        public Plan Plan { get; set; }
    }
}
