using EduCenAPI.Tests.Fakes;
using EducenAPI.DTOs.FileUpload;
using EducenAPI.DTOs.TenantRegistrations;
using EducenAPI.Models;
using EducenAPI.Persistence.Contexts;
using EducenAPI.Services;
using EducenAPI.Services.Interface;
using EducenAPI.Ultils;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging.Abstractions;
using Moq;

public class TenantRegistrationService_CreateRegistration_Tests
{
    private AdminDbContext GetDbContext()
    {
        var options = new DbContextOptionsBuilder<AdminDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;

        return new AdminDbContext(options);
    }

    private MailService GetMailService()
    {
        var configData = new Dictionary<string, string?>
        {
            ["EmailSettings:Email"] = "test@example.com",
            ["EmailSettings:Password"] = "test123",
            ["EmailSettings:Host"] = "smtp.example.com",
            ["EmailSettings:Port"] = "587"
        };

        var configuration = new ConfigurationBuilder()
            .AddInMemoryCollection(configData)
            .Build();

        return new MailService(configuration, new FakeTenantService());
    }

    private static IFormFile CreateBusinessLicenseFile(string fileName = "license.pdf")
    {
        var content = new MemoryStream(System.Text.Encoding.UTF8.GetBytes("fake-license-content"));
        return new FormFile(content, 0, content.Length, "BusinessLicenseFile", fileName)
        {
            Headers = new HeaderDictionary(),
            ContentType = "application/pdf"
        };
    }

    private static CreateRegistrationRequest CreateValidRequest() =>
        new()
        {
            CenterName = "  Alpha Center  ",
            ContactPerson = "  Alice  ",
            Email = "  alpha@example.com  ",
            PhoneNumber = " 0912345678  ",
            TaxCode = " 1234567890 ",
            BusinessLicenseFile = CreateBusinessLicenseFile(),
            Message = "  Need onboarding support  "
        };

    [Fact]
    public async Task CreateRegistration_ShouldThrow_WhenUploadReturnsNull()
    {
        using var context = GetDbContext();
        var fileUploadService = new Mock<IFileUploadService>();
        fileUploadService
            .Setup(x => x.UploadResourceFile(It.IsAny<IFormFileCollection>()))
            .ReturnsAsync((List<FileUploadDto>?)null);

        var service = new TenantRegistrationService(
            context,
            GetMailService(),
            fileUploadService.Object,
            NullLogger<TenantRegistrationService>.Instance);

        var ex = await Assert.ThrowsAsync<Exception>(() => service.CreateRegistrationAsync(CreateValidRequest()));

        Assert.Equal("Upload giấy phép kinh doanh thất bại.", ex.Message);
        Assert.Empty(context.TenantRegistrations);
    }

    [Fact]
    public async Task CreateRegistration_ShouldThrow_WhenUploadReturnsEmptyList()
    {
        using var context = GetDbContext();
        var fileUploadService = new Mock<IFileUploadService>();
        fileUploadService
            .Setup(x => x.UploadResourceFile(It.IsAny<IFormFileCollection>()))
            .ReturnsAsync(new List<FileUploadDto>());

        var service = new TenantRegistrationService(
            context,
            GetMailService(),
            fileUploadService.Object,
            NullLogger<TenantRegistrationService>.Instance);

        var ex = await Assert.ThrowsAsync<Exception>(() => service.CreateRegistrationAsync(CreateValidRequest()));

        Assert.Equal("Upload giấy phép kinh doanh thất bại.", ex.Message);
        Assert.Empty(context.TenantRegistrations);
    }

    [Fact]
    public async Task CreateRegistration_ShouldCreatePendingRegistration_WhenUploadSucceeds()
    {
        using var context = GetDbContext();
        var fileUploadService = new Mock<IFileUploadService>();
        fileUploadService
            .Setup(x => x.UploadResourceFile(It.IsAny<IFormFileCollection>()))
            .ReturnsAsync(new List<FileUploadDto>
            {
                new()
                {
                    FileName = "license.pdf",
                    ContentType = "application/pdf",
                    FilePath = "uploads/license.pdf",
                    Extension = ".pdf",
                    FileSize = 1234
                }
            });

        var service = new TenantRegistrationService(
            context,
            GetMailService(),
            fileUploadService.Object,
            NullLogger<TenantRegistrationService>.Instance);

        var before = DateTime.UtcNow;
        var result = await service.CreateRegistrationAsync(CreateValidRequest());
        var after = DateTime.UtcNow;

        Assert.NotNull(result);
        Assert.False(string.IsNullOrWhiteSpace(result.RegistrationId));
        Assert.Equal("Alpha Center", result.CenterName);
        Assert.Equal("Alice", result.ContactPerson);
        Assert.Equal("alpha@example.com", result.Email);
        Assert.Equal("0912345678", result.PhoneNumber);
        Assert.Equal("1234567890", result.TaxCode);
        Assert.Equal("wwwroot/uploads/license.pdf", result.BusinessLicenseFilePath);
        Assert.Equal("Need onboarding support", result.Message);
        Assert.Equal("Pending", result.Status);
        Assert.InRange(result.CreatedAt, before.AddSeconds(-1), after.AddSeconds(1));

        var saved = Assert.Single(context.TenantRegistrations);
        Assert.Equal(result.RegistrationId, saved.RegistrationId);
        Assert.Equal("wwwroot/uploads/license.pdf", saved.BusinessLicenseFilePath);
    }

    [Fact]
    public async Task CreateRegistration_ShouldSendSingleBusinessLicenseFile_ToUploadService()
    {
        using var context = GetDbContext();
        IFormFileCollection? capturedFiles = null;

        var fileUploadService = new Mock<IFileUploadService>();
        fileUploadService
            .Setup(x => x.UploadResourceFile(It.IsAny<IFormFileCollection>()))
            .Callback<IFormFileCollection>(files => capturedFiles = files)
            .ReturnsAsync(new List<FileUploadDto>
            {
                new() { FilePath = "uploads/license.pdf" }
            });

        var request = CreateValidRequest();
        var service = new TenantRegistrationService(
            context,
            GetMailService(),
            fileUploadService.Object,
            NullLogger<TenantRegistrationService>.Instance);

        await service.CreateRegistrationAsync(request);

        Assert.NotNull(capturedFiles);
        Assert.Single(capturedFiles!);
        Assert.Same(request.BusinessLicenseFile, capturedFiles![0]);
    }
}
