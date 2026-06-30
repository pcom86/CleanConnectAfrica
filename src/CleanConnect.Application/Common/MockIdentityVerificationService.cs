namespace CleanConnect.Application.Common;

public sealed class MockIdentityVerificationService : IIdentityVerificationService
{
    public Task<IdVerificationResult> VerifyIdNumberAsync(string idNumber, CancellationToken cancellationToken = default)
    {
        // Basic SA ID number validation: 13 digits
        var isValid = !string.IsNullOrWhiteSpace(idNumber) && idNumber.Length == 13 && idNumber.All(char.IsDigit);
        var result = new IdVerificationResult(
            isValid,
            isValid ? "ID number validated successfully." : "Invalid ID number format. Must be 13 digits.",
            isValid ? "Mock Verified Name" : null,
            isValid ? DateTimeOffset.UtcNow : null);
        return Task.FromResult(result);
    }

    public Task<IdVerificationResult> VerifyIdDocumentAsync(string idNumber, string idDocumentBase64, CancellationToken cancellationToken = default)
    {
        var hasDocument = !string.IsNullOrWhiteSpace(idDocumentBase64) && idDocumentBase64.Length > 100;
        var isValid = hasDocument && !string.IsNullOrWhiteSpace(idNumber) && idNumber.Length == 13 && idNumber.All(char.IsDigit);
        var result = new IdVerificationResult(
            isValid,
            isValid ? "ID document verified successfully." : "ID document verification failed. Ensure a valid ID number and clear document image.",
            isValid ? "Mock Verified Name" : null,
            isValid ? DateTimeOffset.UtcNow : null);
        return Task.FromResult(result);
    }

    public Task<LivenessResult> VerifyLivenessAsync(string selfieBase64, string idDocumentBase64, CancellationToken cancellationToken = default)
    {
        var hasSelfie = !string.IsNullOrWhiteSpace(selfieBase64) && selfieBase64.Length > 100;
        var hasDocument = !string.IsNullOrWhiteSpace(idDocumentBase64) && idDocumentBase64.Length > 100;
        var isLive = hasSelfie && hasDocument;
        var result = new LivenessResult(
            isLive,
            isLive,
            isLive ? 0.96 : 0.0,
            isLive ? "Liveness and face match verified successfully." : "Liveness check failed. Ensure both selfie and ID document are provided.");
        return Task.FromResult(result);
    }
}
