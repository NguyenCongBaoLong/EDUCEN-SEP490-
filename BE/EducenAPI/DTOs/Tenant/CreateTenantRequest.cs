using System.ComponentModel.DataAnnotations;

namespace EducenAPI.DTOs
{
    public class CreateTenantRequest
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
        [RegularExpression(@"^(0|\+84)[0-9]{9,10}$", ErrorMessage = "Invalid phone number format")]
        public string? PhoneNumber { get; set; }

        [MaxLength(300)]
        public string? Address { get; set; }

        [Required]
        [MaxLength(200)]
        public string SubDomain { get; set; } = string.Empty;

        public bool IsActive { get; set; } = true;

        [StringLength(50, MinimumLength = 3, ErrorMessage = "Username phải từ 3 đến 50 ký tự.")]
        public string? AdminUsername { get; set; }

        [StringLength(100, MinimumLength = 6, ErrorMessage = "Mật khẩu phải từ 6 đến 100 ký tự.")]
        public string? AdminPassword { get; set; }
    }
}
