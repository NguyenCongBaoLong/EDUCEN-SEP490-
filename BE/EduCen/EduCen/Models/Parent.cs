using System;
using System.Collections.Generic;

namespace EduCen.Models;

public partial class Parent
{
    public int ParentId { get; set; }

    public string? PhoneNumber { get; set; }

    public string? Address { get; set; }

    public virtual User ParentNavigation { get; set; } = null!;

    public virtual ICollection<Student> Students { get; set; } = new List<Student>();
}
