using System.ComponentModel.DataAnnotations;

namespace EducenAPI.DTOs.LessionMaterials
{
    public class SaveMaterialDto
    {
        [Required]
        public int SessionId { get; set; }

        [Required]
        public string Title { get; set; } = null!;
    }
}
