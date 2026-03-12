using System;
using System.Collections.Generic;

namespace EducenAPI.Models;

public partial class Schedule
{
    public int ScheduleId { get; set; }

    public int ClassId { get; set; }

    public int DayOfWeek { get; set; }

    public TimeOnly StartTime { get; set; }

    public TimeOnly EndTime { get; set; }

    public virtual Class Class { get; set; } = null!;
    public virtual ICollection<ClassSession> Sessions { get; set; } = new List<ClassSession>();

}
