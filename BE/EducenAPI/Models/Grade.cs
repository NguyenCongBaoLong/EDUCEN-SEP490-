using System.ComponentModel.DataAnnotations;

namespace EducenAPI.Models
{
    public class Grade
    {
        [Key]
        public int GradeId { get; set; }

        [Required]
        [MaxLength(100)]
        public string GradeName { get; set; }

        public virtual ICollection<Class> Classes { get; set; } = new List<Class>();
    }
}