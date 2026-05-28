using SaeBridge.Interop;

var builder = WebApplication.CreateBuilder(args);

// ═══════════════════════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════════════════════

// Load SAE configuration from appsettings.json
var saeConfig = new SaeConfig();
builder.Configuration.GetSection("Sae").Bind(saeConfig);

// Set DLL search directory so InterfaseSae70.dll finds its sister Delphi dependencies
// CRITICAL: This MUST point to the program directory (where DLLs live), NOT the data directory
SaeNative.SetDllDirectory(saeConfig.RutaPrograma);

// Register as singletons (one session for the entire application lifetime)
builder.Services.AddSingleton(saeConfig);
builder.Services.AddSingleton<SaeSessionManager>();

// ═══════════════════════════════════════════════════════════════
// SERVICES
// ═══════════════════════════════════════════════════════════════

builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();

// CORS: Allow Node.js backend to call this service
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowNodeBackend", policy =>
    {
        policy.WithOrigins(
                "http://localhost:5000",   // Node.js backend
                "http://localhost:5173",   // Vite dev server  
                "http://localhost:5174"    // Vite dev server alt port
            )
            .AllowAnyHeader()
            .AllowAnyMethod();
    });
});

var app = builder.Build();

// ═══════════════════════════════════════════════════════════════
// MIDDLEWARE
// ═══════════════════════════════════════════════════════════════

app.UseCors("AllowNodeBackend");
app.MapControllers();

// ═══════════════════════════════════════════════════════════════
// STARTUP: Initialize SAE session
// ═══════════════════════════════════════════════════════════════

var logger = app.Services.GetRequiredService<ILogger<Program>>();
var sessionManager = app.Services.GetRequiredService<SaeSessionManager>();

logger.LogInformation("╔══════════════════════════════════════════════╗");
logger.LogInformation("║       SAE Bridge Service v1.0.0              ║");
logger.LogInformation("║       Aspel-SAE 9.0 Integration              ║");
logger.LogInformation("╚══════════════════════════════════════════════╝");
logger.LogInformation("");
logger.LogInformation("SAE Program Path (DLLs): {Path}", saeConfig.RutaPrograma);
logger.LogInformation("SAE Data Path: {Path}", saeConfig.RutaDatos);
logger.LogInformation("SAE Company: {Empresa}", saeConfig.NumEmpresa);
logger.LogInformation("");

// Initialize SAE session at startup (as recommended)
var initialized = await sessionManager.InitializeAsync();
if (initialized)
{
    logger.LogInformation("✅ SAE session initialized successfully!");
}
else
{
    logger.LogWarning("⚠️  SAE session failed to initialize: {Error}", sessionManager.LastError);
    logger.LogWarning("    The Bridge will run but SAE functions will not work until manually initialized.");
    logger.LogWarning("    POST /api/sae/init to retry initialization.");
}

logger.LogInformation("");
logger.LogInformation("🚀 SAE Bridge is running on http://localhost:5050");
logger.LogInformation("   Health check: GET http://localhost:5050/api/sae/status");
logger.LogInformation("");

// ═══════════════════════════════════════════════════════════════
// SHUTDOWN: Gracefully terminate SAE session
// ═══════════════════════════════════════════════════════════════

app.Lifetime.ApplicationStopping.Register(() =>
{
    logger.LogInformation("Shutting down SAE Bridge...");
    sessionManager.Dispose();
    logger.LogInformation("SAE Bridge shut down cleanly.");
});

app.Run("http://localhost:5050");
