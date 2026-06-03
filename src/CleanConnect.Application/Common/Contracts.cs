namespace CleanConnect.Application.Common;

public sealed record ApiResult<T>(bool Succeeded, T? Data, string? Error)
{
    public static ApiResult<T> Success(T data) => new(true, data, null);
    public static ApiResult<T> Failure(string error) => new(false, default, error);
}

public sealed record PagedResult<T>(IReadOnlyCollection<T> Items, int Page, int PageSize, int TotalCount);
