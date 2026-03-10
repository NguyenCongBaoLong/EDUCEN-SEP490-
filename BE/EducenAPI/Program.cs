using EducenAPI.Middleware;
using EducenAPI.Persistence.Contexts;
using EducenAPI.Services;
using EducenAPI.Services.Interface;
using EducenAPI.Services.TenantService;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using System.Text;
using Microsoft.EntityFrameworkCore;
using EducenAPI.Models;
using Microsoft.OpenApi.Models;

var builder = WebApplication.CreateBuilder(args);

// ── Services ────────────────────────────────────────────────────────────────
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();

// ── Swagger ───────────────────────────────────────────────────────────────
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
    var tenantService = serviceProvider.GetRequiredService<ICurrentTenantService>();

    var connectionString =
        tenantService.ConnectionString
        ?? builder.Configuration.GetConnectionString("DefaultTenantConnection");

    options.UseSqlServer(connectionString);
});

// ── Auth Service ────────────────────────────────────────────────────────────
builder.Services.AddScoped<IAuthService, AuthService>();
builder.Services.AddScoped<ICurrentTenantService, CurrentTenantService>();
builder.Services.AddScoped<ITenantService, TenantService>();
builder.Services.AddScoped<ISubjectService, SubjectService>();
builder.Services.AddScoped<IPlanService, PlanService>();
builder.Services.AddScoped<IStudentService, StudentService>();
builder.Services.AddScoped<ITeacherService, TeacherService>();
builder.Services.AddScoped<IClassService, ClassService>();
builder.Services.AddScoped<IAssistantService, AssistantService>();
builder.Services.AddScoped<IScheduleService, ScheduleService>();
builder.Services.AddScoped<IUserManagementService, UserManagementService>();

// ── CORS: cho phép FE gọi API ──────────────────────────────────────────────
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowFrontend", policy =>
    {
        policy.WithOrigins(
                "http://localhost:5173",  // Vite dev server
                "http://localhost:3000"   // CRA fallback
              )
              .AllowAnyHeader()
              .AllowAnyMethod();
    });
});

// ── JWT Authentication ──────────────────────────────────────────────────────
var jwtSettings = builder.Configuration.GetSection("Jwt");
var jwtKey = jwtSettings["Key"]
    ?? throw new InvalidOperationException("JWT Key is not configured");

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

// ── Build App ───────────────────────────────────────────────────────────────
var app = builder.Build();

// ===============================
// MIDDLEWARE PIPELINE
// ===============================

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI(c =>
    {
        c.SwaggerEndpoint("/swagger/v1/swagger.json", "EducenAPI V1");
        c.RoutePrefix = "swagger";
    });
}
app.UseHttpsRedirection();
app.UseMiddleware<TenantResolver>();
app.UseCors("AllowFrontend");
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();

app.Run();
