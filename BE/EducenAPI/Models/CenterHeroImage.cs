using System.ComponentModel.DataAnnotations;

namespace EducenAPI.Models
{
    public class CenterHeroImage
    {
        [Key]
        public int HeroImageId { get; set; }

        public int CenterProfileId { get; set; }

        public string ImageUrl { get; set; } = null!;
        public string? Title { get; set; }
        public string? SubTitle { get; set; }
        public string? ButtonText { get; set; }
        public string? ButtonLink { get; set; }

        public int SortOrder { get; set; }

        public CenterProfile CenterProfile { get; set; } = null!;
    }
}
