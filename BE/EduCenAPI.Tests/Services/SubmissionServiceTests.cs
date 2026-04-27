using EduCenAPI.Tests.Fakes;
using EducenAPI.DTOs.FileUpload;
using EducenAPI.DTOs.Submissions;
using EducenAPI.Enums;
using EducenAPI.Exceptions;
using EducenAPI.Models;
using EducenAPI.Persistence.Contexts;
using EducenAPI.Services;
using EducenAPI.Services.Interface;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;
using Moq;
using static EducenAPI.Services.Interface.IPaymentReminderService;

public class SubmissionService_CreateSubmission_Tests
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

    private SubmissionService GetService(EducenV2Context context, IFileUploadService? fileService = null, IPaymentReminderService? notificationService = null, IUserContextService? userContextService = null)
    {
        var mockFileService = fileService ?? new Mock<IFileUploadService>().Object;
        var mockNotificationService = notificationService ?? new Mock<IPaymentReminderService>().Object;
        var mockUserContext = userContextService ?? new Mock<IUserContextService>().Object;
        return new SubmissionService(context, mockFileService, mockNotificationService, mockUserContext);
    }

    private static CreateSubmissionRequest CreateValidRequest() =>
        new()
        {
            AsmId = 1,
            StudentId = 1
        };

    private static Assignment CreateAssignment(int asmId, DateTime? startTime = null, DateTime? endTime = null, bool allowLate = false, int? sessionId = null) =>
        new()
        {
            AsmId = asmId,
            Title = "Test Assignment",
            StartTime = startTime,
            EndTime = endTime,
            AllowLateSubmission = allowLate,
            SessionId = sessionId,
            UserId = 1
        };

    private static Student CreateStudent(int userId, string fullName = "Test Student") =>
        new()
        {
            UserId = userId,
            StudentNavigation = new User
            {
                UserId = userId,
                FullName = fullName,
                Username = $"student{userId}",
                AccountStatus = "Active",
                RoleId = 3
            }
        };

    private static ClassSession CreateSession(int sessionId, int classId = 1) =>
        new()
        {
            SessionId = sessionId,
            SessionDate = DateTime.UtcNow.AddHours(7).Date,
            ScheduleId = 1,
            ClassId = classId,
            Class = new Class { ClassId = classId, ClassName = "Test Class" }
        };

    private static IFormFile CreateMockFile(string fileName, long length = 1024)
    {
        var content = new byte[length];
        var stream = new MemoryStream(content);
        return new FormFile(stream, 0, length, "file", fileName)
        {
            Headers = new HeaderDictionary(),
            ContentType = "application/pdf"
        };
    }

    [Fact]
    public async Task CreateSubmission_ShouldThrow_WhenAssignmentNotFound()
    {
        using var context = GetDbContext();
        var service = GetService(context);
        var request = CreateValidRequest();

        var ex = await Assert.ThrowsAsync<Exception>(() =>
            service.CreateSubmissionAsync(request, "https://localhost"));

        Assert.Equal("Không tìm thấy bài tập", ex.Message);
    }

    [Fact]
    public async Task CreateSubmission_ShouldThrow_WhenAssignmentNotStarted()
    {
        using var context = GetDbContext();
        var futureStart = DateTime.Now.AddHours(2);
        context.Assignments.Add(CreateAssignment(1, startTime: futureStart, endTime: futureStart.AddHours(2)));
        await context.SaveChangesAsync();

        var service = GetService(context);
        var request = CreateValidRequest();

        var ex = await Assert.ThrowsAsync<Exception>(() =>
            service.CreateSubmissionAsync(request, "https://localhost"));

        Assert.Equal("Bài tập này chưa mở", ex.Message);
    }

    [Fact]
    public async Task CreateSubmission_ShouldThrow_WhenDeadlinePassedAndNoLateSubmission()
    {
        using var context = GetDbContext();
        var pastEnd = DateTime.Now.AddHours(-2);
        var pastStart = DateTime.Now.AddHours(-4);
        context.Assignments.Add(CreateAssignment(1, startTime: pastStart, endTime: pastEnd, allowLate: false));
        await context.SaveChangesAsync();

        var service = GetService(context);
        var request = CreateValidRequest();

        var ex = await Assert.ThrowsAsync<Exception>(() =>
            service.CreateSubmissionAsync(request, "https://localhost"));

        Assert.Equal("Đã hết hạn nộp bài. Giáo viên không cho phép nộp muộn.", ex.Message);
    }

    [Fact]
    public async Task CreateSubmission_ShouldThrow_WhenStudentNotFound()
    {
        using var context = GetDbContext();
        var startTime = DateTime.Now.AddHours(-2);
        var endTime = DateTime.Now.AddHours(2);
        context.Assignments.Add(CreateAssignment(1, startTime: startTime, endTime: endTime));
        await context.SaveChangesAsync();

        var service = GetService(context);
        var request = CreateValidRequest();

        var ex = await Assert.ThrowsAsync<Exception>(() =>
            service.CreateSubmissionAsync(request, "https://localhost"));

        Assert.Equal("Không tìm thấy học sinh", ex.Message);
    }

    [Fact]
    public async Task CreateSubmission_ShouldThrow_WhenSubmissionAlreadyExists()
    {
        using var context = GetDbContext();
        var startTime = DateTime.Now.AddHours(-2);
        var endTime = DateTime.Now.AddHours(2);
        context.Assignments.Add(CreateAssignment(1, startTime: startTime, endTime: endTime));
        context.Students.Add(CreateStudent(1));
        context.Submissions.Add(new Submission
        {
            SubId = 1,
            AsmId = 1,
            StudentId = 1,
            SubmittedAt = DateTime.Now.AddHours(-1),
            Status = SubmissionStatus.Submitted
        });
        await context.SaveChangesAsync();

        var service = GetService(context);
        var request = CreateValidRequest();

        var ex = await Assert.ThrowsAsync<Exception>(() =>
            service.CreateSubmissionAsync(request, "https://localhost"));

        Assert.Equal("Bài nộp đã tồn tại", ex.Message);
    }

    [Fact]
    public async Task CreateSubmission_ShouldCreateSuccessfully_WhenLateSubmissionAllowed()
    {
        using var context = GetDbContext();
        var pastStart = DateTime.Now.AddHours(-4);
        var pastEnd = DateTime.Now.AddHours(-2);
        context.Assignments.Add(CreateAssignment(1, startTime: pastStart, endTime: pastEnd, allowLate: true, sessionId: 1));
        context.ClassSessions.Add(CreateSession(1));
        context.Students.Add(CreateStudent(1));
        await context.SaveChangesAsync();

        var service = GetService(context);
        var request = CreateValidRequest();

        var result = await service.CreateSubmissionAsync(request, "https://localhost");

        Assert.NotNull(result);
        Assert.Equal(1, result.AsmId);
        Assert.Equal(1, result.StudentId);
        Assert.Equal(SubmissionStatus.LateSubmitted, result.Status);
    }

    [Fact]
    public async Task CreateSubmission_ShouldCreateSuccessfully_WithFileUrl()
    {
        using var context = GetDbContext();
        var startTime = DateTime.Now.AddHours(-2);
        var endTime = DateTime.Now.AddHours(2);
        context.Assignments.Add(CreateAssignment(1, startTime: startTime, endTime: endTime, sessionId: 1));
        context.ClassSessions.Add(CreateSession(1));
        context.Students.Add(CreateStudent(1));
        await context.SaveChangesAsync();

        var service = GetService(context);
        var request = CreateValidRequest();
        request.FileUrl = "wwwroot/uploads/submission.pdf";

        var result = await service.CreateSubmissionAsync(request, "https://localhost");

        Assert.NotNull(result);
        Assert.Contains("uploads/submission.pdf", result.FileUrl);
        Assert.Equal(SubmissionStatus.Submitted, result.Status);
    }

    [Fact]
    public async Task CreateSubmission_ShouldCreateSuccessfully_WithFileUpload()
    {
        using var context = GetDbContext();
        var startTime = DateTime.Now.AddHours(-2);
        var endTime = DateTime.Now.AddHours(2);
        context.Assignments.Add(CreateAssignment(1, startTime: startTime, endTime: endTime, sessionId: 1));
        context.ClassSessions.Add(CreateSession(1));
        context.Students.Add(CreateStudent(1));
        await context.SaveChangesAsync();

        var mockFileService = new Mock<IFileUploadService>();
        mockFileService.Setup(x => x.UploadResourceFile(It.IsAny<IFormFileCollection>()))
            .ReturnsAsync(new List<FileUploadDto>
            {
                new() { FileName = "test.pdf", FilePath = "wwwroot/uploads/test.pdf", ContentType = "application/pdf", Extension = ".pdf", FileSize = 1024 }
            });

        var service = GetService(context, mockFileService.Object);
        var request = CreateValidRequest();
        request.Files = new List<IFormFile> { CreateMockFile("test.pdf") };

        var result = await service.CreateSubmissionAsync(request, "https://localhost");

        Assert.NotNull(result);
        // MapToResponseDto transforms "wwwroot/uploads/test.pdf" -> "https://localhost/uploads/test.pdf"
        Assert.Equal("https://localhost/uploads/test.pdf", result.FileUrl);
        mockFileService.Verify(x => x.UploadResourceFile(It.IsAny<IFormFileCollection>()), Times.Once);
    }

    [Fact]
    public async Task CreateSubmission_ShouldCreateSuccessfully_WithoutFile()
    {
        using var context = GetDbContext();
        var startTime = DateTime.Now.AddHours(-2);
        var endTime = DateTime.Now.AddHours(2);
        context.Assignments.Add(CreateAssignment(1, startTime: startTime, endTime: endTime, sessionId: 1));
        context.ClassSessions.Add(CreateSession(1));
        context.Students.Add(CreateStudent(1));
        await context.SaveChangesAsync();

        var service = GetService(context);
        var request = CreateValidRequest();

        var result = await service.CreateSubmissionAsync(request, "https://localhost");

        Assert.NotNull(result);
        Assert.Equal(1, result.AsmId);
        Assert.Equal(1, result.StudentId);
        Assert.True(string.IsNullOrEmpty(result.FileUrl));
        Assert.Equal(SubmissionStatus.Submitted, result.Status);
    }

    [Fact]
    public async Task CreateSubmission_ShouldSendNotificationToTeachers()
    {
        using var context = GetDbContext();
        var startTime = DateTime.Now.AddHours(-2);
        var endTime = DateTime.Now.AddHours(2);
        context.Assignments.Add(CreateAssignment(1, startTime: startTime, endTime: endTime, sessionId: 1));
        context.ClassSessions.Add(CreateSession(1, classId: 5));
        context.Students.Add(CreateStudent(1, "John Doe"));
        await context.SaveChangesAsync();

        var mockNotificationService = new Mock<IPaymentReminderService>();
        mockNotificationService.Setup(x => x.SendToClassTeachersAsync(It.IsAny<int>(), It.IsAny<CreateRoleNotificationRequest>()))
            .ReturnsAsync(new List<Notification>());
        mockNotificationService.Setup(x => x.CreateSystemNotificationAsync(It.IsAny<CreateNotificationRequest>()))
            .ReturnsAsync(new Notification());

        var service = GetService(context, notificationService: mockNotificationService.Object);
        var request = CreateValidRequest();

        await service.CreateSubmissionAsync(request, "https://localhost");

        mockNotificationService.Verify(x => x.SendToClassTeachersAsync(
            5,
            It.Is<CreateRoleNotificationRequest>(r =>
                r.Title == "Bài nộp mới" &&
                r.Message.Contains("John Doe") &&
                r.Category == "Submission")),
            Times.Once);
    }

    [Fact]
    public async Task CreateSubmission_ShouldSendNotificationToStudent()
    {
        using var context = GetDbContext();
        var startTime = DateTime.Now.AddHours(-2);
        var endTime = DateTime.Now.AddHours(2);
        context.Assignments.Add(CreateAssignment(1, startTime: startTime, endTime: endTime, sessionId: 1));
        context.ClassSessions.Add(CreateSession(1));
        context.Students.Add(CreateStudent(1, "John Doe"));
        await context.SaveChangesAsync();

        var mockNotificationService = new Mock<IPaymentReminderService>();
        mockNotificationService.Setup(x => x.SendToClassTeachersAsync(It.IsAny<int>(), It.IsAny<CreateRoleNotificationRequest>()))
            .ReturnsAsync(new List<Notification>());
        mockNotificationService.Setup(x => x.CreateSystemNotificationAsync(It.IsAny<CreateNotificationRequest>()))
            .ReturnsAsync(new Notification());

        var service = GetService(context, notificationService: mockNotificationService.Object);
        var request = CreateValidRequest();

        await service.CreateSubmissionAsync(request, "https://localhost");

        mockNotificationService.Verify(x => x.CreateSystemNotificationAsync(
            It.Is<CreateNotificationRequest>(r =>
                r.UserId == 1 &&
                r.Title == "Đã nộp bài" &&
                r.Category == "Submission" &&
                r.Type == "Success")),
            Times.Once);
    }
}

