namespace EducenAPI.Services.Interface
{
    public interface IQuotaService
    {
        Task<(bool CanAddUser, string? ErrorMessage)> CheckCanAddUserAsync();
        Task<(bool CanUpload, long FileSizeBytes, string? ErrorMessage)> CheckCanUploadAsync(long fileSizeBytes);
        Task<(int LimitUsers, int UsedUsers, int StorageLimitMB, int UsedStorageMB)> GetQuotaUsageAsync();
    }
}