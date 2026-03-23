using EducenAPI.DTOs.Rooms;
using EducenAPI.DTOs.Schedules;
using EducenAPI.Models;
using EducenAPI.Persistence.Contexts;
using EducenAPI.Services.Interface;
using Microsoft.EntityFrameworkCore;

namespace EducenAPI.Services
{
    public class RoomService : IRoomService
    {
        private readonly EducenV2Context _context;

        public RoomService(EducenV2Context context)
        {
            _context = context;
        }

        public async Task<IEnumerable<RoomDto>> GetAllRoomsAsync()
        {
            return await _context.Rooms
                .Select(r => new RoomDto
                {
                    RoomId = r.RoomId,
                    RoomName = r.RoomName,
                    Status = r.Status
                })
                .ToListAsync();
        }

        public async Task<RoomDto?> GetRoomByIdAsync(int id)
        {
            var room = await _context.Rooms.FindAsync(id);
            if (room == null) return null;

            return new RoomDto
            {
                RoomId = room.RoomId,
                RoomName = room.RoomName,
                Status = room.Status
            };
        }

        public async Task<RoomDto> CreateRoomAsync(CreateRoomDto dto)
        {
            var room = new Room
            {
                RoomName = dto.RoomName,
                Status = dto.Status
            };

            _context.Rooms.Add(room);
            await _context.SaveChangesAsync();

            return new RoomDto
            {
                RoomId = room.RoomId,
                RoomName = room.RoomName,
                Status = room.Status
            };
        }

        public async Task<bool> UpdateRoomAsync(int id, UpdateRoomDto dto)
        {
            var room = await _context.Rooms.FindAsync(id);
            if (room == null) return false;

            room.RoomName = dto.RoomName;
            room.Status = dto.Status;

            _context.Rooms.Update(room);
            await _context.SaveChangesAsync();
            return true;
        }

        public async Task<bool> DeleteRoomAsync(int id)
        {
            var room = await _context.Rooms.FindAsync(id);
            if (room == null) return false;

            // Check if room is used in any class
            var isUsed = await _context.Classes.AnyAsync(c => c.RoomId == id);
            if (isUsed)
            {
                throw new InvalidOperationException("Cannot delete room as it is assigned to one or more classes.");
            }

            _context.Rooms.Remove(room);
            await _context.SaveChangesAsync();
            return true;
        }

        public async Task<IEnumerable<ScheduleDto>> GetRoomScheduleAsync(int roomId)
        {
            return await _context.Schedules
                .Include(s => s.Class)
                .Where(s => s.RoomId == roomId && s.Class.Status.ToLower() == "active")
                .Select(s => new ScheduleDto
                {
                    ScheduleId = s.ScheduleId,
                    ClassId = s.ClassId,
                    ClassName = s.Class.ClassName,
                    DayOfWeek = s.DayOfWeek,
                    StartTime = TimeSpan.FromHours(s.StartTime.Hour).Add(TimeSpan.FromMinutes(s.StartTime.Minute)),
                    EndTime = TimeSpan.FromHours(s.EndTime.Hour).Add(TimeSpan.FromMinutes(s.EndTime.Minute)),
                    Status = s.Class.Status
                })
                .ToListAsync();
        }
    }
}
