using System;
using System.Collections.Generic;

namespace EduCen.Models;

public partial class SystemAdmin
{
    public int SysAdminId { get; set; }

    public string? Username { get; set; }

    public string? PasswordHash { get; set; }

    public string? FullName { get; set; }

    public string? Email { get; set; }
}
