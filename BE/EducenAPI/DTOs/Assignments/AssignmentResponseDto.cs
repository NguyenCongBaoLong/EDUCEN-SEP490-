namespace EducenAPI.DTOs.Assignments
{
    public class AssignmentResponseDto
    {
        public int AsmId { get; set; }
        public int? SessionId { get; set; }
        public int? ClassId { get; set; }
        public int? GradeId { get; set; }
        public string Title { get; set; } = null!;
        public string? Description { get; set; }
        public string? FileUrl { get; set; } // Đây sẽ là Link full
        public DateTime? StartTime { get; set; }
        public DateTime? EndTime { get; set; }
        public DateTime? DueDate { get; set; }
        public bool AllowLateSubmission { get; set; }
        public long? FileSize { get; set; }
        public string? OriginalFileName { get; set; }
        public int SubmissionsCount { get; set; }
        public int TotalStudentsCount { get; set; }
        public int GradedCount { get; set; }
        public bool IsPublished { get; set; }
        public int PublishedCount { get; set; }
    }
}
