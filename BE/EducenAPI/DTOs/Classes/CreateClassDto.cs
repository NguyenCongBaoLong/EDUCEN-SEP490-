using System.ComponentModel.DataAnnotations;

namespace EducenAPI.DTOs.Classes
{
    public class CreateClassDto
    {
        private string _className = string.Empty;
        private string? _description;
        private string? _syllabusContent;
        private string? _status;

        [Required(ErrorMessage = "ClassName is required")]
        [StringLength(100, ErrorMessage = "ClassName cannot exceed 100 characters")]
        [System.ComponentModel.DataAnnotations.RegularExpression(@"^(?!\s+$).+", ErrorMessage = "ClassName cannot be only whitespace")]
        public string ClassName 
        { 
            get => _className;
            set => _className = value?.Trim() ?? string.Empty;
        }

        [StringLength(500, ErrorMessage = "Description cannot exceed 500 characters")]
        [System.ComponentModel.DataAnnotations.RegularExpression(@"^(?!\s+$).+", ErrorMessage = "Description cannot be only whitespace")]
        public string? Description 
        { 
            get => _description;
            set => _description = value?.Trim();
        }

        [StringLength(1000, ErrorMessage = "SyllabusContent cannot exceed 1000 characters")]
        [System.ComponentModel.DataAnnotations.RegularExpression(@"^(?!\s+$).+", ErrorMessage = "SyllabusContent cannot be only whitespace")]
        public string? SyllabusContent 
        { 
            get => _syllabusContent;
            set => _syllabusContent = value?.Trim();
        }

        [Required(ErrorMessage = "SubjectId is required")]
        public int SubjectId { get; set; }

        public int? TeacherId { get; set; }

        public int? AssistantId { get; set; }

        public DateTime? StartDate { get; set; }

        public DateTime? EndDate { get; set; }

        [StringLength(50, ErrorMessage = "Status cannot exceed 50 characters")]
        [System.ComponentModel.DataAnnotations.RegularExpression(@"^(?!\s+$).+", ErrorMessage = "Status cannot be only whitespace")]
        public string? Status 
        { 
            get => _status;
            set => _status = value?.Trim();
        }
    }

    public class UpdateClassDto
    {
        [StringLength(100, ErrorMessage = "ClassName cannot exceed 100 characters")]
        [System.ComponentModel.DataAnnotations.RegularExpression(@"^(?!\s+$).+", ErrorMessage = "ClassName cannot be only whitespace")]
        public string? ClassName { get; set; }

        [StringLength(500, ErrorMessage = "Description cannot exceed 500 characters")]
        [System.ComponentModel.DataAnnotations.RegularExpression(@"^(?!\s+$).+", ErrorMessage = "Description cannot be only whitespace")]
        public string? Description { get; set; }

        [StringLength(1000, ErrorMessage = "SyllabusContent cannot exceed 1000 characters")]
        [System.ComponentModel.DataAnnotations.RegularExpression(@"^(?!\s+$).+", ErrorMessage = "SyllabusContent cannot be only whitespace")]
        public string? SyllabusContent { get; set; }

        public int? SubjectId { get; set; }

        public int? TeacherId { get; set; }

        public int? AssistantId { get; set; }

        public DateTime? StartDate { get; set; }

        public DateTime? EndDate { get; set; }

        [StringLength(50, ErrorMessage = "Status cannot exceed 50 characters")]
        [System.ComponentModel.DataAnnotations.RegularExpression(@"^(?!\s+$).+", ErrorMessage = "Status cannot be only whitespace")]
        public string? Status { get; set; }
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
        public DateTime? StartDate { get; set; }
        public DateTime? EndDate { get; set; }
        public string? Status { get; set; }
        public int StudentCount { get; set; }
        public DateTime CreatedAt { get; set; }
    }
}
