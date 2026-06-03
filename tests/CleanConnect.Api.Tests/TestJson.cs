using System.Text.Json;
using System.Text.Json.Serialization;

namespace CleanConnect.Api.Tests;

public static class TestJson
{
    public static readonly JsonSerializerOptions Options = new()
    {
        PropertyNameCaseInsensitive = true,
        Converters = { new JsonStringEnumConverter() }
    };
}
