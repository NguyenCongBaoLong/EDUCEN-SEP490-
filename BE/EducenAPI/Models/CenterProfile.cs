using System.ComponentModel.DataAnnotations;

namespace EducenAPI.Models
{
    public class CenterProfile
    {
        [Key]
        public int CenterProfileId { get; set; }

        public string Name { get; set; } = null!;
        public string? LogoUrl { get; set; }
        public string? Tagline { get; set; }
        public string? FooterTagline { get; set; }
        public string? IntroTitle { get; set; }
        public string? IntroDescription { get; set; }

        public string? Address { get; set; }
        public string? City { get; set; }

        public string? Phone { get; set; }
        public string? Email { get; set; }
        public string? Website { get; set; }

        public string? QuoteText { get; set; }
        public string? Copyright { get; set; }

        // Branding
        public string? PrimaryColor { get; set; }
        public string? BackgroundColor { get; set; }
        public string? FacebookUrl { get; set; }
        public string? InstagramUrl { get; set; }
        public string? YoutubeUrl { get; set; }

        // Layout Config (JSON)
        public string? DisplayConfig { get; set; }

        public ICollection<CenterImage>? Images { get; set; }
        public ICollection<CenterHeroImage>? HeroImages { get; set; }
        public ICollection<CenterHighlight>? Highlights { get; set; }
        public ICollection<CenterStaff>? Staffs { get; set; }
    }
}
