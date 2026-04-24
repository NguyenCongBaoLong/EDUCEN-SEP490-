using EduCenAPI.Tests.Fakes;
using EducenAPI.DTOs.Attendance;
using EducenAPI.Models;
using EducenAPI.Persistence.Contexts;
using EducenAPI.Services;
using EducenAPI.Services.Interface;
using EducenAPI.Ultils;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using Moq;

public class AttendanceService_BulkSaveAttendance_Tests
{
    private EducenV2Context GetDbContext(string? databaseName = null)
    {
        var dbName = databaseName ?? Guid.NewGuid().ToString();
        var options = new DbContextOptionsBuilder<EducenV2Context>()
            .UseInMemoryDatabase(dbName)
            .ConfigureWarnings(x => x.Ignore(InMemoryEventId.TransactionIgnoredWarning))
            .Options;

        var context = new EducenV2Context(options, new FakeTenantService());
        return context;
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

    private AttendanceService GetService(EducenV2Context context, IPaymentReminderService? notificationService = null)
    {
        var loggerMock = new Mock<ILogger<AttendanceService>>();
        var notifyService = notificationService ?? new Mock<IPaymentReminderService>().Object;
        return new AttendanceService(context, loggerMock.Object, notifyService, GetMailService());
    }

    private static User CreateUser(int userId, string roleName = "Teacher", int? roleId = null) =>
        new()
        {
            UserId = userId,
            Username = $"user{userId}",
            FullName = $"User {userId}",
            Email = $"user{userId}@test.com",
            AccountStatus = "Active",
            RoleId = roleId ?? (roleName == "Admin" ? 1 : 2)
        };

    private static Student CreateStudent(int userId, User? user = null) =>
        new()
        {
            UserId = userId,
            StudentNavigation = user
        };

    private static ClassSession CreateSession(int sessionId, int classId, DateTime sessionDate, int scheduleId = 1) =>
        new()
        {
            SessionId = sessionId,
            ClassId = classId,
            SessionDate = sessionDate,
            ScheduleId = scheduleId,
            Status = "Scheduled"
        };

    private static Schedule CreateSchedule(int scheduleId, int classId, TimeOnly startTime, TimeOnly endTime) =>
        new()
        {
            ScheduleId = scheduleId,
            ClassId = classId,
            DayOfWeek = 1,
            StartTime = startTime,
            EndTime = endTime
        };

    [Fact]
    public async Task BulkSaveAttendance_ShouldThrow_WhenSessionNotFound()
    {
        using var context = GetDbContext();
        var service = GetService(context);
        var records = new List<AttendanceRecord> { new() { StudentId = 1, Status = "present" } };

        var ex = await Assert.ThrowsAsync<Exception>(() => 
            service.BulkSaveAttendanceAsync(999, records, 1));

        Assert.Equal("Không tìm thấy buổi học", ex.Message);
    }

    [Fact]
    public async Task BulkSaveAttendance_ShouldThrow_WhenSessionIsInFuture_ForTeacher()
    {
        using var context = GetDbContext();
        var tomorrow = DateTime.UtcNow.AddHours(7).Date.AddDays(1);
        context.ClassSessions.Add(CreateSession(1, 1, tomorrow));
        await context.SaveChangesAsync();

        var service = GetService(context);
        var records = new List<AttendanceRecord> { new() { StudentId = 1, Status = "present" } };

        var ex = await Assert.ThrowsAsync<Exception>(() => 
            service.BulkSaveAttendanceAsync(1, records, 1, "Teacher"));

        Assert.Equal("Buổi học chưa diễn ra, chưa thể điểm danh", ex.Message);
    }

    [Fact]
    public async Task BulkSaveAttendance_ShouldAllow_WhenSessionIsInFuture_ForAdmin()
    {
        using var context = GetDbContext();
        var tomorrow = DateTime.UtcNow.AddHours(7).Date.AddDays(1);
        var studentUser = CreateUser(1, "Student");
        context.Users.Add(studentUser);
        context.Students.Add(CreateStudent(1, studentUser));
        context.Users.Add(CreateUser(10, "Admin", 1));
        context.ClassSessions.Add(CreateSession(1, 1, tomorrow));
        await context.SaveChangesAsync();

        var mockNotification = new Mock<IPaymentReminderService>();
        var service = GetService(context, mockNotification.Object);
        var records = new List<AttendanceRecord> { new() { StudentId = 1, Status = "present" } };

        var result = await service.BulkSaveAttendanceAsync(1, records, 10, "Admin");

        Assert.Single(result);
    }

    [Fact]
    public async Task BulkSaveAttendance_ShouldThrow_WhenSessionIsInPast_ForTeacher()
    {
        using var context = GetDbContext();
        var yesterday = DateTime.UtcNow.AddHours(7).Date.AddDays(-1);
        context.ClassSessions.Add(CreateSession(1, 1, yesterday));
        await context.SaveChangesAsync();

        var service = GetService(context);
        var records = new List<AttendanceRecord> { new() { StudentId = 1, Status = "present" } };

        var ex = await Assert.ThrowsAsync<Exception>(() => 
            service.BulkSaveAttendanceAsync(1, records, 1, "Teacher"));

        Assert.Equal("Đã quá ngày điểm danh. Vui lòng gửi yêu cầu sửa điểm danh cho Admin.", ex.Message);
    }

    [Fact]
    public async Task BulkSaveAttendance_ShouldAllow_WhenSessionIsInPast_ForAdmin()
    {
        using var context = GetDbContext();
        var yesterday = DateTime.UtcNow.AddHours(7).Date.AddDays(-1);
        var studentUser = CreateUser(1, "Student");
        context.Users.Add(studentUser);
        context.Students.Add(CreateStudent(1, studentUser));
        context.Users.Add(CreateUser(10, "Admin", 1));
        context.ClassSessions.Add(CreateSession(1, 1, yesterday));
        await context.SaveChangesAsync();

        var mockNotification = new Mock<IPaymentReminderService>();
        var service = GetService(context, mockNotification.Object);
        var records = new List<AttendanceRecord> { new() { StudentId = 1, Status = "present" } };

        var result = await service.BulkSaveAttendanceAsync(1, records, 10, "Admin");

        Assert.Single(result);
        mockNotification.Verify(x => x.SendToParentsOfStudentAsync(1, It.IsAny<CreateRoleNotificationRequest>()), Times.Once);
    }

    [Fact]
    public async Task BulkSaveAttendance_ShouldThrow_WhenInvalidStatus()
    {
        using var context = GetDbContext();
        var today = DateTime.UtcNow.AddHours(7).Date;
        context.ClassSessions.Add(CreateSession(1, 1, today));
        await context.SaveChangesAsync();

        var service = GetService(context);
        var records = new List<AttendanceRecord> { new() { StudentId = 1, Status = "invalid" } };

        var ex = await Assert.ThrowsAsync<Exception>(() => 
            service.BulkSaveAttendanceAsync(1, records, 1, "Admin"));

        Assert.Contains("Trạng thái điểm danh không hợp lệ", ex.Message);
    }

    [Theory]
    [InlineData("present")]
    [InlineData("absent")]
    [InlineData("notYet")]
    public async Task BulkSaveAttendance_ShouldCreateNewAttendance_WhenNotExists(string status)
    {
        using var context = GetDbContext();
        var today = DateTime.UtcNow.AddHours(7).Date;
        var studentUser = CreateUser(1, "Student");
        context.Users.Add(studentUser);
        context.Students.Add(CreateStudent(1, studentUser));
        context.Users.Add(CreateUser(10, "Admin", 1));
        context.ClassSessions.Add(CreateSession(1, 1, today));
        await context.SaveChangesAsync();

        var mockNotification = new Mock<IPaymentReminderService>();
        var service = GetService(context, mockNotification.Object);
        var records = new List<AttendanceRecord> { new() { StudentId = 1, Status = status } };

        var result = await service.BulkSaveAttendanceAsync(1, records, 10, "Admin");

        var attendance = Assert.Single(result);
        Assert.Equal(1, attendance.StudentId);
        Assert.Equal(status, attendance.Status);
        Assert.Equal(1, attendance.SessionId);
    }

    [Fact]
    public async Task BulkSaveAttendance_ShouldUpdateExistingAttendance()
    {
        using var context = GetDbContext();
        var today = DateTime.UtcNow.AddHours(7).Date;
        var studentUser = CreateUser(1, "Student");
        context.Users.Add(studentUser);
        context.Students.Add(CreateStudent(1, studentUser));
        context.Users.Add(CreateUser(10, "Admin", 1));
        context.ClassSessions.Add(CreateSession(1, 1, today));
        context.Attendances.Add(new Attendance
        {
            SessionId = 1,
            StudentId = 1,
            Status = "notYet",
            RecordedAt = DateTime.UtcNow.AddDays(-1)
        });
        await context.SaveChangesAsync();

        var mockNotification = new Mock<IPaymentReminderService>();
        var service = GetService(context, mockNotification.Object);
        var records = new List<AttendanceRecord> { new() { StudentId = 1, Status = "present" } };

        var result = await service.BulkSaveAttendanceAsync(1, records, 10, "Admin");

        var attendance = Assert.Single(result);
        Assert.Equal("present", attendance.Status);
    }

    [Fact]
    public async Task BulkSaveAttendance_ShouldHandleMultipleStudents()
    {
        using var context = GetDbContext();
        var today = DateTime.UtcNow.AddHours(7).Date;
        var studentUser1 = CreateUser(1, "Student");
        var studentUser2 = CreateUser(2, "Student");
        context.Users.Add(studentUser1);
        context.Users.Add(studentUser2);
        context.Students.Add(CreateStudent(1, studentUser1));
        context.Students.Add(CreateStudent(2, studentUser2));
        context.Users.Add(CreateUser(10, "Admin", 1));
        context.ClassSessions.Add(CreateSession(1, 1, today));
        await context.SaveChangesAsync();

        var mockNotification = new Mock<IPaymentReminderService>();
        var service = GetService(context, mockNotification.Object);
        var records = new List<AttendanceRecord>
        {
            new() { StudentId = 1, Status = "present" },
            new() { StudentId = 2, Status = "absent" }
        };

        var result = await service.BulkSaveAttendanceAsync(1, records, 1, "Admin");

        Assert.Equal(2, result.Count());
        mockNotification.Verify(x => x.SendToParentsOfStudentAsync(It.IsAny<int>(), It.IsAny<CreateRoleNotificationRequest>()), Times.Exactly(2));
    }

    [Fact]
    public async Task BulkSaveAttendance_ShouldUseUpdaterFromContext()
    {
        using var context = GetDbContext();
        var today = DateTime.UtcNow.AddHours(7).Date;
        var studentUser = CreateUser(1, "Student");
        context.Users.Add(studentUser);
        context.Students.Add(CreateStudent(1, studentUser));
        var admin = CreateUser(10, "Admin", 1);
        context.Users.Add(admin);
        context.ClassSessions.Add(CreateSession(1, 1, today));
        await context.SaveChangesAsync();

        var mockNotification = new Mock<IPaymentReminderService>();
        var service = GetService(context, mockNotification.Object);
        var records = new List<AttendanceRecord> { new() { StudentId = 1, Status = "present" } };

        var result = await service.BulkSaveAttendanceAsync(1, records, 10, "Admin");

        var attendance = Assert.Single(result);
        Assert.NotNull(attendance.UpdatedBy);
        Assert.Equal(10, attendance.UpdatedBy?.UserId);
    }

    [Fact]
    public async Task BulkSaveAttendance_ShouldReturnEmpty_WhenEmptyRecords()
    {
        using var context = GetDbContext();
        var today = DateTime.UtcNow.AddHours(7).Date;
        context.Users.Add(CreateUser(10, "Admin", 1));
        context.ClassSessions.Add(CreateSession(1, 1, today));
        await context.SaveChangesAsync();

        var mockNotification = new Mock<IPaymentReminderService>();
        var service = GetService(context, mockNotification.Object);
        var records = new List<AttendanceRecord>();

        var result = await service.BulkSaveAttendanceAsync(1, records, 10, "Admin");

        Assert.Empty(result);
        mockNotification.Verify(x => x.SendToParentsOfStudentAsync(It.IsAny<int>(), It.IsAny<CreateRoleNotificationRequest>()), Times.Never);
    }

    [Fact]
    public async Task BulkSaveAttendance_ShouldThrow_WhenSessionNotStarted_ForTodaySession()
    {
        using var context = GetDbContext();
        var today = DateTime.UtcNow.AddHours(7).Date;
        var now = DateTime.UtcNow.AddHours(7);
        var futureTime = now.AddHours(2); // Session starts in 2 hours
        
        context.ClassSessions.Add(CreateSession(1, 1, today, 1));
        context.Schedules.Add(CreateSchedule(1, 1, TimeOnly.FromDateTime(futureTime), TimeOnly.FromDateTime(futureTime.AddHours(1))));
        await context.SaveChangesAsync();

        var service = GetService(context);
        var records = new List<AttendanceRecord> { new() { StudentId = 1, Status = "present" } };

        var ex = await Assert.ThrowsAsync<Exception>(() => 
            service.BulkSaveAttendanceAsync(1, records, 1, "Teacher"));

        Assert.Equal("Buổi học chưa bắt đầu", ex.Message);
    }

    [Fact]
    public async Task CreateModificationRequests_ShouldThrow_WhenRequestsEmpty()
    {
        using var context = GetDbContext();
        var service = GetService(context);
        List<AttendanceModificationStudentRequestDto> requests = new();

        var ex = await Assert.ThrowsAsync<Exception>(() =>
            service.CreateModificationRequestsAsync(1, requests, 1));

        Assert.Equal("Danh sách yêu cầu trống", ex.Message);
    }

    [Fact]
    public async Task CreateModificationRequests_ShouldThrow_WhenSessionNotFound()
    {
        using var context = GetDbContext();
        var service = GetService(context);
        var requests = new List<AttendanceModificationStudentRequestDto>
        {
            new() { StudentId = 1, RequestedStatus = "present", Reason = "Test" }
        };

        var ex = await Assert.ThrowsAsync<Exception>(() =>
            service.CreateModificationRequestsAsync(999, requests, 1));

        Assert.Equal("Không tìm thấy buổi học", ex.Message);
    }

    [Fact]
    public async Task CreateModificationRequests_ShouldThrow_WhenPendingRequestExists()
    {
        using var context = GetDbContext();
        var today = DateTime.UtcNow.AddHours(7).Date;
        context.ClassSessions.Add(CreateSession(1, 1, today));
        context.AttendanceModificationRequests.Add(new AttendanceModificationRequest
        {
            SessionId = 1,
            StudentId = 1,
            Status = "Pending",
            RequestedStatus = "present",
            RequestedByUserId = 2,
            RequestedAt = DateTime.UtcNow.AddDays(-1)
        });
        await context.SaveChangesAsync();

        var service = GetService(context);
        var requests = new List<AttendanceModificationStudentRequestDto>
        {
            new() { StudentId = 1, RequestedStatus = "absent", Reason = "Change status" }
        };

        var ex = await Assert.ThrowsAsync<Exception>(() =>
            service.CreateModificationRequestsAsync(1, requests, 1));

        Assert.Contains("Đã tồn tại yêu cầu đang chờ duyệt cho các học sinh: 1", ex.Message);
    }

    [Fact]
    public async Task CreateModificationRequests_ShouldThrow_WhenInvalidStatus()
    {
        using var context = GetDbContext();
        var today = DateTime.UtcNow.AddHours(7).Date;
        context.ClassSessions.Add(CreateSession(1, 1, today));
        await context.SaveChangesAsync();

        var service = GetService(context);
        var requests = new List<AttendanceModificationStudentRequestDto>
        {
            new() { StudentId = 1, RequestedStatus = "invalid", Reason = "Test" }
        };

        var ex = await Assert.ThrowsAsync<Exception>(() =>
            service.CreateModificationRequestsAsync(1, requests, 1));

        Assert.Contains("Trạng thái điểm danh không hợp lệ", ex.Message);
    }

    [Fact]
    public async Task CreateModificationRequests_ShouldCreateWithExistingAttendanceStatus()
    {
        using var context = GetDbContext();
        var today = DateTime.UtcNow.AddHours(7).Date;
        var studentUser = CreateUser(1, "Student");
        context.Users.Add(studentUser);
        context.Students.Add(CreateStudent(1, studentUser));
        context.ClassSessions.Add(CreateSession(1, 1, today));
        context.Attendances.Add(new Attendance
        {
            SessionId = 1,
            StudentId = 1,
            Status = "absent",
            RecordedAt = DateTime.UtcNow.AddHours(-2)
        });
        await context.SaveChangesAsync();

        var service = GetService(context);
        var requests = new List<AttendanceModificationStudentRequestDto>
        {
            new() { StudentId = 1, RequestedStatus = "present", Reason = "Student was present" }
        };

        var result = await service.CreateModificationRequestsAsync(1, requests, 10);

        var request = Assert.Single(result);
        Assert.Equal(1, request.SessionId);
        Assert.Equal(1, request.StudentId);
        Assert.Equal("absent", request.CurrentStatus);
        Assert.Equal("present", request.RequestedStatus);
        Assert.Equal("Pending", request.Status);
        Assert.Equal(10, request.RequestedByUserId);
        Assert.Equal("Student was present", request.Reason);
    }

    [Fact]
    public async Task CreateModificationRequests_ShouldCreateWithNotYet_WhenNoAttendance()
    {
        using var context = GetDbContext();
        var today = DateTime.UtcNow.AddHours(7).Date;
        var studentUser = CreateUser(1, "Student");
        context.Users.Add(studentUser);
        context.Students.Add(CreateStudent(1, studentUser));
        context.ClassSessions.Add(CreateSession(1, 1, today));
        await context.SaveChangesAsync();

        var service = GetService(context);
        var requests = new List<AttendanceModificationStudentRequestDto>
        {
            new() { StudentId = 1, RequestedStatus = "present", Reason = "Add attendance" }
        };

        var result = await service.CreateModificationRequestsAsync(1, requests, 5);

        var request = Assert.Single(result);
        Assert.Equal("notYet", request.CurrentStatus);
        Assert.Equal("present", request.RequestedStatus);
        Assert.Equal("Pending", request.Status);
        Assert.Equal(5, request.RequestedByUserId);
    }

    [Fact]
    public async Task CreateModificationRequests_ShouldCreateMultipleRequests()
    {
        using var context = GetDbContext();
        var today = DateTime.UtcNow.AddHours(7).Date;
        var studentUser1 = CreateUser(1, "Student");
        var studentUser2 = CreateUser(2, "Student");
        context.Users.Add(studentUser1);
        context.Users.Add(studentUser2);
        context.Students.Add(CreateStudent(1, studentUser1));
        context.Students.Add(CreateStudent(2, studentUser2));
        context.ClassSessions.Add(CreateSession(1, 1, today));
        context.Attendances.Add(new Attendance
        {
            SessionId = 1,
            StudentId = 1,
            Status = "absent",
            RecordedAt = DateTime.UtcNow.AddHours(-2)
        });
        await context.SaveChangesAsync();

        var service = GetService(context);
        var requests = new List<AttendanceModificationStudentRequestDto>
        {
            new() { StudentId = 1, RequestedStatus = "present", Reason = "Student 1 was present" },
            new() { StudentId = 2, RequestedStatus = "absent", Reason = "Student 2 was absent" }
        };

        var result = await service.CreateModificationRequestsAsync(1, requests, 3);

        Assert.Equal(2, result.Count);
        Assert.Contains(result, r => r.StudentId == 1 && r.CurrentStatus == "absent" && r.RequestedStatus == "present");
        Assert.Contains(result, r => r.StudentId == 2 && r.CurrentStatus == "notYet" && r.RequestedStatus == "absent");
    }

    [Theory]
    [InlineData("present")]
    [InlineData("absent")]
    [InlineData("notYet")]
    public async Task CreateModificationRequests_ShouldAcceptValidStatuses(string status)
    {
        using var context = GetDbContext();
        var today = DateTime.UtcNow.AddHours(7).Date;
        context.ClassSessions.Add(CreateSession(1, 1, today));
        await context.SaveChangesAsync();

        var service = GetService(context);
        var requests = new List<AttendanceModificationStudentRequestDto>
        {
            new() { StudentId = 1, RequestedStatus = status, Reason = "Test" }
        };

        var result = await service.CreateModificationRequestsAsync(1, requests, 1);

        var request = Assert.Single(result);
        Assert.Equal(status, request.RequestedStatus);
    }

    [Fact]
    public async Task CreateModificationRequests_ShouldGetLatestAttendanceStatus()
    {
        using var context = GetDbContext();
        var today = DateTime.UtcNow.AddHours(7).Date;
        var studentUser = CreateUser(1, "Student");
        context.Users.Add(studentUser);
        context.Students.Add(CreateStudent(1, studentUser));
        context.ClassSessions.Add(CreateSession(1, 1, today));
        context.Attendances.Add(new Attendance
        {
            SessionId = 1,
            StudentId = 1,
            Status = "present",
            RecordedAt = DateTime.UtcNow.AddHours(-3)
        });
        context.Attendances.Add(new Attendance
        {
            SessionId = 1,
            StudentId = 1,
            Status = "absent",
            RecordedAt = DateTime.UtcNow.AddHours(-1) // Latest
        });
        await context.SaveChangesAsync();

        var service = GetService(context);
        var requests = new List<AttendanceModificationStudentRequestDto>
        {
            new() { StudentId = 1, RequestedStatus = "present", Reason = "Correction" }
        };

        var result = await service.CreateModificationRequestsAsync(1, requests, 1);

        var request = Assert.Single(result);
        Assert.Equal("absent", request.CurrentStatus); // Should get the latest (absent)
    }
}
