using System.ComponentModel.DataAnnotations;

namespace EducenAPI.DTOs.Profile
{
    public class UpdateProfileRequest
    {
        [Required(ErrorMessage = "FullName is required")]
        [StringLength(100, ErrorMessage = "FullName cannot exceed 100 characters")]
        public string FullName { get; set; } = string.Empty;
    }
}
