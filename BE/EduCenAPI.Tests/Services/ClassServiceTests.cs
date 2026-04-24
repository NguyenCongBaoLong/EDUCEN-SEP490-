using EduCenAPI.Tests.Fakes;
using EducenAPI.DTOs.Classes;
using EducenAPI.Models;
using EducenAPI.Persistence.Contexts;
using EducenAPI.Services;
using EducenAPI.Services.Interface;
using EducenAPI.Ultils;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Moq;

public class ClassService_CreateClass_Tests
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

    private IServiceScopeFactory CreateScopeFactory(string databaseName)
    {
        var services = new ServiceCollection();
        services.AddScoped(_ => GetMailService());
        services.AddScoped(_ => GetDbContext(databaseName));
        return services.BuildServiceProvider().GetRequiredService<IServiceScopeFactory>();
    }

    private ClassService GetService(EducenV2Context context, string? databaseName = null)
    {
        var notificationService = new Mock<IPaymentReminderService>();
        IServiceScopeFactory scopeFactory = databaseName == null
            ? new Mock<IServiceScopeFactory>().Object
            : CreateScopeFactory(databaseName);
        return new ClassService(context, notificationService.Object, GetMailService(), scopeFactory);
    }

    private static CreateClassDto CreateValidDto() =>
        new()
        {
            ClassName = "Math 101",
            SubjectId = 1,
            TeacherId = 1,
            AssistantId = null,
            RoomId = null,
            GradeId = null,
            StartDate = DateTime.Today.AddDays(1),
            EndDate = DateTime.Today.AddDays(30),
            Status = "Active",
            MaxStudents = 20,
            ScheduleSlots = new List<CreateScheduleSlotDto>()
        };

    private static async Task SeedSubjectAndTeacherAsync(EducenV2Context context)
    {
        context.Subjects.Add(new Subject { SubjectId = 1, SubjectName = "Math" });
        context.Teachers.Add(new Teacher { UserId = 1 });
        await context.SaveChangesAsync();
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("   ")]
    public async Task CreateClass_ShouldThrow_WhenClassNameIsEmpty(string? className)
    {
        using var context = GetDbContext();
        var service = GetService(context);
        var dto = CreateValidDto();
        dto.ClassName = className!;

        var ex = await Assert.ThrowsAsync<Exception>(() => service.CreateClassAsync(dto));

        Assert.Equal("Class name cannot be empty.", ex.Message);
    }

    [Fact]
    public async Task CreateClass_ShouldThrow_WhenClassNameExceedsMaxLength()
    {
        using var context = GetDbContext();
        var service = GetService(context);
        var dto = CreateValidDto();
        dto.ClassName = new string('A', 101);

        var ex = await Assert.ThrowsAsync<Exception>(() => service.CreateClassAsync(dto));

        Assert.Equal("Class name cannot exceed 100 characters.", ex.Message);
    }

    [Fact]
    public async Task CreateClass_ShouldThrow_WhenSubjectNotFound()
    {
        using var context = GetDbContext();
        context.Teachers.Add(new Teacher { UserId = 1 });
        await context.SaveChangesAsync();

        var service = GetService(context);
        var dto = CreateValidDto();

        var ex = await Assert.ThrowsAsync<Exception>(() => service.CreateClassAsync(dto));

        Assert.Equal("Không tìm thấy môn học", ex.Message);
    }

    [Fact]
    public async Task CreateClass_ShouldThrow_WhenTeacherNotFound()
    {
        using var context = GetDbContext();
        context.Subjects.Add(new Subject { SubjectId = 1, SubjectName = "Math" });
        await context.SaveChangesAsync();

        var service = GetService(context);
        var dto = CreateValidDto();

        var ex = await Assert.ThrowsAsync<Exception>(() => service.CreateClassAsync(dto));

        Assert.Equal("Không tìm thấy giáo viên", ex.Message);
    }

    [Fact]
    public async Task CreateClass_ShouldThrow_WhenAssistantNotFound()
    {
        using var context = GetDbContext();
        await SeedSubjectAndTeacherAsync(context);

        var service = GetService(context);
        var dto = CreateValidDto();
        dto.AssistantId = 99;

        var ex = await Assert.ThrowsAsync<Exception>(() => service.CreateClassAsync(dto));

        Assert.Equal("Không tìm thấy trợ giảng", ex.Message);
    }

    [Fact]
    public async Task CreateClass_ShouldThrow_WhenRoomNotFound_AndNoScheduleSlots()
    {
        using var context = GetDbContext();
        await SeedSubjectAndTeacherAsync(context);

        var service = GetService(context);
        var dto = CreateValidDto();
        dto.RoomId = 10;

        var ex = await Assert.ThrowsAsync<Exception>(() => service.CreateClassAsync(dto));

        Assert.Equal("Không tìm thấy phòng học", ex.Message);
    }

    [Fact]
    public async Task CreateClass_ShouldThrow_WhenRoomIsUnderMaintenance_AndNoScheduleSlots()
    {
        using var context = GetDbContext();
        await SeedSubjectAndTeacherAsync(context);
        context.Rooms.Add(new Room { RoomId = 10, RoomName = "Room A", Status = false });
        await context.SaveChangesAsync();

        var service = GetService(context);
        var dto = CreateValidDto();
        dto.RoomId = 10;

        var ex = await Assert.ThrowsAsync<Exception>(() => service.CreateClassAsync(dto));

        Assert.Equal("Phòng 'Room A' đang bảo trì, không thể sử dụng", ex.Message);
    }

    [Fact]
    public async Task CreateClass_ShouldThrow_WhenStartDateGreaterThanEndDate()
    {
        using var context = GetDbContext();
        await SeedSubjectAndTeacherAsync(context);

        var service = GetService(context);
        var dto = CreateValidDto();
        dto.StartDate = DateTime.Today.AddDays(10);
        dto.EndDate = DateTime.Today.AddDays(1);

        var ex = await Assert.ThrowsAsync<Exception>(() => service.CreateClassAsync(dto));

        Assert.Equal("Ngày bắt đầu không thể lớn hơn ngày kết thúc", ex.Message);
    }

    [Fact]
    public async Task CreateClass_ShouldThrow_WhenStartDateIsInThePast()
    {
        using var context = GetDbContext();
        await SeedSubjectAndTeacherAsync(context);

        var service = GetService(context);
        var dto = CreateValidDto();
        dto.StartDate = DateTime.Today.AddDays(-1);
        dto.EndDate = DateTime.Today.AddDays(10);

        var ex = await Assert.ThrowsAsync<Exception>(() => service.CreateClassAsync(dto));

        Assert.Equal("Ngày bắt đầu không thể nằm trong quá khứ", ex.Message);
    }

    [Fact]
    public async Task CreateClass_ShouldThrow_WhenStatusIsInvalid()
    {
        using var context = GetDbContext();
        await SeedSubjectAndTeacherAsync(context);

        var service = GetService(context);
        var dto = CreateValidDto();
        dto.Status = "Draft";

        var ex = await Assert.ThrowsAsync<Exception>(() => service.CreateClassAsync(dto));

        Assert.Equal("Trạng thái phải là một trong: Active, Inactive, Completed, Cancelled", ex.Message);
    }
    [Fact]
    public async Task CreateClass_ShouldCreateClass_WhenDataIsValid()
    {
        var databaseName = Guid.NewGuid().ToString();
        using var context = GetDbContext(databaseName);
        await SeedSubjectAndTeacherAsync(context);

        var service = GetService(context, databaseName);
        var dto = CreateValidDto();
        dto.ClassName = "  Math 101  ";
        dto.Status = null;

        var result = await service.CreateClassAsync(dto);

        Assert.NotNull(result);
        Assert.Equal("Math 101", result.ClassName);
        Assert.Equal("Math", result.SubjectName);
        Assert.Equal(1, result.TeacherId);
        Assert.Equal("Active", result.Status);
        Assert.Equal(20, result.MaxStudents);

        var savedClass = Assert.Single(context.Classes);
        Assert.Equal("Math 101", savedClass.ClassName);
        Assert.Equal("Active", savedClass.Status);
    }

    [Fact]
    public async Task CreateClass_ShouldThrow_WhenTeacherHasScheduleConflict()
    {
        using var context = GetDbContext();
        await SeedSubjectAndTeacherAsync(context);
        context.Classes.Add(new Class
        {
            ClassId = 100,
            ClassName = "Existing Teacher Class",
            SubjectId = 1,
            TeacherId = 1,
            Status = "Active",
            MaxStudents = 20,
            StartDate = DateTime.Today.AddDays(1),
            EndDate = DateTime.Today.AddDays(30)
        });
        context.Schedules.Add(new Schedule
        {
            ClassId = 100,
            DayOfWeek = 1,
            StartTime = TimeOnly.Parse("09:00"),
            EndTime = TimeOnly.Parse("10:00")
        });
        await context.SaveChangesAsync();

        var service = GetService(context);
        var dto = CreateValidDto();
        dto.ScheduleSlots = new List<CreateScheduleSlotDto>
        {
            new() { DayOfWeek = 1, StartTime = "09:30", EndTime = "10:30" }
        };

        var ex = await Assert.ThrowsAsync<Exception>(() => service.CreateClassAsync(dto));

        Assert.Contains("phân công", ex.Message, StringComparison.OrdinalIgnoreCase);
        Assert.Contains("Existing Teacher Class", ex.Message);
    }

    [Fact]
    public async Task CreateClass_ShouldThrow_WhenAssistantHasScheduleConflict()
    {
        using var context = GetDbContext();
        await SeedSubjectAndTeacherAsync(context);
        context.Assistants.Add(new Assistant { UserId = 2 });
        context.Classes.Add(new Class
        {
            ClassId = 101,
            ClassName = "Existing Assistant Class",
            SubjectId = 1,
            TeacherId = 1,
            AssistantId = 2,
            Status = "Active",
            MaxStudents = 20,
            StartDate = DateTime.Today.AddDays(1),
            EndDate = DateTime.Today.AddDays(30)
        });
        context.Schedules.Add(new Schedule
        {
            ClassId = 101,
            DayOfWeek = 2,
            StartTime = TimeOnly.Parse("13:00"),
            EndTime = TimeOnly.Parse("14:00")
        });
        await context.SaveChangesAsync();

        var service = GetService(context);
        var dto = CreateValidDto();
        dto.AssistantId = 2;
        dto.ScheduleSlots = new List<CreateScheduleSlotDto>
        {
            new() { DayOfWeek = 2, StartTime = "13:30", EndTime = "14:30" }
        };

        var ex = await Assert.ThrowsAsync<Exception>(() => service.CreateClassAsync(dto));

        Assert.Contains("phân công", ex.Message, StringComparison.OrdinalIgnoreCase);
        Assert.Contains("Existing Assistant Class", ex.Message);
    }

    [Fact]
    public async Task CreateClass_ShouldThrow_WhenRoomHasScheduleConflict()
    {
        using var context = GetDbContext();
        await SeedSubjectAndTeacherAsync(context);
        context.Teachers.Add(new Teacher { UserId = 2 });
        context.Rooms.Add(new Room { RoomId = 10, RoomName = "Room A", Status = true });
        context.Classes.Add(new Class
        {
            ClassId = 102,
            ClassName = "Existing Room Class",
            SubjectId = 1,
            TeacherId = 2,
            RoomId = 10,
            Status = "Active",
            MaxStudents = 20,
            StartDate = DateTime.Today.AddDays(1),
            EndDate = DateTime.Today.AddDays(30)
        });
        context.Schedules.Add(new Schedule
        {
            ClassId = 102,
            RoomId = 10,
            DayOfWeek = 3,
            StartTime = TimeOnly.Parse("15:00"),
            EndTime = TimeOnly.Parse("16:00")
        });
        await context.SaveChangesAsync();

        var service = GetService(context);
        var dto = CreateValidDto();
        dto.ScheduleSlots = new List<CreateScheduleSlotDto>
        {
            new() { DayOfWeek = 3, StartTime = "15:30", EndTime = "16:30", RoomId = 10 }
        };

        var ex = await Assert.ThrowsAsync<Exception>(() => service.CreateClassAsync(dto));

        Assert.Contains("Room A", ex.Message);
        Assert.Contains("Existing Room Class", ex.Message);
    }
}

