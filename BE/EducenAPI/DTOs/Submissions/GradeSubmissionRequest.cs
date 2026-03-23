using System.ComponentModel.DataAnnotations;

namespace EducenAPI.DTOs.Submissions
{
    public class GradeSubmissionRequest
    {
        [Required]
        [Range(0, 10)] 
        public decimal Score { get; set; }

        public string? TeacherComment { get; set; }
    }
}
