using EduCenAPI.Tests.Fakes;
using EducenAPI.DTOs.Students;
using EducenAPI.Models;
using EducenAPI.Persistence.Contexts;
using EducenAPI.Services;
using EducenAPI.Ultils;
using Microsoft.EntityFrameworkCore;

public class StudentService_CreateStudent_Tests
{
    private EducenV2Context GetDbContext()
    {
        var options = new DbContextOptionsBuilder<EducenV2Context>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;

        return new EducenV2Context(options, new FakeTenantService());
    }

    private static CreateStudentDto CreateValidDto() =>
        new()
        {
            FullName = "Nguyen Van A",
            Email = "student@example.com",
            PhoneNumber = "0912345678",
            Grade = "Grade 1",
            DateOfBirth = new DateTime(2015, 1, 1),
            Gender = "Male",
            Address = "123 Main Street"
        };

    private static async Task SeedStudentRoleAsync(EducenV2Context context)
    {
        if (!await context.Roles.AnyAsync(r => r.RoleName == "Student"))
        {
            context.Roles.Add(new Role { RoleId = 3, RoleName = "Student" });
            await context.SaveChangesAsync();
        }
    }

    [Fact]
    public async Task CreateStudent_ShouldThrow_WhenFullNameIsRequired()
    {
        using var context = GetDbContext();
        var service = new StudentService(context);
        var dto = CreateValidDto();
        dto.FullName = "   ";

        var ex = await Assert.ThrowsAsync<Exception>(() => service.CreateStudentAsync(dto));

        Assert.Equal(ValidationMessages.RequiredFullName, ex.Message);
    }

    [Fact]
    public async Task CreateStudent_ShouldThrow_WhenEmailIsInvalid()
    {
        using var context = GetDbContext();
        var service = new StudentService(context);
        var dto = CreateValidDto();
        dto.Email = "invalid-email";

        var ex = await Assert.ThrowsAsync<Exception>(() => service.CreateStudentAsync(dto));

        Assert.Equal(ValidationMessages.InvalidEmailFormat, ex.Message);
    }

    [Fact]
    public async Task CreateStudent_ShouldThrow_WhenPhoneNumberIsInvalid()
    {
        using var context = GetDbContext();
        var service = new StudentService(context);
        var dto = CreateValidDto();
        dto.PhoneNumber = "09abc";

        var ex = await Assert.ThrowsAsync<Exception>(() => service.CreateStudentAsync(dto));

        Assert.Equal(ValidationMessages.InvalidPhoneFormat, ex.Message);
    }

    [Fact]
    public async Task CreateStudent_ShouldThrow_WhenDateOfBirthIsInFuture()
    {
        using var context = GetDbContext();
        var service = new StudentService(context);
        var dto = CreateValidDto();
        dto.DateOfBirth = DateTime.Today.AddDays(1);

        var ex = await Assert.ThrowsAsync<Exception>(() => service.CreateStudentAsync(dto));

        Assert.Equal(ValidationMessages.DateOfBirthInFuture, ex.Message);
    }

    [Fact]
    public async Task CreateStudent_ShouldThrow_WhenEmailAlreadyExists()
    {
        using var context = GetDbContext();
        context.Users.Add(new User
        {
            Username = "existing",
            PasswordHash = "hashed",
            AccountStatus = "Active",
            RoleId = 3,
            FullName = "Existing User",
            Email = "student@example.com"
        });
        await context.SaveChangesAsync();

        var service = new StudentService(context);
        var dto = CreateValidDto();

        var ex = await Assert.ThrowsAsync<Exception>(() => service.CreateStudentAsync(dto));

        Assert.Equal(ValidationMessages.DuplicateEmail, ex.Message);
    }

    [Fact]
    public async Task CreateStudent_ShouldCreateProfileOnly_WhenUsernameIsMissing()
    {
        using var context = GetDbContext();
        await SeedStudentRoleAsync(context);
        context.Grades.Add(new Grade { GradeId = 1, GradeName = "Grade 1" });
        await context.SaveChangesAsync();

        var service = new StudentService(context);
        var dto = CreateValidDto();
        dto.Username = null;
        dto.Password = "secret123";

        var result = await service.CreateStudentAsync(dto);

        Assert.NotNull(result.UserId);
        Assert.Equal("", result.Username);
        Assert.Equal("NoAccount", result.AccountStatus);
        Assert.False(result.IsAccountSent);
        Assert.Equal("Nguyen Van A", result.FullName);
        Assert.Equal("student@example.com", result.Email);
        Assert.Equal("Grade 1", result.Grade);
        Assert.Equal(1, result.GradeId);

        var savedUser = Assert.Single(context.Users);
        Assert.Null(savedUser.PasswordHash);
        Assert.Null(savedUser.Username);
        Assert.Equal("NoAccount", savedUser.AccountStatus);

        var savedStudent = Assert.Single(context.Students);
        Assert.Equal(savedUser.UserId, savedStudent.UserId);
        Assert.Equal(1, savedStudent.GradeId);
    }

