using EducenAPI.DTOs;
using EducenAPI.DTOs.Tenant;
using EducenAPI.Models;
using EducenAPI.Persistence.Contexts;
using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;
using System.Threading.Tasks;

namespace EducenAPI.Services.TenantService
{
    public class TenantService : ITenantService
    {

        private readonly AdminDbContext _adminDbContext; // database context
        private readonly IConfiguration _configuration;
        private readonly IServiceProvider _serviceProvider;

        public TenantService(AdminDbContext adminDbContext, IConfiguration configuration, IServiceProvider serviceProvider)
        {
            _adminDbContext = adminDbContext;
            _configuration = configuration;
            _serviceProvider = serviceProvider;
        }

        public async Task<Tenant> CreateTenant(CreateTenantRequest request)
        {
            request.TenantName = request.TenantName?.Trim();
            request.ContactPerson = request.ContactPerson?.Trim();
            request.Email = request.Email?.Trim();
            request.PhoneNumber = request.PhoneNumber?.Trim();
            request.Address = request.Address?.Trim();
            request.SubDomain = request.SubDomain?.Trim().ToLower();

            if (string.IsNullOrWhiteSpace(request.SubDomain))
                throw new Exception("SubDomain là bắt buộc.");

            // 1. Check SubDomain chứa space
            if (request.SubDomain.Contains(" "))
                throw new Exception("SubDomain không được chứa khoảng trắng.");

            // 2. Check ký tự hợp lệ
            var regex = new System.Text.RegularExpressions.Regex("^[a-z0-9-]+$");
            if (!regex.IsMatch(request.SubDomain))
                throw new Exception("SubDomain chỉ được chứa chữ cái thường, số và dấu '-'.");

            // 3. Check duplicate SubDomain
            if (_adminDbContext.Tenants.Any(t => t.SubDomain == request.SubDomain))
                throw new Exception("SubDomain đã tồn tại.");

            // 4. Check duplicate TenantName
            if (_adminDbContext.Tenants.Any(t => t.TenantName == request.TenantName))
                throw new Exception("Tên trung tâm đã tồn tại.");

            // create tenant (TenantId auto GUID)
            Tenant tenant = new Tenant
            {
                TenantName = request.TenantName,
                Username = !string.IsNullOrWhiteSpace(request.AdminUsername) ? request.AdminUsername.Trim() : $"admin_{request.SubDomain}",
                Password = !string.IsNullOrWhiteSpace(request.AdminPassword) ? BCrypt.Net.BCrypt.HashPassword(request.AdminPassword) : BCrypt.Net.BCrypt.HashPassword("default123"),
                ContactPerson = request.ContactPerson,
                Email = request.Email,
                PhoneNumber = request.PhoneNumber,
                Address = request.Address,
                SubDomain = request.SubDomain,
                IsActive = true
            };

            string connectionString = _configuration.GetConnectionString("DefaultTenantConnection");

            SqlConnectionStringBuilder builder = new(connectionString);

            string mainDatabaseName = builder.InitialCatalog;

            string tenantDbName = $"{mainDatabaseName}-{tenant.TenantId}";

            builder.InitialCatalog = tenantDbName;

            string modifiedConnectionString = builder.ConnectionString;

            tenant.ConnectionString = modifiedConnectionString;

            try
            {
                using IServiceScope scopeTenant = _serviceProvider.CreateScope();

                EducenV2Context dbContext = scopeTenant.ServiceProvider.GetRequiredService<EducenV2Context>();

                dbContext.Database.SetConnectionString(modifiedConnectionString);

                bool canConnect = await dbContext.Database.CanConnectAsync();
                bool isNewDatabase = false;

                if (!canConnect)
                {
                    Console.ForegroundColor = ConsoleColor.Yellow;
                    Console.WriteLine($"Creating database for tenant '{tenant.TenantId}'.");
                    Console.ResetColor();

                    await dbContext.Database.EnsureCreatedAsync();
                    isNewDatabase = true;
                }

                if (!isNewDatabase && dbContext.Database.GetPendingMigrations().Any())
                {
                    Console.ForegroundColor = ConsoleColor.Cyan;
                    Console.WriteLine($"Database for tenant '{tenant.TenantId}' already exists.");
                    Console.ResetColor();

                    // Check if tables exist (from previous EnsureCreated)
                    try
                    {
                        var tableCount = await dbContext.Database
                            .SqlQueryRaw<int>("SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES")
                            .FirstOrDefaultAsync();

                        if (tableCount > 0)
                        {
                            Console.ForegroundColor = ConsoleColor.Green;
                            Console.WriteLine($"Tables already exist in tenant database, skipping migration.");
                            Console.ResetColor();
                        }
                        else
                        {
                            // Tables don't exist, run EnsureCreated
                            Console.ForegroundColor = ConsoleColor.Yellow;
                            Console.WriteLine($"Creating tables for tenant '{tenant.TenantId}'.");
                            Console.ResetColor();
                            await dbContext.Database.EnsureCreatedAsync();
                        }
                    }
                    catch
                    {
                        // If can't check, try EnsureCreated
                        await dbContext.Database.EnsureCreatedAsync();
                    }
                }

                // Tạo admin cho tenant nếu có nhập Username và Password
                if (!string.IsNullOrWhiteSpace(request.AdminUsername) && !string.IsNullOrWhiteSpace(request.AdminPassword))
                {
                    var username = request.AdminUsername.Trim();

                    // Check username trùng trong DB của tenant
                    var usernameExists = await dbContext.Users.AnyAsync(u => u.Username == username);
                    if (usernameExists)
                        throw new Exception($"Username '{username}' đã tồn tại trong tenant này.");

                    var adminUser = new Models.User
                    {
                        Username = username,
                        PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.AdminPassword),
                        FullName = request.TenantName,
                        Email = request.Email,
                        RoleId = 1, // Admin
                        AccountStatus = "Active",
                        CreatedAt = DateTime.UtcNow
                    };

                    dbContext.Users.Add(adminUser);
                    await dbContext.SaveChangesAsync();
                }

                _adminDbContext.Add(tenant);
                _adminDbContext.SaveChanges();

                // Tự động gán gói dịch vụ cho tenant mới (ưu tiên gói rẻ nhất, bao gồm cả Trial)
                var allPlans = _adminDbContext.Plans.Where(p => p.IsActive).ToList();
                var cheapestPlan = allPlans.OrderBy(p => p.Price).FirstOrDefault();

                Console.WriteLine($"[CreateTenant] TenantId: {tenant.TenantId}, Plans found: {allPlans.Count}, Cheapest: {cheapestPlan?.PlanName}");

                if (cheapestPlan != null)
                {
                    var startDate = DateTime.UtcNow;
                    var months = cheapestPlan.IsTrial ? (cheapestPlan.TrialDays / 30) : 1;
                    Console.WriteLine($"[CreateTenant] Creating subscription - PlanId: {cheapestPlan.PlanId}, Start: {startDate}, End: {(cheapestPlan.IsTrial ? startDate.AddDays(cheapestPlan.TrialDays) : startDate.AddMonths(months))}");
                    
                    var subscription = new Subscription
                    {
                        TenantId = tenant.TenantId,
                        PlanId = cheapestPlan.PlanId,
                        StartDate = startDate,
                        EndDate = cheapestPlan.IsTrial ? startDate.AddDays(cheapestPlan.TrialDays) : startDate.AddMonths(months),
                        Status = "Active"
                    };
                    _adminDbContext.Subscriptions.Add(subscription);

                    // Tạo credit ledger cho gói đăng ký
                    var creditLedger = new TenantCreditLedger
                    {
                        TenantId = tenant.TenantId,
                        Amount = cheapestPlan.Price,
                        EntryType = "Credit",
                        ReferenceType = "NewTenantSubscription",
                        ReferenceId = subscription.Id,
                        BalanceAfter = cheapestPlan.Price,
                        Note = $"Đăng ký gói {cheapestPlan.PlanName}"
                    };
                    _adminDbContext.TenantCreditLedgers.Add(creditLedger);

                    _adminDbContext.SaveChanges();
                    
                    Console.WriteLine($"[CreateTenant] Subscription created with Id: {subscription.Id}");
                }
            }
            catch (Exception ex)
            {
                throw new Exception(ex.Message);
            }

