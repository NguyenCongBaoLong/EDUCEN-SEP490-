using System.Collections.Generic;
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

        public bool Status { get; set; } = true;

        public virtual ICollection<Class> Classes { get; set; } = new List<Class>();
        public virtual ICollection<Schedule> Schedules { get; set; } = new List<Schedule>();
    }
}