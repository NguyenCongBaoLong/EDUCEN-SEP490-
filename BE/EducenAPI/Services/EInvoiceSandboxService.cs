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
            return $@"
  <div style='font-family: Arial, sans-serif; margin: 24px; color: #111827; border: 1px solid #e5e7eb; border-radius: 10px; padding: 20px; max-width: 600px;'>
    <div style='font-size: 24px; font-weight: 700; margin-bottom: 12px; color: #1e40af;'>HÓA ĐƠN ĐIỆN TỬ (SANDBOX DEMO)</div>
    <div style='color: #6b7280; font-size: 14px; margin-bottom: 16px;'>Nhà cung cấp: {encoder.Encode(metadata.Provider)}</div>
    
    <div style='margin-bottom: 20px; padding: 12px; background-color: #f9fafb; border-radius: 8px;'>
        <div><strong>Số hóa đơn:</strong> {encoder.Encode(metadata.InvoiceNo)}</div>
        <div><strong>Mã tra cứu:</strong> {encoder.Encode(metadata.LookupCode)}</div>
        <div><strong>Ngày phát hành:</strong> {metadata.IssuedAt:dd/MM/yyyy HH:mm:ss}</div>
    </div>

    <table style='width: 100%; border-collapse: collapse; margin-top: 10px;'>
      <tr><td style='border-bottom: 1px solid #f3f4f6; padding: 10px; font-weight: bold;'>Mã hóa đơn nội bộ</td><td style='border-bottom: 1px solid #f3f4f6; padding: 10px;'>{encoder.Encode(invoice.InvoiceNumber)}</td></tr>
      <tr><td style='border-bottom: 1px solid #f3f4f6; padding: 10px; font-weight: bold;'>Trung tâm</td><td style='border-bottom: 1px solid #f3f4f6; padding: 10px;'>{encoder.Encode(tenantName)}</td></tr>
      <tr><td style='border-bottom: 1px solid #f3f4f6; padding: 10px; font-weight: bold;'>Số tiền</td><td style='border-bottom: 1px solid #f3f4f6; padding: 10px; color: #b91c1c; font-weight: bold;'>{invoice.Amount:N0} VND</td></tr>
      <tr><td style='border-bottom: 1px solid #f3f4f6; padding: 10px; font-weight: bold;'>Trạng thái</td><td style='border-bottom: 1px solid #f3f4f6; padding: 10px;'>{encoder.Encode(localizedStatus)}</td></tr>
      <tr><td style='border-bottom: 1px solid #f3f4f6; padding: 10px; font-weight: bold;'>Phương thức thanh toán</td><td style='border-bottom: 1px solid #f3f4f6; padding: 10px;'>{encoder.Encode(invoice.PaymentMethod ?? string.Empty)}</td></tr>
      <tr><td style='border-bottom: 1px solid #f3f4f6; padding: 10px; font-weight: bold;'>Thời điểm thanh toán</td><td style='border-bottom: 1px solid #f3f4f6; padding: 10px;'>{(invoice.PaidAt.HasValue ? invoice.PaidAt.Value.ToString("dd/MM/yyyy HH:mm:ss") : "-")}</td></tr>
      <tr><td style='border-bottom: 1px solid #f3f4f6; padding: 10px; font-weight: bold;'>Ghi chú</td><td style='border-bottom: 1px solid #f3f4f6; padding: 10px;'>{encoder.Encode(localizedNote)}</td></tr>
    </table>

    <div style='margin-top: 24px; background: #fff7ed; border: 1px solid #fdba74; padding: 12px; border-radius: 8px; color: #9a3412; font-size: 13px;'>
      <strong>Lưu ý:</strong> Đây là hóa đơn điện tử SANDBOX để demo, không có giá trị pháp lý thuế.
    </div>
  </div>";
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
            return $@"
  <div style='font-family: Arial, sans-serif; margin: 24px; color: #111827; border: 1px solid #e5e7eb; border-radius: 10px; padding: 20px; max-width: 600px;'>
    <div style='font-size: 24px; font-weight: 700; margin-bottom: 12px; color: #1e40af;'>HÓA ĐƠN ĐIỆN TỬ HỌC PHÍ (SANDBOX DEMO)</div>
    <div style='color: #6b7280; font-size: 14px; margin-bottom: 16px;'>Nhà cung cấp: {encoder.Encode(metadata.Provider)}</div>
    
    <div style='margin-bottom: 20px; padding: 12px; background-color: #f9fafb; border-radius: 8px;'>
        <div><strong>Số hóa đơn:</strong> {encoder.Encode(metadata.InvoiceNo)}</div>
        <div><strong>Mã tra cứu:</strong> {encoder.Encode(metadata.LookupCode)}</div>
        <div><strong>Ngày phát hành:</strong> {metadata.IssuedAt:dd/MM/yyyy HH:mm:ss}</div>
    </div>

    <table style='width: 100%; border-collapse: collapse; margin-top: 10px;'>
      <tr><td style='border-bottom: 1px solid #f3f4f6; padding: 10px; font-weight: bold;'>Trung tâm</td><td style='border-bottom: 1px solid #f3f4f6; padding: 10px;'>{encoder.Encode(tenantName)}</td></tr>
      <tr><td style='border-bottom: 1px solid #f3f4f6; padding: 10px; font-weight: bold;'>Kỳ học phí</td><td style='border-bottom: 1px solid #f3f4f6; padding: 10px;'>{invoice.InvoiceMonth:D2}/{invoice.InvoiceYear}</td></tr>
      <tr><td style='border-bottom: 1px solid #f3f4f6; padding: 10px; font-weight: bold;'>Số buổi học</td><td style='border-bottom: 1px solid #f3f4f6; padding: 10px;'>{invoice.AttendedSessions}/{invoice.TotalSessions}</td></tr>
      <tr><td style='border-bottom: 1px solid #f3f4f6; padding: 10px; font-weight: bold;'>Số tiền</td><td style='border-bottom: 1px solid #f3f4f6; padding: 10px; color: #b91c1c; font-weight: bold;'>{invoice.FinalAmount:N0} VND</td></tr>
      <tr><td style='border-bottom: 1px solid #f3f4f6; padding: 10px; font-weight: bold;'>Trạng thái</td><td style='border-bottom: 1px solid #f3f4f6; padding: 10px;'>{encoder.Encode(localizedStatus)}</td></tr>
      <tr><td style='border-bottom: 1px solid #f3f4f6; padding: 10px; font-weight: bold;'>Thời điểm thanh toán</td><td style='border-bottom: 1px solid #f3f4f6; padding: 10px;'>{(invoice.PaidAt.HasValue ? invoice.PaidAt.Value.ToString("dd/MM/yyyy HH:mm:ss") : "-")}</td></tr>
      <tr><td style='border-bottom: 1px solid #f3f4f6; padding: 10px; font-weight: bold;'>Ghi chú</td><td style='border-bottom: 1px solid #f3f4f6; padding: 10px;'>{encoder.Encode(localizedNote)}</td></tr>
    </table>

    <div style='margin-top: 24px; background: #fff7ed; border: 1px solid #fdba74; padding: 12px; border-radius: 8px; color: #9a3412; font-size: 13px;'>
      <strong>Lưu ý:</strong> Đây là hóa đơn điện tử SANDBOX để demo, không có giá trị pháp lý thuế.
    </div>
  </div>";
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
            contentBuilder.AppendLine($"({EscapePdfText(RemoveDiacritics(title))}) Tj");
            
            // Provider info
            contentBuilder.AppendLine("/F2 10 Tf");
            contentBuilder.AppendLine($"0 -30 Td"); // Move from title
            contentBuilder.AppendLine($"(Provider: {EscapePdfText(RemoveDiacritics(metadata.Provider))}) Tj");
            
            contentBuilder.AppendLine($"0 -20 Td");
            contentBuilder.AppendLine($"(So hoa don: {EscapePdfText(metadata.InvoiceNo)}) Tj");
            
            contentBuilder.AppendLine($"0 -20 Td");
            contentBuilder.AppendLine($"(Ma tra cuu: {EscapePdfText(metadata.LookupCode)}) Tj");
            
            contentBuilder.AppendLine($"0 -20 Td");
            contentBuilder.AppendLine($"(Ngay phat hanh: {metadata.IssuedAt:dd/MM/yyyy HH:mm:ss}) Tj");
            
            // Draw table start
            contentBuilder.AppendLine("ET");
            y = 660; // Reset Y for relative moves logic if needed, but we used relative above
            
            contentBuilder.AppendLine("0.5 w");
            contentBuilder.AppendLine("0 0 0 RG");
            contentBuilder.AppendLine($"50 {y} m");
            contentBuilder.AppendLine($"545 {y} l");
            contentBuilder.AppendLine("S");
            
            contentBuilder.AppendLine("BT");
            contentBuilder.AppendLine("/F2 11 Tf");
            contentBuilder.AppendLine($"50 {y - 20} Td"); // Move to first row
            
            foreach (var (label, value) in data)
            {
                contentBuilder.AppendLine($"({EscapePdfText(RemoveDiacritics(label))}:) Tj");
                contentBuilder.AppendLine($"250 0 Td"); // Move right for value
                contentBuilder.AppendLine($"({EscapePdfText(RemoveDiacritics(value))}) Tj");
                
                // Move back and down for next row
                contentBuilder.AppendLine($"-250 -30 Td");
            }
            contentBuilder.AppendLine("ET");
            
            // Warning box (using absolute for line drawing)
            var tableEndY = y - (data.Count * 30) - 10;
            contentBuilder.AppendLine("0.5 w");
            contentBuilder.AppendLine("0.7 0.5 0.3 RG");
            contentBuilder.AppendLine($"50 {tableEndY} m");
            contentBuilder.AppendLine($"545 {tableEndY} l");
            contentBuilder.AppendLine($"545 {tableEndY - 40} l");
            contentBuilder.AppendLine($"50 {tableEndY - 40} l");
            contentBuilder.AppendLine($"50 {tableEndY} l");
            contentBuilder.AppendLine("S");
            
            contentBuilder.AppendLine("BT");
            contentBuilder.AppendLine("/F2 10 Tf");
            contentBuilder.AppendLine($"60 {tableEndY - 25} Td");
            contentBuilder.AppendLine($"({EscapePdfText(RemoveDiacritics(disclaimer))}) Tj");
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

        private static string RemoveDiacritics(string text)
        {
            if (string.IsNullOrWhiteSpace(text))
                return text;

            text = text.Normalize(NormalizationForm.FormD);
            var chars = text.Where(c => System.Globalization.CharUnicodeInfo.GetUnicodeCategory(c) != System.Globalization.UnicodeCategory.NonSpacingMark).ToArray();
            var result = new string(chars).Normalize(NormalizationForm.FormC);
            
            // Handle some specific Vietnamese characters that don't normalize well
            return result
                .Replace("đ", "d")
                .Replace("Đ", "D");
        }
    }
}