            return tenant;
        }

        public IEnumerable<Tenant> GetAllTenants()
        {
            return _adminDbContext.Tenants.ToList();
        }

        public Tenant? GetTenantById(string tenantId)
        {
            return _adminDbContext.Tenants
                .FirstOrDefault(t => t.TenantId == tenantId);
        }

        public async Task<Tenant?> GetTenantByIdAsync(string tenantId)
        {
            return await _adminDbContext.Tenants
                .FirstOrDefaultAsync(t => t.TenantId == tenantId);
        }

        public async Task<List<TenantCreditLedger>> GetCreditLedgerAsync(string tenantId, int page, int pageSize)
        {
            return await _adminDbContext.TenantCreditLedgers
                .Where(l => l.TenantId == tenantId)
                .OrderByDescending(l => l.CreatedAt)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync();
        }

        public async Task<TenantCreditLedger> AdjustTenantCreditAsync(
            string tenantId,
            decimal amount,
            string note,
            string referenceType = "ManualAdjustment",
            string? referenceId = null)
        {
            var tenant = await _adminDbContext.Tenants.FirstOrDefaultAsync(t => t.TenantId == tenantId);
            if (tenant == null)
                throw new Exception("Không tìm thấy trung tâm.");

            var nextBalance = tenant.CreditBalance + amount;
            if (nextBalance < 0)
                throw new Exception("Số dư credit không thể âm.");

            tenant.CreditBalance = nextBalance;
            tenant.UpdatedAt = DateTime.UtcNow;

            var ledger = new TenantCreditLedger
            {
                TenantId = tenantId,
                Amount = amount,
                EntryType = amount >= 0 ? "Credit" : "Debit",
                ReferenceType = string.IsNullOrWhiteSpace(referenceType) ? "ManualAdjustment" : referenceType.Trim(),
                ReferenceId = string.IsNullOrWhiteSpace(referenceId) ? null : referenceId.Trim(),
                BalanceAfter = tenant.CreditBalance,
                Note = string.IsNullOrWhiteSpace(note) ? "Điều chỉnh credit thủ công bởi SystemAdmin" : note.Trim(),
                CreatedAt = DateTime.UtcNow
            };

            _adminDbContext.TenantCreditLedgers.Add(ledger);
            await _adminDbContext.SaveChangesAsync();

            return ledger;
        }

