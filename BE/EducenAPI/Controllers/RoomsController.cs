using EducenAPI.DTOs.Rooms;
using EducenAPI.DTOs.Schedules;
using EducenAPI.Services.Interface;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace EducenAPI.Controllers
{
    [Authorize]
    [ApiController]
    [Route("api/[controller]")]
    public class RoomsController : ControllerBase
    {
        private readonly IRoomService _roomService;

        public RoomsController(IRoomService roomService)
        {
            _roomService = roomService;
        }

        [HttpGet]
        [Authorize(Roles = "Admin,TenantAdmin,Teacher,Assistant")]
        public async Task<ActionResult<IEnumerable<RoomDto>>> GetRooms()
        {
            var rooms = await _roomService.GetAllRoomsAsync();
            return Ok(rooms);
        }

        [HttpGet("{id}")]
        [Authorize(Roles = "Admin,TenantAdmin,Teacher,Assistant")]
        public async Task<ActionResult<RoomDto>> GetRoom(int id)
        {
            var room = await _roomService.GetRoomByIdAsync(id);
            if (room == null) return NotFound();
            return Ok(room);
        }

        [HttpPost]
        [Authorize(Roles = "Admin,TenantAdmin")]
        public async Task<ActionResult<RoomDto>> CreateRoom(CreateRoomDto dto)
        {
            var room = await _roomService.CreateRoomAsync(dto);
            return CreatedAtAction(nameof(GetRoom), new { id = room.RoomId }, room);
        }

        [HttpPut("{id}")]
        [Authorize(Roles = "Admin,TenantAdmin")]
        public async Task<IActionResult> UpdateRoom(int id, UpdateRoomDto dto)
        {
            var success = await _roomService.UpdateRoomAsync(id, dto);
            if (!success) return NotFound();
            return NoContent();
        }

        [HttpDelete("{id}")]
        [Authorize(Roles = "Admin,TenantAdmin")]
        public async Task<IActionResult> DeleteRoom(int id)
        {
            try
            {
                var success = await _roomService.DeleteRoomAsync(id);
                if (!success) return NotFound();
                return NoContent();
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpGet("{id}/schedule")]
        [Authorize(Roles = "Admin,TenantAdmin,Teacher,Assistant")]
        public async Task<ActionResult<IEnumerable<ScheduleDto>>> GetRoomSchedule(int id)
        {
            var schedule = await _roomService.GetRoomScheduleAsync(id);
            return Ok(schedule);
        }
    }
}
