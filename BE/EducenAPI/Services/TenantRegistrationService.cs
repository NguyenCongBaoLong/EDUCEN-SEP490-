using EducenAPI.DTOs.TenantRegistrations;
using EducenAPI.Models;
using EducenAPI.Persistence.Contexts;
using EducenAPI.Services.Interface;
using EducenAPI.Ultils;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace EducenAPI.Services
{
    public class TenantRegistrationService : ITenantRegistrationService
    {
        private readonly AdminDbContext _context;
        private readonly MailService _mailService;
        private readonly ILogger<TenantRegistrationService> _logger;
        private readonly IFileUploadService _fileUploadService;

        public TenantRegistrationService(
            AdminDbContext context,
            MailService mailService,
            IFileUploadService fileUploadService,
            ILogger<TenantRegistrationService> logger)
        {
            _context = context;
            _mailService = mailService;
            _fileUploadService = fileUploadService;
            _logger = logger;
        }

        public async Task<TenantRegistration> CreateRegistrationAsync(CreateRegistrationRequest request)
        {
            var uploadedFiles = await _fileUploadService.UploadResourceFile(
                new Microsoft.AspNetCore.Http.FormFileCollection { request.BusinessLicenseFile });

            if (uploadedFiles == null || uploadedFiles.Count == 0)
            {
                throw new Exception("Upload giấy phép kinh doanh thất bại.");
            }

            var registration = new TenantRegistration
            {
                RegistrationId = Guid.NewGuid().ToString(),
                CenterName = request.CenterName.Trim(),
                ContactPerson = request.ContactPerson?.Trim(),
                Email = request.Email?.Trim(),
                PhoneNumber = request.PhoneNumber?.Trim(),
                TaxCode = request.TaxCode.Trim(),
                BusinessLicenseFilePath = $"wwwroot/{uploadedFiles[0].FilePath}",
                Message = request.Message?.Trim(),
                Status = "Pending",
                CreatedAt = DateTime.UtcNow
            };

            _context.TenantRegistrations.Add(registration);

            await _context.SaveChangesAsync();

            return registration;
        }

        public async Task<List<TenantRegistration>> GetAllAsync()
        {
            return await _context.TenantRegistrations
                .OrderByDescending(x => x.CreatedAt)
                .ToListAsync();
        }

        public async Task<bool> UpdateStatusAsync(string id, string status, string? reason = null)
        {
            var reg = await _context.TenantRegistrations.FindAsync(id);

            if (reg == null)
                return false;

            reg.Status = status;

            await _context.SaveChangesAsync();
            await SendRegistrationStatusEmailAsync(reg, reason);

            return true;
        }

        private async Task SendRegistrationStatusEmailAsync(TenantRegistration reg, string? reason)
        {
            if (string.IsNullOrWhiteSpace(reg.Email))
            {
                _logger.LogWarning(
                    "Skip sending registration status email because email is empty. RegistrationId={RegistrationId}",
                    reg.RegistrationId);
                return;
            }

            var isApproved = string.Equals(reg.Status, "Approved", StringComparison.OrdinalIgnoreCase);
            var subject = isApproved
                ? "Yêu cầu đăng ký trung tâm đã được duyệt"
                : "Yêu cầu đăng ký trung tâm đã bị từ chối";

            var reasonHtml = string.Empty;
            if (!isApproved && !string.IsNullOrWhiteSpace(reason))
            {
                reasonHtml = $@"
                    <p><strong>Lý do từ chối:</strong> {System.Net.WebUtility.HtmlEncode(reason.Trim())}</p>
                ";
            }

            var body = $@"
                <div style='font-family: Arial, sans-serif; line-height: 1.6; color: #1f2937;'>
                    <p>Xin chào {System.Net.WebUtility.HtmlEncode(reg.ContactPerson ?? "Anh/Chị")},</p>
                    <p>
                        Yêu cầu đăng ký trung tâm <strong>{System.Net.WebUtility.HtmlEncode(reg.CenterName)}</strong>
                        của bạn đã được:
                        <strong>{(isApproved ? "Đã duyệt" : "Từ chối")}</strong>.
                    </p>
                    {reasonHtml}
                    <p>Trân trọng,<br/>Hệ thống Educen</p>
                </div>
            ";

            try
            {
                await _mailService.SendEmailAsync(reg.Email.Trim(), subject, body);
            }
            catch (Exception ex)
            {
                _logger.LogError(
                    ex,
                    "Failed to send tenant registration status email. RegistrationId={RegistrationId}, Status={Status}, Email={Email}",
                    reg.RegistrationId,
                    reg.Status,
                    reg.Email);
            }
        }
    }
}
