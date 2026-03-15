using System;
using System.Linq;
using System.Linq.Expressions;
using Microsoft.EntityFrameworkCore;
using EducenAPI.Services;
using EducenAPI.Models;

namespace EducenAPI.Persistence.Contexts;

public partial class EducenV2Context : DbContext
{
    private readonly ICurrentTenantService _currentTenantService;

    public string CurrentTenantId { get; set; } = string.Empty;

    public EducenV2Context(
        DbContextOptions<EducenV2Context> options,
        ICurrentTenantService currentTenantService)
        : base(options)
    {
        _currentTenantService = currentTenantService;
        CurrentTenantId = _currentTenantService.TenantId;
    }

   
    // DbSets 
    public virtual DbSet<Assignment> Assignments { get; set; } = null!;
    public virtual DbSet<Assistant> Assistants { get; set; } = null!;
    public virtual DbSet<Attendance> Attendances { get; set; } = null!;
    public virtual DbSet<Class> Classes { get; set; } = null!;
    public virtual DbSet<LessonMaterial> LessonMaterials { get; set; } = null!;
    public virtual DbSet<Parent> Parents { get; set; } = null!;
    public virtual DbSet<Role> Roles { get; set; } = null!;
    public virtual DbSet<Schedule> Schedules { get; set; } = null!;
    public virtual DbSet<Student> Students { get; set; } = null!;
    public virtual DbSet<Subject> Subjects { get; set; } = null!;
    public virtual DbSet<Submission> Submissions { get; set; } = null!;
    public virtual DbSet<Teacher> Teachers { get; set; } = null!;
    public virtual DbSet<User> Users { get; set; } = null!;
    public virtual DbSet<CenterProfile> CenterProfiles { get; set; } = null!;
    public virtual DbSet<CenterImage> CenterImages { get; set; } = null!;
    public virtual DbSet<CenterHeroImage> CenterHeroImages { get; set; } = null!;
    public virtual DbSet<CenterHighlight> CenterHighlights { get; set; } = null!;
    public DbSet<ClassSession> ClassSessions { get; set; }

