using EducenAPI.DTOs.SupportRequestDTOs;
using EducenAPI.Models;
using EducenAPI.Services.Interface;
using Microsoft.AspNetCore.Http.HttpResults;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace EducenAPI.Controllers
{
    public class SupportRequestsController : ControllerBase
    {
        private readonly ISupportRequestsService _service;

        public SupportRequestsController(ISupportRequestsService service)
        {
            _service = service;
        }

        [HttpPost]
        public async Task<IActionResult> Create([FromBody] CreateSupportRequestDto dto)
        {
            var result = await _service.CreateAsync(dto);
            return Ok(result);
        }

        [HttpGet("my")]
        public async Task<IActionResult> GetMyRequests()
        {
            var result = await _service.GetMyRequestsAsync();
            return Ok(result);
        }

        [HttpGet("my/{id}")]
        public async Task<IActionResult> GetMyRequestById(int id)
        {
            var result = await _service.GetMyRequestByIdAsync(id);
            return Ok(result);
        }
    }
}
