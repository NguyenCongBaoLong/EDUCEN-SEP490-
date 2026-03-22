using EducenAPI.DTOs.Submissions;

namespace EducenAPI.DTOs.Assignments
{
    public class StudentAssignmentDto : AssignmentResponseDto
    {
        public SubmissionResponseDto? CurrentSubmission { get; set; }
    }
}
