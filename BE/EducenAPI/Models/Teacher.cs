using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace EducenAPI.Models;

public partial class Teacher
{
    [Key]
    [ForeignKey("User")]
    public int UserId { get; set; }

    public string? Specialization { get; set; }

    public string? Degree { get; set; }

    public virtual ICollection<Class> Classes { get; set; } = new List<Class>();

    public virtual User TeacherNavigation { get; set; } = null!;
}
