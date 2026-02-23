using System;
using System.Collections.Generic;

namespace EducenAPI.Models;

public partial class Assistant
{
    public int AssistantId { get; set; }

    public string? SupportLevel { get; set; }

    public virtual User AssistantNavigation { get; set; } = null!;

    public virtual ICollection<Class> Classes { get; set; } = new List<Class>();
}
