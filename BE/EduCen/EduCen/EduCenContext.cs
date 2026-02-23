using System;
using System.Collections.Generic;
using EduCen.Models;
using Microsoft.EntityFrameworkCore;

namespace EduCen;

public partial class EduCenContext : DbContext
{
    public EduCenContext()
    {
    }

    public EduCenContext(DbContextOptions<EduCenContext> options)
        : base(options)
    {
    }

    public virtual DbSet<Assignment> Assignments { get; set; }

    public virtual DbSet<Assistant> Assistants { get; set; }

    public virtual DbSet<Attendance> Attendances { get; set; }

    public virtual DbSet<Class> Classes { get; set; }

    public virtual DbSet<Grade> Grades { get; set; }

    public virtual DbSet<LessonMaterial> LessonMaterials { get; set; }

    public virtual DbSet<Parent> Parents { get; set; }

    public virtual DbSet<PaymentRecord> PaymentRecords { get; set; }

    public virtual DbSet<Role> Roles { get; set; }

    public virtual DbSet<Schedule> Schedules { get; set; }

    public virtual DbSet<Student> Students { get; set; }

    public virtual DbSet<Subject> Subjects { get; set; }

    public virtual DbSet<Submission> Submissions { get; set; }

    public virtual DbSet<Subscription> Subscriptions { get; set; }

    public virtual DbSet<SystemAdmin> SystemAdmins { get; set; }

    public virtual DbSet<Teacher> Teachers { get; set; }

    public virtual DbSet<Tenant> Tenants { get; set; }

    public virtual DbSet<User> Users { get; set; }

    protected override void OnConfiguring(DbContextOptionsBuilder optionsBuilder)
#warning To protect potentially sensitive information in your connection string, you should move it out of source code. You can avoid scaffolding the connection string by using the Name= syntax to read it from configuration - see https://go.microsoft.com/fwlink/?linkid=2131148. For more guidance on storing connection strings, see https://go.microsoft.com/fwlink/?LinkId=723263.
        => optionsBuilder.UseSqlServer("Server=localhost;Database=EduCen;uid=sa;pwd=123;TrustServerCertificate=True;");

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<Assignment>(entity =>
        {
            entity.HasKey(e => e.AsmId).HasName("PK__Assignme__8FEE6B2E44537F87");

            entity.ToTable("Assignment");

            entity.Property(e => e.AsmId).HasColumnName("asm_id");
            entity.Property(e => e.ClassId).HasColumnName("class_id");
            entity.Property(e => e.Description).HasColumnName("description");
            entity.Property(e => e.EndTime)
                .HasColumnType("datetime")
                .HasColumnName("end_time");
            entity.Property(e => e.FileUrl)
                .HasMaxLength(255)
                .HasColumnName("file_url");
            entity.Property(e => e.StartTime)
                .HasColumnType("datetime")
                .HasColumnName("start_time");
            entity.Property(e => e.Title)
                .HasMaxLength(100)
                .HasColumnName("title");

            entity.HasOne(d => d.Class).WithMany(p => p.Assignments)
                .HasForeignKey(d => d.ClassId)
                .HasConstraintName("FK_Assignment_Class");
        });

