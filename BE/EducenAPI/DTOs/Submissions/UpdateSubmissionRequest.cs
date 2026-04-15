using System.ComponentModel.DataAnnotations;

namespace EducenAPI.DTOs.Submissions
{
    public class UpdateSubmissionRequest
    {
        public string? FileUrl { get; set; }

        public List<IFormFile>? Files { get; set; }
    }
}
