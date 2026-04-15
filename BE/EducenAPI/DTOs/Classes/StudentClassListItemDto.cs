using EducenAPI.DTOs.Schedules;

namespace EducenAPI.DTOs.Classes
{
    public class StudentClassListItemDto
    {
        public int ClassId { get; set; }
        public string ClassName { get; set; } = null!;
        public string SubjectName { get; set; } = null!;
        public string GradeLevel { get; set; } = null!;
        public string Status { get; set; } = null!;
        public string TeacherName { get; set; } = null!;
        public string? AssistantName { get; set; }
        public string TeacherInitials { get; set; } = null!;
        public string? AssistantInitials { get; set; }
        public string ScheduleDays { get; set; } = null!;
        public string ScheduleTime { get; set; } = null!;
        public int TotalSessions { get; set; }
        public int CompletedSessions { get; set; }
        public string Color { get; set; } = "#3b82f6";
        public DateTime? StartDate { get; set; }
        public DateTime? EndDate { get; set; }
    }
}
