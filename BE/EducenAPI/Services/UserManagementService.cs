using EducenAPI.Persistence.Contexts;
using EducenAPI.Services.Interface;
using Microsoft.EntityFrameworkCore;

namespace EducenAPI.Services
{
    public class UserManagementService : IUserManagementService
    {
        private readonly EducenV2Context _context;

        public UserManagementService(EducenV2Context context)
        {
            _context = context;
        }

        public async Task<bool> LockUserAccountAsync(int userId)
        {
            var user = await _context.Users.FindAsync(userId);
            
            if (user == null)
                return false;

            if (user.AccountStatus == "Locked")
                throw new Exception("User account is already locked");

            user.AccountStatus = "Locked";
            await _context.SaveChangesAsync();

            return true;
        }

        public async Task<bool> UnlockUserAccountAsync(int userId)
        {
            var user = await _context.Users.FindAsync(userId);
            
            if (user == null)
                return false;

            if (user.AccountStatus == "Active")
                throw new Exception("User account is already active");

            user.AccountStatus = "Active";
            await _context.SaveChangesAsync();

            return true;
        }

        public async Task<IEnumerable<object>> GetAllUsersAsync()
        {
            return await _context.Users
                .Include(u => u.Role)
                .Select(u => new
                {
                    u.UserId,
                    u.Username,
                    u.FullName,
                    u.Email,
                    u.PhoneNumber,
                    u.AccountStatus,
                    RoleName = u.Role.RoleName,
                    u.RoleId
                })
                .ToListAsync();
        }

        public async Task<object?> GetUserByIdAsync(int userId)
        {
            return await _context.Users
                .Include(u => u.Role)
                .Where(u => u.UserId == userId)
                .Select(u => new
                {
                    u.UserId,
                    u.Username,
                    u.FullName,
                    u.Email,
                    u.PhoneNumber,
                    u.Address,
                    u.AccountStatus,
                    RoleName = u.Role.RoleName,
                    u.RoleId
                })
                .FirstOrDefaultAsync();
        }
    }
}
