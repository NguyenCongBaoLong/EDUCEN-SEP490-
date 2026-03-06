using EducenAPI.DTOs.Schedules;
using EducenAPI.Services.Interface;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace EducenAPI.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class SchedulesController : ControllerBase
    {
        private readonly IScheduleService _scheduleService;

        public SchedulesController(IScheduleService scheduleService)
        {
            _scheduleService = scheduleService;
        }

        // GET: api/Schedules
        [HttpGet]
        public async Task<IActionResult> GetSchedules()
        {
            var schedules = await _scheduleService.GetAllSchedulesAsync();
            return Ok(schedules);
        }

        // GET: api/Schedules/class/5
        [HttpGet("class/{classId:int}")]
        public async Task<IActionResult> GetSchedulesByClass(int classId)
        {
            var schedules = await _scheduleService.GetSchedulesByClassIdAsync(classId);
            return Ok(schedules);
        }

        // GET: api/Schedules/5
        [HttpGet("{id:int}")]
        public async Task<IActionResult> GetSchedule(int id)
        {
            var schedule = await _scheduleService.GetScheduleByIdAsync(id);

            if (schedule == null)
                return NotFound(new { message = "Schedule not found" });

            return Ok(schedule);
        }

        // POST: api/Schedules
        [HttpPost]
        public async Task<IActionResult> CreateSchedule(CreateScheduleDto dto)
        {
            try
            {
                var schedule = await _scheduleService.CreateScheduleAsync(dto);
                return CreatedAtAction(nameof(GetSchedule), new { id = schedule.ScheduleId }, schedule);
            }
            catch (Exception ex)
            {
                return Conflict(new { message = ex.Message });
            }
        }

        // PUT: api/Schedules/5
        [HttpPut("{id:int}")]
        public async Task<IActionResult> UpdateSchedule(int id, UpdateScheduleDto dto)
        {
            try
            {
                var success = await _scheduleService.UpdateScheduleAsync(id, dto);
                if (!success)
                    return NotFound(new { message = "Schedule not found" });

                return NoContent();
            }
            catch (Exception ex)
            {
                return Conflict(new { message = ex.Message });
            }
        }

        // DELETE: api/Schedules/5
        [HttpDelete("{id:int}")]
        public async Task<IActionResult> DeleteSchedule(int id)
        {
            try
            {
                var success = await _scheduleService.DeleteScheduleAsync(id);
                if (!success)
                    return NotFound(new { message = "Schedule not found" });

                return NoContent();
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        // PUT: api/Schedules/5/approve
        [HttpPut("{id:int}/approve")]
        public async Task<IActionResult> ApproveSchedule(int id)
        {
            try
            {
                var success = await _scheduleService.ApproveScheduleAsync(id);
                if (!success)
                    return NotFound(new { message = "Schedule not found" });

                return Ok(new { message = "Schedule approved successfully", scheduleId = id, status = "Approved" });
            }
            catch (Exception ex)
            {
                return Conflict(new { message = ex.Message });
            }
        }

        // PUT: api/Schedules/5/reject
        [HttpPut("{id:int}/reject")]
        public async Task<IActionResult> RejectSchedule(int id, [FromBody] RejectScheduleRequest? request)
        {
            try
            {
                var success = await _scheduleService.RejectScheduleAsync(id, request?.Reason);
                if (!success)
                    return NotFound(new { message = "Schedule not found" });

                return Ok(new { message = "Schedule rejected successfully", scheduleId = id, status = "Rejected" });
            }
            catch (Exception ex)
            {
                return Conflict(new { message = ex.Message });
            }
        }
    }

    public class RejectScheduleRequest
    {
        public string? Reason { get; set; }
    }
}
