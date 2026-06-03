using CleanConnect.Worker;
using CleanConnect.Infrastructure;

var builder = Host.CreateApplicationBuilder(args);

builder.AddServiceDefaults();
builder.Services.AddCleanConnectDatabase(builder.Configuration);
builder.Services.AddHostedService<Worker>();

var host = builder.Build();
host.Run();
