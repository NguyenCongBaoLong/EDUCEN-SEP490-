using System.Security.Cryptography;
using System.Text;
using System.Text.Encodings.Web;
using System.Text.RegularExpressions;
using System.Xml.Linq;
using EducenAPI.Models;
using EducenAPI.Services.Interface;

namespace EducenAPI.Services
{
    public class EInvoiceSandboxService : IEInvoiceSandboxService
    {
        public SandboxEInvoiceMetadata BuildMetadata(Invoice invoice, string tenantName)
        {
            var issuedAt = invoice.PaidAt ?? invoice.CreatedAt;
            var seed = $"{invoice.InvoiceId}|{invoice.InvoiceNumber}|{issuedAt:O}|{invoice.Amount:F0}|{tenantName}";
            var hash = SHA256.HashData(Encoding.UTF8.GetBytes(seed));
            var token = Convert.ToHexString(hash)[..12];

            return new SandboxEInvoiceMetadata
            {
                Provider = "Sandbox-Demo",
                InvoiceNo = $"SBOX-{issuedAt:yyyyMMdd}-{token[..6]}",
                LookupCode = $"LKP-{token}",
                IssuedAt = issuedAt
            };
        }

        public SandboxEInvoiceMetadata BuildMetadata(TuitionInvoice invoice, string tenantName)
        {
            var issuedAt = invoice.PaidAt ?? invoice.CreatedAt;
            var seed = $"{invoice.InvoiceId}|{invoice.InvoiceMonth}/{invoice.InvoiceYear}|{issuedAt:O}|{invoice.FinalAmount:F0}|{tenantName}";
            var hash = SHA256.HashData(Encoding.UTF8.GetBytes(seed));
            var token = Convert.ToHexString(hash)[..12];

            return new SandboxEInvoiceMetadata
            {
                Provider = "Sandbox-Demo",
                InvoiceNo = $"SBOX-TUI-{issuedAt:yyyyMMdd}-{token[..6]}",
                LookupCode = $"LKP-{token}",
                IssuedAt = issuedAt
            };
        }

        public string BuildXml(Invoice invoice, string tenantName, SandboxEInvoiceMetadata metadata)
        {
            var sanitizedNote = SanitizeDisplayNote(invoice.PaymentNote);
            var root = new XElement("EInvoiceSandbox",
                new XAttribute("version", "1.0"),
                new XElement("Provider", metadata.Provider),
                new XElement("InvoiceNo", metadata.InvoiceNo),
                new XElement("LookupCode", metadata.LookupCode),
                new XElement("IssuedAt", metadata.IssuedAt.ToString("O")),
                new XElement("InternalInvoice",
                    new XElement("InvoiceNumber", invoice.InvoiceNumber),
                    new XElement("TenantName", tenantName),
                    new XElement("Amount", invoice.Amount.ToString("F0")),
                    new XElement("Status", invoice.Status),
                    new XElement("PaymentMethod", invoice.PaymentMethod ?? string.Empty),
                    new XElement("PaidAt", invoice.PaidAt?.ToString("O") ?? string.Empty),
                    new XElement("CreatedAt", invoice.CreatedAt.ToString("O")),
                    new XElement("Note", sanitizedNote)
                ),
                new XElement("Disclaimer", "Day la hoa don dien tu SANDBOX de demo, khong co gia tri phap ly thue.")
            );

            var doc = new XDocument(new XDeclaration("1.0", "utf-8", "yes"), root);
            return doc.ToString();
        }