        modelBuilder.Entity<Assistant>(entity =>
        {
            entity.HasKey(e => e.AssistantId).HasName("PK__Assistan__2A4E4C65D0386270");

            entity.ToTable("Assistant");

            entity.Property(e => e.AssistantId)
                .ValueGeneratedNever()
                .HasColumnName("assistant_id");
            entity.Property(e => e.SupportLevel)
                .HasMaxLength(50)
                .HasColumnName("support_level");

            entity.HasOne(d => d.AssistantNavigation).WithOne(p => p.Assistant)
                .HasForeignKey<Assistant>(d => d.AssistantId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_Assistant_User");
        });

        modelBuilder.Entity<Attendance>(entity =>
        {
            entity.HasKey(e => e.AttendanceId).HasName("PK__Attendan__20D6A96800841AEC");

            entity.ToTable("Attendance");

            entity.Property(e => e.AttendanceId).HasColumnName("attendance_id");
            entity.Property(e => e.RecordedAt)
                .HasDefaultValueSql("(getdate())")
                .HasColumnType("datetime")
                .HasColumnName("recorded_at");
            entity.Property(e => e.ScheduleId).HasColumnName("schedule_id");
            entity.Property(e => e.Status)
                .HasMaxLength(50)
                .HasColumnName("status");
            entity.Property(e => e.StudentId).HasColumnName("student_id");
            entity.Property(e => e.UpdatedBy).HasColumnName("updated_by");

            entity.HasOne(d => d.Schedule).WithMany(p => p.Attendances)
                .HasForeignKey(d => d.ScheduleId)
                .HasConstraintName("FK_Att_Schedule");

            entity.HasOne(d => d.Student).WithMany(p => p.Attendances)
                .HasForeignKey(d => d.StudentId)
                .HasConstraintName("FK_Att_Student");

            entity.HasOne(d => d.UpdatedByNavigation).WithMany(p => p.Attendances)
                .HasForeignKey(d => d.UpdatedBy)
                .HasConstraintName("FK_Att_User");
        });

        modelBuilder.Entity<Class>(entity =>
        {
            entity.HasKey(e => e.ClassId).HasName("PK__Class__FDF479866E065021");

            entity.ToTable("Class");

            entity.Property(e => e.ClassId).HasColumnName("class_id");
            entity.Property(e => e.AssistantId).HasColumnName("assistant_id");
            entity.Property(e => e.ClassName)
                .HasMaxLength(100)
                .HasColumnName("class_name");
            entity.Property(e => e.Description)
                .HasMaxLength(255)
                .HasColumnName("description");
            entity.Property(e => e.Status)
                .HasMaxLength(50)
                .HasColumnName("status");
            entity.Property(e => e.SubjectId).HasColumnName("subject_id");
            entity.Property(e => e.SyllabusContent).HasColumnName("syllabus_content");
            entity.Property(e => e.TeacherId).HasColumnName("teacher_id");
            entity.Property(e => e.TenantId).HasColumnName("tenant_id");

            entity.HasOne(d => d.Assistant).WithMany(p => p.Classes)
                .HasForeignKey(d => d.AssistantId)
                .HasConstraintName("FK_Class_Assistant");

            entity.HasOne(d => d.Subject).WithMany(p => p.Classes)
                .HasForeignKey(d => d.SubjectId)
                .HasConstraintName("FK_Class_Subject");

            entity.HasOne(d => d.Teacher).WithMany(p => p.Classes)
                .HasForeignKey(d => d.TeacherId)
                .HasConstraintName("FK_Class_Teacher");

            entity.HasOne(d => d.Tenant).WithMany(p => p.Classes)
                .HasForeignKey(d => d.TenantId)
                .HasConstraintName("FK_Class_Tenant");
        });

        modelBuilder.Entity<Grade>(entity =>
        {
            entity.HasKey(e => e.GradeId).HasName("PK__Grade__3A8F732CB703BEB2");

            entity.ToTable("Grade");

            entity.HasIndex(e => e.SubId, "UQ__Grade__694106B1047E8FCA").IsUnique();

            entity.Property(e => e.GradeId).HasColumnName("grade_id");
            entity.Property(e => e.GradedAt)
                .HasColumnType("datetime")
                .HasColumnName("graded_at");
            entity.Property(e => e.Score)
                .HasColumnType("decimal(4, 2)")
                .HasColumnName("score");
            entity.Property(e => e.SubId).HasColumnName("sub_id");
            entity.Property(e => e.TeacherComment).HasColumnName("teacher_comment");

            entity.HasOne(d => d.Sub).WithOne(p => p.Grade)
                .HasForeignKey<Grade>(d => d.SubId)
                .HasConstraintName("FK_Grade_Submission");
        });

        modelBuilder.Entity<LessonMaterial>(entity =>
        {
            entity.HasKey(e => e.MaterialId).HasName("PK__Lesson_M__6BFE1D2884D9B283");

            entity.ToTable("Lesson_Material");

            entity.Property(e => e.MaterialId).HasColumnName("material_id");
            entity.Property(e => e.ClassId).HasColumnName("class_id");
            entity.Property(e => e.ContentType)
                .HasMaxLength(50)
                .HasColumnName("content_type");
            entity.Property(e => e.FileUrl)
                .HasMaxLength(255)
                .HasColumnName("file_url");
            entity.Property(e => e.Title)
                .HasMaxLength(100)
                .HasColumnName("title");

            entity.HasOne(d => d.Class).WithMany(p => p.LessonMaterials)
                .HasForeignKey(d => d.ClassId)
                .HasConstraintName("FK_Material_Class");
        });

        modelBuilder.Entity<Parent>(entity =>
        {
            entity.HasKey(e => e.ParentId).HasName("PK__Parent__F2A60819FD46061C");

            entity.ToTable("Parent");

            entity.Property(e => e.ParentId)
                .ValueGeneratedNever()
                .HasColumnName("parent_id");
            entity.Property(e => e.Address)
                .HasMaxLength(255)
                .HasColumnName("address");
            entity.Property(e => e.PhoneNumber)
                .HasMaxLength(20)
                .HasColumnName("phone_number");

            entity.HasOne(d => d.ParentNavigation).WithOne(p => p.Parent)
                .HasForeignKey<Parent>(d => d.ParentId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_Parent_User");

            entity.HasMany(d => d.Students).WithMany(p => p.Parents)
                .UsingEntity<Dictionary<string, object>>(
                    "ParentStudent",
                    r => r.HasOne<Student>().WithMany()
                        .HasForeignKey("StudentId")
                        .OnDelete(DeleteBehavior.ClientSetNull)
                        .HasConstraintName("FK_PS_Student"),
                    l => l.HasOne<Parent>().WithMany()
                        .HasForeignKey("ParentId")
                        .OnDelete(DeleteBehavior.ClientSetNull)
                        .HasConstraintName("FK_PS_Parent"),
                    j =>
                    {
                        j.HasKey("ParentId", "StudentId").HasName("PK__Parent_S__4005387012583F60");
                        j.ToTable("Parent_Student");
                        j.IndexerProperty<int>("ParentId").HasColumnName("parent_id");
                        j.IndexerProperty<int>("StudentId").HasColumnName("student_id");
                    });
        });

        modelBuilder.Entity<PaymentRecord>(entity =>
        {
            entity.HasKey(e => e.PaymentId).HasName("PK__Payment___ED1FC9EA497E22A5");

            entity.ToTable("Payment_Record");

            entity.Property(e => e.PaymentId).HasColumnName("payment_id");
            entity.Property(e => e.Amount)
                .HasColumnType("decimal(10, 2)")
                .HasColumnName("amount");
            entity.Property(e => e.PaymentDate)
                .HasColumnType("datetime")
                .HasColumnName("payment_date");
            entity.Property(e => e.Status)
                .HasMaxLength(50)
                .HasColumnName("status");
            entity.Property(e => e.TenantId).HasColumnName("tenant_id");

            entity.HasOne(d => d.Tenant).WithMany(p => p.PaymentRecords)
                .HasForeignKey(d => d.TenantId)
                .HasConstraintName("FK_Payment_Tenant");
        });

        modelBuilder.Entity<Role>(entity =>
        {
            entity.HasKey(e => e.RoleId).HasName("PK__Role__760965CC44B39FA1");

            entity.ToTable("Role");

            entity.Property(e => e.RoleId).HasColumnName("role_id");
            entity.Property(e => e.RoleName)
                .HasMaxLength(50)
                .HasColumnName("role_name");
        });

        modelBuilder.Entity<Schedule>(entity =>
        {
            entity.HasKey(e => e.ScheduleId).HasName("PK__Schedule__C46A8A6FBE83E02A");

            entity.ToTable("Schedule");

            entity.Property(e => e.ScheduleId).HasColumnName("schedule_id");
            entity.Property(e => e.ClassId).HasColumnName("class_id");
            entity.Property(e => e.DayOfWeek)
                .HasMaxLength(20)
                .HasColumnName("day_of_week");
            entity.Property(e => e.EndTime).HasColumnName("end_time");
            entity.Property(e => e.RoomInfo)
                .HasMaxLength(100)
                .HasColumnName("room_info");
            entity.Property(e => e.StartTime).HasColumnName("start_time");

            entity.HasOne(d => d.Class).WithMany(p => p.Schedules)
                .HasForeignKey(d => d.ClassId)
                .HasConstraintName("FK_Schedule_Class");
        });

        modelBuilder.Entity<Student>(entity =>
        {
            entity.HasKey(e => e.StudentId).HasName("PK__Student__2A33069AC66F084F");

            entity.ToTable("Student");

            entity.Property(e => e.StudentId)
                .ValueGeneratedNever()
                .HasColumnName("student_id");
            entity.Property(e => e.EnrollmentStatus)
                .HasMaxLength(50)
                .HasColumnName("enrollment_status");
            entity.Property(e => e.PhoneNumber)
                .HasMaxLength(20)
                .HasColumnName("phone_number");

            entity.HasOne(d => d.StudentNavigation).WithOne(p => p.Student)
                .HasForeignKey<Student>(d => d.StudentId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_Student_User");

            entity.HasMany(d => d.Classes).WithMany(p => p.Students)
                .UsingEntity<Dictionary<string, object>>(
                    "Enrollment",
                    r => r.HasOne<Class>().WithMany()
                        .HasForeignKey("ClassId")
                        .OnDelete(DeleteBehavior.ClientSetNull)
                        .HasConstraintName("FK_Enroll_Class"),
                    l => l.HasOne<Student>().WithMany()
                        .HasForeignKey("StudentId")
                        .OnDelete(DeleteBehavior.ClientSetNull)
                        .HasConstraintName("FK_Enroll_Student"),
                    j =>
                    {
                        j.HasKey("StudentId", "ClassId").HasName("PK__Enrollme__55EC4102B3359497");
                        j.ToTable("Enrollment");
                        j.IndexerProperty<int>("StudentId").HasColumnName("student_id");
                        j.IndexerProperty<int>("ClassId").HasColumnName("class_id");
                    });
        });

        modelBuilder.Entity<Subject>(entity =>
        {
            entity.HasKey(e => e.SubjectId).HasName("PK__Subject__5004F660242E2051");

            entity.ToTable("Subject");

            entity.Property(e => e.SubjectId).HasColumnName("subject_id");
            entity.Property(e => e.Description)
                .HasMaxLength(255)
                .HasColumnName("description");
            entity.Property(e => e.SubjectName)
                .HasMaxLength(100)
                .HasColumnName("subject_name");
            entity.Property(e => e.TenantId).HasColumnName("tenant_id");

            entity.HasOne(d => d.Tenant).WithMany(p => p.Subjects)
                .HasForeignKey(d => d.TenantId)
                .HasConstraintName("FK_Subject_Tenant");
        });

        modelBuilder.Entity<Submission>(entity =>
        {
            entity.HasKey(e => e.SubId).HasName("PK__Submissi__694106B058B759B1");

            entity.ToTable("Submission");

            entity.HasIndex(e => new { e.AsmId, e.StudentId }, "UQ_Submission").IsUnique();

            entity.Property(e => e.SubId).HasColumnName("sub_id");
            entity.Property(e => e.AsmId).HasColumnName("asm_id");
            entity.Property(e => e.FileUrl)
                .HasMaxLength(255)
                .HasColumnName("file_url");
            entity.Property(e => e.Status)
                .HasMaxLength(50)
                .HasColumnName("status");
            entity.Property(e => e.StudentId).HasColumnName("student_id");
            entity.Property(e => e.SubmittedAt)
                .HasColumnType("datetime")
                .HasColumnName("submitted_at");

            entity.HasOne(d => d.Asm).WithMany(p => p.Submissions)
                .HasForeignKey(d => d.AsmId)
                .HasConstraintName("FK_Submission_Assignment");

            entity.HasOne(d => d.Student).WithMany(p => p.Submissions)
                .HasForeignKey(d => d.StudentId)
                .HasConstraintName("FK_Submission_Student");
        });

        modelBuilder.Entity<Subscription>(entity =>
        {
            entity.HasKey(e => e.PlanId).HasName("PK__Subscrip__BE9F8F1DF74F7581");

            entity.ToTable("Subscription");

            entity.Property(e => e.PlanId).HasColumnName("plan_id");
            entity.Property(e => e.Features).HasColumnName("features");
            entity.Property(e => e.LimitUsers).HasColumnName("limit_users");
            entity.Property(e => e.PlanName)
                .HasMaxLength(100)
                .HasColumnName("plan_name");
            entity.Property(e => e.Price)
                .HasColumnType("decimal(10, 2)")
                .HasColumnName("price");
        });

        modelBuilder.Entity<SystemAdmin>(entity =>
        {
            entity.HasKey(e => e.SysAdminId).HasName("PK__System_A__1793356A67E1E27D");

            entity.ToTable("System_Admin");

            entity.Property(e => e.SysAdminId).HasColumnName("sys_admin_id");
            entity.Property(e => e.Email)
                .HasMaxLength(100)
                .HasColumnName("email");
            entity.Property(e => e.FullName)
                .HasMaxLength(100)
                .HasColumnName("full_name");
            entity.Property(e => e.PasswordHash)
                .HasMaxLength(255)
                .HasColumnName("password_hash");
            entity.Property(e => e.Username)
                .HasMaxLength(50)
                .HasColumnName("username");
        });

        modelBuilder.Entity<Teacher>(entity =>
        {
            entity.HasKey(e => e.TeacherId).HasName("PK__Teacher__03AE777E7ED237DA");

            entity.ToTable("Teacher");

            entity.Property(e => e.TeacherId)
                .ValueGeneratedNever()
                .HasColumnName("teacher_id");
            entity.Property(e => e.Degree)
                .HasMaxLength(100)
                .HasColumnName("degree");
            entity.Property(e => e.Specialization)
                .HasMaxLength(100)
                .HasColumnName("specialization");

            entity.HasOne(d => d.TeacherNavigation).WithOne(p => p.Teacher)
                .HasForeignKey<Teacher>(d => d.TeacherId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_Teacher_User");
        });

        modelBuilder.Entity<Tenant>(entity =>
        {
            entity.HasKey(e => e.TenantId).HasName("PK__Tenant__D6F29F3EC5E9D1E9");

            entity.ToTable("Tenant");

            entity.Property(e => e.TenantId).HasColumnName("tenant_id");
            entity.Property(e => e.CreatedAt)
                .HasDefaultValueSql("(getdate())")
                .HasColumnType("datetime")
                .HasColumnName("created_at");
            entity.Property(e => e.DomainUrl)
                .HasMaxLength(255)
                .HasColumnName("domain_url");
            entity.Property(e => e.PlanId).HasColumnName("plan_id");
            entity.Property(e => e.Status)
                .HasMaxLength(50)
                .HasColumnName("status");
            entity.Property(e => e.TenantName)
                .HasMaxLength(100)
                .HasColumnName("tenant_name");

            entity.HasOne(d => d.Plan).WithMany(p => p.Tenants)
                .HasForeignKey(d => d.PlanId)
                .HasConstraintName("FK_Tenant_Subscription");
        });

        modelBuilder.Entity<User>(entity =>
        {
            entity.HasKey(e => e.UserId).HasName("PK__User__B9BE370FCBDE3802");

            entity.ToTable("User");

            entity.HasIndex(e => new { e.Username, e.TenantId }, "UQ_User").IsUnique();

            entity.Property(e => e.UserId).HasColumnName("user_id");
            entity.Property(e => e.AccountStatus)
                .HasMaxLength(50)
                .HasColumnName("account_status");
            entity.Property(e => e.Email)
                .HasMaxLength(100)
                .HasColumnName("email");
            entity.Property(e => e.FullName)
                .HasMaxLength(100)
                .HasColumnName("full_name");
            entity.Property(e => e.PasswordHash)
                .HasMaxLength(255)
                .HasColumnName("password_hash");
            entity.Property(e => e.RoleId).HasColumnName("role_id");
            entity.Property(e => e.TenantId).HasColumnName("tenant_id");
            entity.Property(e => e.Username)
                .HasMaxLength(50)
                .HasColumnName("username");

            entity.HasOne(d => d.Role).WithMany(p => p.Users)
                .HasForeignKey(d => d.RoleId)
                .HasConstraintName("FK_User_Role");

            entity.HasOne(d => d.Tenant).WithMany(p => p.Users)
                .HasForeignKey(d => d.TenantId)
                .HasConstraintName("FK_User_Tenant");
        });

        OnModelCreatingPartial(modelBuilder);
    }

    partial void OnModelCreatingPartial(ModelBuilder modelBuilder);
}
