using System;
using System.Collections.Generic;

namespace EducenAPI.Models;

public partial class Attendance
{
    public int AttendanceId { get; set; }

    public int ScheduleId { get; set; }

    public int StudentId { get; set; }

    public string? Status { get; set; }

    public int? UpdatedBy { get; set; }

    public DateTime? RecordedAt { get; set; }

    public virtual Schedule Schedule { get; set; } = null!;

    public virtual Student Student { get; set; } = null!;

    public virtual User? UpdatedByNavigation { get; set; }
}
