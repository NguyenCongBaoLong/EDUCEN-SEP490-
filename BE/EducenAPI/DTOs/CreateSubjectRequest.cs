using System.ComponentModel.DataAnnotations;

namespace EducenAPI.DTOs
{
    public class CreateSubjectRequest
    {
        [Required(ErrorMessage = "SubjectName is required")]
        [StringLength(100, ErrorMessage = "SubjectName cannot exceed 100 characters")]
        public string SubjectName { get; set; } = string.Empty;

        [StringLength(255, ErrorMessage = "Description cannot exceed 255 characters")]
        public string? Description { get; set; }
    }
}

