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
                new XElement("Disclaimer", "Đây là hóa đơn điện tử SANDBOX để demo, không có giá trị pháp lý thuế.")
            );

            var doc = new XDocument(new XDeclaration("1.0", "utf-8", "yes"), root);
            return doc.ToString();
        }

        public string BuildHtmlRepresentation(Invoice invoice, string tenantName, SandboxEInvoiceMetadata metadata)
        {
            var encoder = HtmlEncoder.Default;
            var sanitizedNote = SanitizeDisplayNote(invoice.PaymentNote);
            var localizedStatus = LocalizeStatus(invoice.Status);
            var localizedNote = LocalizeNote(sanitizedNote);
            return $@"<!doctype html>
<html>
<head>
  <meta charset='utf-8'/>
  <title>Hóa đơn điện tử sandbox</title>
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
    <div class='title'>HÓA ĐƠN ĐIỆN TỬ (SANDBOX DEMO)</div>
    <div class='muted'>Nhà cung cấp: {encoder.Encode(metadata.Provider)}</div>
    <div><strong>Số hóa đơn:</strong> {encoder.Encode(metadata.InvoiceNo)}</div>
    <div><strong>Mã tra cứu:</strong> {encoder.Encode(metadata.LookupCode)}</div>
    <div><strong>Ngày phát hành:</strong> {metadata.IssuedAt:dd/MM/yyyy HH:mm:ss}</div>

    <table>
      <tr><td><strong>Mã hóa đơn nội bộ</strong></td><td>{encoder.Encode(invoice.InvoiceNumber)}</td></tr>
      <tr><td><strong>Trung tâm</strong></td><td>{encoder.Encode(tenantName)}</td></tr>
      <tr><td><strong>Số tiền</strong></td><td>{invoice.Amount:N0} VND</td></tr>
      <tr><td><strong>Trạng thái</strong></td><td>{encoder.Encode(localizedStatus)}</td></tr>
      <tr><td><strong>Phương thức thanh toán</strong></td><td>{encoder.Encode(invoice.PaymentMethod ?? string.Empty)}</td></tr>
      <tr><td><strong>Thời điểm thanh toán</strong></td><td>{(invoice.PaidAt.HasValue ? invoice.PaidAt.Value.ToString("dd/MM/yyyy HH:mm:ss") : "-")}</td></tr>
      <tr><td><strong>Ghi chú</strong></td><td>{encoder.Encode(localizedNote)}</td></tr>
    </table>

    <div class='warn'>
      Đây là hóa đơn điện tử SANDBOX để demo, không có giá trị pháp lý thuế.
    </div>
  </div>
</body>
</html>";
        }

        public byte[] BuildPdfRepresentation(Invoice invoice, string tenantName, SandboxEInvoiceMetadata metadata)
        {
            var sanitizedNote = SanitizeDisplayNote(invoice.PaymentNote);
            var data = new List<(string Label, string Value)>
            {
                ("Mã hóa đơn nội bộ", invoice.InvoiceNumber),
                ("Trung tâm", tenantName),
                ("Số tiền", $"{invoice.Amount:N0} VND"),
                ("Trạng thái", invoice.Status),
                ("Phương thức thanh toán", invoice.PaymentMethod ?? string.Empty),
                ("Thời điểm thanh toán", invoice.PaidAt.HasValue ? invoice.PaidAt.Value.ToString("dd/MM/yyyy HH:mm:ss") : "-"),
                ("Ghi chú", sanitizedNote)
            };

            return BuildStyledPdf(
                "HÓA ĐƠN ĐIỆN TỬ (SANDBOX DEMO)",
                metadata,
                data,
                "Đây là hóa đơn điện tử SANDBOX để demo, không có giá trị pháp lý thuế."
            );
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
                new XElement("Disclaimer", "Đây là hóa đơn điện tử SANDBOX để demo, không có giá trị pháp lý thuế.")
            );

            var doc = new XDocument(new XDeclaration("1.0", "utf-8", "yes"), root);
            return doc.ToString();
        }

        public string BuildHtmlRepresentation(TuitionInvoice invoice, string tenantName, SandboxEInvoiceMetadata metadata)
        {
            var encoder = HtmlEncoder.Default;
            var sanitizedNote = SanitizeDisplayNote(invoice.Notes);
            var localizedStatus = LocalizeStatus(invoice.Status);
            var localizedNote = LocalizeNote(sanitizedNote);
            return $@"<!doctype html>
<html>
<head>
  <meta charset='utf-8'/>
  <title>Hóa đơn điện tử sandbox</title>
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
    <div class='title'>HÓA ĐƠN ĐIỆN TỬ HỌC PHÍ (SANDBOX DEMO)</div>
    <div class='muted'>Nhà cung cấp: {encoder.Encode(metadata.Provider)}</div>
    <div><strong>Số hóa đơn:</strong> {encoder.Encode(metadata.InvoiceNo)}</div>
    <div><strong>Mã tra cứu:</strong> {encoder.Encode(metadata.LookupCode)}</div>
    <div><strong>Ngày phát hành:</strong> {metadata.IssuedAt:dd/MM/yyyy HH:mm:ss}</div>

    <table>
      <tr><td><strong>Trung tâm</strong></td><td>{encoder.Encode(tenantName)}</td></tr>
      <tr><td><strong>Kỳ học phí</strong></td><td>{invoice.InvoiceMonth:D2}/{invoice.InvoiceYear}</td></tr>
      <tr><td><strong>Số buổi học</strong></td><td>{invoice.AttendedSessions}/{invoice.TotalSessions}</td></tr>
      <tr><td><strong>Số tiền</strong></td><td>{invoice.FinalAmount:N0} VND</td></tr>
      <tr><td><strong>Trạng thái</strong></td><td>{encoder.Encode(localizedStatus)}</td></tr>
      <tr><td><strong>Thời điểm thanh toán</strong></td><td>{(invoice.PaidAt.HasValue ? invoice.PaidAt.Value.ToString("dd/MM/yyyy HH:mm:ss") : "-")}</td></tr>
      <tr><td><strong>Ghi chú</strong></td><td>{encoder.Encode(localizedNote)}</td></tr>
    </table>

    <div class='warn'>
      Đây là hóa đơn điện tử SANDBOX để demo, không có giá trị pháp lý thuế.
    </div>
  </div>
</body>
</html>";
        }

        public byte[] BuildPdfRepresentation(TuitionInvoice invoice, string tenantName, SandboxEInvoiceMetadata metadata)
        {
            var sanitizedNote = SanitizeDisplayNote(invoice.Notes);
            var data = new List<(string Label, string Value)>
            {
                ("Trung tâm", tenantName),
                ("Kỳ học phí", $"{invoice.InvoiceMonth:D2}/{invoice.InvoiceYear}"),
                ("Số buổi học", $"{invoice.AttendedSessions}/{invoice.TotalSessions}"),
                ("Số tiền", $"{invoice.FinalAmount:N0} VND"),
                ("Trạng thái", invoice.Status),
                ("Thời điểm thanh toán", invoice.PaidAt.HasValue ? invoice.PaidAt.Value.ToString("dd/MM/yyyy HH:mm:ss") : "-"),
                ("Ghi chú", sanitizedNote)
            };

            return BuildStyledPdf(
                "HÓA ĐƠN ĐIỆN TỬ HỌC PHÍ (SANDBOX DEMO)",
                metadata,
                data,
                "Đây là hóa đơn điện tử SANDBOX để demo, không có giá trị pháp lý thuế."
            );
        }

        private static byte[] BuildStyledPdf(string title, SandboxEInvoiceMetadata metadata, List<(string Label, string Value)> data, string disclaimer)
        {
            var contentBuilder = new StringBuilder();
            var y = 780;
            
            contentBuilder.AppendLine("BT");
            
            // Title
            contentBuilder.AppendLine("/F1 16 Tf");
            contentBuilder.AppendLine($"50 {y} Td");
            contentBuilder.AppendLine($"({EscapePdfText(title)}) Tj");
            y -= 30;
            
            // Provider info
            contentBuilder.AppendLine("/F2 10 Tf");
            contentBuilder.AppendLine($"50 {y} Td");
            contentBuilder.AppendLine($"(Provider: {EscapePdfText(metadata.Provider)}) Tj");
            y -= 20;
            contentBuilder.AppendLine($"50 {y} Td");
            contentBuilder.AppendLine($"(Số hóa đơn: {EscapePdfText(metadata.InvoiceNo)}) Tj");
            y -= 20;
            contentBuilder.AppendLine($"50 {y} Td");
            contentBuilder.AppendLine($"(Mã tra cứu: {EscapePdfText(metadata.LookupCode)}) Tj");
            y -= 20;
            contentBuilder.AppendLine($"50 {y} Td");
            contentBuilder.AppendLine($"(Ngày phát hành: {metadata.IssuedAt:dd/MM/yyyy HH:mm:ss}) Tj");
            y -= 30;
            
            // Draw table border
            contentBuilder.AppendLine("0.5 w");
            contentBuilder.AppendLine("0 0 0 RG");
            contentBuilder.AppendLine($"50 {y} m");
            contentBuilder.AppendLine("545 {y} l");
            contentBuilder.AppendLine("S");
            y -= 10;
            
            // Table content
            contentBuilder.AppendLine("/F2 11 Tf");
            foreach (var (label, value) in data)
            {
                contentBuilder.AppendLine($"50 {y} Td");
                contentBuilder.AppendLine($"({EscapePdfText(label)}:) Tj");
                contentBuilder.AppendLine($"300 {y} Td");
                contentBuilder.AppendLine($"({EscapePdfText(value)}) Tj");
                y -= 20;
                
                contentBuilder.AppendLine($"50 {y} m");
                contentBuilder.AppendLine("545 {y} l");
                contentBuilder.AppendLine("S");
                y -= 10;
            }
            
            // Warning box
            y -= 20;
            contentBuilder.AppendLine("0.5 w");
            contentBuilder.AppendLine("0.7 0.5 0.3 RG");
            contentBuilder.AppendLine($"50 {y} m");
            contentBuilder.AppendLine("545 {y} l");
            contentBuilder.AppendLine("545 {y-40} l");
            contentBuilder.AppendLine("50 {y-40} l");
            contentBuilder.AppendLine("50 {y} l");
            contentBuilder.AppendLine("S");
            y -= 30;
            
            contentBuilder.AppendLine("/F2 10 Tf");
            contentBuilder.AppendLine($"60 {y} Td");
            contentBuilder.AppendLine($"({EscapePdfText(disclaimer)}) Tj");
            
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
            pdf.AppendLine("3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R /F2 5 0 R >> >> /Contents 6 0 R >> endobj");

            offsets.Add(pdf.Length);
            pdf.AppendLine("4 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >> endobj");

            offsets.Add(pdf.Length);
            pdf.AppendLine("5 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj");

            offsets.Add(pdf.Length);
            pdf.AppendLine($"6 0 obj << /Length {Encoding.ASCII.GetByteCount(content)} >> stream");
            pdf.Append(content);
            pdf.AppendLine("endstream");
            pdf.AppendLine("endobj");

            var xrefStart = pdf.Length;
            pdf.AppendLine("xref");
            pdf.AppendLine("0 7");
            pdf.AppendLine("0000000000 65535 f ");
            foreach (var offset in offsets)
            {
                pdf.AppendLine($"{offset:D10} 00000 n ");
            }
            pdf.AppendLine("trailer << /Size 7 /Root 1 0 R >>");
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

        private static string LocalizeStatus(string? status)
        {
            if (string.IsNullOrWhiteSpace(status))
                return "-";

            return status.Trim().ToLowerInvariant() switch
            {
                "paid" => "Đã thanh toán",
                "unpaid" => "Chưa thanh toán",
                "cancelled" => "Đã hủy",
                "draft" => "Nháp",
                _ => status
            };
        }

        private static string LocalizeNote(string note)
        {
            if (string.IsNullOrWhiteSpace(note))
                return string.Empty;

            var normalized = note.Trim();
            var lower = normalized.ToLowerInvariant();

            if (lower == "cash payment at center")
                return "Thanh toán tiền mặt tại trung tâm";

            // Keep only user-facing payment success text, remove technical metadata.
            if (lower.StartsWith("thanh toan online thanh cong") || lower.StartsWith("thanh toán online thành công"))
                return "Thanh toán online thành công.";

            return note;
        }
    }
}
