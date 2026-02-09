using System;
using System.Collections.Generic;

namespace EduCen.Models;

public partial class Assignment
{
    public int AsmId { get; set; }

    public int ClassId { get; set; }

    public string? Title { get; set; }

    public string? Description { get; set; }

    public string? FileUrl { get; set; }

    public DateTime? StartTime { get; set; }

    public DateTime? EndTime { get; set; }

    public virtual Class Class { get; set; } = null!;

    public virtual ICollection<Submission> Submissions { get; set; } = new List<Submission>();
}