public class ClassService_AddStudentToClass_Tests
{
    private EducenV2Context GetDbContext(string? databaseName = null)
    {
        var dbName = databaseName ?? Guid.NewGuid().ToString();
        var options = new DbContextOptionsBuilder<EducenV2Context>()
            .UseInMemoryDatabase(dbName)
            .ConfigureWarnings(x => x.Ignore(InMemoryEventId.TransactionIgnoredWarning))
            .Options;

        var context = new EducenV2Context(options, new FakeTenantService());
        // Seed Role for students
        context.Roles.Add(new Role { RoleId = 3, RoleName = "Student" });
        context.SaveChanges();
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

    private IServiceScopeFactory CreateScopeFactory(string databaseName)
    {
        var services = new ServiceCollection();
        services.AddScoped(_ => GetMailService());
        services.AddScoped(_ => GetDbContext(databaseName));
        return services.BuildServiceProvider().GetRequiredService<IServiceScopeFactory>();
    }

    private ClassService GetService(EducenV2Context context, string? databaseName = null)
    {
        var notificationService = new Mock<IPaymentReminderService>();
        IServiceScopeFactory scopeFactory = databaseName == null
            ? new Mock<IServiceScopeFactory>().Object
            : CreateScopeFactory(databaseName);
        return new ClassService(context, notificationService.Object, GetMailService(), scopeFactory);
    }

    private static Student CreateStudent(int userId, string email = "student@test.com", string fullName = "Test Student") =>
        new()
        {
            UserId = userId,
            StudentNavigation = new User
            {
                UserId = userId,
                Email = email,
                FullName = fullName,
                Username = $"student{userId}",
                AccountStatus = "Active",
                RoleId = 3
            }
        };

    private static Class CreateActiveClass(int classId, int maxStudents = 20) =>
        new()
        {
            ClassId = classId,
            ClassName = $"Test Class {classId}",
            Status = "Active",
            MaxStudents = maxStudents,
            StartDate = DateTime.Today.AddDays(1),
            EndDate = DateTime.Today.AddDays(30),
            Students = new List<Student>()
        };

    [Fact]
    public async Task AddStudentToClass_ShouldReturnFalse_WhenClassNotFound()
    {
        using var context = GetDbContext();
        var student = CreateStudent(1);
        context.Students.Add(student);
        await context.SaveChangesAsync();

        var service = GetService(context);
        var result = await service.AddStudentToClassAsync(999, 1);

        Assert.False(result);
    }

    [Theory]
    [InlineData("Completed")]
    [InlineData("Cancelled")]
    public async Task AddStudentToClass_ShouldThrow_WhenClassIsCompletedOrCancelled(string status)
    {
        using var context = GetDbContext();
        var classEntity = CreateActiveClass(1);
        classEntity.Status = status;
        context.Classes.Add(classEntity);
        var student = CreateStudent(1);
        context.Students.Add(student);
        await context.SaveChangesAsync();

        var service = GetService(context);

        var ex = await Assert.ThrowsAsync<Exception>(() => service.AddStudentToClassAsync(1, 1));

        Assert.Equal("Lớp đã kết thúc, không thể thêm học sinh.", ex.Message);
    }

    [Fact]
    public async Task AddStudentToClass_ShouldThrow_WhenClassEndDatePassed()
    {
        using var context = GetDbContext();
        var classEntity = CreateActiveClass(1);
        classEntity.EndDate = DateTime.Today.AddDays(-1);
        context.Classes.Add(classEntity);
        var student = CreateStudent(1);
        context.Students.Add(student);
        await context.SaveChangesAsync();

        var service = GetService(context);

        var ex = await Assert.ThrowsAsync<Exception>(() => service.AddStudentToClassAsync(1, 1));

        Assert.Equal("Lớp đã kết thúc, không thể thêm học sinh.", ex.Message);
    }

    [Fact]
    public async Task AddStudentToClass_ShouldThrow_WhenStudentNotFound()
    {
        using var context = GetDbContext();
        context.Classes.Add(CreateActiveClass(1));
        await context.SaveChangesAsync();

        var service = GetService(context);

        var ex = await Assert.ThrowsAsync<Exception>(() => service.AddStudentToClassAsync(1, 999));

        Assert.Equal("Không tìm thấy học sinh", ex.Message);
    }

    [Fact]
    public async Task AddStudentToClass_ShouldThrow_WhenStudentAlreadyInClass()
    {
        using var context = GetDbContext();
        var student = CreateStudent(1);
        var classEntity = CreateActiveClass(1);
        classEntity.Students.Add(student);
        context.Classes.Add(classEntity);
        await context.SaveChangesAsync();

        var service = GetService(context);

        var ex = await Assert.ThrowsAsync<Exception>(() => service.AddStudentToClassAsync(1, 1));

        Assert.Equal("Học sinh này đã tham gia lớp học này", ex.Message);
    }

    [Fact]
    public async Task AddStudentToClass_ShouldThrow_WhenClassIsFull()
    {
        using var context = GetDbContext();
        var classEntity = CreateActiveClass(1, maxStudents: 2);
        var student1 = CreateStudent(1);
        var student2 = CreateStudent(2);
        var student3 = CreateStudent(3);
        classEntity.Students.Add(student1);
        classEntity.Students.Add(student2);
        context.Classes.Add(classEntity);
        context.Students.Add(student3);
        await context.SaveChangesAsync();

        var service = GetService(context);

        var ex = await Assert.ThrowsAsync<Exception>(() => service.AddStudentToClassAsync(1, 3));

        Assert.Equal("Lớp học đã đầy sĩ số tối đa.", ex.Message);
    }

    [Fact]
    public async Task AddStudentToClass_ShouldThrow_WhenScheduleConflicts()
    {
        using var context = GetDbContext();
        var student = CreateStudent(1);
        var existingClass = CreateActiveClass(1);
        existingClass.Students.Add(student);
        context.Classes.Add(existingClass);
        context.Schedules.Add(new Schedule
        {
            ClassId = 1,
            DayOfWeek = 1,
            StartTime = TimeOnly.Parse("09:00"),
            EndTime = TimeOnly.Parse("10:00")
        });

        var newClass = CreateActiveClass(2);
        context.Classes.Add(newClass);
        context.Schedules.Add(new Schedule
        {
            ClassId = 2,
            DayOfWeek = 1,
            StartTime = TimeOnly.Parse("09:30"),
            EndTime = TimeOnly.Parse("10:30")
        });
        await context.SaveChangesAsync();

        var service = GetService(context);

        var ex = await Assert.ThrowsAsync<Exception>(() => service.AddStudentToClassAsync(2, 1));

        Assert.Equal("Lịch học của học sinh bị trùng với lịch của lớp học này.", ex.Message);
    }

    [Fact]
    public async Task AddStudentToClass_ShouldReturnTrue_WhenDataIsValid()
    {
        var databaseName = Guid.NewGuid().ToString();
        using var context = GetDbContext(databaseName);
        var classEntity = CreateActiveClass(1);
        var student = CreateStudent(1);
        context.Classes.Add(classEntity);
        context.Students.Add(student);
        await context.SaveChangesAsync();

        var service = GetService(context, databaseName);
        var result = await service.AddStudentToClassAsync(1, 1);

        Assert.True(result);
        var updatedClass = await context.Classes
            .Include(c => c.Students)
            .FirstOrDefaultAsync(c => c.ClassId == 1);
        Assert.Single(updatedClass!.Students);
        Assert.Equal(1, updatedClass.Students.First().UserId);
    }

    [Fact]
    public async Task AddStudentToClass_ShouldAllow_WhenMaxStudentsIsZero()
    {
        var databaseName = Guid.NewGuid().ToString();
        using var context = GetDbContext(databaseName);
        var classEntity = CreateActiveClass(1, maxStudents: 0);
        var student1 = CreateStudent(1);
        var student2 = CreateStudent(2);
        classEntity.Students.Add(student1);
        context.Classes.Add(classEntity);
        context.Students.Add(student2);
        await context.SaveChangesAsync();

        var service = GetService(context, databaseName);
        var result = await service.AddStudentToClassAsync(1, 2);

        Assert.True(result);
    }
}
