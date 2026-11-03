using Amazon.SecretsManager;
using Amazon.SecretsManager.Model;
using Microsoft.Extensions.Caching.Memory;
using System.Text.Json;
using Pirnav.API.Models;

namespace Pirnav.API.Services;

public class AwsSecretService
{
    private const string SecretName = "pirnav/production/smtp";

    private readonly IAmazonSecretsManager _secretsManager;
    private readonly IMemoryCache _cache;
    private readonly IConfiguration _config;
    private readonly ILogger<AwsSecretService> _logger;

    public AwsSecretService(
        IAmazonSecretsManager secretsManager,
        IMemoryCache cache,
        IConfiguration config,
        ILogger<AwsSecretService> logger)
    {
        _secretsManager = secretsManager;
        _cache = cache;
        _config = config;
        _logger = logger;
    }

    public async Task<SmtpSettings> GetSmtpSettingsAsync()
    {
        return await _cache.GetOrCreateAsync(
            SecretName,
            async entry =>
            {
                entry.AbsoluteExpirationRelativeToNow =
                    TimeSpan.FromMinutes(10);

                try
                {
                    return await LoadFromAwsAsync();
                }
                catch (Exception ex)
                {
                    // Fall back to EmailSettings (appsettings / env vars) when AWS is unavailable, e.g. local runs
                    var fallback = LoadFromConfig();
                    if (fallback == null)
                        throw;

                    _logger.LogWarning(ex, "Could not load SMTP secret from AWS; using EmailSettings from configuration.");
                    return fallback;
                }
            }) ?? throw new Exception("Unable to load SMTP settings.");
    }

    private async Task<SmtpSettings> LoadFromAwsAsync()
    {
        var response = await _secretsManager.GetSecretValueAsync(
            new GetSecretValueRequest
            {
                SecretId = SecretName
            });

        if (string.IsNullOrWhiteSpace(response.SecretString))
            throw new Exception("SMTP secret is empty.");

        var settings = JsonSerializer.Deserialize<SmtpSettings>(
            response.SecretString);

        if (settings == null ||
            string.IsNullOrWhiteSpace(settings.SMTP_SERVER) ||
            string.IsNullOrWhiteSpace(settings.EMAIL_SENDER_EMAIL) ||
            string.IsNullOrWhiteSpace(settings.EMAIL_PASSWORD))
        {
            throw new Exception("SMTP secret is missing required settings.");
        }

        return settings;
    }

    private SmtpSettings? LoadFromConfig()
    {
        var section = _config.GetSection("EmailSettings");

        var settings = new SmtpSettings
        {
            SMTP_SERVER = section["SmtpServer"] ?? "",
            SMTP_PORT = section["Port"] ?? "465",
            EMAIL_SENDER_NAME = section["SenderName"] ?? "",
            EMAIL_SENDER_EMAIL = section["SenderEmail"] ?? "",
            EMAIL_PASSWORD = section["Password"] ?? ""
        };

        if (string.IsNullOrWhiteSpace(settings.SMTP_SERVER) ||
            string.IsNullOrWhiteSpace(settings.EMAIL_SENDER_EMAIL) ||
            string.IsNullOrWhiteSpace(settings.EMAIL_PASSWORD))
        {
            return null;
        }

        return settings;
    }
}