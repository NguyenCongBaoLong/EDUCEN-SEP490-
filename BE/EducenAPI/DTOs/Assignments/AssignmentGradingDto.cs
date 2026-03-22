using System.Collections.Generic;

namespace EducenAPI.DTOs.Assignments
{
    public class AssignmentGradingDto
    {
        public AssignmentResponseDto Assignment { get; set; } = null!;
        public List<StudentSubmissionDto> Students { get; set; } = new();
    }
}
