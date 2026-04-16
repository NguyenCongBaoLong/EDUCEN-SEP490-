using EducenAPI.DTOs.SupportRequestDTOs;
using EducenAPI.Models;

namespace EducenAPI.Services.Interface
{
    public interface ISupportRequestsService
    {
        Task<SupportRequestResponseDto> CreateAsync(CreateSupportRequestDto dto);
        Task<List<SupportRequestResponseDto>> GetMyRequestsAsync();
        Task<SupportRequestResponseDto> GetMyRequestByIdAsync(int id);

        Task<List<SupportRequestResponseDto>> GetAllAsync();
        Task<SupportRequestResponseDto> GetByIdAsync(int id);
        Task<SupportRequestResponseDto> ReplyAsync(int adminId, int id, ReplySupportRequestDto dto);
        Task<SupportRequestResponseDto> ApproveAsync(int adminId, int id, string? note);
        Task<SupportRequestResponseDto> RejectAsync(int adminId, int id, string reason);
        Task<bool> MarkAsReadAsync(int id);
    }
}
