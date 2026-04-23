using EducenAPI.DTOs.Rooms;
using EducenAPI.DTOs.Schedules;
using EducenAPI.Models;
using EducenAPI.Persistence.Contexts;
using EducenAPI.Services.Interface;
using Microsoft.EntityFrameworkCore;
using System.Collections.Concurrent;

namespace EducenAPI.Services
{
    public class RoomService : IRoomService
    {
        private readonly EducenV2Context _context;
        private static readonly ConcurrentDictionary<string, SemaphoreSlim> _locks = new();

        public RoomService(EducenV2Context context)
        {
            _context = context;
        }

        private SemaphoreSlim GetLock(string key)
        {
            return _locks.GetOrAdd(key, _ => new SemaphoreSlim(1, 1));
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
            dto.RoomName = dto.RoomName?.Trim();

            if (string.IsNullOrWhiteSpace(dto.RoomName))
                throw new ArgumentException("Tên phòng không được chỉ chứa khoảng trắng.");

            var normalizedName = dto.RoomName.ToLowerInvariant();
            var lockObj = GetLock($"room_{normalizedName}");
            
            await lockObj.WaitAsync();
            try
            {
                var exists = await _context.Rooms.AnyAsync(r => r.RoomName.ToLower() == normalizedName);
                if (exists)
                    throw new InvalidOperationException("Tên phòng đã tồn tại.");

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
            finally
            {
                lockObj.Release();
            }
        }

        public async Task<bool> UpdateRoomAsync(int id, UpdateRoomDto dto)
        {
            var room = await _context.Rooms.FindAsync(id);
            if (room == null) return false;

            var normalizedName = dto.RoomName?.Trim()?.ToLowerInvariant();
            var duplicateExists = await _context.Rooms
                .AnyAsync(r => r.RoomName.ToLower() == normalizedName && r.RoomId != id);
            if (duplicateExists)
                throw new InvalidOperationException("Tên phòng đã tồn tại.");

            room.RoomName = dto.RoomName?.Trim();
            room.Status = dto.Status;

            _context.Rooms.Update(room);
            await _context.SaveChangesAsync();
            return true;
        }

        public async Task<bool> DeleteRoomAsync(int id)
        {
            var room = await _context.Rooms.FindAsync(id);
            if (room == null) return false;

            // Block deletion if the room is referenced by any class directly
            // or by class schedules (legacy/new flows may store room on schedules).
            var isUsedByClass = await _context.Classes.AnyAsync(c => c.RoomId == id);
            var isUsedBySchedule = await _context.Schedules.AnyAsync(s => s.RoomId == id);
            if (isUsedByClass || isUsedBySchedule)
            {
                throw new InvalidOperationException("Không thể xóa phòng vì đang được sử dụng bởi một hoặc nhiều lớp học.");
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