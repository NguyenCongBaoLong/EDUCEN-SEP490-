using System;
using System.Collections.Generic;

namespace EduCen.Models;

public partial class Class
{
    public int ClassId { get; set; }

    public int TeacherId { get; set; }

    public int? AssistantId { get; set; }

    public int SubjectId { get; set; }

    public string? ClassName { get; set; }

    public string? SyllabusContent { get; set; }

    public string? Description { get; set; }

    public string? Status { get; set; }

    public virtual ICollection<Assignment> Assignments { get; set; } = new List<Assignment>();

    public virtual Assistant? Assistant { get; set; }

    public virtual ICollection<LessonMaterial> LessonMaterials { get; set; } = new List<LessonMaterial>();

    public virtual ICollection<Schedule> Schedules { get; set; } = new List<Schedule>();

    public virtual Subject Subject { get; set; } = null!;

    public virtual Teacher Teacher { get; set; } = null!;

    public virtual ICollection<Student> Students { get; set; } = new List<Student>();
}

