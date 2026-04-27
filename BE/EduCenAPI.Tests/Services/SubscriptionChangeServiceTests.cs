using EducenAPI.Models;
using EducenAPI.Persistence.Contexts;
using EducenAPI.Services;
using EducenAPI.Services.Interface;
using EducenAPI.Ultils;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging.Abstractions;
using Moq;
using EduCenAPI.Tests.Fakes;

public class SubscriptionChangeService_CreatePackageChangeRequest_Tests
{
    private static AdminDbContext GetDbContext()
    {
        var options = new DbContextOptionsBuilder<AdminDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;

        return new AdminDbContext(options);
    }

    private static SubscriptionChangeService GetService(AdminDbContext context)
    {
        var settings = new Dictionary<string, string?>
        {
            ["EmailSettings:Email"] = "test@example.com",
            ["EmailSettings:Password"] = "testpassword",
            ["EmailSettings:Host"] = "smtp.example.com",
            ["EmailSettings:Port"] = "587",
            ["EmailSettings:DisplayName"] = "Test System"
        };
        var config = new ConfigurationBuilder()
            .AddInMemoryCollection(settings)
            .Build();
        var mockCurrentTenantService = new Mock<ICurrentTenantService>().Object;
        var mockMailService = new Mock<MailService>(config, mockCurrentTenantService).Object;
        var mockEInvoiceService = new Mock<IEInvoiceSandboxService>().Object;
        return new SubscriptionChangeService(
            context,
            config,
            mockMailService,
            mockEInvoiceService,
            NullLogger<SubscriptionChangeService>.Instance);
    }

    private static Tenant CreateTenant(string tenantId, string tenantName = "Test Center")
    {
        return new Tenant
        {
            TenantId = tenantId,
            TenantName = tenantName,
            Username = "testuser",
            Password = "password",
            SubDomain = $"test-{tenantId}",
            ConnectionString = "fake-connection",
            IsActive = true
        };
    }

    private static Plan CreatePlan(string planId, string planName, decimal price, bool isActive = true)
    {
        return new Plan
        {
            PlanId = planId,
            PlanName = planName,
            Price = price,
            IsActive = isActive,
            LimitUsers = 10,
            StorageLimit = 100
        };
    }

    private static Subscription CreateSubscription(string tenantId, string planId, string? id = null, DateTime? startDate = null, DateTime? endDate = null, string status = "Active")
    {
        return new Subscription
        {
            Id = id ?? Guid.NewGuid().ToString(),
            TenantId = tenantId,
            PlanId = planId,
            StartDate = startDate ?? DateTime.UtcNow.AddDays(-30),
            EndDate = endDate ?? DateTime.UtcNow.AddDays(30),
            Status = status
        };
    }

    private static PackageChangeRequest CreatePackageChangeRequest(string tenantId, string currentPlanId, string requestedPlanId, string status = "Pending")
    {
        return new PackageChangeRequest
        {
            RequestId = Guid.NewGuid().ToString(),
            TenantId = tenantId,
            CurrentPlanId = currentPlanId,
            RequestedPlanId = requestedPlanId,
            Status = status,
            RequestedMonths = 6,
            RequestedAt = DateTime.UtcNow,
            RequestedBy = "test-user"
        };
    }

    private static Invoice CreateInvoice(string tenantId, string requestId, string status = "Pending")
    {
        return new Invoice
        {
            InvoiceId = Guid.NewGuid().ToString(),
            TenantId = tenantId,
            PackageChangeRequestId = requestId,
            InvoiceNumber = $"INV-{Guid.NewGuid().ToString()[..8]}",
            Amount = 1000,
            Status = status,
            CreatedAt = DateTime.UtcNow,
            DueDate = DateTime.UtcNow.AddDays(7)
        };
    }

