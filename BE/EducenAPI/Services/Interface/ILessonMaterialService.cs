using EducenAPI.DTOs.FileUpload;
using EducenAPI.DTOs.LessionMaterials;
using EducenAPI.Models;

namespace EducenAPI.Services.Interface
{
    public interface ILessonMaterialService
    {
        Task<LessonMaterial> UploadMaterials(UploadMaterialDto dto);

        Task<LessonMaterial> SaveMaterials(SaveMaterialDto dto);
    }
}
