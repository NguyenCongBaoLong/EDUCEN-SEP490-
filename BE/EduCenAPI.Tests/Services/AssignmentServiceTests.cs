using EduCenAPI.Tests.Fakes;
using EducenAPI.DTOs.Assignments;
using EducenAPI.DTOs.FileUpload;
using EducenAPI.Exceptions;
using EducenAPI.Models;
using EducenAPI.Persistence.Contexts;
using EducenAPI.Services;
using EducenAPI.Services.Interface;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;
using Moq;

public class AssignmentService_CreateAssignment_Tests
{
    private EducenV2Context GetDbContext(string? databaseName = null)
    {
        var dbName = databaseName ?? Guid.NewGuid().ToString();
        var options = new DbContextOptionsBuilder<EducenV2Context>()
            .UseInMemoryDatabase(dbName)
            .ConfigureWarnings(x => x.Ignore(InMemoryEventId.TransactionIgnoredWarning))
            .Options;

        return new EducenV2Context(options, new FakeTenantService());
    }

    private AssignmentService GetService(EducenV2Context context, IFileUploadService? fileService = null, IUserContextService? userContextService = null)
    {
        var mockFileService = fileService ?? new Mock<IFileUploadService>().Object;
        var mockUserContext = userContextService ?? MockUserContext(1);
        return new AssignmentService(context, mockFileService, mockUserContext);
    }

    private static IUserContextService MockUserContext(int userId)
    {
        var mock = new Mock<IUserContextService>();
        mock.Setup(x => x.GetUserId()).Returns(userId);
        return mock.Object;
    }

    private static CreateAssignmentDto CreateValidDto() =>
        new()
        {
            Title = "Test Assignment",
            Description = "Test Description",
            StartTime = DateTime.Now.AddHours(1),
            EndTime = DateTime.Now.AddHours(2),
            SessionId = 1
        };

    private static ClassSession CreateSession(int sessionId, DateTime sessionDate, int scheduleId = 1) =>
        new()
        {
            SessionId = sessionId,
            SessionDate = sessionDate,
            ScheduleId = scheduleId,
            ClassId = 1
        };

    private static Schedule CreateSchedule(int scheduleId, TimeOnly startTime) =>
        new()
        {
            ScheduleId = scheduleId,
            StartTime = startTime,
            EndTime = startTime.AddHours(1),
            DayOfWeek = 1,
            ClassId = 1
        };

    [Fact]
    public async Task CreateAssignment_ShouldThrow_WhenSessionNotFound()
    {
        using var context = GetDbContext();
        var service = GetService(context);
        var dto = CreateValidDto();
        dto.SessionId = 999;

        var ex = await Assert.ThrowsAsync<BadRequestException>(() =>
            service.CreateAssignmentAsync(dto, "https://localhost"));

        Assert.Equal("SessionId không tồn tại trong hệ thống.", ex.Message);
    }

    [Fact]
    public async Task CreateAssignment_ShouldThrow_WhenStartTimeAfterEndTime()
    {
        using var context = GetDbContext();
        var today = DateTime.UtcNow.AddHours(7).Date;
        context.ClassSessions.Add(CreateSession(1, today));
        await context.SaveChangesAsync();

        var service = GetService(context);
        var dto = CreateValidDto();
        dto.StartTime = DateTime.Now.AddHours(2);
        dto.EndTime = DateTime.Now.AddHours(1);

        var ex = await Assert.ThrowsAsync<BadRequestException>(() =>
            service.CreateAssignmentAsync(dto, "https://localhost"));

        Assert.Equal("Thời gian bắt đầu không được sau thời gian kết thúc.", ex.Message);
    }

    [Fact]
    public async Task CreateAssignment_ShouldThrow_WhenDuplicateFileInSession()
    {
        using var context = GetDbContext();
        var today = DateTime.UtcNow.AddHours(7).Date;
        context.ClassSessions.Add(CreateSession(1, today));
        // FileUrl format: original name stored after underscore by UploadResourceFile
        // GetOriginalFileNameFromUrl extracts part after last underscore
        context.Assignments.Add(new Assignment
        {
            AsmId = 1,
            SessionId = 1,
            Title = "Existing",
            FileUrl = "wwwroot/uploads/guid_testfile.pdf", // Original name: testfile.pdf
            UserId = 1
        });
        await context.SaveChangesAsync();

        var mockFileService = new Mock<IFileUploadService>();
        mockFileService.Setup(x => x.UploadResourceFile(It.IsAny<IFormFileCollection>()))
            .ReturnsAsync(new List<FileUploadDto>());
        
        var service = GetService(context, mockFileService.Object);

        var dto = CreateValidDto();
        dto.File = CreateMockFile("testfile.pdf"); // Should match extracted name

        var ex = await Assert.ThrowsAsync<ConflictException>(() =>
            service.CreateAssignmentAsync(dto, "https://localhost"));

        Assert.Equal("File bài tập này đã tồn tại trong buổi học này.", ex.Message);
    }

