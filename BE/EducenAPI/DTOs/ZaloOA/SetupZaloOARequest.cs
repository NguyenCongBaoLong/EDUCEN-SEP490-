using System.ComponentModel.DataAnnotations;

namespace EducenAPI.DTOs.ZaloOA
{
    public class SetupZaloOARequest
    {
        [Required]
        [MaxLength(100)]
        public string AppId { get; set; } = string.Empty;

        [MaxLength(100)]
        public string? OAId { get; set; }

        [Required]
        public string SecretKey { get; set; } = string.Empty;
    }
}