    // ================================
    // 1. Months validation (1-120)
    // ================================
    [Theory]
    [InlineData(0)]
    [InlineData(-1)]
    [InlineData(121)]
    [InlineData(999)]
    public async Task CreatePackageChangeRequest_ShouldThrow_WhenMonthsInvalid(int months)
    {
        var context = GetDbContext();
        var service = GetService(context);

        var ex = await Assert.ThrowsAsync<Exception>(() =>
            service.CreatePackageChangeRequestAsync("tenant-1", "plan-pro", months, null, "test-user"));

        Assert.Equal("Số tháng đăng ký phải từ 1 đến 120.", ex.Message);
    }

    [Theory]
    [InlineData(1)]
    [InlineData(12)]
    [InlineData(120)]
    public async Task CreatePackageChangeRequest_ShouldNotThrow_WhenMonthsValid(int months)
    {
        var context = GetDbContext();
        context.Tenants.Add(CreateTenant("tenant-1"));
        context.Plans.Add(CreatePlan("plan-pro", "Pro Plan", 200));
        await context.SaveChangesAsync();

        var service = GetService(context);
        var result = await service.CreatePackageChangeRequestAsync("tenant-1", "plan-pro", months, null, "test-user");

        Assert.NotNull(result);
        Assert.Equal(months, result.RequestedMonths);
    }

    // ================================
    // 2. Tenant not found
    // ================================
    [Fact]
    public async Task CreatePackageChangeRequest_ShouldThrow_WhenTenantNotFound()
    {
        var context = GetDbContext();
        context.Plans.Add(CreatePlan("plan-pro", "Pro Plan", 200));
        await context.SaveChangesAsync();

        var service = GetService(context);

        var ex = await Assert.ThrowsAsync<Exception>(() =>
            service.CreatePackageChangeRequestAsync("non-existent-tenant", "plan-pro", 6, null, "test-user"));

        Assert.Equal("Không tìm thấy trung tâm.", ex.Message);
    }

    // ================================
    // 3. Plan not found or inactive
    // ================================
    [Fact]
    public async Task CreatePackageChangeRequest_ShouldThrow_WhenPlanNotFound()
    {
        var context = GetDbContext();
        context.Tenants.Add(CreateTenant("tenant-1"));
        await context.SaveChangesAsync();

        var service = GetService(context);

        var ex = await Assert.ThrowsAsync<Exception>(() =>
            service.CreatePackageChangeRequestAsync("tenant-1", "non-existent-plan", 6, null, "test-user"));

        Assert.Equal("Gói dịch vụ không hợp lệ.", ex.Message);
    }

    [Fact]
    public async Task CreatePackageChangeRequest_ShouldThrow_WhenPlanInactive()
    {
        var context = GetDbContext();
        context.Tenants.Add(CreateTenant("tenant-1"));
        context.Plans.Add(CreatePlan("plan-inactive", "Inactive Plan", 200, isActive: false));
        await context.SaveChangesAsync();

        var service = GetService(context);

        var ex = await Assert.ThrowsAsync<Exception>(() =>
            service.CreatePackageChangeRequestAsync("tenant-1", "plan-inactive", 6, null, "test-user"));

        Assert.Equal("Gói dịch vụ không hợp lệ.", ex.Message);
    }

    // ================================
    // 4. Downgrade validation (only within 7 days)
    // ================================
    [Fact]
    public async Task CreatePackageChangeRequest_ShouldThrow_WhenDowngradeAfterGracePeriod()
    {
        var context = GetDbContext();
        context.Tenants.Add(CreateTenant("tenant-1"));
        context.Plans.Add(CreatePlan("plan-basic", "Basic Plan", 100));
        context.Plans.Add(CreatePlan("plan-pro", "Pro Plan", 200));
        // Subscription started 10 days ago (beyond 7-day grace period)
        context.Subscriptions.Add(CreateSubscription("tenant-1", "plan-pro", startDate: DateTime.UtcNow.AddDays(-10)));
        await context.SaveChangesAsync();

        var service = GetService(context);

        var ex = await Assert.ThrowsAsync<Exception>(() =>
            service.CreatePackageChangeRequestAsync("tenant-1", "plan-basic", 6, null, "test-user"));

        Assert.Equal("Chỉ được hạ gói trong 7 ngày đầu tiên của gói hiện tại.", ex.Message);
    }

