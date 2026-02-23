using System;
using System.Collections.Generic;

namespace EduCen.Models;

public partial class Tenant
{
    public int TenantId { get; set; }

    public int? PlanId { get; set; }

    public string? TenantName { get; set; }

    public string? DomainUrl { get; set; }

    public string? Status { get; set; }

    public DateTime? CreatedAt { get; set; }

    public virtual ICollection<Class> Classes { get; set; } = new List<Class>();

    public virtual ICollection<PaymentRecord> PaymentRecords { get; set; } = new List<PaymentRecord>();

    public virtual Subscription? Plan { get; set; }

    public virtual ICollection<Subject> Subjects { get; set; } = new List<Subject>();

    public virtual ICollection<User> Users { get; set; } = new List<User>();
}
