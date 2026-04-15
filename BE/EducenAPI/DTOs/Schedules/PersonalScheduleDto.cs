namespace EducenAPI.DTOs.Schedules
{
    /// <summary>
    /// DTO for teacher schedule with room, time, and day information
    /// </summary>
    public class TeacherScheduleDto
    {
        public int ScheduleId { get; set; }
        public int ClassId { get; set; }
        public string ClassName { get; set; } = string.Empty;
        public int SubjectId { get; set; }
        public string SubjectName { get; set; } = string.Empty;
        public string? TeacherName { get; set; }
        
        // Day and Time
        public int DayOfWeek { get; set; }
        public string DayName { get; set; } = string.Empty; // "Monday", "Tuesday", etc.
        public TimeSpan StartTime { get; set; }
        public TimeSpan EndTime { get; set; }
        
        // Room information
        public int? RoomId { get; set; }
        public string? RoomName { get; set; }
        
        // Class date range
        public DateTime? StartDate { get; set; }
        public DateTime? EndDate { get; set; }
        
        // Additional info
        public string Status { get; set; } = string.Empty;
        public string? Description { get; set; }
    }

    /// <summary>
    /// DTO for student schedule with room, time, and day information
    /// </summary>
    public class StudentScheduleDto
    {
        public int ScheduleId { get; set; }
        public int ClassId { get; set; }
        public string ClassName { get; set; } = string.Empty;
        public int SubjectId { get; set; }
        public string SubjectName { get; set; } = string.Empty;
        
        // Teacher info
        public int? TeacherId { get; set; }
        public string? TeacherName { get; set; }
        
        // Day and Time
        public int DayOfWeek { get; set; }
        public string DayName { get; set; } = string.Empty; // "Monday", "Tuesday", etc.
        public TimeSpan StartTime { get; set; }
        public TimeSpan EndTime { get; set; }
        
        // Room information
        public int? RoomId { get; set; }
        public string? RoomName { get; set; }
        
        // Class date range
        public DateTime? StartDate { get; set; }
        public DateTime? EndDate { get; set; }
        
        // Additional info
        public string Status { get; set; } = string.Empty;
        public string? Description { get; set; }
    }
}
