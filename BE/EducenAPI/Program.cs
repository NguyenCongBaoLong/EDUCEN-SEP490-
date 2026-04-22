using EducenAPI.Middleware;
using EducenAPI.Persistence.Contexts;
using EducenAPI.Services;
using EducenAPI.Services.Interface;
using EducenAPI.Services.TenantService;
using EducenAPI.Services.Payment;
using EducenAPI.Services.BackgroundServices;
using EducenAPI.Filters;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using System.Text;
using EducenAPI.Models;
using Microsoft.OpenApi.Models;
using EducenAPI.Ultils;
using Microsoft.AspNetCore.Http.Features;

var builder = WebApplication.CreateBuilder(args);

// === Services ===
builder.Services.AddControllers(options =>
{
    options.Filters.Add<QuotaCheckAttribute>();
})
    .AddJsonOptions(options =>
    {
        // Xử lý circular reference (Student ↔ User navigation)
        options.JsonSerializerOptions.ReferenceHandler = System.Text.Json.Serialization.ReferenceHandler.IgnoreCycles;
        options.JsonSerializerOptions.DefaultIgnoreCondition = System.Text.Json.Serialization.JsonIgnoreCondition.WhenWritingNull;
    })
    .ConfigureApiBehaviorOptions(options =>
    {
        // Custom validation error response
        options.InvalidModelStateResponseFactory = context =>
        {
            var errors = context.ModelState
                .Where(e => e.Value?.Errors.Count > 0)
                .Select(e => new
                {
                    Field = e.Key,
                    Errors = e.Value?.Errors.Select(err => err.ErrorMessage)
                });

            // Get the first error message for display
            var firstErrorMessage = errors.FirstOrDefault()?.Errors?.FirstOrDefault();

            return new BadRequestObjectResult(new
            {
                statusCode = 400,
                message = firstErrorMessage ?? "Dữ liệu đầu vào không hợp lệ",
                errors = errors
            });
        };
    });
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddRouting();
builder.Services.AddMemoryCache();
builder.Services.AddScoped<MailService>();

// === Swagger ===
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new Microsoft.OpenApi.Models.OpenApiInfo 
    { 
        Title = "EducenAPI", 
        Version = "v1" 
    });
    
    // Add JWT Authentication
    c.AddSecurityDefinition("Bearer", new Microsoft.OpenApi.Models.OpenApiSecurityScheme
    {
        Name = "Authorization",
        Type = Microsoft.OpenApi.Models.SecuritySchemeType.ApiKey,
        Scheme = "Bearer",
        BearerFormat = "JWT",
        In = Microsoft.OpenApi.Models.ParameterLocation.Header,
        Description = "JWT Authorization header using the Bearer scheme. \r\n\r\n Enter 'Bearer' [space] and then your token in the text input below.\r\n\r\nExample: \"Bearer 12345abcdef\""
    });

    // API KEY (System API)
    c.AddSecurityDefinition("ApiKey", new OpenApiSecurityScheme
    {
        Name = "X-API-KEY",
        Type = SecuritySchemeType.ApiKey,
        In = ParameterLocation.Header,
        Description = "Enter system API key"
    });

    c.AddSecurityDefinition("Tenant", new OpenApiSecurityScheme
    {
        Name = "Tenant",
        Type = SecuritySchemeType.ApiKey,
        In = ParameterLocation.Header,
        Description = "Enter Tenant ID or Subdomain"
    });

    c.AddSecurityRequirement(new Microsoft.OpenApi.Models.OpenApiSecurityRequirement
    {
        {
            new Microsoft.OpenApi.Models.OpenApiSecurityScheme
            {
                Reference = new Microsoft.OpenApi.Models.OpenApiReference
                {
                    Type = Microsoft.OpenApi.Models.ReferenceType.SecurityScheme,
                    Id = "Bearer"
                }
            },
            Array.Empty<string>()
        },
        {
            new OpenApiSecurityScheme
            {
                Reference = new OpenApiReference
                {
                    Type = ReferenceType.SecurityScheme,
                    Id = "ApiKey"
                }
            },
            Array.Empty<string>()
        },
        {
            new OpenApiSecurityScheme
            {
                Reference = new OpenApiReference
                {
                    Type = ReferenceType.SecurityScheme,
                    Id = "Tenant"
                }
            },
            new string[] {}
        }
    });
});

