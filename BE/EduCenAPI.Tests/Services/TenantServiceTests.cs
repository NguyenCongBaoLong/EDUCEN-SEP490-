using EduCenAPI.Tests.Fakes;
using EducenAPI.DTOs;
using EducenAPI.Models;
using EducenAPI.Persistence.Contexts;
using EducenAPI.Services.TenantService;
using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

public class TenantServiceTests : IDisposable
{
    private readonly List<string> _tenantDatabaseNames = new();

    private AdminDbContext GetAdminDbContext()
    {
        var options = new DbContextOptionsBuilder<AdminDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;

        return new AdminDbContext(options);
    }

    private IConfiguration GetConfiguration()
    {
        var settings = new Dictionary<string, string?>
        {
            ["ConnectionStrings:DefaultTenantConnection"] =
                "Server=(localdb)\\MSSQLLocalDB;Database=EducenTenantTemplate;Trusted_Connection=True;TrustServerCertificate=True;MultipleActiveResultSets=true"
        };

        return new ConfigurationBuilder()
            .AddInMemoryCollection(settings)
            .Build();
    }

    private IServiceProvider GetServiceProvider(EducenV2Context tenantDbContext)
    {
        var services = new ServiceCollection();
        services.AddScoped(_ => tenantDbContext);
        return services.BuildServiceProvider();
    }

    private EducenV2Context GetTenantDbContext(string databaseName)
    {
        var connectionString =
            $"Server=(localdb)\\MSSQLLocalDB;Database={databaseName};Trusted_Connection=True;TrustServerCertificate=True;MultipleActiveResultSets=true";

        var options = new DbContextOptionsBuilder<EducenV2Context>()
            .UseSqlServer(connectionString)
            .Options;

        var tenantService = new FakeTenantService
        {
            TenantId = "test-tenant",
            ConnectionString = connectionString
        };

        var context = new EducenV2Context(options, tenantService);
        _tenantDatabaseNames.Add(databaseName);
        return context;
    }

    private static CreateTenantRequest CreateValidRequest() =>
        new()
        {
            TenantName = "Alpha Center",
            ContactPerson = "Alice",
            Email = "alpha@example.com",
            PhoneNumber = "0912345678",
            Address = "123 Main Street",
            SubDomain = "alpha-center"
        };

    private static void SeedActivePlan(AdminDbContext context, string planId = "basic", decimal price = 100m, bool isTrial = false, int trialDays = 30)
    {
        context.Plans.Add(new Plan
        {
            PlanId = planId,
            PlanName = $"Plan-{planId}",
            Price = price,
            LimitUsers = 10,
            StorageLimit = 100,
            IsActive = true,
            IsTrial = isTrial,
            TrialDays = trialDays
        });
        context.SaveChanges();
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("   ")]
    public async Task CreateTenant_ShouldThrow_WhenSubDomainIsRequired(string? subDomain)
    {
        using var adminContext = GetAdminDbContext();
        using var tenantContext = GetTenantDbContext($"EducenTenantTest_{Guid.NewGuid():N}");
        var service = new TenantService(adminContext, GetConfiguration(), GetServiceProvider(tenantContext));
        var request = CreateValidRequest();
        request.SubDomain = subDomain!;

        var ex = await Assert.ThrowsAsync<Exception>(() => service.CreateTenant(request));

        Assert.Equal("SubDomain là bắt buộc.", ex.Message);
    }

    [Fact]
    public async Task CreateTenant_ShouldThrow_WhenSubDomainContainsWhitespace()
    {
        using var adminContext = GetAdminDbContext();
        using var tenantContext = GetTenantDbContext($"EducenTenantTest_{Guid.NewGuid():N}");
        var service = new TenantService(adminContext, GetConfiguration(), GetServiceProvider(tenantContext));
        var request = CreateValidRequest();
        request.SubDomain = "alpha center";

        var ex = await Assert.ThrowsAsync<Exception>(() => service.CreateTenant(request));

        Assert.Equal("SubDomain không được chứa khoảng trắng.", ex.Message);
    }

