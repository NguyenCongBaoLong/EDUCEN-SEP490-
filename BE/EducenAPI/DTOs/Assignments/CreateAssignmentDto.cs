using System.ComponentModel.DataAnnotations;

namespace EducenAPI.DTOs.Assignments
{
    public class CreateAssignmentDto
    {
        [Required]
        public int ClassId { get; set; }

        [Required]
        public string Title { get; set; } = null!;

        public string? Description { get; set; }

        public string? FileUrl { get; set; }

        public DateTime? StartTime { get; set; }

        public DateTime? EndTime { get; set; }

        public IFormFile? File { get; set; }
    }
}
