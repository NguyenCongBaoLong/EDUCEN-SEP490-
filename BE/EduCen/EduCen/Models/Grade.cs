using System;
using System.Collections.Generic;

namespace EduCen.Models;

public partial class Grade
{
    public int GradeId { get; set; }

    public int? SubId { get; set; }

    public decimal? Score { get; set; }

    public string? TeacherComment { get; set; }

    public DateTime? GradedAt { get; set; }

    public virtual Submission? Sub { get; set; }
}
