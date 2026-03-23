using System.ComponentModel.DataAnnotations;

namespace EducenAPI.Models
{
    public class Room
    {
        [Key]
        public int RoomId { get; set; }

        [Required]
        [MaxLength(100)]
        public string RoomName { get; set; }

        public virtual ICollection<Class> Classes { get; set; } = new List<Class>();
    }
}