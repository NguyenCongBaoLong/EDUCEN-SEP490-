using System.ComponentModel.DataAnnotations;

namespace EducenAPI.DTOs.Assignments
{
    public class CreateAssignmentDto
    {
        public int? SessionId { get; set; }
        public int? GradeId { get; set; }

        [Required]
        [StringLength(200, ErrorMessage = "Title cannot exceed 200 characters")]
        public string Title { get; set; } = null!;

        [StringLength(1000, ErrorMessage = "Description cannot exceed 1000 characters")]
        public string? Description { get; set; }

        public string? FileUrl { get; set; }

        public DateTime? StartTime { get; set; }

        public DateTime? EndTime { get; set; }

        public IFormFile? File { get; set; }

        public bool SaveToLibrary { get; set; }
    }
}
