using System.ComponentModel.DataAnnotations;

namespace EducenAPI.DTOs.CenterHome
{
    public class SaveCenterHomeDto
    {
        [Required]
        public string Name { get; set; } = null!;
        public string? Tagline { get; set; }
        public string? FooterTagline { get; set; }
        public string? Address { get; set; }
        public string? City { get; set; }
        public string? Phone { get; set; }
        public string? Email { get; set; }
        public string? Website { get; set; }
        public string? IntroTitle { get; set; }
        public string? IntroDescription { get; set; }
        public string? QuoteText { get; set; }
        public string? Copyright { get; set; }

        // --- CÁC TRƯỜNG UPLOAD ẢNH ---

        // 1. Logo
        public IFormFile? LogoFile { get; set; } // File ảnh Logo mới
        public string? ExistingLogoUrl { get; set; } // Link Logo cũ (nếu không upload file mới)

        // 2. Ảnh slide (Hero Images)
        public List<IFormFile>? HeroImageFiles { get; set; } // Danh sách file ảnh Hero mới
        public List<string>? ExistingHeroImageUrls { get; set; } // Danh sách link ảnh Hero cũ muốn giữ lại

        // 3. Ảnh thư viện (Center Images)
        public List<IFormFile>? ImageFiles { get; set; }
        public List<string>? ExistingImageUrls { get; set; }

        // Danh sách Highlight (Khi dùng form-data, FE sẽ gửi dưới dạng Highlights[0].Icon, Highlights[0].Text...)
        public List<HighlightDto> Highlights { get; set; } = new List<HighlightDto>();
    }
}
