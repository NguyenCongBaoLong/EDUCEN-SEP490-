using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace EducenAPI.Models
{
    public class CenterStaff
    {
        [Key]
        public int CenterStaffId { get; set; }

        public int CenterProfileId { get; set; }
        [ForeignKey("CenterProfileId")]
        public CenterProfile CenterProfile { get; set; } = null!;

        public string Name { get; set; } = null!;
        public string? Role { get; set; }
        public string? Bio { get; set; }
        public string? AvatarUrl { get; set; }
        public int SortOrder { get; set; }
    }
}
