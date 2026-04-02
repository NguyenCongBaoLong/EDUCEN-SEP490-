using System.ComponentModel.DataAnnotations;

namespace EducenAPI.DTOs.SupportRequestDTOs
{
    public class CreateSupportRequestDto
    {
        [Required]
        [MaxLength(200)]
        public string Title { get; set; }

        [Required]
        [StringLength(5000, ErrorMessage = "Nội dung không được vượt quá 5000 ký tự.")]
        public string Content { get; set; }
    }
}
