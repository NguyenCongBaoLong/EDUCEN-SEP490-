using EducenAPI.DTOs;
using EducenAPI.DTOs.Parents;
using EducenAPI.Services;
using System.IO;
using System.Net;
using System.Net.Mail;
using System.Net.Mime;

namespace EducenAPI.Ultils
{
    public class MailService
    {
        private readonly EmailSettings _systemAdminEmailSettings;
        private readonly EmailSettings _centerFlowEmailSettings;
        private readonly ICurrentTenantService _currentTenantService;

        public MailService(IConfiguration configuration, ICurrentTenantService currentTenantService)
        {
            _currentTenantService = currentTenantService;
            _systemAdminEmailSettings =
                configuration.GetSection("EmailProfiles:SystemAdmin").Get<EmailSettings>()
                ?? configuration.GetSection("EmailSettings").Get<EmailSettings>()
                ?? throw new InvalidOperationException("Missing SystemAdmin email settings.");

            _centerFlowEmailSettings =
                configuration.GetSection("EmailProfiles:CenterFlow").Get<EmailSettings>()
                ?? _systemAdminEmailSettings;
        }

        public async Task SendStudentAccount(string toEmail, string username, string password)
        {
            var mail = new MailMessage();
            var emailSettings = ResolveEmailSettings();
            mail.From = new MailAddress(emailSettings.Email);
            mail.To.Add(toEmail);
            mail.Subject = "Thong tin tai khoan hoc sinh";

            mail.Body = $@"
            Xin chao,

            Day la thong tin tai khoan cua ban:

            Tai khoan: {username}
            Mat khau: {password}

            Vui long dang nhap va doi mat khau.

            Tran trong.
        ";

            var smtp = new SmtpClient(emailSettings.Host, emailSettings.Port)
            {
                Credentials = new NetworkCredential(emailSettings.Email, emailSettings.Password),
                EnableSsl = true
            };

            await smtp.SendMailAsync(mail);
        }

        public async Task SendParentAccount(string toEmail, string username, string password)
        {
            var mail = new MailMessage();
            var emailSettings = ResolveEmailSettings();
            mail.From = new MailAddress(emailSettings.Email);
            mail.To.Add(toEmail);
            mail.Subject = "Thong tin tai khoan phu huynh - Educen";

            mail.Body = $@"
            Xin chao,

            Chao mung ban den voi he thong Educen. Day la thong tin tai khoan truy cap danh cho phu huynh:

            Tai khoan (Username): {username}
            Mat khau (Password): {password}

            Ban co the su dung tai khoan nay de theo doi tinh hinh hoc tap cua con em minh.
            Vui long dang nhap va doi mat khau ngay trong lan dau su dung.

            Tran trong,
            Doi ngu Educen.
        ";

            var smtp = new SmtpClient(emailSettings.Host, emailSettings.Port)
            {
                Credentials = new NetworkCredential(emailSettings.Email, emailSettings.Password),
                EnableSsl = true
            };

            await smtp.SendMailAsync(mail);
        }

        public async Task SendTeacherAccount(string toEmail, string username, string password)
        {
            var mail = new MailMessage();
            var emailSettings = ResolveEmailSettings();
            mail.From = new MailAddress(emailSettings.Email);
            mail.To.Add(toEmail);
            mail.Subject = "Thong tin tai khoan giao vien - Educen";

            mail.Body = $@"
            Xin chao,

            Chao mung ban den voi he thong Educen. Day la thong tin tai khoan truy cap danh cho giao vien:

            Tai khoan (Username): {username}
            Mat khau (Password): {password}

            Ban co the su dung tai khoan nay de quan ly lop hoc va bai giang.
            Vui long dang nhap va doi mat khau ngay trong lan dau su dung.

            Tran trong,
            Doi ngu Educen.
        ";

            var smtp = new SmtpClient(emailSettings.Host, emailSettings.Port)
            {
                Credentials = new NetworkCredential(emailSettings.Email, emailSettings.Password),
                EnableSsl = true
            };

            await smtp.SendMailAsync(mail);
        }

        public async Task SendResetPasswordEmail(string toEmail, string resetCode)
        {
            var mail = new MailMessage();
            var emailSettings = ResolveEmailSettings();
            mail.From = new MailAddress(emailSettings.Email);
            mail.To.Add(toEmail);
            mail.Subject = "Ma xac thuc dat lai mat khau - Educen";

            mail.Body = $@"
            Xin chao,

            Chung toi nhan duoc yeu cau dat lai mat khau cho tai khoan lien ket voi email nay.
            
            Vui long su dung ma xac thuc gom 6 chu so ben duoi de hoan tat qua trinh dat lai mat khau:
            
            {resetCode}
            
            Ma nay co hieu luc trong vong 15 phut. Neu ban khong yeu cau thay doi nay, hay bo qua email nay.

            Tran trong,
            Doi ngu Educen.
        ";

            var smtp = new SmtpClient(emailSettings.Host, emailSettings.Port)
            {
                Credentials = new NetworkCredential(emailSettings.Email, emailSettings.Password),
                EnableSsl = true
            };

            await smtp.SendMailAsync(mail);
        }