    [Fact]
    public async Task CreateTenant_ShouldThrow_WhenSubDomainContainsInvalidCharacters()
    {
        using var adminContext = GetAdminDbContext();
        using var tenantContext = GetTenantDbContext($"EducenTenantTest_{Guid.NewGuid():N}");
        var service = new TenantService(adminContext, GetConfiguration(), GetServiceProvider(tenantContext));
        var request = CreateValidRequest();
        request.SubDomain = "Alpha@123";

        var ex = await Assert.ThrowsAsync<Exception>(() => service.CreateTenant(request));

        Assert.Equal("SubDomain chỉ được chứa chữ cái thường, số và dấu '-'.", ex.Message);
    }

    [Fact]
    public async Task CreateTenant_ShouldThrow_WhenSubDomainAlreadyExists()
    {
        using var adminContext = GetAdminDbContext();
        adminContext.Tenants.Add(new Tenant
        {
            TenantName = "Existing Center",
            Username = "existing_admin",
            Password = "hashed",
            SubDomain = "alpha-center",
            ConnectionString = "Server=(localdb)\\MSSQLLocalDB;Database=ExistingDb;Trusted_Connection=True;"
        });
        adminContext.SaveChanges();

        using var tenantContext = GetTenantDbContext($"EducenTenantTest_{Guid.NewGuid():N}");
        var service = new TenantService(adminContext, GetConfiguration(), GetServiceProvider(tenantContext));
        var request = CreateValidRequest();

        var ex = await Assert.ThrowsAsync<Exception>(() => service.CreateTenant(request));

        Assert.Equal("SubDomain đã tồn tại.", ex.Message);
    }

    [Fact]
    public async Task CreateTenant_ShouldThrow_WhenEmailIsInvalid()
    {
        using var adminContext = GetAdminDbContext();
        using var tenantContext = GetTenantDbContext($"EducenTenantTest_{Guid.NewGuid():N}");
        var service = new TenantService(adminContext, GetConfiguration(), GetServiceProvider(tenantContext));
        var request = CreateValidRequest();
        request.Email = "abc";

        var ex = await Assert.ThrowsAsync<Exception>(() => service.CreateTenant(request));

        Assert.Equal("Email không đúng định dạng.", ex.Message);
    }

    [Fact]
    public async Task CreateTenant_ShouldThrow_WhenPhoneNumberIsInvalid()
    {
        using var adminContext = GetAdminDbContext();
        using var tenantContext = GetTenantDbContext($"EducenTenantTest_{Guid.NewGuid():N}");
        var service = new TenantService(adminContext, GetConfiguration(), GetServiceProvider(tenantContext));
        var request = CreateValidRequest();
        request.PhoneNumber = "12345";

        var ex = await Assert.ThrowsAsync<Exception>(() => service.CreateTenant(request));

        Assert.Equal("Số điện thoại không đúng định dạng.", ex.Message);
    }

    [Fact]
    public async Task CreateTenant_ShouldThrow_WhenTenantNameAlreadyExists()
    {
        using var adminContext = GetAdminDbContext();
        adminContext.Tenants.Add(new Tenant
        {
            TenantName = "Alpha Center",
            Username = "existing_admin",
            Password = "hashed",
            SubDomain = "existing-center",
            ConnectionString = "Server=(localdb)\\MSSQLLocalDB;Database=ExistingDb;Trusted_Connection=True;"
        });
        adminContext.SaveChanges();

        using var tenantContext = GetTenantDbContext($"EducenTenantTest_{Guid.NewGuid():N}");
        var service = new TenantService(adminContext, GetConfiguration(), GetServiceProvider(tenantContext));
        var request = CreateValidRequest();

        var ex = await Assert.ThrowsAsync<Exception>(() => service.CreateTenant(request));

        Assert.Equal("Tên trung tâm đã tồn tại.", ex.Message);
    }

