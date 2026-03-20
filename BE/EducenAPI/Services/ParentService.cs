using EducenAPI.DTOs.Parents;
using EducenAPI.Models;
using EducenAPI.Persistence.Contexts;
using EducenAPI.Services.Interface;
using Microsoft.EntityFrameworkCore;

namespace EducenAPI.Services
{
    public class ParentService : IParentService
    {
        private readonly EducenV2Context _context;

        public ParentService(EducenV2Context context)
        {
            _context = context;
        }

        public async Task<IEnumerable<ParentDto>> GetAllParentsAsync()
        {
            var parents = await _context.Parents
                .Include(p => p.ParentNavigation)
                .ToListAsync();

            return parents.Select(p => new ParentDto
            {
                ParentId = p.UserId,
                UserId = p.UserId,
                Username = p.ParentNavigation?.Username ?? "",
                FullName = p.ParentNavigation?.FullName ?? "",
                Email = p.ParentNavigation?.Email ?? "",
                PhoneNumber = p.ParentNavigation?.PhoneNumber,
                Address = p.ParentNavigation?.Address,
                AccountStatus = p.ParentNavigation?.AccountStatus ?? "Pending",
                ChildrenCount = p.Students.Count,
                CreatedAt = DateTime.Now
            }).ToList();
        }

        public async Task<ParentDto?> GetParentByIdAsync(int id)
        {
            var parent = await _context.Parents
                .Include(p => p.ParentNavigation)
                .FirstOrDefaultAsync(p => p.UserId == id);

            if (parent == null)
                return null;

            var userNav = parent.ParentNavigation;
            return new ParentDto
            {
                ParentId = parent.UserId,
                UserId = parent.UserId,
                Username = userNav != null ? userNav.Username : "",
                FullName = userNav != null ? userNav.FullName : "",
                Email = userNav != null ? userNav.Email : "",
                PhoneNumber = userNav != null ? userNav.PhoneNumber : null,
                Address = userNav != null ? userNav.Address : null,
                AccountStatus = userNav != null ? userNav.AccountStatus : "Pending",
                ChildrenCount = parent.Students.Count,
                CreatedAt = DateTime.Now
            };
        }

        public async Task<ParentDto> CreateParentAsync(CreateParentDto dto)
        {
            var parentRole = await _context.Roles
                .FirstOrDefaultAsync(r => r.RoleName == "Parent");

            if (parentRole == null)
                throw new Exception("Parent role not found");

            // Validate unique username if provided
            if (!string.IsNullOrWhiteSpace(dto.Username))
            {
                var existingUser = await _context.Users
                    .AnyAsync(u => u.Username == dto.Username);

                if (existingUser)
                    throw new Exception("Username already exists");
            }

            // Validate unique email if provided
            if (!string.IsNullOrWhiteSpace(dto.Email))
            {
                var existingEmail = await _context.Users
                    .AnyAsync(u => u.Email == dto.Email);

                if (existingEmail)
                    throw new Exception("Email already exists");
            }

            var user = new User
            {
                Username = dto.Username,
                PasswordHash = !string.IsNullOrWhiteSpace(dto.Password) 
                    ? BCrypt.Net.BCrypt.HashPassword(dto.Password) 
                    : null,
                RoleId = parentRole.RoleId,
                FullName = dto.FullName,
                Email = dto.Email,
                PhoneNumber = dto.PhoneNumber,
                Address = dto.Address,
                AccountStatus = !string.IsNullOrWhiteSpace(dto.Username) && !string.IsNullOrWhiteSpace(dto.Password) 
                    ? "Active" 
                    : "Pending"
            };

            _context.Users.Add(user);
            await _context.SaveChangesAsync();

            var parent = new Parent
            {
                UserId = user.UserId
            };

            _context.Parents.Add(parent);
            await _context.SaveChangesAsync();

            return new ParentDto
            {
                ParentId = parent.UserId,
                UserId = user.UserId,
                Username = user.Username,
                FullName = user.FullName ?? "",
                Email = user.Email ?? "",
                PhoneNumber = user.PhoneNumber,
                Address = user.Address,
                AccountStatus = user.AccountStatus,
                ChildrenCount = 0,
                CreatedAt = DateTime.Now
            };
        }

        public async Task<bool> UpdateParentAsync(int id, UpdateParentDto dto)
        {
            var existingParent = await _context.Parents
                .Include(p => p.ParentNavigation)
                .FirstOrDefaultAsync(p => p.UserId == id);

            if (existingParent == null)
                return false;

            // Update user info if exists
            if (existingParent.ParentNavigation != null)
            {
                if (!string.IsNullOrWhiteSpace(dto.Username))
                    existingParent.ParentNavigation.Username = dto.Username;

                if (!string.IsNullOrWhiteSpace(dto.Password))
                    existingParent.ParentNavigation.PasswordHash = BCrypt.Net.BCrypt.HashPassword(dto.Password);

                if (!string.IsNullOrWhiteSpace(dto.FullName))
                    existingParent.ParentNavigation.FullName = dto.FullName;

                if (!string.IsNullOrWhiteSpace(dto.Email))
                    existingParent.ParentNavigation.Email = dto.Email;

                if (!string.IsNullOrWhiteSpace(dto.PhoneNumber))
                    existingParent.ParentNavigation.PhoneNumber = dto.PhoneNumber;

                if (!string.IsNullOrWhiteSpace(dto.Address))
                    existingParent.ParentNavigation.Address = dto.Address;
            }

            await _context.SaveChangesAsync();
            return true;
        }

        public async Task<bool> DeleteParentAsync(int id)
        {
            var existingParent = await _context.Parents
                .Include(p => p.ParentNavigation)
                .FirstOrDefaultAsync(p => p.UserId == id);

            if (existingParent == null)
                return false;

            if (existingParent.ParentNavigation != null)
                _context.Users.Remove(existingParent.ParentNavigation);

            _context.Parents.Remove(existingParent);
            await _context.SaveChangesAsync();
            return true;
        }
    }
}
