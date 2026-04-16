using System.ComponentModel.DataAnnotations;

namespace EducenAPI.DTOs.SupportRequestDTOs
{
    public class ValidateScheduleChangeDto
    {
        [Required]
        public int ClassId { get; set; }

        [Range(0, 6)]
        public int DayOfWeek { get; set; }

        [Required]
        public string StartTime { get; set; } = string.Empty;

        [Required]
        public string EndTime { get; set; } = string.Empty;
    }

    public class ValidateScheduleChangeResponseDto
    {
        public bool IsValid { get; set; }
        public List<string> Errors { get; set; } = new();
        public List<string> TeacherConflicts { get; set; } = new();
        public List<string> RoomConflicts { get; set; } = new();
    }
}
