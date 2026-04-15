using EducenAPI.Services.Interface;
using System.Security.Claims;

namespace EducenAPI.Services
{
    public class UserContextService : IUserContextService
    {
        private readonly IHttpContextAccessor _httpContext;

        public UserContextService(IHttpContextAccessor httpContext)
        {
            _httpContext = httpContext;
        }

        public int GetUserId()
        {
            var user = _httpContext.HttpContext?.User;

            if (user == null || user.Identity == null || !user.Identity.IsAuthenticated)
            {
                throw new UnauthorizedAccessException("User chưa đăng nhập.");
            }

            var userIdClaim = user.FindFirst(ClaimTypes.NameIdentifier)?.Value
                              ?? user.FindFirst("userId")?.Value
                              ?? user.FindFirst("UserId")?.Value
                              ?? user.FindFirst("sub")?.Value;

            if (string.IsNullOrEmpty(userIdClaim))
            {
                throw new UnauthorizedAccessException("Không tìm thấy UserId trong token.");
            }

            if (!int.TryParse(userIdClaim, out var userId))
            {
                throw new UnauthorizedAccessException("UserId trong token không hợp lệ.");
            }

            return userId;
        }
    }
}
