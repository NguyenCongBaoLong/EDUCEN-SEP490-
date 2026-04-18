using System.ComponentModel.DataAnnotations;

namespace EducenAPI.Models
{
    public class TenantRegistration
    {
        [Key]
        public string RegistrationId { get; set; } = Guid.NewGuid().ToString();

        [Required]
        [MaxLength(200)]
        public string CenterName { get; set; }

        [MaxLength(150)]
        public string? ContactPerson { get; set; }

        [MaxLength(150)]
        public string? Email { get; set; }

        [MaxLength(20)]
        public string? PhoneNumber { get; set; }

        public string? Message { get; set; }

        public string Status { get; set; } = "Pending";
        // Pending | Approved | Rejected

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}
