using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace EducenAPI.Models
{
    public class Subscription
    {
        [Key]
        public string Id { get; set; } = Guid.NewGuid().ToString();

        [Required]
        public string TenantId { get; set; } = null!;

        [Required]
        public string PlanId { get; set; } = null!;

        public DateTime StartDate { get; set; }

        public DateTime EndDate { get; set; }

        [MaxLength(50)]
        public string Status { get; set; } = "Active"; // Active, Expired, Cancelled

        // Navigation
        [ForeignKey(nameof(TenantId))]
        public virtual Tenant Tenant { get; set; } = null!;

        [ForeignKey(nameof(PlanId))]
        public virtual Plan Plan { get; set; } = null!;
    }
}