    [Fact]
    public async Task CreateTenant_ShouldCreateTenant_WhenRequestIsValid()
    {
        using var adminContext = GetAdminDbContext();
        SeedActivePlan(adminContext);

        using var tenantContext = GetTenantDbContext($"EducenTenantTest_{Guid.NewGuid():N}");
        var service = new TenantService(adminContext, GetConfiguration(), GetServiceProvider(tenantContext));
        var request = CreateValidRequest();
        request.TenantName = "  Alpha Center  ";
        request.ContactPerson = "  Alice  ";
        request.Email = "  alpha@example.com  ";
        request.PhoneNumber = " 0912345678 ";
        request.Address = " 123 Main Street ";
        request.SubDomain = "  Alpha-Center  ";

        var result = await service.CreateTenant(request);

        Assert.NotNull(result);
        Assert.Equal("Alpha Center", result.TenantName);
        Assert.Equal("Alice", result.ContactPerson);
        Assert.Equal("alpha@example.com", result.Email);
        Assert.Equal("0912345678", result.PhoneNumber);
        Assert.Equal("123 Main Street", result.Address);
        Assert.Equal("alpha-center", result.SubDomain);
        Assert.Equal("admin_alpha-center", result.Username);
        Assert.True(BCrypt.Net.BCrypt.Verify("default123", result.Password));
        Assert.False(string.IsNullOrWhiteSpace(result.ConnectionString));
        Assert.Single(adminContext.Tenants);
    }

    [Fact]
    public async Task CreateTenant_ShouldCreateSubscriptionAndLedger_ForCheapestActivePlan()
    {
        using var adminContext = GetAdminDbContext();
        SeedActivePlan(adminContext, "pro", 300m);
        SeedActivePlan(adminContext, "basic", 100m);

        using var tenantContext = GetTenantDbContext($"EducenTenantTest_{Guid.NewGuid():N}");
        var service = new TenantService(adminContext, GetConfiguration(), GetServiceProvider(tenantContext));

        var result = await service.CreateTenant(CreateValidRequest());

        var subscription = Assert.Single(adminContext.Subscriptions);
        Assert.Equal(result.TenantId, subscription.TenantId);
        Assert.Equal("basic", subscription.PlanId);
        Assert.Equal("Active", subscription.Status);

        var ledger = Assert.Single(adminContext.TenantCreditLedgers);
        Assert.Equal(result.TenantId, ledger.TenantId);
        Assert.Equal(100m, ledger.Amount);
        Assert.Equal("Credit", ledger.EntryType);
        Assert.Equal("NewTenantSubscription", ledger.ReferenceType);
        Assert.Equal(100m, ledger.BalanceAfter);
    }

    [Fact]
    public async Task CreateTenant_ShouldCreateTenantWithoutSubscription_WhenNoActivePlan()
    {
        using var adminContext = GetAdminDbContext();
        adminContext.Plans.Add(new Plan
        {
            PlanId = "inactive",
            PlanName = "Inactive Plan",
            Price = 50m,
            LimitUsers = 5,
            StorageLimit = 50,
            IsActive = false
        });
        adminContext.SaveChanges();

        using var tenantContext = GetTenantDbContext($"EducenTenantTest_{Guid.NewGuid():N}");
        var service = new TenantService(adminContext, GetConfiguration(), GetServiceProvider(tenantContext));

        var result = await service.CreateTenant(CreateValidRequest());

        Assert.NotNull(result);
        Assert.Single(adminContext.Tenants);
        Assert.Empty(adminContext.Subscriptions);
        Assert.Empty(adminContext.TenantCreditLedgers);
    }

 
   

    public void Dispose()
    {
        foreach (var databaseName in _tenantDatabaseNames.Distinct())
        {
            try
            {
                var masterConnection =
                    "Server=(localdb)\\MSSQLLocalDB;Database=master;Trusted_Connection=True;TrustServerCertificate=True;MultipleActiveResultSets=true";

                using var connection = new SqlConnection(masterConnection);
                connection.Open();

                using var command = connection.CreateCommand();
                command.CommandText = $@"
IF DB_ID('{databaseName}') IS NOT NULL
BEGIN
    ALTER DATABASE [{databaseName}] SET SINGLE_USER WITH ROLLBACK IMMEDIATE;
    DROP DATABASE [{databaseName}];
END";
                command.ExecuteNonQuery();
            }
            catch
            {
                // Best effort cleanup for LocalDB test databases.
            }
        }
    }
}