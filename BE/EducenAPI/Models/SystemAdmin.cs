using System.ComponentModel.DataAnnotations;

namespace EducenAPI.Models
{
    public class SystemAdmin
    {
        [Key]
        public string SysAdminId { get; set; }

        [Required]
        [MaxLength(100)]
        public string Username { get; set; }

        [Required]
        public string PasswordHash { get; set; }

    }
}
