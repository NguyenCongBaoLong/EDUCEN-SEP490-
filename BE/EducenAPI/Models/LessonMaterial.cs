using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;

namespace EducenAPI.Models;

public partial class LessonMaterial
{
    [Key]
    public int MaterialId { get; set; }

    public int? SessionId { get; set; }

    public int? ClassId { get; set; }

    public string? Title { get; set; }

    public string? FileUrl { get; set; }

    public string? ContentType { get; set; }

    public virtual ClassSession? Session { get; set; }
}