    [Fact]
    public async Task CreatePackageChangeRequest_ShouldAllow_DowngradeWithinGracePeriod()
    {
        var context = GetDbContext();
        context.Tenants.Add(CreateTenant("tenant-1"));
        context.Plans.Add(CreatePlan("plan-basic", "Basic Plan", 100));
        context.Plans.Add(CreatePlan("plan-pro", "Pro Plan", 200));
        // Subscription started 3 days ago (within 7-day grace period)
        context.Subscriptions.Add(CreateSubscription("tenant-1", "plan-pro", startDate: DateTime.UtcNow.AddDays(-3)));
        await context.SaveChangesAsync();

        var service = GetService(context);
        var result = await service.CreatePackageChangeRequestAsync("tenant-1", "plan-basic", 6, "Downgrade reason", "test-user");

        Assert.NotNull(result);
        Assert.Equal("plan-pro", result.CurrentPlanId);
        Assert.Equal("plan-basic", result.RequestedPlanId);
    }

    [Fact]
    public async Task CreatePackageChangeRequest_ShouldAllow_UpgradeAnytime()
    {
        var context = GetDbContext();
        context.Tenants.Add(CreateTenant("tenant-1"));
        context.Plans.Add(CreatePlan("plan-basic", "Basic Plan", 100));
        context.Plans.Add(CreatePlan("plan-pro", "Pro Plan", 200));
        // Subscription started 30 days ago (well beyond grace period)
        context.Subscriptions.Add(CreateSubscription("tenant-1", "plan-basic", startDate: DateTime.UtcNow.AddDays(-30)));
        await context.SaveChangesAsync();

        var service = GetService(context);
        var result = await service.CreatePackageChangeRequestAsync("tenant-1", "plan-pro", 6, "Upgrade reason", "test-user");

        Assert.NotNull(result);
        Assert.Equal("plan-basic", result.CurrentPlanId);
        Assert.Equal("plan-pro", result.RequestedPlanId);
    }

    // ================================
    // 5. No active subscription (fallback to requested plan)
    // ================================
    [Fact]
    public async Task CreatePackageChangeRequest_ShouldUseRequestedPlan_WhenNoActiveSubscription()
    {
        var context = GetDbContext();
        context.Tenants.Add(CreateTenant("tenant-1"));
        context.Plans.Add(CreatePlan("plan-pro", "Pro Plan", 200));
        // No subscription added
        await context.SaveChangesAsync();

        var service = GetService(context);
        var result = await service.CreatePackageChangeRequestAsync("tenant-1", "plan-pro", 6, null, "test-user");

        Assert.NotNull(result);
        // When no active subscription, CurrentPlanId should fallback to RequestedPlanId
        Assert.Equal("plan-pro", result.CurrentPlanId);
        Assert.Equal("plan-pro", result.RequestedPlanId);
    }

    [Fact]
    public async Task CreatePackageChangeRequest_ShouldUseRequestedPlan_WhenCurrentPlanNotExists()
    {
        var context = GetDbContext();
        context.Tenants.Add(CreateTenant("tenant-1"));
        context.Plans.Add(CreatePlan("plan-pro", "Pro Plan", 200));
        // Subscription references a plan that doesn't exist in Plans table
        context.Subscriptions.Add(CreateSubscription("tenant-1", "plan-deleted", startDate: DateTime.UtcNow.AddDays(-30)));
        await context.SaveChangesAsync();

        var service = GetService(context);
        var result = await service.CreatePackageChangeRequestAsync("tenant-1", "plan-pro", 6, null, "test-user");

        Assert.NotNull(result);
        // CurrentPlanId should fallback to RequestedPlanId when current plan not found
        Assert.Equal("plan-pro", result.CurrentPlanId);
    }

