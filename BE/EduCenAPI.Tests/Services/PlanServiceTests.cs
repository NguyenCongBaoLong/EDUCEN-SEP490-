using Xunit;
using Microsoft.EntityFrameworkCore;
using EducenAPI.Services;
using EducenAPI.Models;
using EducenAPI.DTOs.Plans;
using System;
using System.Threading.Tasks;
using EducenAPI.Persistence.Contexts;
using EduCenAPI.Tests.Fakes;
using System.Linq;

public class PlanService_CreatePlan_Tests
{
    private AdminDbContext GetDbContext()
    {
        var options = new DbContextOptionsBuilder<AdminDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;

        return new AdminDbContext(options);
    }

    // ================================
    // 1. PlanName null / empty / whitespace
    // ================================
    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("   ")]
    public async Task CreatePlan_ShouldThrow_WhenNameIsEmpty(string name)
    {
        var context = GetDbContext();
        var service = new PlanService(context);

        var request = new CreatePlanRequest
        {
            PlanName = name
        };

        var ex = await Assert.ThrowsAsync<Exception>(
            () => service.CreatePlanAsync(request));

        Assert.Equal("Plan name cannot be empty.", ex.Message);
    }

    // ================================
    // 2. Create success (full data)
    // ================================
    [Fact]
    public async Task CreatePlan_ShouldCreate_WhenValid()
    {
        var context = GetDbContext();
        var service = new PlanService(context);

        var request = new CreatePlanRequest
        {
            PlanName = "Basic Plan",
            Price = 100,
            LimitUsers = 10,
            Features = "Feature A",
            StorageLimit = 50
        };

        var result = await service.CreatePlanAsync(request);

        Assert.NotNull(result);
        Assert.Equal("Basic Plan", result.PlanName);
        Assert.Equal(100, result.Price);
        Assert.Equal(10, result.LimitUsers);
        Assert.Equal("Feature A", result.Features);
        Assert.Equal(50, result.StorageLimit);
        Assert.True(result.IsActive);
        Assert.False(string.IsNullOrEmpty(result.PlanId));
        Assert.Equal(1, context.Plans.Count());
    }

    // ================================
    // 3. Trim PlanName
    // ================================
    [Fact]
    public async Task CreatePlan_ShouldTrimName()
    {
        var context = GetDbContext();
        var service = new PlanService(context);

        var request = new CreatePlanRequest
        {
            PlanName = "  Basic Plan  "
        };

        var result = await service.CreatePlanAsync(request);

        Assert.Equal("Basic Plan", result.PlanName);
    }

    // ================================
    // 4. Trim Features
    // ================================
    [Fact]
    public async Task CreatePlan_ShouldTrimFeatures()
    {
        var context = GetDbContext();
        var service = new PlanService(context);

        var request = new CreatePlanRequest
        {
            PlanName = "Pro Plan",
            Features = "  Feature A, Feature B  "
        };

        var result = await service.CreatePlanAsync(request);

        Assert.Equal("Feature A, Feature B", result.Features);
    }

    // ================================
    // 5. Features null
    // ================================
    [Fact]
    public async Task CreatePlan_ShouldAllow_NullFeatures()
    {
        var context = GetDbContext();
        var service = new PlanService(context);

        var request = new CreatePlanRequest
        {
            PlanName = "Free Plan",
            Features = null
        };

        var result = await service.CreatePlanAsync(request);

        Assert.Null(result.Features);
    }

    // ================================
    // 6. Default values check
    // ================================
    [Fact]
    public async Task CreatePlan_ShouldSet_DefaultValues()
    {
        var context = GetDbContext();
        var service = new PlanService(context);

        var request = new CreatePlanRequest
        {
            PlanName = "Starter"
        };

        var result = await service.CreatePlanAsync(request);

        Assert.True(result.IsActive);
        Assert.False(string.IsNullOrEmpty(result.PlanId));
    }
}