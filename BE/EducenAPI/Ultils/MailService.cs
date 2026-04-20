using EducenAPI.DTOs;
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
