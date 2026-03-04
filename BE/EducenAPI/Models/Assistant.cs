using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace EducenAPI.Models;

public partial class Assistant
{
    [Key]
    [ForeignKey("User")]
    public int UserId { get; set; }

    public string? SupportLevel { get; set; }

    public virtual User AssistantNavigation { get; set; } = null!;

    public virtual ICollection<Class> Classes { get; set; } = new List<Class>();
}
