using System;
using System.Collections.Generic;

namespace EduCen.Models;

public partial class Schedule
{
    public int ScheduleId { get; set; }

    public int ClassId { get; set; }

    public int DayOfWeek { get; set; }

    public TimeOnly StartTime { get; set; }

    public TimeOnly EndTime { get; set; }

    public string? RoomInfo { get; set; }

    public virtual ICollection<Attendance> Attendances { get; set; } = new List<Attendance>();

    public virtual Class Class { get; set; } = null!;
}
