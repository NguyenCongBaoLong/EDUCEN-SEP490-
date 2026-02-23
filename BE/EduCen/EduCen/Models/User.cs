using System;
using System.Collections.Generic;

namespace EduCen.Models;

public partial class User
{
    public int UserId { get; set; }

    public int? TenantId { get; set; }

    public string? Username { get; set; }

    public string? PasswordHash { get; set; }

    public string? FullName { get; set; }

    public string? Email { get; set; }

    public string? AccountStatus { get; set; }

    public int? RoleId { get; set; }

    public virtual Assistant? Assistant { get; set; }

    public virtual ICollection<Attendance> Attendances { get; set; } = new List<Attendance>();

    public virtual Parent? Parent { get; set; }

    public virtual Role? Role { get; set; }

    public virtual Student? Student { get; set; }

    public virtual Teacher? Teacher { get; set; }

    public virtual Tenant? Tenant { get; set; }
}