    // ================================
    // 6. Check existing open request
    // ================================
    [Theory]
    [InlineData("Pending")]
    [InlineData("Approved")]
    public async Task CreatePackageChangeRequest_ShouldThrow_WhenHasOpenRequest(string existingStatus)
    {
        var context = GetDbContext();
        context.Tenants.Add(CreateTenant("tenant-1"));
        context.Plans.Add(CreatePlan("plan-basic", "Basic Plan", 100));
        context.Plans.Add(CreatePlan("plan-pro", "Pro Plan", 200));
        context.Subscriptions.Add(CreateSubscription("tenant-1", "plan-basic"));
        context.PackageChangeRequests.Add(CreatePackageChangeRequest("tenant-1", "plan-basic", "plan-pro", existingStatus));
        await context.SaveChangesAsync();

        var service = GetService(context);

        var ex = await Assert.ThrowsAsync<Exception>(() =>
            service.CreatePackageChangeRequestAsync("tenant-1", "plan-pro", 6, null, "test-user"));

        Assert.Equal("Đã có yêu cầu đổi/gói gia hạn chưa xử lý xong.", ex.Message);
    }

    [Fact]
    public async Task CreatePackageChangeRequest_ShouldAllow_WhenPreviousRequestRejected()
    {
        var context = GetDbContext();
        context.Tenants.Add(CreateTenant("tenant-1"));
        context.Plans.Add(CreatePlan("plan-basic", "Basic Plan", 100));
        context.Plans.Add(CreatePlan("plan-pro", "Pro Plan", 200));
        context.Subscriptions.Add(CreateSubscription("tenant-1", "plan-basic"));
        context.PackageChangeRequests.Add(CreatePackageChangeRequest("tenant-1", "plan-basic", "plan-pro", "Rejected"));
        await context.SaveChangesAsync();

        var service = GetService(context);
        var result = await service.CreatePackageChangeRequestAsync("tenant-1", "plan-pro", 6, null, "test-user");

        Assert.NotNull(result);
    }

    // ================================
    // 7. Check unresolved invoice
    // ================================
    [Theory]
    [InlineData("Pending")]
    [InlineData("AwaitingConfirmation")]
    public async Task CreatePackageChangeRequest_ShouldThrow_WhenHasUnresolvedInvoice(string invoiceStatus)
    {
        var context = GetDbContext();
        var tenant = CreateTenant("tenant-1");
        context.Tenants.Add(tenant);
        context.Plans.Add(CreatePlan("plan-basic", "Basic Plan", 100));
        context.Plans.Add(CreatePlan("plan-pro", "Pro Plan", 200));
        context.Subscriptions.Add(CreateSubscription("tenant-1", "plan-basic"));

        // Create a Rejected request (not Pending/Approved) so open request check passes
        var existingRequest = CreatePackageChangeRequest("tenant-1", "plan-basic", "plan-pro", "Rejected");
        context.PackageChangeRequests.Add(existingRequest);
        context.Invoices.Add(CreateInvoice("tenant-1", existingRequest.RequestId, invoiceStatus));
        await context.SaveChangesAsync();

        var service = GetService(context);

        var ex = await Assert.ThrowsAsync<Exception>(() =>
            service.CreatePackageChangeRequestAsync("tenant-1", "plan-pro", 6, null, "test-user"));

        Assert.Equal("Đã có hóa đơn đổi/gói gia hạn chưa thanh toán.", ex.Message);
    }

    [Fact]
    public async Task CreatePackageChangeRequest_ShouldAllow_WhenInvoicePaid()
    {
        var context = GetDbContext();
        var tenant = CreateTenant("tenant-1");
        context.Tenants.Add(tenant);
        context.Plans.Add(CreatePlan("plan-basic", "Basic Plan", 100));
        context.Plans.Add(CreatePlan("plan-pro", "Pro Plan", 200));
        context.Subscriptions.Add(CreateSubscription("tenant-1", "plan-basic"));

        // Create a Rejected request (not Pending/Approved) so open request check passes
        var existingRequest = CreatePackageChangeRequest("tenant-1", "plan-basic", "plan-pro", "Rejected");
        context.PackageChangeRequests.Add(existingRequest);
        context.Invoices.Add(CreateInvoice("tenant-1", existingRequest.RequestId, "Paid"));
        await context.SaveChangesAsync();

        var service = GetService(context);
        var result = await service.CreatePackageChangeRequestAsync("tenant-1", "plan-pro", 6, null, "test-user");

        Assert.NotNull(result);
    }

