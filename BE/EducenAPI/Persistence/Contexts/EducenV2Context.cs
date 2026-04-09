using System;
using System.Linq;
using System.Linq.Expressions;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
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
    public DbSet<AttendanceModificationRequest> AttendanceModificationRequests { get; set; }
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
    public DbSet<Grade> Grades { get; set; }
    public DbSet<Room> Rooms { get; set; }
    public DbSet<ClassSession> ClassSessions { get; set; }
    public DbSet<EnrollmentRequest> EnrollmentRequests { get; set; } // Enrollment feature
    public DbSet<SupportRequest> SupportRequests { get; set; }
    public DbSet<ResourceFile> ResourceFiles { get; set; }
    public DbSet<CenterStaff> CenterStaffs { get; set; } = null!;

    // === Payment & Tuition System ===
    public DbSet<TuitionInvoice> TuitionInvoices { get; set; }
    public DbSet<TuitionInvoiceItem> TuitionInvoiceItems { get; set; }
    public DbSet<Notification> Notifications { get; set; }
    public DbSet<NotificationSetting> NotificationSettings { get; set; }
    
    // === Family Invoice System ===
    public DbSet<FamilyInvoice> FamilyInvoices { get; set; }
    public DbSet<FamilyInvoiceItem> FamilyInvoiceItems { get; set; }

    // === Invoice Lock System ===
    public DbSet<InvoiceLock> InvoiceLocks { get; set; }

    // === Payment Records (Học phí - lưu trong Tenant DB) ===
    public DbSet<PaymentRecordTenant> PaymentRecordTenants { get; set; }
    public DbSet<PaymentTransactionTenant> PaymentTransactionTenants { get; set; }

    // === Zalo OA ===
    public DbSet<ZaloOARecipient> ZaloOARecipients { get; set; }

    // ================================
    // MODEL CONFIGURATION
    // ================================
    protected override void OnConfiguring(DbContextOptionsBuilder optionsBuilder)
    {
        if (!optionsBuilder.IsConfigured)
        {
            // Đọc connection string từ appsettings.json (chỉ dùng khi chạy migration, không qua DI)
            var config = new ConfigurationBuilder()
                .SetBasePath(AppContext.BaseDirectory)
                .AddJsonFile("appsettings.json")
                .Build();

            var connectionString = config.GetConnectionString("DefaultTenantConnection");
            optionsBuilder.UseSqlServer(connectionString);
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
                // Create a parameter for the entity
                var parameter = Expression.Parameter(entityType.ClrType, "e");
                
                // Get the TenantId property
                var tenantIdProperty = Expression.Property(parameter, "TenantId");
                
                // Get CurrentTenantId from this context instance
                var currentTenantIdProperty = Expression.Property(
                    Expression.Constant(this), 
                    nameof(CurrentTenantId)
                );
                
                // Build expression: 
                // If CurrentTenantId is null or empty, return true (no filter)
                // Otherwise, check if TenantId == CurrentTenantId
                var isEmptyCheck = Expression.Equal(currentTenantIdProperty, Expression.Constant(""));
                var isNullCheck = Expression.Equal(currentTenantIdProperty, Expression.Constant(null, typeof(string)));
                var isEmptyOrNull = Expression.OrElse(isEmptyCheck, isNullCheck);
                
                var equalityCheck = Expression.Equal(tenantIdProperty, currentTenantIdProperty);
                
                // Combine: (CurrentTenantId == "" || CurrentTenantId == null) || (TenantId == CurrentTenantId)
                var body = Expression.OrElse(isEmptyOrNull, equalityCheck);
                
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
                // CHỈ GHI ĐÈ TỰ ĐỘNG NẾU TENANT ID ĐANG BỊ RỖNG HOẶC NULL
                if (string.IsNullOrEmpty(entry.Entity.TenantId))
                {
                    // Use CurrentTenantId, or a placeholder if also empty
                    var tenantToUse = string.IsNullOrEmpty(CurrentTenantId) ? "pending" : CurrentTenantId;
                    entry.Entity.TenantId = tenantToUse;
                }
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

        // ClassSession - Attendance relationship
        modelBuilder.Entity<Attendance>()
        .HasOne(a => a.Session)
        .WithMany(s => s.Attendances)
        .HasForeignKey(a => a.SessionId)
        .OnDelete(DeleteBehavior.Cascade);

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

        modelBuilder.Entity<CenterStaff>()
            .HasOne(s => s.CenterProfile)
            .WithMany(c => c.Staffs)
            .HasForeignKey(s => s.CenterProfileId)
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
        
        modelBuilder.Entity<Schedule>()
        .HasOne(s => s.Room)
        .WithMany(r => r.Schedules)
        .HasForeignKey(s => s.RoomId)
        .OnDelete(DeleteBehavior.SetNull);


        modelBuilder.Entity<Assignment>()
            .HasOne(a => a.Session)
            .WithMany(s => s.Assignments)
            .HasForeignKey(a => a.SessionId)
            .IsRequired(false)
            .OnDelete(DeleteBehavior.SetNull);

        modelBuilder.Entity<LessonMaterial>()
        .HasOne(m => m.Session)
        .WithMany(s => s.LessonMaterials)
        .HasForeignKey(m => m.SessionId)
        .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<Class>()
        .HasOne(c => c.Grade)
        .WithMany(g => g.Classes)
        .HasForeignKey(c => c.GradeId)
        .OnDelete(DeleteBehavior.SetNull);

        modelBuilder.Entity<Class>()
        .HasOne(c => c.Room)
        .WithMany(r => r.Classes)
        .HasForeignKey(c => c.RoomId)
        .OnDelete(DeleteBehavior.SetNull);

        modelBuilder.Entity<Assignment>()
            .HasOne(a => a.User)
            .WithMany()
            .HasForeignKey(a => a.UserId)
            .OnDelete(DeleteBehavior.SetNull);

        modelBuilder.Entity<LessonMaterial>()
        .HasOne(m => m.User)
        .WithMany()
        .HasForeignKey(m => m.UserId)
        .OnDelete(DeleteBehavior.SetNull);

        modelBuilder.Entity<ResourceFile>()
            .HasOne(rf => rf.Assignment)
            .WithMany()
            .HasForeignKey(rf => rf.AssignmentId)
            .OnDelete(DeleteBehavior.SetNull);

        modelBuilder.Entity<ResourceFile>()
            .HasOne(rf => rf.LessonMaterial)
            .WithMany()
            .HasForeignKey(rf => rf.LessonMaterialId)
            .OnDelete(DeleteBehavior.SetNull);
        // === TuitionInvoice Configuration ===
        modelBuilder.Entity<TuitionInvoice>()
            .HasOne(ti => ti.Student)
            .WithMany()
            .HasForeignKey(ti => ti.StudentId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<TuitionInvoice>()
            .HasOne(ti => ti.Class)
            .WithMany()
            .HasForeignKey(ti => ti.ClassId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<TuitionInvoice>()
            .HasIndex(ti => new { ti.InvoiceMonth, ti.InvoiceYear });

        modelBuilder.Entity<TuitionInvoice>()
            .HasIndex(ti => new { ti.StudentId, ti.Status });

        modelBuilder.Entity<TuitionInvoice>()
            .HasIndex(ti => new { ti.Status, ti.DueDate }); // For overdue checking

        // === TuitionInvoiceItem Configuration ===
        modelBuilder.Entity<TuitionInvoiceItem>()
            .HasOne(tii => tii.Invoice)
            .WithMany(ti => ti.Items)
            .HasForeignKey(tii => tii.InvoiceId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<TuitionInvoiceItem>()
            .HasIndex(tii => new { tii.InvoiceId, tii.SessionId });

        // === Notification Configuration ===
        modelBuilder.Entity<Notification>()
            .HasOne(n => n.User)
            .WithMany()
            .HasForeignKey(n => n.UserId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<Notification>()
            .HasIndex(n => new { n.TenantId, n.UserId, n.IsRead });

        modelBuilder.Entity<Notification>()
            .HasIndex(n => new { n.TenantId, n.Category, n.CreatedAt });

        // === NotificationSetting Configuration ===
        modelBuilder.Entity<NotificationSetting>()
            .HasIndex(ns => new { ns.TenantId, ns.UserId })
            .IsUnique();

        // === PaymentTransactionTenant Configuration ===
        modelBuilder.Entity<PaymentTransactionTenant>()
            .HasOne(pt => pt.PaymentRecord)
            .WithMany(pr => pr.Transactions)
            .HasForeignKey(pt => pt.PaymentRecordId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<PaymentTransactionTenant>()
            .HasIndex(pt => pt.PaymentRecordId);

        modelBuilder.Entity<SupportRequest>(enttiy =>
        {
            enttiy.HasOne(e => e.Sender)
                .WithMany(e => e.SentRequests)
                .HasForeignKey(e => e.SenderId)
                .OnDelete(DeleteBehavior.Restrict);

            enttiy.HasOne(e => e.Receiver)
                .WithMany(e => e.ReceiveRequests)
                .HasForeignKey(e => e.ReceiverId)
                .OnDelete(DeleteBehavior.SetNull);
        });



        // === ZaloOARecipient Configuration ===
        modelBuilder.Entity<ZaloOARecipient>()
            .HasIndex(z => z.ZaloUserId);

        // === FamilyInvoice Configuration ===
        modelBuilder.Entity<FamilyInvoice>()
            .HasKey(fi => fi.InvoiceId);

        modelBuilder.Entity<FamilyInvoice>()
            .HasIndex(fi => new { fi.ParentId, fi.Month, fi.Year, fi.Type });

        modelBuilder.Entity<FamilyInvoiceItem>()
            .HasKey(fii => fii.ItemId);

        modelBuilder.Entity<FamilyInvoiceItem>()
            .HasOne(fii => fii.FamilyInvoice)
            .WithMany(fi => fi.StudentInvoices)
            .HasForeignKey(fii => fii.FamilyInvoiceId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<FamilyInvoiceItem>()
            .HasIndex(fii => fii.StudentInvoiceId);

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
