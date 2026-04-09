using EducenAPI.DTOs.SupportRequestDTOs;
using EducenAPI.Models;
using EducenAPI.Persistence.Contexts;
using EducenAPI.Services.Interface;
using Microsoft.EntityFrameworkCore;
using System;

namespace EducenAPI.Services
{
    public class SupportRequestsService : ISupportRequestsService
    {
        private readonly EducenV2Context _context;
        private readonly IUserContextService _userContext;
        public SupportRequestsService(EducenV2Context context, IUserContextService userContext)
        {
            _context = context;
            _userContext = userContext;
        }

        public async Task<SupportRequestResponseDto> CreateAsync(CreateSupportRequestDto dto)
        {
            var senderId = _userContext.GetUserId();
            var entity = new SupportRequest
            {
                SenderId = senderId,
                Title = dto.Title,
                Content = dto.Content,
                Status = "Pending",
                IsRead = false,
                CreatedAt = DateTime.UtcNow
            };

            _context.SupportRequests.Add(entity);
            await _context.SaveChangesAsync();

            var created = await _context.SupportRequests
                .Include(x => x.Sender)
                .Include(x => x.Receiver)
                .FirstOrDefaultAsync(x => x.Id == entity.Id);

            return MapToDto(created);
        }

        public async Task<List<SupportRequestResponseDto>> GetMyRequestsAsync()
        {
            var userId = _userContext.GetUserId();
            var list = await _context.SupportRequests
                .Include(x => x.Sender)
                    .ThenInclude(u => u.Role)
                .Include(x => x.Receiver)
                .Where(x => x.SenderId == userId)
                .OrderByDescending(x => x.CreatedAt)
                .ToListAsync();

            return list.Select(MapToDto).ToList();
        }

        public async Task<SupportRequestResponseDto> GetMyRequestByIdAsync(int id)
        {
            var userId = _userContext.GetUserId();
            var entity = await _context.SupportRequests
                .Include(x => x.Sender)
                    .ThenInclude(u => u.Role)
                .Include(x => x.Receiver)
                .FirstOrDefaultAsync(x => x.Id == id && x.SenderId == userId);

            if (entity == null)
                throw new Exception("Không tìm thấy request.");

            return MapToDto(entity);
        }

        public async Task<List<SupportRequestResponseDto>> GetAllAsync()
        {
            var list = await _context.SupportRequests
                .Include(x => x.Sender)
                    .ThenInclude(u => u.Role)
                .Include(x => x.Receiver)
                .OrderByDescending(x => x.CreatedAt)
                .ToListAsync();

            return list.Select(MapToDto).ToList();
        }

        public async Task<SupportRequestResponseDto> GetByIdAsync(int id)
        {
            var entity = await _context.SupportRequests
                .Include(x => x.Sender)
                    .ThenInclude(u => u.Role)
                .Include(x => x.Receiver)
                .FirstOrDefaultAsync(x => x.Id == id);

            if (entity == null)
                throw new Exception("Không tìm thấy request.");

            return MapToDto(entity);
        }

        public async Task<SupportRequestResponseDto> ReplyAsync(int adminId, int id, ReplySupportRequestDto dto)
        {
            var entity = await _context.SupportRequests
                .Include(x => x.Sender)
                    .ThenInclude(u => u.Role)
                .Include(x => x.Receiver)
                .FirstOrDefaultAsync(x => x.Id == id);

            if (entity == null)
                throw new Exception("Không tìm thấy request.");

            entity.ReceiverId = adminId;
            entity.AdminResponse = dto.AdminResponse;
            entity.Status = "Answered";
            entity.IsRead = true;
            //entity.RespondedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            return MapToDto(entity);
        }

        public async Task<bool> MarkAsReadAsync(int id)
        {
            var entity = await _context.SupportRequests.FirstOrDefaultAsync(x => x.Id == id);
            if (entity == null)
                return false;

            entity.IsRead = true;
            await _context.SaveChangesAsync();
            return true;
        }

        private SupportRequestResponseDto MapToDto(SupportRequest x)
        {
            return new SupportRequestResponseDto
            {
                Id = x.Id,
                SenderId = x.SenderId,
                SenderName = x.Sender?.FullName ?? "",
                SenderRoleName = x.Sender?.Role?.RoleName ?? "",
                ReceiverId = x.ReceiverId,
                ReceiverName = x.Receiver?.FullName,
                Title = x.Title,
                Content = x.Content,
                Status = x.Status,
                IsRead = x.IsRead,
                CreatedAt = x.CreatedAt,
                AdminResponse = x.AdminResponse,
                //RespondedAt = x.RespondedAt
            };
        }
    }
}
