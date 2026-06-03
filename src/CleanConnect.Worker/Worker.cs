namespace CleanConnect.Worker;

public sealed class Worker(ILogger<Worker> logger) : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        while (!stoppingToken.IsCancellationRequested)
        {
            logger.LogInformation("CleanConnect worker heartbeat at {Time}", DateTimeOffset.UtcNow);
            await Task.Delay(TimeSpan.FromMinutes(5), stoppingToken);
        }
    }
}