    // ================================
    // 8. Successful creation
    // ================================
    [Fact]
    public async Task CreatePackageChangeRequest_ShouldCreateSuccessfully()
    {
        var context = GetDbContext();
        context.Tenants.Add(CreateTenant("tenant-1", "Test Center"));
        context.Plans.Add(CreatePlan("plan-basic", "Basic Plan", 100));
        context.Plans.Add(CreatePlan("plan-pro", "Pro Plan", 200));
        context.Subscriptions.Add(CreateSubscription("tenant-1", "plan-basic"));
        await context.SaveChangesAsync();

        var service = GetService(context);
        var result = await service.CreatePackageChangeRequestAsync("tenant-1", "plan-pro", 6, "Need more features", "admin-user");

        Assert.NotNull(result);
        Assert.Equal("tenant-1", result.TenantId);
        Assert.Equal("plan-basic", result.CurrentPlanId);
        Assert.Equal("plan-pro", result.RequestedPlanId);
        Assert.Equal(6, result.RequestedMonths);
        Assert.Equal("Need more features", result.Reason);
        Assert.Equal("admin-user", result.RequestedBy);
        Assert.Equal("Pending", result.Status);
        Assert.NotNull(result.RequestId);
        Assert.NotEqual(default, result.RequestedAt);
    }

    [Fact]
    public async Task CreatePackageChangeRequest_ShouldTrimReason()
    {
        var context = GetDbContext();
        context.Tenants.Add(CreateTenant("tenant-1"));
        context.Plans.Add(CreatePlan("plan-pro", "Pro Plan", 200));
        await context.SaveChangesAsync();

        var service = GetService(context);
        var result = await service.CreatePackageChangeRequestAsync("tenant-1", "plan-pro", 6, "  Reason with spaces  ", "test-user");

        Assert.Equal("Reason with spaces", result.Reason);
    }

    [Fact]
    public async Task CreatePackageChangeRequest_ShouldSaveToDatabase()
    {
        var context = GetDbContext();
        context.Tenants.Add(CreateTenant("tenant-1"));
        context.Plans.Add(CreatePlan("plan-pro", "Pro Plan", 200));
        await context.SaveChangesAsync();

        var service = GetService(context);
        var result = await service.CreatePackageChangeRequestAsync("tenant-1", "plan-pro", 12, null, "test-user");

        var savedRequest = await context.PackageChangeRequests.FindAsync(result.RequestId);
        Assert.NotNull(savedRequest);
        Assert.Equal(12, savedRequest.RequestedMonths);
        Assert.Equal("Pending", savedRequest.Status);
    }

    // ================================
    // 9. Extend same plan (CurrentPlanId == RequestedPlanId)
    // ================================
    [Fact]
    public async Task CreatePackageChangeRequest_ShouldAllow_ExtendSamePlan()
    {
        var context = GetDbContext();
        context.Tenants.Add(CreateTenant("tenant-1"));
        context.Plans.Add(CreatePlan("plan-pro", "Pro Plan", 200));
        context.Subscriptions.Add(CreateSubscription("tenant-1", "plan-pro"));
        await context.SaveChangesAsync();

        var service = GetService(context);
        var result = await service.CreatePackageChangeRequestAsync("tenant-1", "plan-pro", 12, "Extend subscription", "test-user");

        Assert.NotNull(result);
        Assert.Equal("plan-pro", result.CurrentPlanId);
        Assert.Equal("plan-pro", result.RequestedPlanId);
        Assert.Equal(12, result.RequestedMonths);
    }
}
