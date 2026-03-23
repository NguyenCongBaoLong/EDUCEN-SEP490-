using EducenAPI.DTOs.Grades;

namespace EducenAPI.Services.Interface
{
    public interface IGradeService
    {
        Task<IEnumerable<GradeDto>> GetAllGradesAsync();
        Task<GradeDto?> GetGradeByIdAsync(int id);
        Task<GradeDto> CreateGradeAsync(CreateGradeDto createGradeDto);
        Task<bool> UpdateGradeAsync(int id, UpdateGradeDto updateGradeDto);
        Task<bool> DeleteGradeAsync(int id);
    }
}
