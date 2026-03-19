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
    }
}
