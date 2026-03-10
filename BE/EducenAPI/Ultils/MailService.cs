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
    }
}