    [Fact]
    public async Task CreateStudent_ShouldCreateProfileOnlyAndLinkParents_WhenPasswordIsMissing()
    {
        using var context = GetDbContext();
        await SeedStudentRoleAsync(context);

        var parentUser = new User
        {
            UserId = 10,
            Username = "parent1",
            PasswordHash = "hashed",
            AccountStatus = "Active",
            RoleId = 4,
            FullName = "Parent One",
            Email = "parent@example.com"
        };
        var parent = new Parent { UserId = 10, ParentNavigation = parentUser };
        context.Users.Add(parentUser);
        context.Parents.Add(parent);
        await context.SaveChangesAsync();

        var service = new StudentService(context);
        var dto = CreateValidDto();
        dto.Username = "studentA";
        dto.Password = null;
        dto.ParentIds = new List<int> { 10 };

        var result = await service.CreateStudentAsync(dto);

        Assert.Equal("NoAccount", result.AccountStatus);
        Assert.Single(result.ParentIds);
        Assert.Contains(10, result.ParentIds);

        var savedStudent = await context.Students.Include(s => s.Parents).FirstAsync();
        Assert.Single(savedStudent.Parents);
        Assert.Equal(10, savedStudent.Parents.First().UserId);
    }

    [Fact]
    public async Task CreateStudent_ShouldThrow_WhenStudentRoleNotFound()
    {
        using var context = GetDbContext();
        var service = new StudentService(context);
        var dto = CreateValidDto();
        dto.Username = null;
        dto.Password = null;

        var ex = await Assert.ThrowsAsync<Exception>(() => service.CreateStudentAsync(dto));

        Assert.Equal("Không tìm thấy vai trò Học sinh.", ex.Message);
    }

    [Fact]
    public async Task CreateStudent_ShouldThrow_WhenUsernameAlreadyExists()
    {
        using var context = GetDbContext();
        await SeedStudentRoleAsync(context);
        context.Users.Add(new User
        {
            Username = "studentA",
            PasswordHash = "hashed",
            AccountStatus = "Active",
            RoleId = 3,
            FullName = "Existing Student",
            Email = "other@example.com"
        });
        await context.SaveChangesAsync();

        var service = new StudentService(context);
        var dto = CreateValidDto();
        dto.Username = "studentA";
        dto.Password = "secret123";

        var ex = await Assert.ThrowsAsync<Exception>(() => service.CreateStudentAsync(dto));

        Assert.Equal(ValidationMessages.DuplicateUsername, ex.Message);
    }

    [Fact]
    public async Task CreateStudent_ShouldCreateStudentWithAccount_WhenUsernameAndPasswordProvided()
    {
        using var context = GetDbContext();
        await SeedStudentRoleAsync(context);
        context.Grades.Add(new Grade { GradeId = 2, GradeName = "Grade 1" });
        await context.SaveChangesAsync();

        var service = new StudentService(context);
        var dto = CreateValidDto();
        dto.Username = "  studentA  ";
        dto.Password = "secret123";
        dto.EnrollmentStatus = null;

        var result = await service.CreateStudentAsync(dto);

        Assert.NotNull(result.UserId);
        Assert.Equal("studentA", result.Username);
        Assert.Equal("Inactive", result.AccountStatus);
        Assert.False(result.IsAccountSent);
        Assert.Equal("Active", result.EnrollmentStatus);
        Assert.Equal("Grade 1", result.Grade);
        Assert.Equal(2, result.GradeId);

        var savedUser = Assert.Single(context.Users);
        Assert.Equal("studentA", savedUser.Username);
        Assert.Equal("Inactive", savedUser.AccountStatus);
        Assert.True(BCrypt.Net.BCrypt.Verify("secret123", savedUser.PasswordHash));

        var savedStudent = Assert.Single(context.Students);
        Assert.Equal(savedUser.UserId, savedStudent.UserId);
        Assert.Equal("Active", savedStudent.EnrollmentStatus);
        Assert.Equal(2, savedStudent.GradeId);
    }
}
