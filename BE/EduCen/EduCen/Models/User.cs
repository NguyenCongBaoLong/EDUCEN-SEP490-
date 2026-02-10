using System;
using System.Collections.Generic;

namespace EduCen.Models;

public partial class User
{
    public int UserId { get; set; }

    public string Username { get; set; } = null!;

    public string PasswordHash { get; set; } = null!;

    public string AccountStatus { get; set; } = null!;

    public int RoleId { get; set; }

    public string? FullName { get; set; }

    public virtual Assistant? Assistant { get; set; }

    public virtual ICollection<Attendance> Attendances { get; set; } = new List<Attendance>();

    public virtual Parent? Parent { get; set; }

    public virtual Role Role { get; set; } = null!;

    public virtual Student? Student { get; set; }

    public virtual Teacher? Teacher { get; set; }
}
