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

        // Các mảng dữ liệu
        public List<string> HeroImages { get; set; } = new List<string>();
        public List<string> Images { get; set; } = new List<string>();
        public List<HighlightDto> Highlights { get; set; } = new List<HighlightDto>();
        public List<CourseDropdownDto> Courses { get; set; } = new List<CourseDropdownDto>();
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