        public async Task SendEmailAsync(string toEmail, string subject, string body)
        {
            var emailSettings = ResolveEmailSettings();
            var mail = new MailMessage();
            mail.From = new MailAddress(emailSettings.Email);
            mail.To.Add(toEmail);
            mail.Subject = subject;
            mail.Body = body;
            mail.IsBodyHtml = true;

            var smtp = new SmtpClient(emailSettings.Host, emailSettings.Port)
            {
                Credentials = new NetworkCredential(emailSettings.Email, emailSettings.Password),
                EnableSsl = true
            };

            await smtp.SendMailAsync(mail);
        }

        public async Task SendEmailWithAttachmentsAsync(
            string toEmail,
            string subject,
            string body,
            IEnumerable<(string FileName, string ContentType, byte[] Content)> attachments)
        {
            var emailSettings = ResolveEmailSettings();
            using var mail = new MailMessage();
            mail.From = new MailAddress(emailSettings.Email);
            mail.To.Add(toEmail);
            mail.Subject = subject;
            mail.Body = body;
            mail.IsBodyHtml = true;

            foreach (var attachment in attachments)
            {
                var stream = new MemoryStream(attachment.Content);
                var mediaType = string.IsNullOrWhiteSpace(attachment.ContentType)
                    ? MediaTypeNames.Application.Octet
                    : attachment.ContentType;
                var mailAttachment = new Attachment(stream, attachment.FileName, mediaType);
                mail.Attachments.Add(mailAttachment);
            }

            using var smtp = new SmtpClient(emailSettings.Host, emailSettings.Port)
            {
                Credentials = new NetworkCredential(emailSettings.Email, emailSettings.Password),
                EnableSsl = true
            };

            await smtp.SendMailAsync(mail);
        }

        public async Task SendStudentClassEnrollmentEmailAsync(string toEmail, string studentName, string className)
        {
            var subject = "Thong bao: Ban da duoc them vao lop hoc moi";
            var body = $@"
                <div style='font-family: sans-serif; line-height: 1.6; color: #333;'>
                    <h2>Chao mung {studentName},</h2>
                    <p>Ban da duoc ban quan tri them vao lop hoc: <strong>{className}</strong>.</p>
                    <p>Vui long dang nhap vao he thong Educen de xem thoi khoa bieu va tai lieu hoc tap.</p>
                    <br/>
                    <p>Tran trong,</p>
                    <p>Doi ngu Educen.</p>
                </div>
            ";
            await SendEmailAsync(toEmail, subject, body);
        }

        public async Task SendAssistantClassAssignmentEmailAsync(string toEmail, string assistantName, string className)
        {
            var subject = "Thong bao: Ban da duoc phan cong ho tro lop hoc moi";
            var body = $@"
                <div style='font-family: sans-serif; line-height: 1.6; color: #333;'>
                    <h2>Xin chao tro giang {assistantName},</h2>
                    <p>Ban da duoc phan cong ho tro lop hoc: <strong>{className}</strong>.</p>
                    <p>Vui long dang nhap vao he thong de kiem tra danh sach hoc sinh va phoi hop cung giao vien chinh.</p>
                    <br/>
                    <p>Tran trong,</p>
                    <p>Doi ngu Educen.</p>
                </div>
            ";
            await SendEmailAsync(toEmail, subject, body);
        }

