using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace EducenAPI.Models
{
    public class Tenant
    {
        [Key]
        public string TenantId { get; set; } = Guid.NewGuid().ToString();

        [Required]
        [MaxLength(200)]
        public string TenantName { get; set; }

        public string Username { get; set; } = null!;

        public string Password { get; set; } = null!;

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
        public string SubDomain { get; set; }

        [Required]
        public string ConnectionString { get; set; }

        public bool IsActive { get; set; } = true;

        [Column(TypeName = "decimal(18,2)")]
        public decimal CreditBalance { get; set; } = 0m;

        // Navigation
        public ICollection<Subscription> Subscriptions { get; set; } = new List<Subscription>();

        public ICollection<PaymentRecord> PaymentRecords { get; set; } = new List<PaymentRecord>();

        public ICollection<TenantCreditLedger> CreditLedgers { get; set; } = new List<TenantCreditLedger>();
    }
}
