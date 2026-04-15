using System.Collections.Generic;
using Microsoft.AspNetCore.Http;
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

        // Branding
        public string? PrimaryColor { get; set; }
        public string? BackgroundColor { get; set; }
        public string? FacebookUrl { get; set; }
        public string? InstagramUrl { get; set; }
        public string? YoutubeUrl { get; set; }
        
        // Layout Config (JSON)
        public string? DisplayConfig { get; set; }

        // --- CÁC TRƯỜNG UPLOAD ẢNH ---

        // 1. Logo
        public IFormFile? LogoFile { get; set; } // File ảnh Logo mới
        public string? ExistingLogoUrl { get; set; } // Link Logo cũ (nếu không upload file mới)

        // 2. Ảnh slide (Hero Images)
        public List<IFormFile>? HeroImageFiles { get; set; } 
        public List<SaveHeroImageDto>? HeroImages { get; set; } 

        // 3. Ảnh thư viện (Center Images)
        public List<IFormFile>? ImageFiles { get; set; }
        public List<string>? ExistingImageUrls { get; set; }

        // Danh sách Highlight
        public List<HighlightDto> Highlights { get; set; } = new List<HighlightDto>();
        public List<CourseDropdownDto>? Courses { get; set; } = new List<CourseDropdownDto>();

        // 4. Đội ngũ giáo viên
        public List<IFormFile>? StaffAvatarFiles { get; set; }
        public List<SaveStaffDto>? Staffs { get; set; }
    }

    public class SaveHeroImageDto
    {
        public string? Title { get; set; }
        public string? SubTitle { get; set; }
        public string? ButtonText { get; set; }
        public string? ButtonLink { get; set; }
        public string? ExistingImageUrl { get; set; } // Nếu giữ ảnh cũ hoặc thay đổi meta
        public int? FileIndex { get; set; } // Nếu upload ảnh mới cho slide này
    }

    public class SaveStaffDto
    {
        public int? Id { get; set; }
        public string Name { get; set; } = null!;
        public string? Role { get; set; }
        public string? Bio { get; set; }
        public string? ExistingAvatarUrl { get; set; }
        public int? FileIndex { get; set; }
    }
}
