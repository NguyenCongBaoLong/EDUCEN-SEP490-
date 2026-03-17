using System;

namespace EducenAPI.DTOs.Classes
{
    public class SessionResponseDto
    {
        public int SessionId { get; set; }
        public int ScheduleId { get; set; }
        public DateTime SessionDate { get; set; }
        public string Status { get; set; } = "Scheduled";
        public string DayLabel { get; set; } = string.Empty;
        public string Time { get; set; } = string.Empty;
        public string Title { get; set; } = string.Empty;
    }
}
