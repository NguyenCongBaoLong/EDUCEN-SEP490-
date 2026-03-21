using System.ComponentModel.DataAnnotations;

namespace EducenAPI.DTOs.Submissions
{
    public class CreateSubmissionRequest
    {
        [Required]
        public int AsmId { get; set; }

        [Required]
        public int StudentId { get; set; }

        public string? FileUrl { get; set; }

        public IFormFile? File { get; set; }
    }
}
