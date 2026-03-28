using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;

namespace EducenAPI.Models;

public partial class User
{
    [Key]
    public int UserId { get; set; }

    public string? Username { get; set; } = null!;

    public string? PasswordHash { get; set; } = null!;

    public string AccountStatus { get; set; } = null!;

    public int RoleId { get; set; }

    public string? FullName { get; set; }
    public string? PhoneNumber { get; set; }
    public string? Email { get; set; }

    public string? Address { get; set; }
    public bool IsAccountSent { get; set; } = false;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public virtual Assistant? Assistant { get; set; }

    public virtual ICollection<Attendance> Attendances { get; set; } = new List<Attendance>();

    public virtual Parent? Parent { get; set; }

    public virtual Role Role { get; set; } = null!;

    public virtual Student? Student { get; set; }

    public virtual Teacher? Teacher { get; set; }
    public virtual ICollection<SupportRequest> SentRequests { get; set; } = new List<SupportRequest>();
    public virtual ICollection<SupportRequest> ReceiveRequests { get; set; } = new List<SupportRequest>();

}
