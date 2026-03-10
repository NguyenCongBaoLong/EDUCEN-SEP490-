using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;

namespace EducenAPI.Models;

public partial class Submission
{
    [Key]
    public int SubId { get; set; }

    public int AsmId { get; set; }

    public int StudentId { get; set; }

    public string? FileUrl { get; set; }

    public DateTime? SubmittedAt { get; set; }

    public string? Status { get; set; }
    public decimal? Score { get; set; }

    public string? TeacherComment { get; set; }

    public DateTime? GradedAt { get; set; }
    public bool IsPublished { get; set; } = false;

    public virtual Assignment Asm { get; set; } = null!;


    public virtual Student Student { get; set; } = null!;
}
