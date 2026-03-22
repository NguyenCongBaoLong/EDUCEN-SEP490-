using System;

namespace EducenAPI.DTOs.Submissions
{
    public class SubmissionResponseDto
    {
        public int SubId { get; set; }
        public int AsmId { get; set; }
        public int StudentId { get; set; }
        public string? FileUrl { get; set; }
        public DateTime? SubmittedAt { get; set; }
        public string? Status { get; set; }
        public decimal? Score { get; set; }
        public string? TeacherComment { get; set; }
        public DateTime? GradedAt { get; set; }
        public bool IsPublished { get; set; }
    }
}
