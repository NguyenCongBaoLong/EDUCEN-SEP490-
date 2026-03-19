using Microsoft.AspNetCore.Http;
using System.ComponentModel.DataAnnotations;

namespace EducenAPI.DTOs.LessionMaterials
{
    public class SaveMaterialDto
    {
        public int? SessionId { get; set; }

        [Required]
        public string Title { get; set; } = null!;

        public bool SaveToLibrary { get; set; }
        
        public IFormFile? File { get; set; }
    }
}
