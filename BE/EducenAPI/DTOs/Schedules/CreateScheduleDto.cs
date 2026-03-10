using System.ComponentModel.DataAnnotations;

namespace EducenAPI.DTOs.Schedules
{
    public class CreateScheduleDto
    {
        [Required(ErrorMessage = "ClassId is required")]
        public int ClassId { get; set; }

        [Required(ErrorMessage = "ScheduleDate is required")]
        public DateTime ScheduleDate { get; set; }

        [Required(ErrorMessage = "StartTime is required")]
        public TimeSpan StartTime { get; set; }

        [Required(ErrorMessage = "EndTime is required")]
        public TimeSpan EndTime { get; set; }

        private string? _notes;
        private string? _status;

        [StringLength(200, ErrorMessage = "Notes cannot exceed 200 characters")]
        [System.ComponentModel.DataAnnotations.RegularExpression(@"^(?!\s+$).+", ErrorMessage = "Notes cannot be only whitespace")]
        public string? Notes 
        { 
            get => _notes;
            set => _notes = value?.Trim();
        }

        [StringLength(50, ErrorMessage = "Status cannot exceed 50 characters")]
        [System.ComponentModel.DataAnnotations.RegularExpression(@"^(?!\s+$).+", ErrorMessage = "Status cannot be only whitespace")]
        public string? Status 
        { 
            get => _status;
            set => _status = value?.Trim();
        }
    }

    public class UpdateScheduleDto
    {
        public DateTime? ScheduleDate { get; set; }

        public TimeSpan? StartTime { get; set; }

        public TimeSpan? EndTime { get; set; }

        private string? _notes;
        private string? _status;

        [StringLength(200, ErrorMessage = "Notes cannot exceed 200 characters")]
        [System.ComponentModel.DataAnnotations.RegularExpression(@"^(?!\s+$).+", ErrorMessage = "Notes cannot be only whitespace")]
        public string? Notes 
        { 
            get => _notes;
            set => _notes = value?.Trim();
        }

        [StringLength(50, ErrorMessage = "Status cannot exceed 50 characters")]
        [System.ComponentModel.DataAnnotations.RegularExpression(@"^(?!\s+$).+", ErrorMessage = "Status cannot be only whitespace")]
        public string? Status 
        { 
            get => _status;
            set => _status = value?.Trim();
        }
    }

    public class ScheduleDto
    {
        public int ScheduleId { get; set; }
        public int ClassId { get; set; }
        public string ClassName { get; set; } = string.Empty;
        public DateTime ScheduleDate { get; set; }
        public TimeSpan StartTime { get; set; }
        public TimeSpan EndTime { get; set; }
        public string? Notes { get; set; }
        public string Status { get; set; } = string.Empty;
        public DateTime CreatedAt { get; set; }
    }
}
