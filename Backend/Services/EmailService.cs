
using MailKit.Net.Smtp;
using MailKit.Security;
using MimeKit;
using Pirnav.API.Models;

namespace Pirnav.API.Services
{
    public class EmailService
    {
        private readonly AwsSecretService _awsSecretService;
        private readonly ILogger<EmailService> _logger;

        public EmailService(
            AwsSecretService awsSecretService,
            ILogger<EmailService> logger)
        {
            _awsSecretService = awsSecretService;
            _logger = logger;
        }

        public async Task SendEmailAsync(
            string toEmail,
            string subject,
            string body,
            string? customSenderEmail = null,
            string? customSenderName = null,
            string? customPassword = null)
        {
            try
            {
                var smtp = await _awsSecretService.GetSmtpSettingsAsync();

                var message = new MimeMessage();

                message.From.Add(new MailboxAddress(
                    smtp.EMAIL_SENDER_NAME,
                    smtp.EMAIL_SENDER_EMAIL
                ));

                message.To.Add(new MailboxAddress("", toEmail.Trim()));

                message.Subject = subject;

                message.Body = new TextPart("html")
                {
                    Text = body
                };

                using var client = new SmtpClient();

                await client.ConnectAsync(
                    smtp.SMTP_SERVER,
                    int.Parse(smtp.SMTP_PORT),
                    SecureSocketOptions.Auto
                );

                await client.AuthenticateAsync(
                    smtp.EMAIL_SENDER_EMAIL,
                    smtp.EMAIL_PASSWORD
                );

                await client.SendAsync(message);

                await client.DisconnectAsync(true);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Email sending failed for recipient {Recipient}", toEmail);
                throw;
            }
        }

        public async Task SendEmailWithAttachmentAsync(
            string toEmail,
            string subject,
            string body,
            string filePath)
        {
            try
            {
                var smtp = await _awsSecretService.GetSmtpSettingsAsync();

                var message = new MimeMessage();

                message.From.Add(new MailboxAddress(
                    smtp.EMAIL_SENDER_NAME,
                    smtp.EMAIL_SENDER_EMAIL
                ));

                message.To.Add(new MailboxAddress("", toEmail.Trim()));

                message.Subject = subject;

                var builder = new BodyBuilder
                {
                    HtmlBody = body
                };

                if (File.Exists(filePath))
                {
                    builder.Attachments.Add(filePath);
                }
                else
                {
                    _logger.LogWarning(
                        "Email attachment file not found: {FilePath}",
                        filePath);
                }

                message.Body = builder.ToMessageBody();

                using var client = new SmtpClient();

                await client.ConnectAsync(
                    smtp.SMTP_SERVER,
                    int.Parse(smtp.SMTP_PORT),
                    SecureSocketOptions.Auto
                );

                await client.AuthenticateAsync(
                    smtp.EMAIL_SENDER_EMAIL,
                    smtp.EMAIL_PASSWORD
                );

                await client.SendAsync(message);

                await client.DisconnectAsync(true);
            }
            catch (Exception ex)
            {
                _logger.LogError(
                    ex,
                    "Attachment email sending failed for recipient {Recipient}",
                    toEmail);

                throw;
            }
        }
    }
}