// Admin DB (central database)
builder.Services.AddDbContext<AdminDbContext>(options =>
    options.UseSqlServer(
        builder.Configuration.GetConnectionString("AdminConnection")));

// Tenant DB (dynamic per request)
builder.Services.AddDbContext<EducenV2Context>((serviceProvider, options) =>
{
    var currentTenantService = serviceProvider.GetRequiredService<ICurrentTenantService>();
    var connectionString =
        currentTenantService.ConnectionString
        ?? builder.Configuration.GetConnectionString("DefaultTenantConnection");

    options.UseSqlServer(connectionString);
});
builder.Services.Configure<FormOptions>(options =>
{
    options.MultipartBodyLengthLimit = 20 * 1024 * 1024; // 20 MB
});

// === Auth Service ===
builder.Services.AddHttpContextAccessor();
builder.Services.AddScoped<IAuthService, AuthService>();
builder.Services.AddScoped<ICurrentTenantService, CurrentTenantService>();
builder.Services.AddScoped<ITenantService, TenantService>();
builder.Services.AddScoped<ISubjectService, SubjectService>();
builder.Services.AddScoped<IPlanService, PlanService>();
builder.Services.AddScoped<IStudentService, StudentService>();
builder.Services.AddScoped<IStudentImportService, StudentImportService>();
builder.Services.AddScoped<ITeacherService, TeacherService>();
builder.Services.AddScoped<IClassService, ClassService>();
builder.Services.AddScoped<IAssistantService, AssistantService>();
builder.Services.AddScoped<IScheduleService, ScheduleService>();
builder.Services.AddScoped<IUserManagementService, UserManagementService>();
builder.Services.AddScoped<IFileUploadService, UploadFileService>();
builder.Services.AddScoped<ILessonMaterialService, LessonMaterialService>();
builder.Services.AddScoped<IAssignmentService, AssignmentService>();
builder.Services.AddScoped<IParentService, ParentService>();
builder.Services.AddScoped<ISubscriptionService, SubscriptionService>();
builder.Services.AddScoped<IContractService, ContractService>();
builder.Services.AddScoped<ISubscriptionChangeService, SubscriptionChangeService>();
builder.Services.AddScoped<ITenantRegistrationService, TenantRegistrationService>();
builder.Services.AddScoped<IEInvoiceSandboxService, EInvoiceSandboxService>();
builder.Services.AddScoped<IAdminDashboardService, AdminDashboardService>();
builder.Services.AddScoped<ISubmissionService, SubmissionService>();
builder.Services.AddScoped<ICenterDashboardService, CenterDashboardService>();
builder.Services.AddScoped<IRoomService, RoomService>();
builder.Services.AddScoped<IGradeService, GradeService>();
builder.Services.AddScoped<ICenterHomeService, CenterHomeService>();
builder.Services.AddScoped<IUserContextService, UserContextService>();
builder.Services.AddScoped<IAttendanceService, AttendanceService>();
builder.Services.AddScoped<IEnrollmentRequestService, EnrollmentRequestService>(); // Enrollment feature
builder.Services.AddScoped<ISupportRequestsService, SupportRequestsService>();
builder.Services.AddScoped<ITeacherReportService, TeacherReportService>();

// === Payment Services ===
builder.Services.Configure<PaymentConfigResolutionOptions>(
    builder.Configuration.GetSection(PaymentConfigResolutionOptions.SectionName));
