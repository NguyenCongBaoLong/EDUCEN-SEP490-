using System.ComponentModel.DataAnnotations;

namespace EducenAPI.Models
{
    public class CenterHighlight
    {
        [Key]
        public int HighlightId { get; set; }

        public int CenterProfileId { get; set; }

        public string Icon { get; set; } = null!;

        public string Text { get; set; } = null!;

        public int SortOrder { get; set; }

        public CenterProfile CenterProfile { get; set; } = null!;
    }
}
