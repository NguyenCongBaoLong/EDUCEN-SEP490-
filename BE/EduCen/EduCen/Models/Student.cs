using System;
using System.Collections.Generic;

namespace EduCen.Models;

public partial class Student
{
    public int StudentId { get; set; }

    public string? Email { get; set; }

    public string? PhoneNumber { get; set; }

    public string? EnrollmentStatus { get; set; }

    public virtual ICollection<Attendance> Attendances { get; set; } = new List<Attendance>();

    public virtual User StudentNavigation { get; set; } = null!;

    public virtual ICollection<Submission> Submissions { get; set; } = new List<Submission>();

    public virtual ICollection<Class> Classes { get; set; } = new List<Class>();

    public virtual ICollection<Parent> Parents { get; set; } = new List<Parent>();
}