    [Fact]
    public async Task CreateAssignment_ShouldThrow_WhenDuplicateFileInLibrary()
    {
        using var context = GetDbContext();
        var today = DateTime.UtcNow.AddHours(7).Date;
        context.ClassSessions.Add(CreateSession(1, today));
        // FileUrl format: guid_originalname.ext → GetOriginalFileNameFromUrl extracts part after underscore
        context.Assignments.Add(new Assignment
        {
            AsmId = 1,
            SessionId = null,
            Title = "Library File",
            FileUrl = "wwwroot/uploads/guid_libraryfile.pdf", // Original name: libraryfile.pdf
            UserId = 1
        });
        await context.SaveChangesAsync();

        var mockFileService = new Mock<IFileUploadService>();
        mockFileService.Setup(x => x.UploadResourceFile(It.IsAny<IFormFileCollection>()))
            .ReturnsAsync(new List<FileUploadDto>());
        var service = GetService(context, mockFileService.Object);

        var dto = CreateValidDto();
        dto.File = CreateMockFile("libraryfile.pdf"); // Should match extracted name

        var ex = await Assert.ThrowsAsync<BadRequestException>(() =>
            service.CreateAssignmentAsync(dto, "https://localhost"));

        Assert.Equal("File bài tập này đã tồn tại trong thư viện. Vui lòng chọn từ thư viện.", ex.Message);
    }

    [Fact]
    public async Task CreateAssignment_ShouldThrow_WhenDuplicateTitle()
    {
        using var context = GetDbContext();
        var today = DateTime.UtcNow.AddHours(7).Date;
        context.ClassSessions.Add(CreateSession(1, today));
        context.Assignments.Add(new Assignment
        {
            AsmId = 1,
            SessionId = 1,
            Title = "Test Assignment",
            UserId = 1
        });
        await context.SaveChangesAsync();

        var service = GetService(context);
        var dto = CreateValidDto();

        var ex = await Assert.ThrowsAsync<ConflictException>(() =>
            service.CreateAssignmentAsync(dto, "https://localhost"));

        Assert.Equal("Tiêu đề đang bị trùng, vui lòng đặt lại", ex.Message);
    }

    [Fact]
    public async Task CreateAssignment_ShouldCreateSuccessfully_WithoutFile()
    {
        using var context = GetDbContext();
        var today = DateTime.UtcNow.AddHours(7).Date;
        context.ClassSessions.Add(CreateSession(1, today));
        await context.SaveChangesAsync();

        var service = GetService(context);
        var dto = CreateValidDto();

        var result = await service.CreateAssignmentAsync(dto, "https://localhost");

        Assert.NotNull(result);
        Assert.Equal("Test Assignment", result.Title);
        Assert.Equal(1, result.SessionId);
        Assert.Null(result.FileUrl);
    }

    [Fact]
    public async Task CreateAssignment_ShouldCreateSuccessfully_WithFileUrl()
    {
        using var context = GetDbContext();
        var today = DateTime.UtcNow.AddHours(7).Date;
        context.ClassSessions.Add(CreateSession(1, today));
        await context.SaveChangesAsync();

        var service = GetService(context);
        var dto = CreateValidDto();
        dto.FileUrl = "wwwroot/uploads/existing.pdf";

        var result = await service.CreateAssignmentAsync(dto, "https://localhost");

        Assert.NotNull(result);
        // FileUrl is stored as-is and returned via MapToResponseDto with full URL
        Assert.Contains("uploads/existing.pdf", result.FileUrl);
    }

