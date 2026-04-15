using EducenAPI.DTOs.FileUpload;
using EducenAPI.DTOs.LessionMaterials;
using EducenAPI.Models;

namespace EducenAPI.Services.Interface
{
    public interface ILessonMaterialService
    {
        Task<LessonMaterial> UploadMaterials(UploadMaterialDto dto);

        Task<MaterialResponseDto> SaveMaterials(SaveMaterialDto dto, string baseUrl);
        Task<MaterialResponseDto> UpdateMaterialAsync(int id, SaveMaterialDto dto, string baseUrl);

        Task<List<MaterialResponseDto>> GetMaterialsBySessionAsync(int sessionId, string baseUrl);
        Task<List<MaterialResponseDto>> GetAllMaterialsAsync(string baseUrl);
        Task<LessonMaterial> ImportMaterialAsync(int materialId, int sessionId);
        Task<bool> DeleteMaterialAsync(int id);
    }
}
