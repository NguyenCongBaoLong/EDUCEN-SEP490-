using Xunit;
using Microsoft.EntityFrameworkCore;
using EducenAPI.Services;
using EducenAPI.Models;
using EducenAPI.DTOs;
using System;
using System.Threading.Tasks;
using EducenAPI.Persistence.Contexts;
using EduCenAPI.Tests.Fakes;
using System.Linq;
using EducenAPI.DTOs.Teachers;
using Microsoft.Extensions.Logging;
using EducenAPI.Ultils;
using Microsoft.Extensions.Configuration;

public class TeacherService_CreateTeacher_Tests
{
    private EducenV2Context GetDbContext()
    {
        var options = new DbContextOptionsBuilder<EducenV2Context>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;

        var tenantService = new FakeTenantService();

        return new EducenV2Context(options, tenantService);
    }

    private MailService GetMailService()
    {
        var configData = new Dictionary<string, string?>
        {
            {"EmailSettings:Email", "test@example.com"},
            {"EmailSettings:Password", "test123"},
            {"EmailSettings:Host", "smtp.example.com"},
            {"EmailSettings:Port", "587"}
        };
        
        var configuration = new ConfigurationBuilder()
            .AddInMemoryCollection(configData)
            .Build();
            
        return new MailService(configuration);
    }

    // ================================
    // 1. Username null → profile only
    // ================================
    [Fact]
    public async Task CreateTeacher_ShouldCreateProfileOnly_WhenUsernameNull()
    {
        var context = GetDbContext();
        var mailService = GetMailService();
        var service = new TeacherService(context, mailService);

        var dto = new CreateTeacherDto
        {
            Username = null,
            Password = "123",
            FullName = "Teacher A"
        };

        var result = await service.CreateTeacherAsync(dto);

        Assert.Equal("", result.Username);
        Assert.Equal("Pending", result.AccountStatus);
        Assert.Equal(1, context.Teachers.Count());
        Assert.Empty(context.Users);
    }

    // ================================
    // 2. Password null → profile only
    // ================================
    [Fact]
    public async Task CreateTeacher_ShouldCreateProfileOnly_WhenPasswordNull()
    {
        var context = GetDbContext();
        var mailService = GetMailService();
        var service = new TeacherService(context, mailService);

        var dto = new CreateTeacherDto
        {
            Username = "teacher1",
            Password = null
        };

        var result = await service.CreateTeacherAsync(dto);

        Assert.Equal("Pending", result.AccountStatus);
        Assert.Equal(1, context.Teachers.Count());
        Assert.Empty(context.Users);
    }

    // ================================
    // 3. Username duplicate
    // ================================
    [Fact]
    public async Task CreateTeacher_ShouldThrow_WhenUsernameExists()
    {
        var context = GetDbContext();

        // ✅ PHẢI có role để đi qua branch
        context.Roles.Add(new Role { RoleName = "Teacher" });

        context.Users.Add(new User { Username = "teacher1" });
        await context.SaveChangesAsync();

        var service = new TeacherService(context, GetMailService());

        var dto = new CreateTeacherDto
        {
            Username = "teacher1",
            Password = "123"
        };

        var ex = await Assert.ThrowsAsync<Exception>(
            () => service.CreateTeacherAsync(dto));

        Assert.Equal("Username already exists", ex.Message);
    }

    // ================================
    // 4. Email duplicate
    // ================================
    [Fact]
    public async Task CreateTeacher_ShouldThrow_WhenEmailExists()
    {
        var context = GetDbContext();

        // ✅ PHẢI có role
        context.Roles.Add(new Role { RoleName = "Teacher" });

        context.Users.Add(new User { Email = "test@mail.com" });
        await context.SaveChangesAsync();

        var service = new TeacherService(context, GetMailService());

        var dto = new CreateTeacherDto
        {
            Username = "teacher2",
            Password = "123",
            Email = "test@mail.com"
        };

        var ex = await Assert.ThrowsAsync<Exception>(
            () => service.CreateTeacherAsync(dto));

        Assert.Equal("Email already exists", ex.Message);
    }

    // ================================
    // 5. Role not found
    // ================================
    [Fact]
    public async Task CreateTeacher_ShouldThrow_WhenRoleNotFound()
    {
        var context = GetDbContext();
        var service = new TeacherService(context, GetMailService());

        var dto = new CreateTeacherDto
        {
            Username = "teacher1",
            Password = "123"
        };

        var ex = await Assert.ThrowsAsync<Exception>(
            () => service.CreateTeacherAsync(dto));

        Assert.Equal("Teacher role not found", ex.Message);
    }

    // ================================
    // 6. Success full flow
    // ================================
    [Fact]
    public async Task CreateTeacher_ShouldCreateUserAndTeacher_WhenValid()
    {
        var context = GetDbContext();

        context.Roles.Add(new Role { RoleName = "Teacher" });
        await context.SaveChangesAsync();

        var service = new TeacherService(context, GetMailService());

        var dto = new CreateTeacherDto
        {
            Username = "teacher1",
            Password = "123",
            Email = "teacher@mail.com",
            FullName = "Teacher A"
        };

        var result = await service.CreateTeacherAsync(dto);

        Assert.Equal("teacher1", result.Username);
        Assert.Equal("Active", result.AccountStatus);
        Assert.Equal(1, context.Users.Count());
        Assert.Equal(1, context.Teachers.Count());
    }
}