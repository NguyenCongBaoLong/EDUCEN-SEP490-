using System.ComponentModel.DataAnnotations;

namespace EducenAPI.Models
{
    public class Plan
    {
        [Key]
        public string PlanId { get; set; }

        [Required]
        [MaxLength(100)]
        public string PlanName { get; set; }

        [Required]
        public decimal Price { get; set; }

        public int LimitUsers { get; set; }

        public string? Features { get; set; }

        public int StorageLimit { get; set; } // GB
        public bool IsActive { get; set; } = true;

        // Navigation
        public ICollection<Subscription>? Subscriptions { get; set; }
    }
}
