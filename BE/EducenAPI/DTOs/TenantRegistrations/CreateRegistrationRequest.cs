using System.ComponentModel.DataAnnotations;

namespace EducenAPI.DTOs.TenantRegistrations
{
    public class CreateRegistrationRequest
    {
        [Required(ErrorMessage = "Center name is required")]
        [MaxLength(200)]
        [RegularExpression(@"^(?!\s*$).+", ErrorMessage = "Center name cannot be empty")]
        public string CenterName { get; set; }

        [MaxLength(150)]
        [RegularExpression(@"^(?!\s*$).+", ErrorMessage = "Contact person cannot be only whitespace")]
        public string? ContactPerson { get; set; }

        [EmailAddress(ErrorMessage = "Invalid email format")]
        [MaxLength(150)]
        public string? Email { get; set; }

        [Phone(ErrorMessage = "Invalid phone number format")]
        [MaxLength(20)]
        public string? PhoneNumber { get; set; }

        [MaxLength(500)]
        public string? Message { get; set; }
    }
}
