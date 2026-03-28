using System;

namespace EducenAPI.DTOs.CenterHome
{
    public class HomeClassDto
    {
        public int ClassId { get; set; }
        public string ClassName { get; set; } = null!;
        public string? SubjectName { get; set; }
        public string? TeacherName { get; set; }
        public DateTime? StartDate { get; set; }
        public string? Status { get; set; }
        public int StudentCount { get; set; }
        public string? ScheduleSummary { get; set; } // Ví dụ: "Thứ 2, Thứ 4 (18:00 - 19:30)"
    }
}
