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
        public DbSet<TenantRegistration> TenantRegistrations { get; set; }
        public DbSet<TenantCreditLedger> TenantCreditLedgers { get; set; }

        // === Payment System ===
        public DbSet<PaymentTransaction> PaymentTransactions { get; set; }
        public DbSet<RefundRequest> RefundRequests { get; set; }
        public DbSet<TenantPaymentGatewayConfig> TenantPaymentGatewayConfigs { get; set; }
        public DbSet<TenantPaymentConfigAudit> TenantPaymentConfigAudits { get; set; }

        // === Zalo OA ===
        public DbSet<TenantZaloOAConfig> TenantZaloOAConfigs { get; set; }

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
                .WithMany(p => p.Subscriptions)
                .HasForeignKey(s => s.PlanId)
                .OnDelete(DeleteBehavior.Restrict);

            // Tenant - PaymentRecord
            builder.Entity<PaymentRecord>()
                .HasOne(p => p.Tenant)
                .WithMany(t => t.PaymentRecords)
                .HasForeignKey(p => p.TenantId)
                .OnDelete(DeleteBehavior.Cascade);

            // Tenant - Credit Ledger
            builder.Entity<TenantCreditLedger>()
                .HasOne(l => l.Tenant)
                .WithMany(t => t.CreditLedgers)
                .HasForeignKey(l => l.TenantId)
                .OnDelete(DeleteBehavior.Cascade);

            builder.Entity<TenantCreditLedger>()
                .HasIndex(l => new { l.TenantId, l.CreatedAt });

            // Subscription index
            builder.Entity<Subscription>()
                .HasIndex(s => new { s.TenantId, s.StartDate });

            // === PaymentTransaction Configuration ===
            builder.Entity<PaymentTransaction>()
                .HasOne(pt => pt.PaymentRecord)
                .WithMany(pr => pr.Transactions)
                .HasForeignKey(pt => pt.PaymentRecordId)
                .OnDelete(DeleteBehavior.Cascade);

            builder.Entity<PaymentTransaction>()
                .HasIndex(pt => new { pt.PaymentRecordId, pt.Status });

            builder.Entity<PaymentTransaction>()
                .HasIndex(pt => pt.GatewayTransactionId);

            // === RefundRequest Configuration ===
            builder.Entity<RefundRequest>()
                .HasOne(rr => rr.PaymentRecord)
                .WithMany()
                .HasForeignKey(rr => rr.PaymentRecordId)
                .OnDelete(DeleteBehavior.Restrict);

            builder.Entity<RefundRequest>()
                .HasIndex(rr => new { rr.TenantId, rr.Status });

            builder.Entity<RefundRequest>()
                .HasIndex(rr => rr.SubscriptionId);

            // === TenantPaymentGatewayConfig Configuration ===
            builder.Entity<TenantPaymentGatewayConfig>()
                .HasOne(c => c.Tenant)
                .WithMany()
                .HasForeignKey(c => c.TenantId)
                .OnDelete(DeleteBehavior.Restrict);

            builder.Entity<TenantPaymentGatewayConfig>()
                .HasIndex(c => new { c.TenantId, c.GatewayType })
                .IsUnique()
                .HasFilter("[IsDeleted] = 0");

            builder.Entity<TenantPaymentGatewayConfig>()
                .HasIndex(c => c.Status);

            // === TenantPaymentConfigAudit Configuration ===
            builder.Entity<TenantPaymentConfigAudit>()
                .HasOne(a => a.TenantPaymentGatewayConfig)
                .WithMany(c => c.AuditLogs)
                .HasForeignKey(a => a.TenantPaymentGatewayConfigId);
            // === TenantZaloOAConfig Configuration ===
            builder.Entity<TenantZaloOAConfig>()
                .HasIndex(z => z.TenantId)
                .IsUnique();

            builder.Entity<TenantZaloOAConfig>()
                .HasIndex(z => z.AppId);

            builder.Entity<TenantZaloOAConfig>()
                .HasIndex(z => z.OAId);

            builder.Entity<TenantZaloOAConfig>()
                .HasOne(z => z.Tenant)
                .WithMany()
                .HasForeignKey(z => z.TenantId)
                .OnDelete(DeleteBehavior.Cascade);
        }
    }
}
