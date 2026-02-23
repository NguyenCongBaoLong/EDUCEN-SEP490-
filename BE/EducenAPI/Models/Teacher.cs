using System;
using System.Collections.Generic;

namespace EducenAPI.Models;

public partial class Teacher
{
    public int TeacherId { get; set; }

    public string? Specialization { get; set; }

    public string? Degree { get; set; }

    public virtual ICollection<Class> Classes { get; set; } = new List<Class>();

    public virtual User TeacherNavigation { get; set; } = null!;
}
