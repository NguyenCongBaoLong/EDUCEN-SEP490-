using EducenAPI.DTOs.Rooms;
using EducenAPI.DTOs.Schedules;

namespace EducenAPI.Services.Interface
{
    public interface IRoomService
    {
        Task<IEnumerable<RoomDto>> GetAllRoomsAsync();
        Task<RoomDto?> GetRoomByIdAsync(int id);
        Task<RoomDto> CreateRoomAsync(CreateRoomDto createRoomDto);
        Task<bool> UpdateRoomAsync(int id, UpdateRoomDto updateRoomDto);
        Task<bool> DeleteRoomAsync(int id);
        Task<IEnumerable<ScheduleDto>> GetRoomScheduleAsync(int roomId);
    }
}
