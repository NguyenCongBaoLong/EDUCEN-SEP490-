using System;
using System.Collections.Generic;

namespace EduCen.Models;

public partial class Subscription
{
    public int PlanId { get; set; }

    public string? PlanName { get; set; }

    public decimal? Price { get; set; }

    public int? LimitUsers { get; set; }

    public string? Features { get; set; }

    public virtual ICollection<Tenant> Tenants { get; set; } = new List<Tenant>();
}
