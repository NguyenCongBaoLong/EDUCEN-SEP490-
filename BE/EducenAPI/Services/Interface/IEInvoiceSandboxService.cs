using EducenAPI.Models;

namespace EducenAPI.Services.Interface
{
    public interface IEInvoiceSandboxService
    {
        SandboxEInvoiceMetadata BuildMetadata(Invoice invoice, string tenantName);
        SandboxEInvoiceMetadata BuildMetadata(TuitionInvoice invoice, string tenantName);
        string BuildXml(Invoice invoice, string tenantName, SandboxEInvoiceMetadata metadata);
        string BuildXml(TuitionInvoice invoice, string tenantName, SandboxEInvoiceMetadata metadata);
        string BuildHtmlRepresentation(Invoice invoice, string tenantName, SandboxEInvoiceMetadata metadata);
        string BuildHtmlRepresentation(TuitionInvoice invoice, string tenantName, SandboxEInvoiceMetadata metadata);
        byte[] BuildPdfRepresentation(Invoice invoice, string tenantName, SandboxEInvoiceMetadata metadata);
        byte[] BuildPdfRepresentation(TuitionInvoice invoice, string tenantName, SandboxEInvoiceMetadata metadata);
    }

    public sealed class SandboxEInvoiceMetadata
    {
        public string Provider { get; set; } = "Sandbox-Demo";
        public string InvoiceNo { get; set; } = string.Empty;
        public string LookupCode { get; set; } = string.Empty;
        public DateTime IssuedAt { get; set; }
    }
}
