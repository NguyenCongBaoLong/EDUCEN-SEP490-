using System.ComponentModel.DataAnnotations;

namespace EducenAPI.Models
{
    public class CenterHeroImage : IMustHaveTenant
    {
        [Key]
        public int HeroImageId { get; set; }

        public string TenantId { get; set; } = string.Empty;

        public int CenterProfileId { get; set; }

        public string ImageUrl { get; set; } = null!;

        public int SortOrder { get; set; }

        public CenterProfile CenterProfile { get; set; } = null!;
    }
}
