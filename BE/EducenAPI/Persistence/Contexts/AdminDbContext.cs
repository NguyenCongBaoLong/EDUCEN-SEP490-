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

            builder.Entity<Tenant>()
                .HasIndex(t => t.DomainUrl)
                .IsUnique();
        }
    }
}
