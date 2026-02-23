using System;
using System.Collections.Generic;

namespace EduCen.Models;

public partial class Attendance
{
    public int AttendanceId { get; set; }

    public int? ScheduleId { get; set; }

    public int? StudentId { get; set; }

    public string? Status { get; set; }

    public int? UpdatedBy { get; set; }

    public DateTime? RecordedAt { get; set; }

    public virtual Schedule? Schedule { get; set; }

    public virtual Student? Student { get; set; }

    public virtual User? UpdatedByNavigation { get; set; }
}
