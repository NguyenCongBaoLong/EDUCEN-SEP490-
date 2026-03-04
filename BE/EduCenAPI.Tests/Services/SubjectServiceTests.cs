using Xunit;
using Microsoft.EntityFrameworkCore;
using EducenAPI.Services;
using EducenAPI.Models;
using EducenAPI.DTOs;
using System;
using System.Linq;
using System.Threading.Tasks;
using EducenAPI.Persistence.Contexts;
using EduCenAPI.Tests.Fakes;

public class SubjectServiceTests
{
    private EducenV2Context GetDbContext()
    {
        var options = new DbContextOptionsBuilder<EducenV2Context>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;

        var tenantService = new FakeTenantService();

        return new EducenV2Context(options, tenantService);
    }

    // ===============================
    // GetAllSubjectsAsync
    // ===============================

    [Fact]
    public async Task GetAllSubjectsAsync_Should_Return_All_Subjects()
    {
        // Arrange
        var context = GetDbContext();
        context.Subjects.Add(new Subject { SubjectName = "Math" });
        context.Subjects.Add(new Subject { SubjectName = "Physics" });
        await context.SaveChangesAsync();

        var service = new SubjectService(context);

        // Act
        var result = await service.GetAllSubjectsAsync();

        // Assert
        Assert.Equal(2, result.Count());
    }

    // ===============================
    // GetSubjectByIdAsync
    // ===============================

    [Fact]
    public async Task GetSubjectByIdAsync_Should_Return_Subject_When_Exists()
    {
        // Arrange
        var context = GetDbContext();

        var subject = new Subject { SubjectName = "Math" };
        context.Subjects.Add(subject);
        await context.SaveChangesAsync();

        var service = new SubjectService(context);

        // Act
        var result = await service.GetSubjectByIdAsync(subject.SubjectId);

        // Assert
        Assert.NotNull(result);
        Assert.Equal("Math", result!.SubjectName);
    }

    [Fact]
    public async Task GetSubjectByIdAsync_Should_Return_Null_When_Not_Found()
    {
        // Arrange
        var context = GetDbContext();
        var service = new SubjectService(context);

        // Act
        var result = await service.GetSubjectByIdAsync(999);

        // Assert
        Assert.Null(result);
    }

    // ===============================
    // CreateSubjectAsync
    // ===============================

    [Fact]
    public async Task CreateSubjectAsync_Should_Create_Subject()
    {
        // Arrange
        var context = GetDbContext();
        var service = new SubjectService(context);

        var request = new CreateSubjectRequest
        {
            SubjectName = "Chemistry",
            Description = "Basic chemistry"
        };

        // Act
        var result = await service.CreateSubjectAsync(request);

        // Assert
        Assert.NotNull(result);
        Assert.Equal("Chemistry", result.SubjectName);
        Assert.Equal(1, context.Subjects.Count());
    }

    // ===============================
    // UpdateSubjectAsync
    // ===============================

    [Fact]
    public async Task UpdateSubjectAsync_Should_Update_Subject_When_Exists()
    {
        // Arrange
        var context = GetDbContext();

        var subject = new Subject
        {
            SubjectName = "Old Name"
        };

        context.Subjects.Add(subject);
        await context.SaveChangesAsync();

        var service = new SubjectService(context);

        var request = new UpdateSubjectRequest
        {
            SubjectName = "New Name",
            Description = "Updated description"
        };

        // Act
        var result = await service.UpdateSubjectAsync(subject.SubjectId, request);

        // Assert
        Assert.True(result);

        var updated = await context.Subjects.FindAsync(subject.SubjectId);
        Assert.Equal("New Name", updated!.SubjectName);
    }

    [Fact]
    public async Task UpdateSubjectAsync_Should_Return_False_When_Subject_Not_Found()
    {
        // Arrange
        var context = GetDbContext();
        var service = new SubjectService(context);

        var request = new UpdateSubjectRequest
        {
            SubjectName = "Test"
        };

        // Act
        var result = await service.UpdateSubjectAsync(999, request);

        // Assert
        Assert.False(result);
    }

    // ===============================
    // DeleteSubjectAsync
    // ===============================

    [Fact]
    public async Task DeleteSubjectAsync_Should_Delete_Subject_When_Exists()
    {
        // Arrange
        var context = GetDbContext();

        var subject = new Subject { SubjectName = "To Delete" };
        context.Subjects.Add(subject);
        await context.SaveChangesAsync();

        var service = new SubjectService(context);

        // Act
        var result = await service.DeleteSubjectAsync(subject.SubjectId);

        // Assert
        Assert.True(result);
        Assert.Empty(context.Subjects);
    }

    [Fact]
    public async Task DeleteSubjectAsync_Should_Return_False_When_Subject_Not_Found()
    {
        // Arrange
        var context = GetDbContext();
        var service = new SubjectService(context);

        // Act
        var result = await service.DeleteSubjectAsync(999);

        // Assert
        Assert.False(result);
    }

    // ===============================
    // IsSubjectUsedInClassesAsync
    // ===============================

    [Fact]
    public async Task IsSubjectUsedInClassesAsync_Should_Return_True_When_Subject_Is_Used()
    {
        // Arrange
        var context = GetDbContext();

        var subject = new Subject { SubjectName = "Math" };
        context.Subjects.Add(subject);
        await context.SaveChangesAsync();

        context.Classes.Add(new Class
        {
            SubjectId = subject.SubjectId,
            TeacherId = 1
        });

        await context.SaveChangesAsync();

        var service = new SubjectService(context);

        // Act
        var result = await service.IsSubjectUsedInClassesAsync(subject.SubjectId);

        // Assert
        Assert.True(result);
    }

    [Fact]
    public async Task IsSubjectUsedInClassesAsync_Should_Return_False_When_Not_Used()
    {
        // Arrange
        var context = GetDbContext();

        var subject = new Subject { SubjectName = "Math" };
        context.Subjects.Add(subject);
        await context.SaveChangesAsync();

        var service = new SubjectService(context);

        // Act
        var result = await service.IsSubjectUsedInClassesAsync(subject.SubjectId);

        // Assert
        Assert.False(result);
    }
}