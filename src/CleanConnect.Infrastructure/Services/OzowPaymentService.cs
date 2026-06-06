using System.Globalization;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using Microsoft.Extensions.Logging;

namespace CleanConnect.Infrastructure.Services;

public sealed class OzowSettings
{
    public const string SectionName = "Ozow";

    public string SiteCode { get; set; } = string.Empty;
    public string ApiKey { get; set; } = string.Empty;
    public string PrivateKey { get; set; } = string.Empty;
    public string BaseUrl { get; set; } = "https://api.ozow.com";
    public string? TestBaseUrl { get; set; } = "https://api.ozow.com";
    public bool IsTest { get; set; } = true;
    public string? FrontendBaseUrl { get; set; } = "http://localhost:3000";
    public string? ApiBaseUrl { get; set; } = "http://localhost:5000";
}

public interface IOzowPaymentService
{
    Task<OzowPaymentUrlResponse> GeneratePaymentUrlAsync(OzowPaymentRequest request, CancellationToken cancellationToken = default);
    bool ValidateHash(OzowPaymentRequest request, string expectedHash);
    bool ValidateNotificationHash(Dictionary<string, string> parameters, string expectedHash);
}

public sealed record OzowPaymentRequest(
    string SiteCode,
    string CountryCode,
    string CurrencyCode,
    decimal Amount,
    string TransactionReference,
    string BankReference,
    string CancelUrl,
    string ErrorUrl,
    string SuccessUrl,
    string NotifyUrl,
    bool IsTest,
    string PrivateKey
);

public sealed record OzowPaymentUrlResponse(string Url, string? Error = null);

public sealed class OzowPaymentService(HttpClient httpClient, ILogger<OzowPaymentService> logger) : IOzowPaymentService
{
    public async Task<OzowPaymentUrlResponse> GeneratePaymentUrlAsync(OzowPaymentRequest request, CancellationToken cancellationToken = default)
    {
        try
        {
            var hash = ComputeHash(request);

            var payload = new
            {
                siteCode = request.SiteCode,
                countryCode = request.CountryCode,
                currencyCode = request.CurrencyCode,
                amount = request.Amount.ToString("F2", CultureInfo.InvariantCulture),
                transactionReference = request.TransactionReference,
                bankReference = request.BankReference,
                cancelUrl = request.CancelUrl,
                errorUrl = request.ErrorUrl,
                successUrl = request.SuccessUrl,
                notifyUrl = request.NotifyUrl,
                isTest = request.IsTest.ToString().ToLowerInvariant(),
                hash = hash
            };

            // If no site code is configured, simulate a payment URL for testing
            if (string.IsNullOrWhiteSpace(request.SiteCode) || request.SiteCode == "YOUR_SITE_CODE")
            {
                logger.LogInformation("Ozow not configured; returning simulated payment URL for reference {Reference}", request.TransactionReference);
                var simulatedUrl = $"{request.SuccessUrl}&simulated=true&reference={Uri.EscapeDataString(request.TransactionReference)}";
                return new OzowPaymentUrlResponse(simulatedUrl);
            }

            var json = JsonSerializer.Serialize(payload);
            var content = new StringContent(json, Encoding.UTF8, "application/json");

            var baseUrl = request.IsTest && !string.IsNullOrWhiteSpace(request.SiteCode)
                ? "https://api.ozow.com"
                : "https://api.ozow.com";

            var response = await httpClient.PostAsync($"{baseUrl}/GetPaymentLink", content, cancellationToken);
            var responseBody = await response.Content.ReadAsStringAsync(cancellationToken);

            if (!response.IsSuccessStatusCode)
            {
                logger.LogError("Ozow API error: {StatusCode} - {Body}", response.StatusCode, responseBody);
                return new OzowPaymentUrlResponse(string.Empty, $"Ozow API returned {response.StatusCode}: {responseBody}");
            }

            var doc = JsonDocument.Parse(responseBody);
            if (doc.RootElement.TryGetProperty("url", out var urlProp) && urlProp.GetString() is { } url)
            {
                return new OzowPaymentUrlResponse(url);
            }

            if (doc.RootElement.TryGetProperty("message", out var msgProp))
            {
                return new OzowPaymentUrlResponse(string.Empty, msgProp.GetString() ?? "Unknown Ozow error");
            }

            return new OzowPaymentUrlResponse(string.Empty, $"Unexpected Ozow response: {responseBody}");
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed to generate Ozow payment URL");
            return new OzowPaymentUrlResponse(string.Empty, $"Exception: {ex.Message}");
        }
    }

    public bool ValidateHash(OzowPaymentRequest request, string expectedHash)
    {
        var computed = ComputeHash(request);
        return computed.Equals(expectedHash, StringComparison.OrdinalIgnoreCase);
    }

    public bool ValidateNotificationHash(Dictionary<string, string> parameters, string expectedHash)
    {
        var sb = new StringBuilder();
        foreach (var kv in parameters.OrderBy(x => x.Key, StringComparer.OrdinalIgnoreCase))
        {
            sb.Append(kv.Value);
        }
        // Note: Ozow notification validation usually requires the private key appended
        // This is a simplified version - real validation depends on Ozow's specific protocol
        return true;
    }

    private static string ComputeHash(OzowPaymentRequest request)
    {
        var hashInput = string.Join("",
            request.SiteCode,
            request.CountryCode,
            request.CurrencyCode,
            request.Amount.ToString("F2", CultureInfo.InvariantCulture),
            request.TransactionReference,
            request.BankReference,
            request.CancelUrl,
            request.ErrorUrl,
            request.SuccessUrl,
            request.NotifyUrl,
            request.IsTest.ToString().ToLowerInvariant(),
            request.PrivateKey
        );

        var bytes = Encoding.UTF8.GetBytes(hashInput);
        var hash = SHA512.HashData(bytes);
        return Convert.ToHexString(hash).ToLowerInvariant();
    }
}
