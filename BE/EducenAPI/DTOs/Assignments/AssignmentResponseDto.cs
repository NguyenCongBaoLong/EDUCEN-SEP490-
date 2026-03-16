namespace EducenAPI.DTOs.Assignments
{
    public class AssignmentResponseDto
    {
        public int AsmId { get; set; }
        public int SessionId { get; set; }
        public string Title { get; set; } = null!;
        public string? Description { get; set; }
        public string? FileUrl { get; set; } // Đây sẽ là Link full
        public DateTime? StartTime { get; set; }
        public DateTime? EndTime { get; set; }
    }
}
