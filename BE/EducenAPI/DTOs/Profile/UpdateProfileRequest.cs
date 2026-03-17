using System.ComponentModel.DataAnnotations;

namespace EducenAPI.DTOs.Profile
{
    public class UpdateProfileRequest
    {
        [Required(ErrorMessage = "FullName is required")]
        [StringLength(100, ErrorMessage = "FullName cannot exceed 100 characters")]
        [RegularExpression(@"^(?!\s+$).+", ErrorMessage = "FullName cannot be only whitespace")]
        public string FullName { get; set; } = string.Empty;

        [EmailAddress(ErrorMessage = "Invalid email format")]
        [StringLength(100, ErrorMessage = "Email cannot exceed 100 characters")]
        public string? Email { get; set; }

        [Phone(ErrorMessage = "Invalid phone number format")]
        [StringLength(20, ErrorMessage = "Phone number cannot exceed 20 characters")]
        public string? PhoneNumber { get; set; }
    }
}
