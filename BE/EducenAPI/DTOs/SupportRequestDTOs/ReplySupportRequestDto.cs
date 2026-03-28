using System.ComponentModel.DataAnnotations;

namespace EducenAPI.DTOs.SupportRequestDTOs
{
    public class ReplySupportRequestDto
    {
        [Required]
        public string AdminResponse { get; set; }
    }
}
