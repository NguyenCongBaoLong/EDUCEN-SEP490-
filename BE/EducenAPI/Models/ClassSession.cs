using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace EducenAPI.Models
{
    public class ClassSession
    {
        [Key]
        public int SessionId { get; set; }

        [Required]
        public int ScheduleId { get; set; }

        [Required]
        public DateTime SessionDate { get; set; }

        [MaxLength(50)]
        public string Status { get; set; } = "Scheduled";

        // Navigation
        [ForeignKey("ScheduleId")]
        public Schedule Schedule { get; set; } = null!;
        public ICollection<Attendance> Attendances { get; set; } = new List<Attendance>();
        public ICollection<Assignment> Assignments { get; set; }
        public ICollection<LessonMaterial> LessonMaterials { get; set; }

    }
}
