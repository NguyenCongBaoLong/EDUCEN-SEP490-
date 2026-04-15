using System.ComponentModel.DataAnnotations;

namespace EducenAPI.DTOs.ZaloOA
{
    public class SendZaloMessageRequest
    {
        [Required]
        [MaxLength(200)]
        public string Title { get; set; } = string.Empty;

        [Required]
        [StringLength(4000, ErrorMessage = "Nội dung không được vượt quá 4000 ký tự.")]
        public string Content { get; set; } = string.Empty;

        [Required]
        [StringLength(100)]
        public string Target { get; set; } = "all";
    }
}
