using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;

namespace EducenAPI.Models;

public partial class Attendance
{
    public int AttendanceId { get; set; }

    public int SessionId { get; set; }

    public int StudentId { get; set; }

    /// <summary>
    /// Status: 'present', 'absent', 'notYet' (default)
    /// </summary>
    [MaxLength(20)]
    public string Status { get; set; } = "notYet";

    public DateTime? RecordedAt { get; set; }

    public virtual Student Student { get; set; } = null!;

    public virtual User? UpdatedBy { get; set; }
    public ClassSession Session { get; set; } = null!;

}
