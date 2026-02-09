using System;
using System.Collections.Generic;

namespace EduCen.Models;

public partial class Subject
{
    public int SubjectId { get; set; }

    public string SubjectName { get; set; } = null!;

    public string? Description { get; set; }

    public virtual ICollection<Class> Classes { get; set; } = new List<Class>();
}
