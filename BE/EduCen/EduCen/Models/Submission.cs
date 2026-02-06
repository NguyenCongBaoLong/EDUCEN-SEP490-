using System;
using System.Collections.Generic;

namespace EduCen.Models;

public partial class Submission
{
    public int SubId { get; set; }

    public int? AsmId { get; set; }

    public int? StudentId { get; set; }

    public string? FileUrl { get; set; }

    public DateTime? SubmittedAt { get; set; }

    public string? Status { get; set; }

    public virtual Assignment? Asm { get; set; }

    public virtual Grade? Grade { get; set; }

    public virtual Student? Student { get; set; }
}
