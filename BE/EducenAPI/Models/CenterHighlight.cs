using System.ComponentModel.DataAnnotations;

namespace EducenAPI.Models
{
    public class CenterHighlight : IMustHaveTenant
    {
        [Key]
        public int HighlightId { get; set; }

        public string TenantId { get; set; } = string.Empty;

        public int CenterProfileId { get; set; }

        public string Icon { get; set; } = null!;

        public string Text { get; set; } = null!;

        public int SortOrder { get; set; }

        public CenterProfile CenterProfile { get; set; } = null!;
    }
}
