using System.ComponentModel.DataAnnotations;

namespace EducenAPI.DTOs.SupportRequestDTOs
{
    public class ReplySupportRequestDto
    {
        [StringLength(5000, ErrorMessage = "Phản hồi không được vượt quá 5000 ký tự.")]
        public string? AdminResponse { get; set; }
    }
}
