using System.Collections.Generic;

namespace EducenAPI.DTOs.CenterHome
{
    public class CenterHomeResponseDto
    {
        public string Name { get; set; }
        public string Logo { get; set; } // Map với LogoUrl
        public string Tagline { get; set; }
        public string FooterTagline { get; set; }
        public string Address { get; set; }
        public string City { get; set; }
        public string Phone { get; set; }
        public string Email { get; set; }
        public string Website { get; set; }
        public string IntroTitle { get; set; }
        public string IntroDescription { get; set; }
        public string QuoteText { get; set; }
        public string Copyright { get; set; }

        public string? PrimaryColor { get; set; }
        public string? BackgroundColor { get; set; }
        public string? FacebookUrl { get; set; }
        public string? InstagramUrl { get; set; }
        public string? YoutubeUrl { get; set; }
        public string? DisplayConfig { get; set; }

        // Các mảng dữ liệu
        public List<HeroImageDto> HeroImages { get; set; } = new List<HeroImageDto>();
        public List<string> Images { get; set; } = new List<string>();
        public List<HighlightDto> Highlights { get; set; } = new List<HighlightDto>();
        public List<CourseDropdownDto> Courses { get; set; } = new List<CourseDropdownDto>();
        public List<StaffDto> Staffs { get; set; } = new List<StaffDto>();
    }

    public class HeroImageDto
    {
        public string ImageUrl { get; set; }
        public string? Title { get; set; }
        public string? SubTitle { get; set; }
        public string? ButtonText { get; set; }
        public string? ButtonLink { get; set; }
    }

    public class StaffDto
    {
        public int Id { get; set; }
        public string Name { get; set; }
        public string? Role { get; set; }
        public string? Bio { get; set; }
        public string? AvatarUrl { get; set; }
    }

    public class HighlightDto
    {
        public string Icon { get; set; }
        public string Text { get; set; }
    }

    public class CourseDropdownDto
    {
        public string Value { get; set; }
        public string Label { get; set; }
    }
}

