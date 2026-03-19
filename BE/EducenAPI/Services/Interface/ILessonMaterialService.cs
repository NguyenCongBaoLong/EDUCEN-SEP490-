using EducenAPI.DTOs.FileUpload;
using EducenAPI.DTOs.LessionMaterials;
using EducenAPI.Models;

namespace EducenAPI.Services.Interface
{
    public interface ILessonMaterialService
    {
        Task<LessonMaterial> UploadMaterials(UploadMaterialDto dto);

        Task<LessonMaterial> SaveMaterials(SaveMaterialDto dto);
        Task<LessonMaterial> UpdateMaterialAsync(int id, SaveMaterialDto dto);

        Task<List<MaterialResponseDto>> GetMaterialsBySessionAsync(int sessionId, string baseUrl);
        Task<List<MaterialResponseDto>> GetAllMaterialsAsync(string baseUrl);
        Task<LessonMaterial> ImportMaterialAsync(int materialId, int sessionId);
        Task<bool> DeleteMaterialAsync(int id);
    }
}
