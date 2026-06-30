namespace CleanConnect.Application.Common;

public sealed record IdVerificationResult(
    bool IsValid,
    string? Message = null,
    string? FullName = null,
    DateTimeOffset? VerifiedAt = null);

public sealed record LivenessResult(
    bool IsLive,
    bool FaceMatch,
    double ConfidenceScore,
    string? Message = null);

public interface IIdentityVerificationService
{
    Task<IdVerificationResult> VerifyIdNumberAsync(string idNumber, CancellationToken cancellationToken = default);
    Task<IdVerificationResult> VerifyIdDocumentAsync(string idNumber, string idDocumentBase64, CancellationToken cancellationToken = default);
    Task<LivenessResult> VerifyLivenessAsync(string selfieBase64, string idDocumentBase64, CancellationToken cancellationToken = default);
}
