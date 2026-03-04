using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace EducenAPI.Models;

public partial class Parent
{
    [Key]
    [ForeignKey("User")]
    public int UserId { get; set; }

    public virtual User ParentNavigation { get; set; } = null!;

    public virtual ICollection<Student> Students { get; set; } = new List<Student>();
}
