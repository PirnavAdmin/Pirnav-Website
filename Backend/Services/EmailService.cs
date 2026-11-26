
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
            string? customPassword = null,
            string? plainTextBody = null,
            string? replyToEmail = null)
        {
            try
            {
                var smtp = await _awsSecretService.GetSmtpSettingsAsync();

                var fromEmail = string.IsNullOrWhiteSpace(customSenderEmail)
                    ? smtp.EMAIL_SENDER_EMAIL
                    : customSenderEmail.Trim();
                var fromName = string.IsNullOrWhiteSpace(customSenderName)
                    ? smtp.EMAIL_SENDER_NAME
                    : customSenderName.Trim();
                var authEmail = smtp.EMAIL_SENDER_EMAIL;
                var authPassword = string.IsNullOrWhiteSpace(customPassword)
                    ? smtp.EMAIL_PASSWORD
                    : customPassword;
                if (!string.IsNullOrWhiteSpace(customPassword) && !string.IsNullOrWhiteSpace(customSenderEmail))
                {
                    authEmail = fromEmail;
                }

                var message = new MimeMessage();

                message.From.Add(new MailboxAddress(fromName, fromEmail));
                if (!string.Equals(fromEmail, authEmail, StringComparison.OrdinalIgnoreCase))
                {
                    message.Sender = new MailboxAddress(smtp.EMAIL_SENDER_NAME, authEmail);
                    message.ReplyTo.Add(new MailboxAddress(fromName, fromEmail));
                }
                else if (!string.IsNullOrWhiteSpace(replyToEmail))
                {
                    message.ReplyTo.Add(new MailboxAddress(fromName, replyToEmail.Trim()));
                }

                foreach (var recipient in toEmail.Split(new[] { ',', ';' }, StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries))
                {
                    message.To.Add(new MailboxAddress("", recipient));
                }

                message.Subject = subject;

                var bodyBuilder = new BodyBuilder
                {
                    HtmlBody = body
                };
                if (!string.IsNullOrWhiteSpace(plainTextBody))
                {
                    bodyBuilder.TextBody = plainTextBody;
                }
                message.Body = bodyBuilder.ToMessageBody();

                using var client = new SmtpClient();

                await client.ConnectAsync(
                    smtp.SMTP_SERVER,
                    int.Parse(smtp.SMTP_PORT),
                    SecureSocketOptions.Auto
                );

                await client.AuthenticateAsync(
                    authEmail,
                    authPassword
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
