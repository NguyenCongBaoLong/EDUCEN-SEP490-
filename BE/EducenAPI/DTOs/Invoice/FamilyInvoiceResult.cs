namespace EducenAPI.DTOs.Invoice
{
    public class FamilyInvoiceResult
    {
        public bool Success { get; set; }
        public string InvoiceId { get; set; } = string.Empty;
        public string Message { get; set; } = string.Empty;
        public decimal TotalAmount { get; set; }
        public int StudentCount { get; set; }
        public List<string> Errors { get; set; } = new();
    }
}
