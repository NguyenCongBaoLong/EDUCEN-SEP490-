using System.ComponentModel.DataAnnotations;

namespace EducenAPI.DTOs.Tenant
{
    public class UpdateTenantRequest
    {
        [Required]
        [MaxLength(200)]
        public string TenantName { get; set; } = string.Empty;

        [MaxLength(200)]
        public string? ContactPerson { get; set; }

        [MaxLength(150)]
        [EmailAddress]
        public string? Email { get; set; }

        [MaxLength(20)]
        [Phone]
        public string? PhoneNumber { get; set; }

        [MaxLength(300)]
        public string? Address { get; set; }

        [Required]
        [MaxLength(200)]
        public string SubDomain { get; set; } = string.Empty;

        public bool IsActive { get; set; }
    }
}
