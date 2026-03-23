using EducenAPI.DTOs.Submissions;

namespace EducenAPI.DTOs.Assignments
{
    public class StudentSubmissionDto
    {
        public int StudentId { get; set; }
        public string FullName { get; set; } = null!;
        public SubmissionResponseDto? Submission { get; set; }
    }
}
