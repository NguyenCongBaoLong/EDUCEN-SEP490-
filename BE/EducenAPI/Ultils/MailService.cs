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
                ?? throw new InvalidOperationException("Thiếu cấu hình email quản trị hệ thống.");

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
            mail.Subject = "Thông tin tài khoản học sinh";

            mail.Body = $@"
            Xin chào,

            Đây là thông tin tài khoản của bạn:

            Tài khoản: {username}
            Mật khẩu: {password}

            Vui lòng đăng nhập và đổi mật khẩu.

            Trân trọng.
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
            mail.Subject = "Thông tin tài khoản phụ huynh - Educen";

            mail.Body = $@"
            Xin chào,

            Chào mừng bạn đến với hệ thống Educen. Đây là thông tin tài khoản truy cập dành cho phụ huynh:

            Tài khoản (Username): {username}
            Mật khẩu (Password): {password}

            Bạn có thể sử dụng tài khoản này để theo dõi tình hình học tập của con em mình.
            Vui lòng đăng nhập và đổi mật khẩu ngay trong lần đầu sử dụng.

            Trân trọng,
            Đội ngũ Educen.
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
            mail.Subject = "Thông tin tài khoản giáo viên - Educen";

            mail.Body = $@"
            Xin chào,

            Chào mừng bạn đến với hệ thống Educen. Đây là thông tin tài khoản truy cập dành cho giáo viên:

            Tài khoản (Username): {username}
            Mật khẩu (Password): {password}

            Bạn có thể sử dụng tài khoản này để quản lý lớp học và bài giảng.
            Vui lòng đăng nhập và đổi mật khẩu ngay trong lần đầu sử dụng.

            Trân trọng,
            Đội ngũ Educen.
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
            mail.Subject = "Mã xác thực đặt lại mật khẩu - Educen";

            mail.Body = $@"
            Xin chào,

            Chúng tôi nhận được yêu cầu đặt lại mật khẩu cho tài khoản liên kết với email này.
            
            Vui lòng sử dụng mã xác thực gồm 6 chữ số bên dưới để hoàn tất quá trình đặt lại mật khẩu:
            
            {resetCode}
            
            Mã này có hiệu lực trong vòng 15 phút. Nếu bạn không yêu cầu thay đổi này, hãy bỏ qua email này.

            Trân trọng,
            Đội ngũ Educen.
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
            var subject = "Thông báo: Bạn đã được thêm vào lớp học mới";
            var body = $@"
                <div style='font-family: sans-serif; line-height: 1.6; color: #333;'>
                    <h2>Chào mừng {studentName},</h2>
                    <p>Bạn đã được ban quản trị thêm vào lớp học: <strong>{className}</strong>.</p>
                    <p>Vui lòng đăng nhập vào hệ thống Educen để xem thời khóa biểu và tài liệu học tập.</p>
                    <br/>
                    <p>Trân trọng,</p>
                    <p>Đội ngũ Educen.</p>
                </div>
            ";
            await SendEmailAsync(toEmail, subject, body);
        }

        public async Task SendAssistantClassAssignmentEmailAsync(string toEmail, string assistantName, string className)
        {
            var subject = "Thông báo: Bạn đã được phân công hỗ trợ lớp học mới";
            var body = $@"
                <div style='font-family: sans-serif; line-height: 1.6; color: #333;'>
                    <h2>Xin chào trợ giảng {assistantName},</h2>
                    <p>Bạn đã được phân công hỗ trợ lớp học: <strong>{className}</strong>.</p>
                    <p>Vui lòng đăng nhập vào hệ thống để kiểm tra danh sách học sinh và phối hợp cùng giáo viên chính.</p>
                    <br/>
                    <p>Trân trọng,</p>
                    <p>Đội ngũ Educen.</p>
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
            var subject = "Thông báo: Bạn đã được phân công giảng dạy lớp học mới";
            var body = $@"
                <div style='font-family: sans-serif; line-height: 1.6; color: #333;'>
                    <h2>Xin chào giáo viên {teacherName},</h2>
                    <p>Bạn đã được phân công giảng dạy lớp học: <strong>{className}</strong>.</p>
                    <p>Vui lòng đăng nhập vào hệ thống Educen để xem danh sách học sinh, thời khóa biểu và chuẩn bị bài giảng.</p>
                    <br/>
                    <p>Trân trọng,</p>
                    <p>Đội ngũ Educen.</p>
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
