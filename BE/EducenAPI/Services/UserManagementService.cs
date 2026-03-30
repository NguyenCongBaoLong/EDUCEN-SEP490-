using EducenAPI.Persistence.Contexts;
using EducenAPI.Services.Interface;
using Microsoft.EntityFrameworkCore;

namespace EducenAPI.Services
{
    public class UserManagementService : IUserManagementService
    {
        private readonly EducenV2Context _context;
        private readonly ILogger<UserManagementService> _logger;

        public UserManagementService(EducenV2Context context, ILogger<UserManagementService> logger)
        {
            _context = context;
            _logger = logger;
        }

        public async Task<bool> LockUserAccountAsync(int userId)
        {
            _logger.LogInformation($"[LockUser] Trying to lock userId: {userId}");
            _logger.LogInformation($"[LockUser] CurrentTenantId: {_context.CurrentTenantId}");
            
            var user = await _context.Users.FindAsync(userId);
            
            _logger.LogInformation($"[LockUser] Found user: {user?.Username}, AccountStatus: {user?.AccountStatus}");
            
            if (user == null)
            {
                _logger.LogWarning($"[LockUser] User not found with id: {userId}");
                return false;
            }

            if (user.AccountStatus == "Locked")
            {
                _logger.LogWarning($"[LockUser] User account is already locked: {user.Username}");
                throw new Exception("Tài khoản người dùng đã bị khóa.");
            }

            user.AccountStatus = "Locked";
            await _context.SaveChangesAsync();

            _logger.LogInformation($"[LockUser] Successfully locked user: {user.Username}");
            return true;
        }

        public async Task<bool> UnlockUserAccountAsync(int userId)
        {
            _logger.LogInformation($"[UnlockUser] Trying to unlock userId: {userId}");
            _logger.LogInformation($"[UnlockUser] CurrentTenantId: {_context.CurrentTenantId}");
            
            var user = await _context.Users.FindAsync(userId);
            
            _logger.LogInformation($"[UnlockUser] Found user: {user?.Username}, AccountStatus: {user?.AccountStatus}");
            
            if (user == null)
            {
                _logger.LogWarning($"[UnlockUser] User not found with id: {userId}");
                return false;
            }

            if (user.AccountStatus == "Active")
            {
                _logger.LogWarning($"[UnlockUser] User account is already active: {user.Username}");
                throw new Exception("Tài khoản người dùng đang hoạt động.");
            }

            user.AccountStatus = "Active";
            await _context.SaveChangesAsync();

            _logger.LogInformation($"[UnlockUser] Successfully unlocked user: {user.Username}");
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
