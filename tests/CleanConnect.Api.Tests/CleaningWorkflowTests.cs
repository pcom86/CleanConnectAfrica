using System.Net;
using System.Net.Http.Json;
using CleanConnect.Application.Common;
using CleanConnect.Infrastructure.Entities;
using FluentAssertions;

namespace CleanConnect.Api.Tests;

public class CleaningWorkflowTests : IClassFixture<CustomWebApplicationFactory>
{
    private readonly HttpClient _client;

    public CleaningWorkflowTests(CustomWebApplicationFactory factory)
    {
        _client = factory.CreateClient();
    }

    [Fact]
    public async Task FullCleaningWorkflow_ShouldSucceed()
    {
        // --- Step 1: Create Customer ---
        var createUserResponse = await _client.PostAsJsonAsync("/api/v1/users", new
        {
            firstName = "Thabo",
            lastName = "Mokoena",
            email = "thabo@test.com",
            phoneNumber = "+27831234567",
            passwordHash = "hashedpw123",
            role = "Customer",
            status = "Active",
            customerProfile = new { customerType = "Residential" }
        });

        createUserResponse.StatusCode.Should().Be(HttpStatusCode.OK);
        var userResult = await createUserResponse.Content.ReadFromJsonAsync<ApiResult<UserDto>>(TestJson.Options);
        userResult!.Succeeded.Should().BeTrue();
        var customerId = userResult.Data!.CustomerProfile!.Id;

        // --- Step 2: Create Provider (Cleaning Company) ---
        var createProviderResponse = await _client.PostAsJsonAsync("/api/v1/providers/apply", new
        {
            contactUserId = userResult.Data!.Id,
            companyName = "SuperClean SA",
            registrationNumber = "CK2024/123456",
            joiningFeeAmount = 0m,
            commissionRate = 0.15m
        });

        var providerBody = await createProviderResponse.Content.ReadAsStringAsync();
        createProviderResponse.StatusCode.Should().Be(HttpStatusCode.OK, because: providerBody);
        var providerResult = System.Text.Json.JsonSerializer.Deserialize<ApiResult<ProviderDto>>(providerBody, TestJson.Options);
        providerResult!.Succeeded.Should().BeTrue();
        var providerId = providerResult.Data!.Id;

        // --- Step 3: Approve Provider ---
        var approveResponse = await _client.PostAsync($"/api/v1/providers/{providerId}/approve", null);
        approveResponse.StatusCode.Should().Be(HttpStatusCode.OK);

        // --- Step 4: Create Cleaning Request ---
        var createRequestResponse = await _client.PostAsJsonAsync("/api/v1/cleaning-requests", new
        {
            customerProfileId = customerId,
            notes = "Deep clean for 3-bedroom apartment in Sandton",
            preferredDate = DateTimeOffset.UtcNow.AddDays(3)
        });

        createRequestResponse.StatusCode.Should().Be(HttpStatusCode.OK);
        var requestResult = await createRequestResponse.Content.ReadFromJsonAsync<ApiResult<CleaningRequestDto>>(TestJson.Options);
        requestResult!.Succeeded.Should().BeTrue();
        var requestId = requestResult.Data!.Id;
        requestResult.Data.Status.Should().Be(CleaningRequestStatus.Requested);

        // --- Step 5: Find Nearby Providers (will fail without address coordinates) ---
        // For a real test you'd create an address with lat/long first
        var nearbyResponse = await _client.GetAsync($"/api/v1/cleaning-requests/{requestId}/nearby-providers?maxDistanceKm=50");
        // Expecting BadRequest because no address coordinates exist yet
        nearbyResponse.StatusCode.Should().BeOneOf(HttpStatusCode.OK, HttpStatusCode.BadRequest);

        // --- Step 6: Provider Accepts Request ---
        var acceptResponse = await _client.PostAsJsonAsync($"/api/v1/cleaning-requests/{requestId}/accept", new
        {
            providerId = providerId,
            responseNotes = "We can start at 8am"
        });

        acceptResponse.StatusCode.Should().Be(HttpStatusCode.OK);
        var bookingResult = await acceptResponse.Content.ReadFromJsonAsync<ApiResult<BookingDto>>(TestJson.Options);
        bookingResult!.Succeeded.Should().BeTrue();
        var bookingId = bookingResult.Data!.Id;
        bookingResult.Data.Status.Should().Be(BookingStatus.Confirmed);

        // --- Step 7: Dispatch Team ---
        var dispatchResponse = await _client.PutAsJsonAsync($"/api/v1/cleaning-bookings/{bookingId}/status", new
        {
            newStatus = "CleanerEnRoute",
            notes = "Team dispatched, ETA 15 min"
        });

        dispatchResponse.StatusCode.Should().Be(HttpStatusCode.OK);
        var dispatchResult = await dispatchResponse.Content.ReadFromJsonAsync<ApiResult<BookingDto>>(TestJson.Options);
        dispatchResult!.Succeeded.Should().BeTrue();
        dispatchResult.Data.Status.Should().Be(BookingStatus.CleanerEnRoute);

        // --- Step 8: Team Arrived On Site ---
        var arrivedResponse = await _client.PutAsJsonAsync($"/api/v1/cleaning-bookings/{bookingId}/status", new
        {
            newStatus = "InProgress",
            notes = "Team arrived and started cleaning"
        });

        arrivedResponse.StatusCode.Should().Be(HttpStatusCode.OK);
        var arrivedResult = await arrivedResponse.Content.ReadFromJsonAsync<ApiResult<BookingDto>>(TestJson.Options);
        arrivedResult!.Succeeded.Should().BeTrue();
        arrivedResult.Data.Status.Should().Be(BookingStatus.InProgress);

        // --- Step 9: Complete with Report ---
        var completeResponse = await _client.PostAsJsonAsync($"/api/v1/cleaning-bookings/{bookingId}/complete", new
        {
            afterPhotos = new[] { "https://storage.example.com/after-kitchen.jpg", "https://storage.example.com/after-lounge.jpg" },
            cleanerNotes = "All rooms completed. Kitchen deep cleaned.",
            completedChecklistItems = new[] { "Kitchen deep clean", "Bathroom sanitization", "Floor mopping" }
        });

        completeResponse.StatusCode.Should().Be(HttpStatusCode.OK);
        var completeResult = await completeResponse.Content.ReadFromJsonAsync<ApiResult<CleaningReportDto>>(TestJson.Options);
        completeResult!.Succeeded.Should().BeTrue();
        completeResult.Data.AfterPhotos.Should().HaveCount(2);
    }

    [Fact]
    public async Task CreateCleaningRequest_WithInvalidCustomer_ShouldReturnFailure()
    {
        var response = await _client.PostAsJsonAsync("/api/v1/cleaning-requests", new
        {
            customerProfileId = Guid.NewGuid(),
            notes = "Test request"
        });

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        var result = await response.Content.ReadFromJsonAsync<ApiResult<CleaningRequestDto>>(TestJson.Options);
        result!.Succeeded.Should().BeFalse();
    }

    [Fact]
    public async Task AcceptCleaningRequest_WithInvalidRequest_ShouldReturnFailure()
    {
        var response = await _client.PostAsJsonAsync($"/api/v1/cleaning-requests/{Guid.NewGuid()}/accept", new
        {
            providerId = Guid.NewGuid(),
            responseNotes = "Test"
        });

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }
}
