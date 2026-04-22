using EducenAPI.Models;
using EducenAPI.Persistence.Contexts;
using EducenAPI.Services.Interface;
using Microsoft.EntityFrameworkCore;

namespace EducenAPI.Services
{
    public interface IContractService
    {
        Task<List<TenantContract>> GetContractsByTenantAsync(string tenantId);
        Task<TenantContract?> GetContractByIdAsync(string contractId);
        Task<TenantContract> UploadContractAsync(string tenantId, IFormFile file, string title, string? description, string uploadedBy);
        Task<bool> DeleteContractAsync(string contractId);
    }

    public class ContractService : IContractService
    {
        private readonly AdminDbContext _context;
        private readonly IFileUploadService _fileUploadService;

        public ContractService(AdminDbContext context, IFileUploadService fileUploadService)
        {
            _context = context;
            _fileUploadService = fileUploadService;
        }

        public async Task<List<TenantContract>> GetContractsByTenantAsync(string tenantId)
        {
            return await _context.TenantContracts
                .Where(c => c.TenantId == tenantId && c.Status == "Active")
                .OrderByDescending(c => c.CreatedAt)
                .ToListAsync();
        }

        public async Task<TenantContract?> GetContractByIdAsync(string contractId)
        {
            return await _context.TenantContracts
                .Include(c => c.Tenant)
                .FirstOrDefaultAsync(c => c.ContractId == contractId);
        }

        public async Task<TenantContract> UploadContractAsync(string tenantId, IFormFile file, string title, string? description, string uploadedBy)
        {
            var tenant = await _context.Tenants.FindAsync(tenantId);
            if (tenant == null)
                throw new Exception("Khong tim thay trung tam.");

            if (file == null || file.Length <= 0)
                throw new Exception("File hop dong la bat buoc.");

            var normalizedTitle = title?.Trim();
            var normalizedDescription = description?.Trim();

            if (string.IsNullOrWhiteSpace(normalizedTitle))
                throw new Exception("Tieu de hop dong la bat buoc.");
            if (normalizedTitle.Length > 200)
                throw new Exception("Tieu de hop dong khong duoc vuot qua 200 ky tu.");
            if (!string.IsNullOrWhiteSpace(normalizedDescription) && normalizedDescription.Length > 500)
                throw new Exception("Mo ta hop dong khong duoc vuot qua 500 ky tu.");

            var allowedExtensions = new[] { ".pdf", ".jpg", ".jpeg", ".png" };
            var fileExtension = Path.GetExtension(file.FileName).ToLowerInvariant();

            if (!allowedExtensions.Contains(fileExtension))
                throw new Exception("Chi chap nhan file PDF, JPG, PNG.");

            if (file.Length > 10 * 1024 * 1024)
                throw new Exception("Dung luong file khong duoc vuot qua 10MB.");

            var uploads = await _fileUploadService.UploadResourceFile(
                new Microsoft.AspNetCore.Http.FormFileCollection { file });

            if (uploads == null || uploads.Count == 0)
                throw new Exception("Upload file that bai.");

            var uploadedFile = uploads[0];

            var contract = new TenantContract
            {
                TenantId = tenantId,
                ContractTitle = normalizedTitle,
                Description = normalizedDescription,
                FilePath = $"wwwroot/{uploadedFile.FilePath}",
                FileType = fileExtension.TrimStart('.').ToUpperInvariant(),
                FileSize = file.Length,
                Status = "Active",
                CreatedAt = DateTime.UtcNow,
                CreatedBy = uploadedBy
            };

            _context.TenantContracts.Add(contract);
            await _context.SaveChangesAsync();

            return contract;
        }

        public async Task<bool> DeleteContractAsync(string contractId)
        {
            var contract = await _context.TenantContracts.FindAsync(contractId);
            if (contract == null)
                return false;

            contract.Status = "Deleted";
            await _context.SaveChangesAsync();

            return true;
        }
    }
}
