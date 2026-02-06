using System;
using System.Collections.Generic;

namespace EduCen.Models;

public partial class PaymentRecord
{
    public int PaymentId { get; set; }

    public int? TenantId { get; set; }

    public decimal? Amount { get; set; }

    public string? Status { get; set; }

    public DateTime? PaymentDate { get; set; }

    public virtual Tenant? Tenant { get; set; }
}
