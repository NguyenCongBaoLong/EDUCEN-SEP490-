using EducenAPI.DTOs.Assistants;

namespace EducenAPI.Services.Interface
{
    public interface IAssistantService
    {
        Task<IEnumerable<AssistantDto>> GetAllAssistantsAsync();
        Task<AssistantDto?> GetAssistantByIdAsync(int id);
        Task<AssistantDto> CreateAssistantAsync(CreateAssistantDto dto);
        Task<bool> UpdateAssistantAsync(int id, UpdateAssistantDto dto);
        Task<bool> DeleteAssistantAsync(int id);
    }
}