    // ================================
    // MODEL CONFIGURATION
    // ================================
    protected override void OnConfiguring(DbContextOptionsBuilder optionsBuilder)
    {
        if (!optionsBuilder.IsConfigured)
        {
            optionsBuilder.UseSqlServer("...");
        }
    }
    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);


        ConfigureEntities(modelBuilder);
        SeedRoles(modelBuilder);
        // Thêm Global Filter Multi-Tenant
        ApplyMultiTenantFilter(modelBuilder);
    }

    // ================================
    // GLOBAL TENANT FILTER
    // ================================
    private void ApplyMultiTenantFilter(ModelBuilder builder)
    {
        foreach (var entityType in builder.Model.GetEntityTypes())
        {
            if (typeof(IMustHaveTenant).IsAssignableFrom(entityType.ClrType))
            {
                var parameter = Expression.Parameter(entityType.ClrType, "e");
                var property = Expression.Property(parameter, "TenantId");
                var tenantId = Expression.Constant(CurrentTenantId);
                var body = Expression.Equal(property, tenantId);

                var lambda = Expression.Lambda(body, parameter);

                builder.Entity(entityType.ClrType)
                       .HasQueryFilter(lambda);
            }
        }
    }


    public override int SaveChanges()
    {
        SetTenantId();
        return base.SaveChanges();
    }

    public override Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
    {
        SetTenantId();
        return base.SaveChangesAsync(cancellationToken);
    }

    private void SetTenantId()
    {
        foreach (var entry in ChangeTracker.Entries<IMustHaveTenant>().ToList())
        {
            if (entry.State == EntityState.Added)
            {
                entry.Entity.TenantId = CurrentTenantId;
            }
        }
    }


    private void ConfigureEntities(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<Student>()
        .HasOne(s => s.StudentNavigation)
        .WithOne(u => u.Student)
        .HasForeignKey<Student>(s => s.UserId)
        .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<Teacher>()
            .HasOne(t => t.TeacherNavigation)
            .WithOne(u => u.Teacher)
            .HasForeignKey<Teacher>(t => t.UserId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<Assistant>()
            .HasOne(a => a.AssistantNavigation)
            .WithOne(u => u.Assistant)
            .HasForeignKey<Assistant>(a => a.UserId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<Parent>()
            .HasOne(p => p.ParentNavigation)
            .WithOne(u => u.Parent)
            .HasForeignKey<Parent>(p => p.UserId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<Submission>()
        .HasOne(s => s.Student)
        .WithMany(st => st.Submissions)
        .HasForeignKey(s => s.StudentId)
        .OnDelete(DeleteBehavior.NoAction);

        modelBuilder.Entity<Parent>()
        .HasMany(p => p.Students)
        .WithMany(s => s.Parents)
        .UsingEntity<Dictionary<string, object>>(
            "ParentStudent",
            j => j
                .HasOne<Student>()
                .WithMany()
                .HasForeignKey("StudentsUserId")
                .OnDelete(DeleteBehavior.NoAction),
            j => j
                .HasOne<Parent>()
                .WithMany()
                .HasForeignKey("ParentsUserId")
                .OnDelete(DeleteBehavior.Cascade)
        );

        modelBuilder.Entity<Class>()
        .HasMany(c => c.Students)
        .WithMany(s => s.Classes)
        .UsingEntity<Dictionary<string, object>>(
            "ClassStudent",
            j => j
                .HasOne<Student>()
                .WithMany()
                .HasForeignKey("StudentsUserId")
                .OnDelete(DeleteBehavior.NoAction),
            j => j
                .HasOne<Class>()
                .WithMany()
                .HasForeignKey("ClassesClassId")
                .OnDelete(DeleteBehavior.Cascade)
        );

        modelBuilder.Entity<Attendance>()
        .HasOne(a => a.Student)
        .WithMany(s => s.Attendances)
        .HasForeignKey(a => a.StudentId)
        .OnDelete(DeleteBehavior.NoAction);

        modelBuilder.Entity<CenterImage>()
        .HasOne(i => i.CenterProfile)
        .WithMany(c => c.Images)
        .HasForeignKey(i => i.CenterProfileId)
        .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<CenterHeroImage>()
            .HasOne(i => i.CenterProfile)
            .WithMany(c => c.HeroImages)
            .HasForeignKey(i => i.CenterProfileId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<CenterHighlight>()
            .HasOne(h => h.CenterProfile)
            .WithMany(c => c.Highlights)
            .HasForeignKey(h => h.CenterProfileId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<Attendance>()
        .HasOne(a => a.Session)
        .WithMany(s => s.Attendances)
        .HasForeignKey(a => a.SessionId)
        .OnDelete(DeleteBehavior.NoAction);

        modelBuilder.Entity<ClassSession>()
        .HasOne(cs => cs.Schedule)
        .WithMany(s => s.Sessions)
        .HasForeignKey(cs => cs.ScheduleId)
        .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<Assignment>()
        .HasOne(a => a.Session)
        .WithMany(s => s.Assignments)
        .HasForeignKey(a => a.SessionId)
        .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<LessonMaterial>()
        .HasOne(m => m.Session)
        .WithMany(s => s.LessonMaterials)
        .HasForeignKey(m => m.SessionId)
        .OnDelete(DeleteBehavior.Cascade);
    }

    private void SeedRoles(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<Role>().HasData(
            new Role { RoleId = 1, RoleName = "Admin" },
            new Role { RoleId = 2, RoleName = "Teacher" },
            new Role { RoleId = 3, RoleName = "Student" },
            new Role { RoleId = 4, RoleName = "Parent" },
            new Role { RoleId = 5, RoleName = "Assistant" }
        );
    }
}