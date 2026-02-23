using System;
using System.Collections.Generic;

namespace EduCen.Models;

public partial class Subject
{
    public int SubjectId { get; set; }

    public int? TenantId { get; set; }

    public string? SubjectName { get; set; }

    public string? Description { get; set; }

    public virtual ICollection<Class> Classes { get; set; } = new List<Class>();

    public virtual Tenant? Tenant { get; set; }
}
