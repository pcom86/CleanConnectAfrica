var builder = DistributedApplication.CreateBuilder(args);

var insights = builder.AddAzureApplicationInsights("cleanconnect-insights");

var postgresPassword = builder.AddParameter("postgres-password", "postgres", secret: true);
var postgres = builder.AddPostgres("postgres", password: postgresPassword)
    .WithPgWeb()
    .AddDatabase("CleanConnectDatabase", "cleanconnect");
var redis = builder.AddRedis("redis");

var api = builder.AddProject<Projects.CleanConnect_Api>("cleanconnect-api")
    .WithReference(postgres)
    .WaitFor(postgres)
    .WithReference(redis)
    .WaitFor(redis)
    .WithReference(insights)
    .WithUrl("/swagger", "Swagger UI")
    .WithUrl("/scalar/v1", "Scalar API Reference");

builder.AddProject<Projects.CleanConnect_Worker>("cleanconnect-worker")
    .WithReference(postgres)
    .WaitFor(postgres)
    .WithReference(redis)
    .WaitFor(redis)
    .WithReference(insights);

builder.Build().Run();
