using System;
using System.Collections.Generic;

namespace EducenAPI.Models;

public partial class LessonMaterial
{
    public int MaterialId { get; set; }

    public int ClassId { get; set; }

    public string? Title { get; set; }

    public string? FileUrl { get; set; }

    public string? ContentType { get; set; }

    public virtual Class Class { get; set; } = null!;
}
