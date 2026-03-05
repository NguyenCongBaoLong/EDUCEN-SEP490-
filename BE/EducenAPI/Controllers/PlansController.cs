using EducenAPI.DTOs.Plans;
using EducenAPI.Services.Interface;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace EducenAPI.Controllers
{
    [Route("api/admin/plans")]
    [ApiController]
    public class PlansController : ControllerBase
    {
        private readonly IPlanService _planService;

        public PlansController(IPlanService planService)
        {
            _planService = planService;
        }

        [HttpGet]
        public async Task<IActionResult> GetPlans()
        {
            var plans = await _planService.GetAllPlansAsync();
            return Ok(plans);
        }

        [HttpGet("{id}")]
        public async Task<IActionResult> GetPlan(string id)
        {
            var plan = await _planService.GetPlanByIdAsync(id);

            if (plan == null)
                return NotFound();

            return Ok(plan);
        }

        [HttpPost]
        public async Task<IActionResult> CreatePlan(CreatePlanRequest request)
        {
            try
            {
                var plan = await _planService.CreatePlanAsync(request);

                return CreatedAtAction(nameof(GetPlan),
                    new { id = plan.PlanId },
                    plan);
            }
            catch (Exception ex)
            {
                if (ex.Message.Contains("exists"))
                    return Conflict(new { message = ex.Message });

                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> UpdatePlan(string id, UpdatePlanRequest request)
        {
            try
            {
                var updated = await _planService.UpdatePlanAsync(id, request);

                if (!updated)
                    return NotFound();

                return NoContent();
            }
            catch (Exception ex)
            {
                if (ex.Message.Contains("exists"))
                    return Conflict(new { message = ex.Message });

                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> DeletePlan(string id)
        {
            try
            {
                var deleted = await _planService.DeletePlanAsync(id);

                if (!deleted)
                    return NotFound();

                return NoContent();
            }
            catch (Exception ex)
            {
                return Conflict(new { message = ex.Message });
            }
        }
    }
}