    [Fact]
    public async Task CreateAssignment_ShouldUploadFile_WhenFileProvided()
    {
        using var context = GetDbContext();
        var today = DateTime.UtcNow.AddHours(7).Date;
        context.ClassSessions.Add(CreateSession(1, today));
        await context.SaveChangesAsync();

        var mockFileService = new Mock<IFileUploadService>();
        mockFileService.Setup(x => x.UploadResourceFile(It.IsAny<IFormFileCollection>()))
            .ReturnsAsync(new List<FileUploadDto>
            {
                new() { FileName = "test.pdf", FilePath = "wwwroot/uploads/test.pdf", ContentType = "application/pdf", Extension = ".pdf", FileSize = 1024 }
            });

        var service = GetService(context, mockFileService.Object);
        var dto = CreateValidDto();
        dto.File = CreateMockFile("newfile.pdf");

        var result = await service.CreateAssignmentAsync(dto, "https://localhost");

        Assert.NotNull(result);
        // MapToResponseDto transforms "wwwroot/uploads/test.pdf" -> "https://localhost/uploads/test.pdf"
        Assert.Equal("https://localhost/uploads/test.pdf", result.FileUrl);
        mockFileService.Verify(x => x.UploadResourceFile(It.IsAny<IFormFileCollection>()), Times.Once);
    }

    [Fact]
    public async Task CreateAssignment_ShouldCreateLibraryCopy_WhenSaveToLibraryTrue()
    {
        using var context = GetDbContext();
        var today = DateTime.UtcNow.AddHours(7).Date;
        context.ClassSessions.Add(CreateSession(1, today));
        await context.SaveChangesAsync();

        var service = GetService(context);
        var dto = CreateValidDto();
        dto.SaveToLibrary = true;

        var result = await service.CreateAssignmentAsync(dto, "https://localhost");

        Assert.NotNull(result);
        
        // Verify library copy created
        var libraryAssignments = await context.Assignments
            .Where(a => a.SessionId == null && a.UserId == 1)
            .ToListAsync();
        Assert.Single(libraryAssignments);
        Assert.Equal("Test Assignment", libraryAssignments[0].Title);
    }

    [Fact]
    public async Task CreateAssignment_ShouldNotDuplicateLibrary_WhenAlreadyExists()
    {
        using var context = GetDbContext();
        var today = DateTime.UtcNow.AddHours(7).Date;
        context.ClassSessions.Add(CreateSession(1, today));
        context.Assignments.Add(new Assignment
        {
            AsmId = 1,
            SessionId = null,
            Title = "Test Assignment",
            FileUrl = "wwwroot/uploads/test.pdf",
            UserId = 1
        });
        await context.SaveChangesAsync();

        var service = GetService(context);
        var dto = CreateValidDto();
        dto.FileUrl = "wwwroot/uploads/test.pdf";
        dto.SaveToLibrary = true;

        var result = await service.CreateAssignmentAsync(dto, "https://localhost");

        // Should not create duplicate library entry
        var libraryAssignments = await context.Assignments
            .Where(a => a.SessionId == null && a.UserId == 1)
            .ToListAsync();
        Assert.Single(libraryAssignments);
    }

    [Fact]
    public async Task CreateAssignment_ShouldResolveStartTimeFromSession()
    {
        using var context = GetDbContext();
        var today = DateTime.UtcNow.AddHours(7).Date;
        var startTime = new TimeOnly(9, 0);
        context.Schedules.Add(CreateSchedule(1, startTime));
        context.ClassSessions.Add(CreateSession(1, today, 1));
        await context.SaveChangesAsync();

        var service = GetService(context);
        var dto = CreateValidDto();
        dto.StartTime = null;
        dto.EndTime = today.AddHours(12);

        var result = await service.CreateAssignmentAsync(dto, "https://localhost");

        var expectedStartTime = today.Add(startTime.ToTimeSpan());
        Assert.Equal(expectedStartTime, result.StartTime);
    }

    [Fact]
    public async Task CreateAssignment_ShouldUseProvidedStartTime_WhenNoSession()
    {
        using var context = GetDbContext();
        var service = GetService(context);
        var dto = CreateValidDto();
        dto.SessionId = null;
        var providedStartTime = DateTime.Now.AddHours(1);
        dto.StartTime = providedStartTime;
        dto.EndTime = DateTime.Now.AddHours(3);

        var result = await service.CreateAssignmentAsync(dto, "https://localhost");

        Assert.Equal(providedStartTime, result.StartTime);
    }

    private static IFormFile CreateMockFile(string fileName, long length = 1024)
    {
        var content = new byte[length];
        var stream = new MemoryStream(content);
        
        // Create a FormFile which properly implements IFormFile
        var formFile = new FormFile(stream, 0, length, "file", fileName)
        {
            Headers = new HeaderDictionary(),
            ContentType = "application/pdf"
        };
        
        return formFile;
    }
}
