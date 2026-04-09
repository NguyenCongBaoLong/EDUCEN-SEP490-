namespace EducenAPI.DTOs.Attendance
{
    public class CreateAttendanceModificationRequestDto
    {
        public int SessionId { get; set; }
        public int StudentId { get; set; }
        public string RequestedStatus { get; set; } = null!;
        public string? Reason { get; set; }
    }

    public class AttendanceModificationRequestDto
    {
        public int RequestId { get; set; }
        public int SessionId { get; set; }
        public int StudentId { get; set; }
        public string? StudentName { get; set; }
        public string? ClassName { get; set; }
        public string? SessionDate { get; set; }
        public string Status { get; set; } = null!;
        public string? CurrentStatus { get; set; }
        public string RequestedStatus { get; set; } = null!;
        public string? Reason { get; set; }
        public int RequestedByUserId { get; set; }
        public string? RequestedByUserName { get; set; }
        public int? ReviewedByUserId { get; set; }
        public string? ReviewedByUserName { get; set; }
        public string? RequestedAt { get; set; }
        public string? ReviewedAt { get; set; }
        public string? ReviewNote { get; set; }
    }

    public class ReviewAttendanceModificationRequestDto
    {
        public bool Approved { get; set; }
        public string? ReviewNote { get; set; }
        public string? NewStatus { get; set; } // Chỉ cần khi Approved - trạng thái điểm danh mới
    }
}