builder.Services.AddScoped<VNPayService>();
builder.Services.AddScoped<ITenantPaymentGatewayConfigService, TenantPaymentGatewayConfigService>();
builder.Services.AddScoped<PaymentGatewayFactory>();
builder.Services.AddScoped<IPaymentService, PaymentService>();
builder.Services.AddScoped<ITuitionService, TuitionService>();
builder.Services.AddScoped<IInvoiceService, InvoiceService>();
builder.Services.AddScoped<IInvoiceLockService, InvoiceLockService>();
builder.Services.AddScoped<IRefundService, RefundService>();
builder.Services.AddScoped<IPaymentReminderService, PaymentReminderService>();
builder.Services.AddScoped<IRevenueReportService, RevenueReportService>();
builder.Services.AddScoped<IAdminReportService, AdminReportService>();
builder.Services.AddScoped<IQuotaService, QuotaService>();

// === Background Services ===
builder.Services.AddHostedService<EducenAPI.Services.BackgroundServices.OverdueInvoiceService>();
builder.Services.AddHostedService<EducenAPI.Services.BackgroundServices.SubscriptionExpirationService>();
builder.Services.AddHostedService<EducenAPI.Services.BackgroundServices.CreditDeductionService>();
builder.Services.AddHostedService<EducenAPI.Services.BackgroundServices.MonthlyInvoiceGenerationService>();
builder.Services.AddHostedService<EducenAPI.Services.BackgroundServices.LegacyCreditLedgerCleanupService>();
builder.Services.AddHostedService<EducenAPI.Services.BackgroundServices.MonthlyPerformanceReportService>();

// === Zalo OA ===
builder.Services.AddHttpClient("ZaloAPI", client =>
{
    client.Timeout = TimeSpan.FromSeconds(30);
    client.DefaultRequestHeaders.Add("Accept", "application/json");
});
builder.Services.AddScoped<IZaloOANotificationService, ZaloOANotificationService>();

// === CORS: cho phép FE gọi API ===
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowFrontend", policy =>
    {
        policy.WithOrigins(
                "http://localhost:5173",  // Vite dev server
                "http://localhost:3000",   // CRA fallback
                "http://localhost:5106",   // Backend HTTP
                "http://192.168.1.9:5173", // Local network host
                "https://unfated-subcoriaceous-irene.ngrok-free.dev" // ngrok public URL
              )
              .AllowAnyHeader()
              .AllowAnyMethod()
              .AllowCredentials()
              .SetPreflightMaxAge(TimeSpan.FromSeconds(3600));
    });
});


// === JWT Authentication ===
var jwtSettings = builder.Configuration.GetSection("Jwt");
var jwtKey = jwtSettings["Key"]
    ?? throw new InvalidOperationException("JWT Key chưa được cấu hình.");

var key = Encoding.UTF8.GetBytes(jwtKey);

builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
})
.AddJwtBearer(options =>
{
    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuer = true,
        ValidateAudience = true,
        ValidateIssuerSigningKey = true,
        ValidateLifetime = true,
        ValidIssuer = jwtSettings["Issuer"],
        ValidAudience = jwtSettings["Audience"],
        IssuerSigningKey = new SymmetricSecurityKey(key)
    };
});

builder.Services.AddAuthorization();

// === Build App ===
var app = builder.Build();

// ===============================
// MIDDLEWARE PIPELINE
// ===============================
app.UseMiddleware<GlobalExceptionHandler>();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI(c =>
    {
        c.SwaggerEndpoint("/swagger/v1/swagger.json", "EducenAPI V1");
        c.RoutePrefix = "swagger";
    });
}
app.Use(async (context, next) =>
{
    if (context.Request.Method == "OPTIONS")
    {
        context.Response.Headers.Add("Access-Control-Allow-Private-Network", "true");
    }
    await next();
});
app.UseCors("AllowFrontend");
if (!app.Environment.IsDevelopment())
{
    app.UseHttpsRedirection();
}
// IMPORTANT: TenantResolver MUST run BEFORE SystemApiKeyMiddleware
// because we need tenant context to be set first
app.UseMiddleware<TenantResolver>();
app.UseRouting();
app.UseStaticFiles();
app.UseAuthentication();
// IMPORTANT: SystemApiKeyMiddleware MUST run AFTER UseAuthentication
// so that context.User is populated with JWT claims for authenticated users
app.UseMiddleware<SystemApiKeyMiddleware>();
app.UseAuthorization();
app.MapControllers();

// === Seed Plans ===


app.Run();

