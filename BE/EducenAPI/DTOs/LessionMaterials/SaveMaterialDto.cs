using System.ComponentModel.DataAnnotations;

namespace EducenAPI.DTOs.LessionMaterials
{
    public class SaveMaterialDto
    {
        [Required]
        public int ClassId { get; set; }

        [Required]
        public string Title { get; set; } = null!;
    }
}
