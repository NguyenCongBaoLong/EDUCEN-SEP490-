using EducenAPI.DTOs.Parents;

namespace EducenAPI.Services.Interface
{
    public interface IParentService
    {
        Task<IEnumerable<ParentDto>> GetAllParentsAsync();
        Task<ParentDto?> GetParentByIdAsync(int id);
        Task<ParentDto> CreateParentAsync(CreateParentDto dto);
        Task<bool> UpdateParentAsync(int id, UpdateParentDto dto);
        Task<bool> DeleteParentAsync(int id);
    }
}
