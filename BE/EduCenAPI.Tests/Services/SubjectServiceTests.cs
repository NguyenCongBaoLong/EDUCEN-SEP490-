using Xunit;
using Microsoft.EntityFrameworkCore;
using EducenAPI.Services;
using EducenAPI.Models;
using EducenAPI.DTOs.Subjects;
using System;
using System.Threading.Tasks;
using EducenAPI.Persistence.Contexts;
using EduCenAPI.Tests.Fakes;
using System.Linq;

public class SubjectService_CreateSubject_Tests
{
    private EducenV2Context GetDbContext()
    {
        var options = new DbContextOptionsBuilder<EducenV2Context>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;

        var tenantService = new FakeTenantService();

        return new EducenV2Context(options, tenantService);
    }

    // ================================
    // 1. SubjectName null/empty/whitespace
    // ================================
    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("   ")]
    public async Task CreateSubject_ShouldThrow_WhenNameIsEmpty(string name)
    {
        var context = GetDbContext();
        var service = new SubjectService(context);

        var request = new CreateSubjectRequest
        {
            SubjectName = name
        };

        var ex = await Assert.ThrowsAsync<Exception>(
            () => service.CreateSubjectAsync(request));

        Assert.Equal("Subject name cannot be empty.", ex.Message);
    }

    // ================================
    // 2. Create success
    // ================================
    [Fact]
    public async Task CreateSubject_ShouldCreate_WhenValid()
    {
        var context = GetDbContext();
        var service = new SubjectService(context);

        var request = new CreateSubjectRequest
        {
            SubjectName = "Math",
            Description = "Basic math"
        };

        var result = await service.CreateSubjectAsync(request);

        Assert.NotNull(result);
        Assert.Equal("Math", result.SubjectName);
        Assert.Equal("Basic math", result.Description);
        Assert.Equal(1, context.Subjects.Count());
    }

    // ================================
    // 3. Trim SubjectName
    // ================================
    [Fact]
    public async Task CreateSubject_ShouldTrimName()
    {
        var context = GetDbContext();
        var service = new SubjectService(context);

        var request = new CreateSubjectRequest
        {
            SubjectName = "  Math  "
        };

        var result = await service.CreateSubjectAsync(request);

        Assert.Equal("Math", result.SubjectName);
    }

    // ================================
    // 4. Duplicate name (exact match)
    // ================================
    [Fact]
    public async Task CreateSubject_ShouldThrow_WhenDuplicateName()
    {
        var context = GetDbContext();

        context.Subjects.Add(new Subject { SubjectName = "Math" });
        await context.SaveChangesAsync();

        var service = new SubjectService(context);

        var request = new CreateSubjectRequest
        {
            SubjectName = "Math"
        };

        var ex = await Assert.ThrowsAsync<Exception>(
            () => service.CreateSubjectAsync(request));

        Assert.Equal("Subject name already exists.", ex.Message);
    }

    // ================================
    // 5. Trim Description
    // ================================
    [Fact]
    public async Task CreateSubject_ShouldTrimDescription()
    {
        var context = GetDbContext();
        var service = new SubjectService(context);

        var request = new CreateSubjectRequest
        {
            SubjectName = "Physics",
            Description = "  Science subject  "
        };

        var result = await service.CreateSubjectAsync(request);

        Assert.Equal("Science subject", result.Description);
    }
}