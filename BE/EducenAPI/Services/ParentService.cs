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
            return await _context.Parents
                .Include(p => p.ParentNavigation)
                .Select(p => new ParentDto
                {
                    ParentId = p.UserId,
                    UserId = p.UserId,
                    Username = p.ParentNavigation.Username ?? "",
                    FullName = p.ParentNavigation.FullName ?? "",
                    Email = p.ParentNavigation.Email ?? "",
                    PhoneNumber = p.ParentNavigation.PhoneNumber,
                    Address = null, // Parent model doesn't have Address field
                    AccountStatus = p.ParentNavigation.AccountStatus,
                    ChildrenCount = p.Students.Count,
                    CreatedAt = DateTime.Now
                })
                .ToListAsync();
        }

        public async Task<ParentDto?> GetParentByIdAsync(int id)
        {
            return await _context.Parents
                .Include(p => p.ParentNavigation)
                .Where(p => p.UserId == id)
                .Select(p => new ParentDto
                {
                    ParentId = p.UserId,
                    UserId = p.UserId,
                    Username = p.ParentNavigation.Username ?? "",
                    FullName = p.ParentNavigation.FullName ?? "",
                    Email = p.ParentNavigation.Email ?? "",
                    PhoneNumber = p.ParentNavigation.PhoneNumber,
                    Address = null, // Parent model doesn't have Address field
                    AccountStatus = p.ParentNavigation.AccountStatus,
                    ChildrenCount = p.Students.Count,
                    CreatedAt = DateTime.Now
                })
                .FirstOrDefaultAsync();
        }

        public async Task<ParentDto> CreateParentAsync(CreateParentDto dto)
        {
            // Skip user creation if username or password is null
            if (string.IsNullOrWhiteSpace(dto.Username) || string.IsNullOrWhiteSpace(dto.Password))
            {
                // Create parent profile without user account
                var parentProfile = new Parent
                {
                    UserId = 0 // Will be set when account is created
                };

                _context.Parents.Add(parentProfile);
                await _context.SaveChangesAsync();

                return new ParentDto
                {
                    ParentId = parentProfile.UserId,
                    UserId = parentProfile.UserId,
                    Username = "",
                    FullName = dto.FullName,
                    Email = dto.Email,
                    PhoneNumber = dto.PhoneNumber,
                    Address = null, // Parent model doesn't have Address field
                    AccountStatus = "Pending",
                    ChildrenCount = 0,
                    CreatedAt = DateTime.Now
                };
            }

            var existingUser = await _context.Users
                .AnyAsync(u => u.Username == dto.Username);

            if (existingUser)
                throw new Exception("Username already exists");

            var existingEmail = await _context.Users
                .AnyAsync(u => u.Email == dto.Email);

            if (existingEmail)
                throw new Exception("Email already exists");

            var parentRole = await _context.Roles
                .FirstOrDefaultAsync(r => r.RoleName == "Parent");

            if (parentRole == null)
                throw new Exception("Parent role not found");

            var user = new User
            {
                Username = dto.Username,
                PasswordHash = BCrypt.Net.BCrypt.HashPassword(dto.Password),
                RoleId = parentRole.RoleId,
                FullName = dto.FullName,
                Email = dto.Email,
                PhoneNumber = dto.PhoneNumber,
                AccountStatus = "Active"
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
                Address = null, // Parent model doesn't have Address field
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
            }

            // Parent model doesn't have Address field to update

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
