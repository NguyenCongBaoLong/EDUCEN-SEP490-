using System.ComponentModel.DataAnnotations;

namespace EducenAPI.DTOs
{
    public class UpdateSubjectRequest
    {
        [Required(ErrorMessage = "SubjectName is required")]
        [StringLength(100, ErrorMessage = "SubjectName cannot exceed 100 characters")]
        public string SubjectName { get; set; } = string.Empty;

        [StringLength(500, ErrorMessage = "Description cannot exceed 500 characters")]
        public string? Description { get; set; }
    }
}

