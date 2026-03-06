using System.ComponentModel.DataAnnotations;

namespace EducenAPI.DTOs.Classes
{
    public class CreateClassDto
    {
        [Required(ErrorMessage = "ClassName is required")]
        [StringLength(100, ErrorMessage = "ClassName cannot exceed 100 characters")]
        public string ClassName { get; set; } = string.Empty;

        [StringLength(500, ErrorMessage = "Description cannot exceed 500 characters")]
        public string? Description { get; set; }

        [StringLength(1000, ErrorMessage = "SyllabusContent cannot exceed 1000 characters")]
        public string? SyllabusContent { get; set; }

        [Required(ErrorMessage = "SubjectId is required")]
        public int SubjectId { get; set; }

        public int? TeacherId { get; set; }

        public int? AssistantId { get; set; }

        public DateTime? StartDate { get; set; }

        public DateTime? EndDate { get; set; }

        [StringLength(50, ErrorMessage = "Status cannot exceed 50 characters")]
        public string? Status { get; set; }
    }

    public class UpdateClassDto
    {
        [StringLength(100, ErrorMessage = "ClassName cannot exceed 100 characters")]
        public string? ClassName { get; set; }

        [StringLength(500, ErrorMessage = "Description cannot exceed 500 characters")]
        public string? Description { get; set; }

        [StringLength(1000, ErrorMessage = "SyllabusContent cannot exceed 1000 characters")]
        public string? SyllabusContent { get; set; }

        public int? SubjectId { get; set; }

        public int? TeacherId { get; set; }

        public int? AssistantId { get; set; }

        public DateTime? StartDate { get; set; }

        public DateTime? EndDate { get; set; }

        [StringLength(50, ErrorMessage = "Status cannot exceed 50 characters")]
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
