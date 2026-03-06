namespace EducenAPI.Services.Interface
{
    public interface IUserManagementService
    {
        Task<bool> LockUserAccountAsync(int userId);
        Task<bool> UnlockUserAccountAsync(int userId);
        Task<IEnumerable<object>> GetAllUsersAsync();
        Task<object?> GetUserByIdAsync(int userId);
    }
}