        public string BuildHtmlRepresentation(Invoice invoice, string tenantName, SandboxEInvoiceMetadata metadata)
        {
            var encoder = HtmlEncoder.Default;
            var sanitizedNote = SanitizeDisplayNote(invoice.PaymentNote);
            return $@"<!doctype html>
<html>
<head>
  <meta charset='utf-8'/>
  <title>Hoa don dien tu sandbox</title>
  <style>
    body {{ font-family: Arial, sans-serif; margin: 24px; color: #111827; }}
    .card {{ border: 1px solid #e5e7eb; border-radius: 10px; padding: 16px; }}
    .muted {{ color: #6b7280; }}
    .title {{ font-size: 20px; font-weight: 700; margin-bottom: 8px; }}
    table {{ width: 100%; border-collapse: collapse; margin-top: 10px; }}
    td {{ border-bottom: 1px solid #f3f4f6; padding: 8px; vertical-align: top; }}
    .warn {{ margin-top: 14px; background: #fff7ed; border: 1px solid #fdba74; padding: 10px; border-radius: 8px; color: #9a3412; }}
  </style>
</head>
<body>
  <div class='card'>
    <div class='title'>HOA DON DIEN TU (SANDBOX DEMO)</div>
    <div class='muted'>Provider: {encoder.Encode(metadata.Provider)}</div>
    <div><strong>So hoa don:</strong> {encoder.Encode(metadata.InvoiceNo)}</div>
    <div><strong>Ma tra cuu:</strong> {encoder.Encode(metadata.LookupCode)}</div>
    <div><strong>Ngay phat hanh:</strong> {metadata.IssuedAt:dd/MM/yyyy HH:mm:ss}</div>

    <table>
      <tr><td><strong>Ma hoa don noi bo</strong></td><td>{encoder.Encode(invoice.InvoiceNumber)}</td></tr>
      <tr><td><strong>Trung tam</strong></td><td>{encoder.Encode(tenantName)}</td></tr>
      <tr><td><strong>So tien</strong></td><td>{invoice.Amount:N0} VND</td></tr>
      <tr><td><strong>Trang thai</strong></td><td>{encoder.Encode(invoice.Status)}</td></tr>
      <tr><td><strong>Phuong thuc thanh toan</strong></td><td>{encoder.Encode(invoice.PaymentMethod ?? string.Empty)}</td></tr>
      <tr><td><strong>Thoi diem thanh toan</strong></td><td>{(invoice.PaidAt.HasValue ? invoice.PaidAt.Value.ToString("dd/MM/yyyy HH:mm:ss") : "-")}</td></tr>
      <tr><td><strong>Ghi chu</strong></td><td>{encoder.Encode(sanitizedNote)}</td></tr>
    </table>

    <div class='warn'>
      Day la hoa don dien tu SANDBOX de demo, khong co gia tri phap ly thue.
    </div>
  </div>
</body>
</html>";
        }

        public byte[] BuildPdfRepresentation(Invoice invoice, string tenantName, SandboxEInvoiceMetadata metadata)
        {
            var sanitizedNote = SanitizeDisplayNote(invoice.PaymentNote);
            var lines = new List<string>
            {
                "HOA DON DIEN TU (SANDBOX DEMO)",
                $"Provider: {metadata.Provider}",
                $"So hoa don: {metadata.InvoiceNo}",
                $"Ma tra cuu: {metadata.LookupCode}",
                $"Ngay phat hanh: {metadata.IssuedAt:dd/MM/yyyy HH:mm:ss}",
                "",
                $"Ma hoa don noi bo: {invoice.InvoiceNumber}",
                $"Trung tam: {tenantName}",
                $"So tien: {invoice.Amount:N0} VND",
                $"Trang thai: {invoice.Status}",
                $"Phuong thuc thanh toan: {invoice.PaymentMethod ?? string.Empty}",
                $"Thoi diem thanh toan: {(invoice.PaidAt.HasValue ? invoice.PaidAt.Value.ToString("dd/MM/yyyy HH:mm:ss") : "-")}",
                $"Ghi chu: {sanitizedNote}",
                "",
                "Day la hoa don dien tu SANDBOX de demo, khong co gia tri phap ly thue."
            };

            return BuildSimplePdf(lines);
        }

        public string BuildXml(TuitionInvoice invoice, string tenantName, SandboxEInvoiceMetadata metadata)
        {
            var sanitizedNote = SanitizeDisplayNote(invoice.Notes);
            var root = new XElement("EInvoiceSandbox",
                new XAttribute("version", "1.0"),
                new XElement("Provider", metadata.Provider),
                new XElement("InvoiceNo", metadata.InvoiceNo),
                new XElement("LookupCode", metadata.LookupCode),
                new XElement("IssuedAt", metadata.IssuedAt.ToString("O")),
                new XElement("InternalInvoice",
                    new XElement("TenantName", tenantName),
                    new XElement("InvoicePeriod", $"{invoice.InvoiceMonth:D2}/{invoice.InvoiceYear}"),
                    new XElement("TotalSessions", invoice.TotalSessions),
                    new XElement("AttendedSessions", invoice.AttendedSessions),
                    new XElement("AbsentSessions", invoice.AbsentSessions),
                    new XElement("ExcusedSessions", invoice.ExcusedSessions),
                    new XElement("PricePerSession", invoice.PricePerSession.ToString("F0")),
                    new XElement("FinalAmount", invoice.FinalAmount.ToString("F0")),
                    new XElement("Status", invoice.Status),
                    new XElement("PaidAt", invoice.PaidAt?.ToString("O") ?? string.Empty),
                    new XElement("CreatedAt", invoice.CreatedAt.ToString("O")),
                    new XElement("Note", sanitizedNote)
                ),
                new XElement("Disclaimer", "Day la hoa don dien tu SANDBOX de demo, khong co gia tri phap ly thue.")
            );

            var doc = new XDocument(new XDeclaration("1.0", "utf-8", "yes"), root);
            return doc.ToString();
        }

        public string BuildHtmlRepresentation(TuitionInvoice invoice, string tenantName, SandboxEInvoiceMetadata metadata)
        {
            var encoder = HtmlEncoder.Default;
            var sanitizedNote = SanitizeDisplayNote(invoice.Notes);
            return $@"<!doctype html>
<html>
<head>
  <meta charset='utf-8'/>
  <title>Hoa don dien tu sandbox</title>
  <style>
    body {{ font-family: Arial, sans-serif; margin: 24px; color: #111827; }}
    .card {{ border: 1px solid #e5e7eb; border-radius: 10px; padding: 16px; }}
    .muted {{ color: #6b7280; }}
    .title {{ font-size: 20px; font-weight: 700; margin-bottom: 8px; }}
    table {{ width: 100%; border-collapse: collapse; margin-top: 10px; }}
    td {{ border-bottom: 1px solid #f3f4f6; padding: 8px; vertical-align: top; }}
    .warn {{ margin-top: 14px; background: #fff7ed; border: 1px solid #fdba74; padding: 10px; border-radius: 8px; color: #9a3412; }}
  </style>
</head>
<body>
  <div class='card'>
    <div class='title'>HOA DON DIEN TU HOC PHI (SANDBOX DEMO)</div>
    <div class='muted'>Provider: {encoder.Encode(metadata.Provider)}</div>
    <div><strong>So hoa don:</strong> {encoder.Encode(metadata.InvoiceNo)}</div>
    <div><strong>Ma tra cuu:</strong> {encoder.Encode(metadata.LookupCode)}</div>
    <div><strong>Ngay phat hanh:</strong> {metadata.IssuedAt:dd/MM/yyyy HH:mm:ss}</div>

    <table>
      <tr><td><strong>Trung tam</strong></td><td>{encoder.Encode(tenantName)}</td></tr>
      <tr><td><strong>Ky hoc phi</strong></td><td>{invoice.InvoiceMonth:D2}/{invoice.InvoiceYear}</td></tr>
      <tr><td><strong>So buoi hoc</strong></td><td>{invoice.AttendedSessions}/{invoice.TotalSessions}</td></tr>
      <tr><td><strong>So tien</strong></td><td>{invoice.FinalAmount:N0} VND</td></tr>
      <tr><td><strong>Trang thai</strong></td><td>{encoder.Encode(invoice.Status)}</td></tr>
      <tr><td><strong>Thoi diem thanh toan</strong></td><td>{(invoice.PaidAt.HasValue ? invoice.PaidAt.Value.ToString("dd/MM/yyyy HH:mm:ss") : "-")}</td></tr>
      <tr><td><strong>Ghi chu</strong></td><td>{encoder.Encode(sanitizedNote)}</td></tr>
    </table>

    <div class='warn'>
      Day la hoa don dien tu SANDBOX de demo, khong co gia tri phap ly thue.
    </div>
  </div>
</body>
</html>";
        }

        public byte[] BuildPdfRepresentation(TuitionInvoice invoice, string tenantName, SandboxEInvoiceMetadata metadata)
        {
            var sanitizedNote = SanitizeDisplayNote(invoice.Notes);
            var lines = new List<string>
            {
                "HOA DON DIEN TU HOC PHI (SANDBOX DEMO)",
                $"Provider: {metadata.Provider}",
                $"So hoa don: {metadata.InvoiceNo}",
                $"Ma tra cuu: {metadata.LookupCode}",
                $"Ngay phat hanh: {metadata.IssuedAt:dd/MM/yyyy HH:mm:ss}",
                "",
                $"Trung tam: {tenantName}",
                $"Ky hoc phi: {invoice.InvoiceMonth:D2}/{invoice.InvoiceYear}",
                $"So buoi hoc: {invoice.AttendedSessions}/{invoice.TotalSessions}",
                $"So tien: {invoice.FinalAmount:N0} VND",
                $"Trang thai: {invoice.Status}",
                $"Thoi diem thanh toan: {(invoice.PaidAt.HasValue ? invoice.PaidAt.Value.ToString("dd/MM/yyyy HH:mm:ss") : "-")}",
                $"Ghi chu: {sanitizedNote}",
                "",
                "Day la hoa don dien tu SANDBOX de demo, khong co gia tri phap ly thue."
            };

            return BuildSimplePdf(lines);
        }

        private static byte[] BuildSimplePdf(IEnumerable<string> lines)
        {
            var normalized = lines
                .Where(l => !string.IsNullOrWhiteSpace(l) || l == string.Empty)
                .Select(EscapePdfText)
                .ToList();

            var contentBuilder = new StringBuilder();
            contentBuilder.AppendLine("BT");
            contentBuilder.AppendLine("/F1 12 Tf");
            contentBuilder.AppendLine("50 800 Td");
            for (var i = 0; i < normalized.Count; i++)
            {
                if (i == 0)
                {
                    contentBuilder.AppendLine($"({normalized[i]}) Tj");
                }
                else
                {
                    contentBuilder.AppendLine("0 -16 Td");
                    contentBuilder.AppendLine($"({normalized[i]}) Tj");
                }
            }
            contentBuilder.AppendLine("ET");

            var content = contentBuilder.ToString();
            var pdf = new StringBuilder();
            var offsets = new List<int>();

            pdf.AppendLine("%PDF-1.4");

            offsets.Add(pdf.Length);
            pdf.AppendLine("1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj");

            offsets.Add(pdf.Length);
            pdf.AppendLine("2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj");

            offsets.Add(pdf.Length);
            pdf.AppendLine("3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >> endobj");

            offsets.Add(pdf.Length);
            pdf.AppendLine("4 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj");

            offsets.Add(pdf.Length);
            pdf.AppendLine($"5 0 obj << /Length {Encoding.ASCII.GetByteCount(content)} >> stream");
            pdf.Append(content);
            pdf.AppendLine("endstream");
            pdf.AppendLine("endobj");

            var xrefStart = pdf.Length;
            pdf.AppendLine("xref");
            pdf.AppendLine("0 6");
            pdf.AppendLine("0000000000 65535 f ");
            foreach (var offset in offsets)
            {
                pdf.AppendLine($"{offset:D10} 00000 n ");
            }
            pdf.AppendLine("trailer << /Size 6 /Root 1 0 R >>");
            pdf.AppendLine("startxref");
            pdf.AppendLine(xrefStart.ToString());
            pdf.AppendLine("%%EOF");

            return Encoding.ASCII.GetBytes(pdf.ToString());
        }

        private static string EscapePdfText(string input)
        {
            return input
                .Replace("\\", "\\\\")
                .Replace("(", "\\(")
                .Replace(")", "\\)");
        }

        private static string SanitizeDisplayNote(string? note)
        {
            if (string.IsNullOrWhiteSpace(note))
            {
                return string.Empty;
            }

            var sanitized = note;
            sanitized = Regex.Replace(
                sanitized,
                @"(?i)\bpaymentrecordid\b\s*[:=]\s*[\w-]+",
                string.Empty);
            sanitized = Regex.Replace(
                sanitized,
                @"(?i)\binvoiceid\b\s*[:=]\s*[\w-]+",
                string.Empty);
            sanitized = Regex.Replace(sanitized, @"\s*\|\s*\|\s*", " | ");
            sanitized = Regex.Replace(sanitized, @"^\s*\|\s*|\s*\|\s*$", string.Empty);
            sanitized = Regex.Replace(sanitized, @"\s{2,}", " ");
            return sanitized.Trim();
        }
    }
}
