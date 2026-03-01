using System.ComponentModel.DataAnnotations;

namespace EducenAPI.Models
{
    public class Tenant
    {
        [Key]
        public string TenantId { get; set; }

        [Required]
        [MaxLength(200)]
        public string TenantName { get; set; }

        [MaxLength(200)]
        public string? ContactPerson { get; set; }

        [MaxLength(150)]
        public string? Email { get; set; }

        [MaxLength(20)]
        public string? PhoneNumber { get; set; }

        [MaxLength(300)]
        public string? Address { get; set; }

        [Required]
        [MaxLength(200)]
        public string DomainUrl { get; set; }

        [Required]
        public string ConnectionString { get; set; }

        public bool IsActive { get; set; } = true;

        // Navigation
        public ICollection<Subscription>? Subscriptions { get; set; }
        public ICollection<PaymentRecord>? PaymentRecords { get; set; }
    }
}