        public async Task SendMonthlyPerformanceReport(string toEmail, string parentName, string childName, int month, int year, ChildPerformanceReportDto report)
        {
            var subject = $"[Bao cao hoc tap] Thang {month}/{year} - Hoc sinh {childName}";
            
            var classRows = "";
            foreach (var cls in report.ClassSummaries)
            {
                var rankColor = cls.Rank switch {
                    "Xuất sắc" => "#15803d",
                    "Giỏi" => "#16a34a",
                    "Khá" => "#a16207",
                    "Trung bình" => "#c2410c",
                    "Yếu" => "#dc2626",
                    _ => "#64748b"
                };

                classRows += $@"
                    <tr>
                        <td style='padding: 12px; border-bottom: 1px solid #edf2f7;'>
                            <strong>{cls.ClassName}</strong><br/>
                            <small style='color: #718096;'>{cls.SubjectName} • GV: {cls.TeacherName}</small>
                        </td>
                        <td style='padding: 12px; border-bottom: 1px solid #edf2f7; text-align: center;'>{cls.AttendanceRate}%</td>
                        <td style='padding: 12px; border-bottom: 1px solid #edf2f7; text-align: center;'>{cls.AverageScore ?? 0}</td>
                        <td style='padding: 12px; border-bottom: 1px solid #edf2f7; text-align: center;'>
                            <span style='color: {rankColor}; font-weight: bold;'>{cls.Rank}</span>
                        </td>
                        <td style='padding: 12px; border-bottom: 1px solid #edf2f7; font-size: 0.85em;'>{cls.LatestFeedback ?? "—"}</td>
                    </tr>";
            }

            var body = $@"
                <div style='font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; color: #2d3748;'>
                    <div style='background: #6366f1; padding: 24px; color: white; border-radius: 8px 8px 0 0;'>
                        <h1 style='margin: 0; font-size: 20px;'>Bao cao hoc tap thang {month}/{year}</h1>
                        <p style='margin: 8px 0 0; opacity: 0.9;'>Hoc sinh: {childName}</p>
                    </div>
                    
                    <div style='padding: 24px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 8px 8px;'>
                        <p>Kinh gui phu huynh <strong>{parentName}</strong>,</p>
                        <p>Trung tam gui den ban ket qua hoc tap cua con em trong thang {month}/{year} nhu sau:</p>
                        
                        <div style='display: flex; gap: 20px; margin: 24px 0; background: #f8fafc; padding: 16px; border-radius: 8px;'>
                            <div style='flex: 1; text-align: center;'>
                                <div style='font-size: 24px; font-weight: bold; color: #4f46e5;'>{report.OverallGPA}</div>
                                <div style='font-size: 12px; color: #718096; text-transform: uppercase;'>GPA Tong</div>
                            </div>
                            <div style='flex: 1; text-align: center;'>
                                <div style='font-size: 24px; font-weight: bold; color: #10b981;'>{report.OverallAttendanceRate}%</div>
                                <div style='font-size: 12px; color: #718096; text-transform: uppercase;'>Chuyen can</div>
                            </div>
                            <div style='flex: 1; text-align: center;'>
                                <div style='font-size: 24px; font-weight: bold; color: #4b5563;'>{report.TotalAssignmentsSubmitted}/{report.TotalAssignmentsAssigned}</div>
                                <div style='font-size: 12px; color: #718096; text-transform: uppercase;'>Bai tap</div>
                            </div>
                        </div>

                        <table style='width: 100%; border-collapse: collapse; margin-top: 20px;'>
                            <thead>
                                <tr style='background: #f1f5f9;'>
                                    <th style='padding: 12px; text-align: left; font-size: 13px;'>LOP HOC</th>
                                    <th style='padding: 12px; text-align: center; font-size: 13px;'>DIEM DANH</th>
                                    <th style='padding: 12px; text-align: center; font-size: 13px;'>DIEM TB</th>
                                    <th style='padding: 12px; text-align: center; font-size: 13px;'>XEP LOAI</th>
                                    <th style='padding: 12px; text-align: left; font-size: 13px;'>NHAN XET</th>
                                </tr>
                            </thead>
                            <tbody>
                                {classRows}
                            </tbody>
                        </table>

                        <div style='margin-top: 32px; padding-top: 24px; border-top: 1px solid #edf2f7; color: #718096; font-size: 14px;'>
                            <p>Ban co the dang nhap vao he thong Educen de xem chi tiet diem so tung bai tap va lich su diem danh.</p>
                            <p>Tran trong,<br/>Doi ngu Educen.</p>
                        </div>
                    </div>
                </div>
            ";

            await SendEmailAsync(toEmail, subject, body);
        }

        public async Task SendTeacherClassAssignmentEmailAsync(string toEmail, string teacherName, string className)
        {
            var subject = "Thong bao: Ban da duoc phan cong giang day lop hoc moi";
            var body = $@"
                <div style='font-family: sans-serif; line-height: 1.6; color: #333;'>
                    <h2>Xin chao giao vien {teacherName},</h2>
                    <p>Ban da duoc phan cong giang day lop hoc: <strong>{className}</strong>.</p>
                    <p>Vui long dang nhap vao he thong Educen de xem danh sach hoc sinh, thoi khoa bieu va chuan bi bai giang.</p>
                    <br/>
                    <p>Tran trong,</p>
                    <p>Doi ngu Educen.</p>
                </div>
            ";
            await SendEmailAsync(toEmail, subject, body);
        }

        private EmailSettings ResolveEmailSettings()
        {
            return string.IsNullOrWhiteSpace(_currentTenantService.TenantId)
                ? _systemAdminEmailSettings
                : _centerFlowEmailSettings;
        }
    }
}