        public async Task<TenantCreditLedger> SetTenantCreditBalanceAsync(
            string tenantId,
            decimal newBalance,
            string note,
            string? referenceId = null)
        {
            if (newBalance < 0)
                throw new Exception("Số dư credit không thể âm.");

            var tenant = await _adminDbContext.Tenants.FirstOrDefaultAsync(t => t.TenantId == tenantId);
            if (tenant == null)
                throw new Exception("Không tìm thấy trung tâm.");

            var delta = newBalance - tenant.CreditBalance;
            tenant.CreditBalance = newBalance;
            tenant.UpdatedAt = DateTime.UtcNow;

            var ledger = new TenantCreditLedger
            {
                TenantId = tenantId,
                Amount = delta,
                EntryType = delta >= 0 ? "Credit" : "Debit",
                ReferenceType = "ManualSetBalance",
                ReferenceId = string.IsNullOrWhiteSpace(referenceId) ? null : referenceId.Trim(),
                BalanceAfter = tenant.CreditBalance,
                Note = string.IsNullOrWhiteSpace(note) ? "Thiết lập số dư credit bởi SystemAdmin" : note.Trim(),
                CreatedAt = DateTime.UtcNow
            };

            _adminDbContext.TenantCreditLedgers.Add(ledger);
            await _adminDbContext.SaveChangesAsync();

            return ledger;
        }

        public Tenant? UpdateTenant(string tenantId, UpdateTenantRequest request)
        {
            var tenant = _adminDbContext.Tenants
                .FirstOrDefault(t => t.TenantId == tenantId);

            if (tenant == null)
                return null;

            // Trim input
            var tenantName = request.TenantName?.Trim();
            var subDomain = request.SubDomain?.Trim().ToLower();

            // Check duplicate SubDomain (trừ chính nó)
            if (!string.IsNullOrWhiteSpace(subDomain) && subDomain != tenant.SubDomain)
            {
                if (_adminDbContext.Tenants.Any(t => t.SubDomain == subDomain && t.TenantId != tenantId))
                    throw new Exception("SubDomain đã tồn tại.");
            }

            // Check duplicate TenantName (trừ chính nó)
            if (!string.IsNullOrWhiteSpace(tenantName) && tenantName != tenant.TenantName)
            {
                if (_adminDbContext.Tenants.Any(t => t.TenantName == tenantName && t.TenantId != tenantId))
                    throw new Exception("Tên trung tâm đã tồn tại.");
            }

            tenant.TenantName = tenantName ?? tenant.TenantName;
            tenant.ContactPerson = request.ContactPerson?.Trim() ?? tenant.ContactPerson;
            tenant.Email = request.Email?.Trim() ?? tenant.Email;
            tenant.PhoneNumber = request.PhoneNumber?.Trim() ?? tenant.PhoneNumber;
            tenant.Address = request.Address?.Trim() ?? tenant.Address;
            tenant.SubDomain = subDomain ?? tenant.SubDomain;
            tenant.IsActive = request.IsActive;

            _adminDbContext.SaveChanges();

            return tenant;
        }

