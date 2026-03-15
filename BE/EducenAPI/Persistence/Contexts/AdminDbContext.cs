using EducenAPI.Models;
using Microsoft.EntityFrameworkCore;

namespace EducenAPI.Persistence.Contexts
{
    public class AdminDbContext : DbContext
    {
        public AdminDbContext(DbContextOptions<AdminDbContext> options)
            : base(options)
        {
        }

        public DbSet<Tenant> Tenants { get; set; }

        public DbSet<Subscription> Subscriptions { get; set; }

        public DbSet<Plan> Plans { get; set; }

        public DbSet<SystemAdmin> SystemAdmins { get; set; }

        public DbSet<PaymentRecord> PaymentRecords { get; set; }

        protected override void OnModelCreating(ModelBuilder builder)
        {
            base.OnModelCreating(builder);

            // Tenant domain unique
            builder.Entity<Tenant>()
                .HasIndex(t => t.SubDomain)
                .IsUnique();

            // Tenant - Subscription
            builder.Entity<Subscription>()
                .HasOne(s => s.Tenant)
                .WithMany(t => t.Subscriptions)
                .HasForeignKey(s => s.TenantId)
                .OnDelete(DeleteBehavior.Cascade);

            // Subscription - Plan
            builder.Entity<Subscription>()
                .HasOne(s => s.Plan)
                .WithMany()
                .HasForeignKey(s => s.PlanId)
                .OnDelete(DeleteBehavior.Restrict);

            // Tenant - PaymentRecord
            builder.Entity<PaymentRecord>()
                .HasOne(p => p.Tenant)
                .WithMany(t => t.PaymentRecords)
                .HasForeignKey(p => p.TenantId)
                .OnDelete(DeleteBehavior.Cascade);

            // Subscription index
            builder.Entity<Subscription>()
                .HasIndex(s => new { s.TenantId, s.StartDate });
        }
    }
}