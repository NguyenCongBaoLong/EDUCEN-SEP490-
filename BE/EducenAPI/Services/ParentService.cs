using EducenAPI.DTOs.Parents;
using EducenAPI.Models;
using EducenAPI.Persistence.Contexts;
using EducenAPI.Services.Interface;
using EducenAPI.Ultils;
using Microsoft.EntityFrameworkCore;

namespace EducenAPI.Services
{
    public class ParentService : IParentService
    {
        private readonly EducenV2Context _context;
        private readonly MailService _mailService;

        public ParentService(EducenV2Context context, MailService mailService)
        {
            _context = context;
            _mailService = mailService;
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
                    Address = null,
                    AccountStatus = p.ParentNavigation.AccountStatus,
                    ChildrenCount = p.Students.Count,
                    StudentNames = p.Students.Select(s => s.StudentNavigation.FullName ?? s.StudentNavigation.Username).ToList(),
                    StudentIds = p.Students.Select(s => s.UserId).ToList(),
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
                    Address = null,
                    AccountStatus = p.ParentNavigation.AccountStatus,
                    ChildrenCount = p.Students.Count,
                    StudentNames = p.Students.Select(s => s.StudentNavigation.FullName ?? s.StudentNavigation.Username).ToList(),
                    StudentIds = p.Students.Select(s => s.UserId).ToList(),
                    CreatedAt = DateTime.Now
                })
                .FirstOrDefaultAsync();
        }

        public async Task<ParentDto> CreateParentAsync(CreateParentDto dto)
        {
            string username = dto.Username;
            string password = dto.Password;
            string accountStatus = "Active";

            if (string.IsNullOrWhiteSpace(username) || string.IsNullOrWhiteSpace(password))
            {
                username = null;
                password = null;
                accountStatus = "NoAccount";
            }

            if (username != null)
            {
                var existingUser = await _context.Users
                    .AnyAsync(u => u.Username == username);

                if (existingUser)
                    throw new Exception("Username already exists");
            }

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
                Username = username,
                PasswordHash = password != null ? BCrypt.Net.BCrypt.HashPassword(password) : null,
                RoleId = parentRole.RoleId,
                FullName = dto.FullName,
                Email = dto.Email,
                PhoneNumber = dto.PhoneNumber,
                AccountStatus = accountStatus,
                IsAccountSent = false
            };

            var parent = new Parent
            {
                ParentNavigation = user
            };

            // Link Students
            if (dto.StudentIds != null && dto.StudentIds.Any())
            {
                var students = await _context.Students
                    .Where(s => dto.StudentIds.Contains(s.UserId))
                    .ToListAsync();
                foreach (var student in students)
                {
                    parent.Students.Add(student);
                }
            }

            _context.Users.Add(user);
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
                Address = null,
                AccountStatus = user.AccountStatus,
                ChildrenCount = parent.Students.Count,
                StudentNames = parent.Students.Select(s => s.StudentNavigation.FullName ?? s.StudentNavigation.Username).ToList(),
                StudentIds = parent.Students.Select(s => s.UserId).ToList(),
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
            if (dto.Address != null)
            {
                // Not supported in Parent model yet, skipping for now or handle via User
                if (existingParent.ParentNavigation != null)
                {
                    // Update address in User if possible, but User doesn't have Address field either in current model?
                    // Let's stick to fields that exist.
                }
            }

            // Update Linked Students
            if (dto.StudentIds != null)
            {
                // Load existing links
                await _context.Entry(existingParent).Collection(p => p.Students).LoadAsync();
                
                existingParent.Students.Clear();
                var students = await _context.Students
                    .Where(s => dto.StudentIds.Contains(s.UserId))
                    .ToListAsync();
                foreach (var student in students)
                {
                    existingParent.Students.Add(student);
                }
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

        public async Task<bool> SendAccountAsync(int parentId)
        {
            var user = await _context.Users
                .Include(u => u.Parent)
                .FirstOrDefaultAsync(u => u.UserId == parentId);

            if (user == null) return false;

            if (string.IsNullOrEmpty(user.Email))
                throw new Exception("Parent has no email address");

            // Generate Username if not exists
            if (string.IsNullOrEmpty(user.Username))
            {
                // Ensure unique username
                string baseUsername = user.Email.Trim().Split('@')[0].ToLower();
                string uniqueUsername = baseUsername;
                int counter = 1;
                while (await _context.Users.AnyAsync(u => u.Username == uniqueUsername))
                {
                    uniqueUsername = $"{baseUsername}{counter++}";
                }
                user.Username = uniqueUsername;
            }

            // Generate Secure Password
            string newPassword = PasswordGenerator.GenerateSecurePassword();
            user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(newPassword);
            
            user.AccountStatus = "Active";
            user.IsAccountSent = true;

            await _context.SaveChangesAsync();

            // Send Email
            await _mailService.SendParentAccount(user.Email, user.Username, newPassword);

            return true;
        }
    }
}
