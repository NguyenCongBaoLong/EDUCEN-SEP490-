using System.ComponentModel.DataAnnotations;

namespace EducenAPI.Models
{
    public class CenterImage
    {
        [Key]
        public int ImageId { get; set; }

        public int CenterProfileId { get; set; }

        public string ImageUrl { get; set; } = null!;

        public int SortOrder { get; set; }

        public CenterProfile CenterProfile { get; set; } = null!;
    }
}