        public IEnumerable<TenantWithSubscriptionRequest> GetAllTenantDetails()
        {
            var tenants = _adminDbContext.Tenants.ToList();

            var result = new List<TenantWithSubscriptionRequest>();

            foreach (var tenant in tenants)
            {
                var subscription = _adminDbContext.Subscriptions
                    .Include(s => s.Plan)
                    .Where(s => s.TenantId == tenant.TenantId && s.Status == "Active")
                    .OrderByDescending(s => s.StartDate)
                    .FirstOrDefault();

                var usage = GetTenantUsage(tenant);

                result.Add(new TenantWithSubscriptionRequest
                {
                    TenantId = tenant.TenantId,
                    TenantName = tenant.TenantName,
                    SubDomain = tenant.SubDomain,
                    IsActive = tenant.IsActive,

                    ContactPerson = tenant.ContactPerson,
                    Email = tenant.Email,
                    PhoneNumber = tenant.PhoneNumber,
                    Address = tenant.Address,

                    PlanId = subscription?.PlanId,
                    PlanName = subscription?.Plan?.PlanName,
                    IsSubscribed = subscription != null && subscription.Status == "Active" && subscription.EndDate > DateTime.UtcNow,
                    ExpiredAt = subscription?.EndDate,
                    PlanIsActive = subscription?.Plan?.IsActive ?? true,

                    LimitUsers = subscription?.Plan?.LimitUsers,
                    StorageLimit = subscription?.Plan?.StorageLimit,

                    TotalUsers = usage.TotalUsers,
                    TotalStudents = usage.TotalStudents,
                    TotalClasses = usage.TotalClasses,
                    StorageMB = usage.StorageMB,
                    CreditBalance = tenant.CreditBalance
                });
            }

            return result;
        }

        public TenantWithSubscriptionRequest? GetTenantDetails(string tenantId)
        {
            var tenant = _adminDbContext.Tenants
                .FirstOrDefault(t => t.TenantId == tenantId);

            if (tenant == null)
                return null;

            var subscription = _adminDbContext.Subscriptions
                .Include(s => s.Plan)
                .Where(s => s.TenantId == tenantId && s.Status == "Active")
                .OrderByDescending(s => s.StartDate)
                .FirstOrDefault();

            var usage = GetTenantUsage(tenant);

            return new TenantWithSubscriptionRequest
            {
                TenantId = tenant.TenantId,
                TenantName = tenant.TenantName,
                SubDomain = tenant.SubDomain,
                IsActive = tenant.IsActive,

                ContactPerson = tenant.ContactPerson,
                Email = tenant.Email,
                PhoneNumber = tenant.PhoneNumber,
                Address = tenant.Address,

                PlanId = subscription?.PlanId,
                PlanName = subscription?.Plan?.PlanName,
                IsSubscribed = subscription != null && subscription.Status == "Active" && subscription.EndDate > DateTime.UtcNow,
                ExpiredAt = subscription?.EndDate,
                PlanIsActive = subscription?.Plan?.IsActive ?? true,

                LimitUsers = subscription?.Plan?.LimitUsers,
                StorageLimit = subscription?.Plan?.StorageLimit,

                TotalUsers = usage.TotalUsers,
                TotalStudents = usage.TotalStudents,
                TotalClasses = usage.TotalClasses,
                StorageMB = usage.StorageMB,
                CreditBalance = tenant.CreditBalance
            };
        }
        private (int TotalUsers, int TotalStudents, int TotalClasses, double StorageMB) GetTenantUsage(Tenant tenant)
        {
            using IServiceScope scope = _serviceProvider.CreateScope();

            var db = scope.ServiceProvider.GetRequiredService<EducenV2Context>();

            // Fix connection string for Docker environment dynamically
            var baseConnStr = _configuration.GetConnectionString("DefaultTenantConnection");
            var baseBuilder = new Microsoft.Data.SqlClient.SqlConnectionStringBuilder(baseConnStr); 
            var tenantBuilder = new Microsoft.Data.SqlClient.SqlConnectionStringBuilder(tenant.ConnectionString);
            
            baseBuilder.InitialCatalog = tenantBuilder.InitialCatalog;
            db.Database.SetConnectionString(baseBuilder.ConnectionString);

            int users = db.Users.Count();
            int students = db.Students.Count();
            int classes = db.Classes.Count();

            double storage = 0; // có thể tính từ file hoặc blob sau

            return (users, students, classes, storage);
        }

