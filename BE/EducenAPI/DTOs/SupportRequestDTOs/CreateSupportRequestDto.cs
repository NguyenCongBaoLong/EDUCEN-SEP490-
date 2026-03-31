using System.ComponentModel.DataAnnotations;

namespace EducenAPI.DTOs.SupportRequestDTOs
{
    public class CreateSupportRequestDto
    {
        [Required]
        [MaxLength(200)]
        public string Title { get; set; }

        [Required]
        public string Content { get; set; }
    }
}
