using Microsoft.AspNetCore.Http;
using System.ComponentModel.DataAnnotations;

namespace EducenAPI.DTOs.LessionMaterials
{
    public class SaveMaterialDto
    {
        public int? SessionId { get; set; }
        public int? GradeId { get; set; }

        [Required]
        [StringLength(200, ErrorMessage = "Title cannot exceed 200 characters")]
        public string Title { get; set; } = null!;

        public bool SaveToLibrary { get; set; }
        
        public IFormFile? File { get; set; }
    }
}