public class SubmissionService_GradeSubmission_Tests
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

    private SubmissionService GetService(EducenV2Context context, IUserContextService? userContextService = null)
    {
        var mockFileService = new Mock<IFileUploadService>().Object;
        var mockNotificationService = new Mock<IPaymentReminderService>().Object;
        var mockUserContext = userContextService ?? MockUserContext(1);
        return new SubmissionService(context, mockFileService, mockNotificationService, mockUserContext);
    }

    private static IUserContextService MockUserContext(int userId)
    {
        var mock = new Mock<IUserContextService>();
        mock.Setup(x => x.GetUserId()).Returns(userId);
        return mock.Object;
    }

    private static GradeSubmissionRequest CreateValidRequest() =>
        new()
        {
            Score = 8.5m,
            TeacherComment = "Good work!"
        };

    private static Assignment CreateAssignment(int asmId, int userId = 1) =>
        new()
        {
            AsmId = asmId,
            Title = "Test Assignment",
            UserId = userId,
            SessionId = 1
        };

    private static Submission CreateSubmission(int asmId, int studentId, int? subId = null) =>
        new()
        {
            SubId = subId ?? 1, // Default = 1 để dễ test
            AsmId = asmId,
            StudentId = studentId,
            SubmittedAt = DateTime.Now.AddHours(-1),
            Status = SubmissionStatus.Submitted,
            FileUrl = "wwwroot/uploads/test.pdf"
        };

    [Fact]
    public async Task GradeSubmission_ShouldThrow_WhenSubmissionNotFound()
    {
        using var context = GetDbContext();
        var service = GetService(context);
        var request = CreateValidRequest();

        var ex = await Assert.ThrowsAsync<NotFoundException>(() =>
            service.GradeSubmissionAsync(999, request, "https://localhost"));

        Assert.Equal("Không tìm thấy bài nộp", ex.Message);
    }

    [Fact]
    public async Task GradeSubmission_ShouldThrow_WhenNotAssignmentOwner()
    {
        // Test case: Assignment tồn tại nhưng thuộc về user khác
        using var context = GetDbContext();
        // Assignment owned by user 2, current user is 1
        var assignment = CreateAssignment(1, userId: 2);
        var submission = CreateSubmission(1, 1);
        context.Assignments.Add(assignment);
        context.Submissions.Add(submission);
        await context.SaveChangesAsync();

        var service = GetService(context);
        var request = CreateValidRequest();

        var ex = await Assert.ThrowsAsync<BadRequestException>(() =>
            service.GradeSubmissionAsync(submission.SubId, request, "https://localhost"));

        Assert.Equal("Bạn không thể chấm điểm vì bài này không thuộc về bạn", ex.Message);
    }

    [Fact]
    public async Task GradeSubmission_ShouldGradeSuccessfully()
    {
        using var context = GetDbContext();
        var assignment = CreateAssignment(1, userId: 1);
        var submission = CreateSubmission(1, 1);
        context.Assignments.Add(assignment);
        context.Submissions.Add(submission);
        await context.SaveChangesAsync();

        var service = GetService(context);
        var request = CreateValidRequest();

        var result = await service.GradeSubmissionAsync(submission.SubId, request, "https://localhost");

        Assert.NotNull(result);
        Assert.Equal(submission.SubId, result.SubId);
        Assert.Equal(8.5m, result.Score);
        Assert.Equal("Good work!", result.TeacherComment);
        Assert.Equal(SubmissionStatus.Graded, result.Status);
        Assert.NotNull(result.GradedAt);
    }

    [Fact]
    public async Task GradeSubmission_ShouldSaveToDatabase()
    {
        using var context = GetDbContext();
        var assignment = CreateAssignment(1, userId: 1);
        var submission = CreateSubmission(1, 1);
        context.Assignments.Add(assignment);
        context.Submissions.Add(submission);
        await context.SaveChangesAsync();

        var service = GetService(context);
        var request = new GradeSubmissionRequest { Score = 9.0m, TeacherComment = "Excellent!" };

        var result = await service.GradeSubmissionAsync(submission.SubId, request, "https://localhost");

        // Verify returned DTO
        Assert.NotNull(result);
        Assert.Equal(9.0m, result.Score);
        Assert.Equal("Excellent!", result.TeacherComment);
        Assert.Equal(SubmissionStatus.Graded, result.Status);

        // Verify saved to database
        var updatedSubmission = await context.Submissions.FindAsync(submission.SubId);
        Assert.NotNull(updatedSubmission);
        Assert.Equal(9.0m, updatedSubmission.Score);
        Assert.Equal("Excellent!", updatedSubmission.TeacherComment);
        Assert.Equal(SubmissionStatus.Graded, updatedSubmission.Status);
        Assert.NotNull(updatedSubmission.GradedAt);
    }
}