        public async Task<object> CreateAdminForTenantAsync(string tenantId, CreateTenantAdminDto dto)
        {
            // 1. Tìm tenant trong AdminDB
            var tenant = _adminDbContext.Tenants.FirstOrDefault(t => t.TenantId == tenantId);
            if (tenant == null)
                throw new Exception($"Không tìm thấy tenant với ID: {tenantId}");

            if (!tenant.IsActive)
                throw new Exception("Trung tâm này đã bị vô hiệu hóa.");

            // 2. Tạo scope mới với connection string của tenant
            using IServiceScope scope = _serviceProvider.CreateScope();
            var dbContext = scope.ServiceProvider.GetRequiredService<EducenV2Context>();

            var baseConnStr = _configuration.GetConnectionString("DefaultTenantConnection");
            var baseBuilder = new Microsoft.Data.SqlClient.SqlConnectionStringBuilder(baseConnStr);
            var tenantBuilder = new Microsoft.Data.SqlClient.SqlConnectionStringBuilder(tenant.ConnectionString);
            baseBuilder.InitialCatalog = tenantBuilder.InitialCatalog;
            dbContext.Database.SetConnectionString(baseBuilder.ConnectionString);

            // 3. Check username đã tồn tại chưa
            var exist = await dbContext.Users.AnyAsync(u => u.Username == dto.Username);
            if (exist)
                throw new Exception($"Username '{dto.Username}' đã tồn tại trong tenant này.");

            // 4. Tạo User Admin (RoleId = 1 = Admin)
            var user = new Models.User
            {
                Username = dto.Username,
                PasswordHash = BCrypt.Net.BCrypt.HashPassword(dto.Password),
                FullName = dto.FullName,
                Email = dto.Email,
                RoleId = 1, // Admin
                AccountStatus = "Active",
                CreatedAt = DateTime.UtcNow
            };

            dbContext.Users.Add(user);
            await dbContext.SaveChangesAsync();

            return new
            {
                userId = user.UserId,
                username = user.Username,
                fullName = user.FullName,
                email = user.Email,
                role = "Admin",
                tenantId = tenantId
            };
        }

        public async Task<List<object>> GetTenantAdminsAsync(string tenantId)
        {
            var tenant = _adminDbContext.Tenants.FirstOrDefault(t => t.TenantId == tenantId);
            if (tenant == null)
                throw new Exception($"Không tìm thấy tenant với ID: {tenantId}");

            using IServiceScope scope = _serviceProvider.CreateScope();
            var dbContext = scope.ServiceProvider.GetRequiredService<EducenV2Context>();

            var baseConnStr = _configuration.GetConnectionString("DefaultTenantConnection");
            var baseBuilder = new Microsoft.Data.SqlClient.SqlConnectionStringBuilder(baseConnStr);
            var tenantBuilder = new Microsoft.Data.SqlClient.SqlConnectionStringBuilder(tenant.ConnectionString);
            baseBuilder.InitialCatalog = tenantBuilder.InitialCatalog;
            dbContext.Database.SetConnectionString(baseBuilder.ConnectionString);

            // RoleId = 1 = Admin
            var admins = await dbContext.Users
                .Include(u => u.Role)
                .Where(u => u.RoleId == 1)
                .Select(u => new
                {
                    userId = u.UserId,
                    username = u.Username,
                    fullName = u.FullName,
                    email = u.Email,
                    accountStatus = u.AccountStatus,
                    createdAt = u.CreatedAt
                })
                .ToListAsync();

            return admins.Cast<object>().ToList();
        }
    }
}
