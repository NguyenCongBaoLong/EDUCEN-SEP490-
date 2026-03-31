using EducenAPI.DTOs;
using System.Net;
using System.Net.Mail;
namespace EducenAPI.Ultils
{

    public class MailService
    {
        private readonly EmailSettings _emailSettings;

        public MailService(IConfiguration configuration)
        {
            _emailSettings = configuration.GetSection("EmailSettings").Get<EmailSettings>();
        }

        public async Task SendStudentAccount(string toEmail, string username, string password)
        {
            var mail = new MailMessage();
            mail.From = new MailAddress(_emailSettings.Email);
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

            var smtp = new SmtpClient(_emailSettings.Host, _emailSettings.Port)
            {
                Credentials = new NetworkCredential(_emailSettings.Email, _emailSettings.Password),
                EnableSsl = true
            };

            await smtp.SendMailAsync(mail);
        }

        public async Task SendParentAccount(string toEmail, string username, string password)
        {
            var mail = new MailMessage();
            mail.From = new MailAddress(_emailSettings.Email);
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

            var smtp = new SmtpClient(_emailSettings.Host, _emailSettings.Port)
            {
                Credentials = new NetworkCredential(_emailSettings.Email, _emailSettings.Password),
                EnableSsl = true
            };

            await smtp.SendMailAsync(mail);
        }

        public async Task SendTeacherAccount(string toEmail, string username, string password)
        {
            var mail = new MailMessage();
            mail.From = new MailAddress(_emailSettings.Email);
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

            var smtp = new SmtpClient(_emailSettings.Host, _emailSettings.Port)
            {
                Credentials = new NetworkCredential(_emailSettings.Email, _emailSettings.Password),
                EnableSsl = true
            };

            await smtp.SendMailAsync(mail);
        }

        public async Task SendResetPasswordEmail(string toEmail, string resetCode)
        {
            var mail = new MailMessage();
            mail.From = new MailAddress(_emailSettings.Email);
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

            var smtp = new SmtpClient(_emailSettings.Host, _emailSettings.Port)
            {
                Credentials = new NetworkCredential(_emailSettings.Email, _emailSettings.Password),
                EnableSsl = true
            };

            await smtp.SendMailAsync(mail);
        }

        public async Task SendEmailAsync(string toEmail, string subject, string body)
        {
            var mail = new MailMessage();
            mail.From = new MailAddress(_emailSettings.Email);
            mail.To.Add(toEmail);
            mail.Subject = subject;
            mail.Body = body;
            mail.IsBodyHtml = true;

            var smtp = new SmtpClient(_emailSettings.Host, _emailSettings.Port)
            {
                Credentials = new NetworkCredential(_emailSettings.Email, _emailSettings.Password),
                EnableSsl = true
            };

            await smtp.SendMailAsync(mail);
        }
    }
}
