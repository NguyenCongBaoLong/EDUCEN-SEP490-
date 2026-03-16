using System.ComponentModel.DataAnnotations;

namespace EducenAPI.DTOs.LessionMaterials
{
    public class UploadMaterialDto
    {
        [Required]
        public int MaterialId { get; set; }

        [Required]
        public IFormFile File { get; set; } = null!;
    }
}
