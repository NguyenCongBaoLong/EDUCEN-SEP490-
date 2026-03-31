using System.ComponentModel.DataAnnotations;

namespace EducenAPI.DTOs.ZaloOA
{
    public class SendZaloMessageRequest
    {
        [Required]
        [MaxLength(200)]
        public string Title { get; set; } = string.Empty;

        [Required]
        public string Content { get; set; } = string.Empty;

        public string Target { get; set; } = "all";
    }
}
