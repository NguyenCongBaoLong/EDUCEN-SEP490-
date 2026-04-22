using System.ComponentModel.DataAnnotations;

namespace EducenAPI.DTOs.Classes
{
    public class CreateClassDto
    {
        private string _className = string.Empty;
        private string? _description;
        private string? _syllabusContent;
        private string? _status;

        [Required(ErrorMessage = "Tên lớp là bắt buộc")]
        [StringLength(100, ErrorMessage = "Tên lớp không được vượt quá 100 ký tự")]
        [System.ComponentModel.DataAnnotations.RegularExpression(@"^(?!\s+$).+", ErrorMessage = "Tên lớp không được chỉ chứa khoảng trắng")]
        public string ClassName 
        { 
            get => _className;
            set => _className = value?.Trim() ?? string.Empty;
        }

        [StringLength(500, ErrorMessage = "Mô tả không được vượt quá 500 ký tự")]
        [System.ComponentModel.DataAnnotations.RegularExpression(@"^(?!\s+$).+", ErrorMessage = "Mô tả không được chỉ chứa khoảng trắng")]
        public string? Description 
        { 
            get => _description;
            set => _description = value?.Trim();
        }

        [StringLength(1000, ErrorMessage = "Nội dung chương trình không được vượt quá 1000 ký tự")]
        [System.ComponentModel.DataAnnotations.RegularExpression(@"^(?!\s+$).+", ErrorMessage = "Nội dung chương trình không được chỉ chứa khoảng trắng")]
        public string? SyllabusContent 
        { 
            get => _syllabusContent;
            set => _syllabusContent = value?.Trim();
        }

        [Required(ErrorMessage = "Môn học là bắt buộc")]
        public int SubjectId { get; set; }

        public int? RoomId { get; set; }

        public int? GradeId { get; set; }

        [Required(ErrorMessage = "Giáo viên là bắt buộc")]
        public int TeacherId { get; set; }

        public int? AssistantId { get; set; }

        [Required(ErrorMessage = "Số học sinh tối đa là bắt buộc")]
        [Range(1, 1000, ErrorMessage = "Số học sinh tối đa phải từ 1 đến 1000")]
        public int MaxStudents { get; set; }

        public DateTime? StartDate { get; set; }

        public DateTime? EndDate { get; set; }

        [StringLength(50, ErrorMessage = "Trạng thái không được vượt quá 50 ký tự")]
        [System.ComponentModel.DataAnnotations.RegularExpression(@"^(?!\s+$).+", ErrorMessage = "Trạng thái không được chỉ chứa khoảng trắng")]
        public string? Status 
        { 
            get => _status;
            set => _status = value?.Trim();
        }

        public List<CreateScheduleSlotDto> ScheduleSlots { get; set; } = new List<CreateScheduleSlotDto>();

        public decimal? PricePerSession { get; set; }
    }

    public class CreateScheduleSlotDto
    {
        public int? Slot { get; set; }
        [Range(0, 6, ErrorMessage = "Thứ trong tuần phải từ 0 đến 6")]
        public int DayOfWeek { get; set; } // 0 = Sunday, 1 = Monday, ...
        [Required]
        public string StartTime { get; set; } = string.Empty; // Format "HH:mm"
        [Required]
        public string EndTime { get; set; } = string.Empty;   // Format "HH:mm"
        public int? RoomId { get; set; }
        public string? RoomName { get; set; }
    }

    public class UpdateClassDto
    {
        [StringLength(100, ErrorMessage = "Tên lớp không được vượt quá 100 ký tự")]
        [System.ComponentModel.DataAnnotations.RegularExpression(@"^(?!\s+$).+", ErrorMessage = "Tên lớp không được chỉ chứa khoảng trắng")]
        public string? ClassName { get; set; }

        [StringLength(500, ErrorMessage = "Mô tả không được vượt quá 500 ký tự")]
        [System.ComponentModel.DataAnnotations.RegularExpression(@"^(?!\s+$).+", ErrorMessage = "Mô tả không được chỉ chứa khoảng trắng")]
        public string? Description { get; set; }

        [StringLength(1000, ErrorMessage = "Nội dung chương trình không được vượt quá 1000 ký tự")]
        [System.ComponentModel.DataAnnotations.RegularExpression(@"^(?!\s+$).+", ErrorMessage = "Nội dung chương trình không được chỉ chứa khoảng trắng")]
        public string? SyllabusContent { get; set; }

        public int? SubjectId { get; set; }

        public int? RoomId { get; set; }

        public int? GradeId { get; set; }

        public int? TeacherId { get; set; }

        public int? AssistantId { get; set; }

        public int? MaxStudents { get; set; }

        public DateTime? StartDate { get; set; }

        public DateTime? EndDate { get; set; }

        [StringLength(50, ErrorMessage = "Trạng thái không được vượt quá 50 ký tự")]
        [System.ComponentModel.DataAnnotations.RegularExpression(@"^(?!\s+$).+", ErrorMessage = "Trạng thái không được chỉ chứa khoảng trắng")]
        public string? Status { get; set; }

        public List<CreateScheduleSlotDto>? ScheduleSlots { get; set; }

        public decimal? PricePerSession { get; set; }
    }

    public class ClassDto
    {
        public int ClassId { get; set; }
        public string ClassName { get; set; } = string.Empty;
        public string? Description { get; set; }
        public string? SyllabusContent { get; set; }
        public int SubjectId { get; set; }
        public string SubjectName { get; set; } = string.Empty;
        public int? TeacherId { get; set; }
        public string? TeacherName { get; set; }
        public int? AssistantId { get; set; }
        public string? AssistantName { get; set; }
        public int? RoomId { get; set; }
        public string? RoomName { get; set; }
        public int? GradeId { get; set; }
        public string? GradeName { get; set; }
        public DateTime? StartDate { get; set; }
        public DateTime? EndDate { get; set; }
        public string? Status { get; set; }
        public int MaxStudents { get; set; }
        public int StudentCount { get; set; }
        public int TotalSessions { get; set; }
        public int CompletedSessions { get; set; }
        public DateTime CreatedAt { get; set; }
        public decimal? PricePerSession { get; set; }
        public List<CreateScheduleSlotDto> ScheduleSlots { get; set; } = new List<CreateScheduleSlotDto>();
    }
    public class UpdateClassPriceDto
    {
        [Range(0, double.MaxValue, ErrorMessage = "Giá phải lớn hơn hoặc bằng 0")]
        public decimal Price { get; set; }
    }
}
