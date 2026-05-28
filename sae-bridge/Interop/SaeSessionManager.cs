using System.Text;
using System.Runtime.InteropServices;

namespace SaeBridge.Interop;

/// <summary>
/// Manages the SAE session lifecycle and provides thread-safe access to the DLL.
/// 
/// ARCHITECTURE DECISIONS:
/// 1. The Delphi DLL is NOT thread-safe → ALL calls are serialized via SemaphoreSlim.
/// 2. The session is initialized ONCE at startup and kept alive via ContinuaIntSAE.
/// 3. The session is terminated ONLY when the service shuts down.
/// 4. Communication uses the flat dispatch functions (EjecutaComando/EjecutaComandoXE) to prevent memory crashes.
/// </summary>
public class SaeSessionManager : IDisposable
{
    private readonly SemaphoreSlim _semaphore = new(1, 1);
    private bool _isInitialized = false;
    private Timer? _keepAliveTimer;
    private readonly ILogger<SaeSessionManager> _logger;
    private readonly SaeConfig _config;
    private SaeDynamicLoader? _dynamicLoader;

    public bool IsInitialized => _isInitialized;
    public string LastError { get; private set; } = string.Empty;
    public string LastSaeResponse { get; private set; } = string.Empty;

    public SaeSessionManager(ILogger<SaeSessionManager> logger, SaeConfig config)
    {
        _logger = logger;
        _config = config;
    }

    public int DispatchSaeCommand(string commandName, string xmlInput, out string xmlOutput)
    {
        try
        {
            var sb = new StringBuilder(1024 * 1024);
            
            // Prefer dynamic loader if available
            IntPtr resultPtr = IntPtr.Zero;
            string output = string.Empty;
            if (_dynamicLoader != null && _dynamicLoader.IsLoaded)
            {
                var (ptr, result, lastErr) = _dynamicLoader.Invoke(commandName, xmlInput, sb.Capacity);
                resultPtr = ptr;
                output = result ?? string.Empty;
                if (resultPtr == IntPtr.Zero && lastErr != 0)
                {
                    _logger.LogWarning("Dynamic invoke returned error {Err} for {Cmd}", lastErr, commandName);
                }
            }
            else
            {
                // Fallback to DllImport-based call
                resultPtr = SaeNative.EjecutaComandoXE_Unicode(commandName, xmlInput, sb);
                output = sb.ToString().Trim();
            }

            if (resultPtr != IntPtr.Zero && resultPtr.ToInt64() > 1000)
            {
                try
                {
                    string? uni = Marshal.PtrToStringUni(resultPtr);
                    string? ansi = Marshal.PtrToStringAnsi(resultPtr);
                    string? candidate = null;

                    if (!string.IsNullOrEmpty(uni) && (uni.Contains("<DATAPACKET>") || uni.Contains("<?xml") || uni == "0"))
                    {
                        candidate = uni;
                    }
                    else if (!string.IsNullOrEmpty(ansi) && (ansi.Contains("<DATAPACKET>") || ansi.Contains("<?xml") || ansi == "0"))
                    {
                        candidate = ansi;
                    }
                    else if (!string.IsNullOrEmpty(uni) && string.IsNullOrWhiteSpace(output))
                    {
                        candidate = uni;
                    }
                    else if (!string.IsNullOrEmpty(ansi) && string.IsNullOrWhiteSpace(output))
                    {
                        candidate = ansi;
                    }

                    if (!string.IsNullOrEmpty(candidate))
                    {
                        output = candidate.Trim();
                    }
                }
                catch
                {
                    // Fallback to StringBuilder output
                }
            }

            xmlOutput = output;

            // In Delphi, the return value is the pointer to the buffer (resultPtr).
            // A null pointer (0) means a severe system or calling error.
            if (resultPtr == IntPtr.Zero)
            {
                return -1; // System/DLL execution error
            }

            // Determine success by inspecting the output buffer contents:
            // 1. Initialization/termination/keep-alive commands write "0" on success.
            if (commandName == "IniciaInterfazSAE" || 
                commandName == "IniciaInterfazSAESinLogin" || 
                commandName == "TerminaInterfazSAE" || 
                commandName == "ContinuaIntSAE")
            {
                if (output == "0")
                {
                    return 0; // Success
                }
                return -2; // Initialization/session error
            }

            // 2. Query/modify commands are successful if they successfully returned a result.
            // If they returned "0" (often means success with 0 records or success acknowledgement)
            // or a valid XML packet, then it is a success!
            if (output == "0" || output.Contains("<DATAPACKET>") || output.Contains("<ROWDATA>") || output.StartsWith("<?xml"))
            {
                return 0; // Success
            }

            // Otherwise, check if output is empty
            if (string.IsNullOrEmpty(output))
            {
                return -3; // Empty response
            }

            // If it successfully ran and returned data, treat as success
            return 0;
        }
        catch (Exception ex)
        {
            xmlOutput = ex.Message;
            return -999; // Crash/exception
        }
    }

    /// <summary>
    /// Initializes the SAE session. Called once at application startup.
    /// Constructs the XML input that SAE expects for initialization.
    /// </summary>
    public async Task<bool> InitializeAsync()
    {
        await _semaphore.WaitAsync();
        try
        {
            if (_isInitialized)
            {
                _logger.LogWarning("SAE session already initialized");
                return true;
            }

            _logger.LogInformation("Initializing SAE session via Flat Command Dispatcher...");
            _logger.LogInformation("  Data Path: {Path}", _config.RutaDatos);
            _logger.LogInformation("  User: {User}", _config.Usuario);
            _logger.LogInformation("  Company: {Empresa}", _config.NumEmpresa);

            // Initialize dynamic loader to find the best DLL and dispatcher at runtime
            try
            {
                _dynamicLoader = new SaeDynamicLoader(_logger);
                var candidates = new List<string>();
                var basePath = _config.RutaPrograma?.TrimEnd('\\') ?? string.Empty;
                if (!string.IsNullOrEmpty(basePath) && System.IO.Directory.Exists(basePath))
                {
                    candidates.AddRange(System.IO.Directory.GetFiles(basePath, "InterfaseSae*.dll", System.IO.SearchOption.TopDirectoryOnly));
                }

                if (candidates.Count == 0)
                {
                    var fallbackPaths = new[]
                    {
                        System.IO.Path.Combine(basePath, "InterfaseSae70.dll"),
                        System.IO.Path.Combine(basePath, "InterfaseSae.dll"),
                        System.IO.Path.Combine(basePath, "InterfaseSae80.dll"),
                        System.IO.Path.Combine(basePath, "InterfaseSae90.dll"),
                        System.IO.Path.Combine(basePath, "InterfaseSae100.dll"),
                    };
                    candidates.AddRange(fallbackPaths);
                }

                _dynamicLoader.TryLoadFromPaths(candidates);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Failed to initialize dynamic SAE loader");
            }

            string xmlInput = $@"<?xml version=""1.0"" encoding=""UTF-8""?>
<DATAPACKET>
  <ROWDATA>
    <ROW RutaDatos=""{_config.RutaDatos}"" 
         Usuario=""{_config.Usuario}"" 
         Password=""{_config.Password}"" 
         NumEmpresa=""{_config.NumEmpresa}"" />
  </ROWDATA>
</DATAPACKET>";

            string xmlOutput;
            int result;

            try
            {
                _logger.LogInformation("Sending 'IniciaInterfazSAESinLogin' command...");
                result = DispatchSaeCommand("IniciaInterfazSAESinLogin", xmlInput, out xmlOutput);
                _logger.LogInformation("Command returned code: {Code}", result);
                _logger.LogDebug("SAE Response XML: {Xml}", xmlOutput);

                if (result != 0)
                {
                    _logger.LogWarning("SinLogin command failed with code {Code}. Trying standard IniciaInterfazSAE...", result);
                    result = DispatchSaeCommand("IniciaInterfazSAE", xmlInput, out xmlOutput);
                    _logger.LogInformation("Standard IniciaInterfazSAE returned code: {Code}", result);
                    _logger.LogDebug("SAE Response XML: {Xml}", xmlOutput);
                }
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "SinLogin command dispatch failed, trying standard IniciaInterfazSAE...");
                try
                {
                    result = DispatchSaeCommand("IniciaInterfazSAE", xmlInput, out xmlOutput);
                    _logger.LogInformation("Command returned code: {Code}", result);
                }
                catch (Exception ex2)
                {
                    LastError = $"Both init attempts failed: {ex.Message} | {ex2.Message}";
                    _logger.LogError("All SAE initialization attempts failed");
                    return false;
                }
            }

            LastSaeResponse = xmlOutput;

            if (result >= 0)
            {
                _isInitialized = true;
                LastError = string.Empty;
                _logger.LogInformation("✅ SAE session initialized successfully!");

                // Start keep-alive timer (every 5 minutes)
                _keepAliveTimer = new Timer(KeepAliveCallback, null,
                    TimeSpan.FromMinutes(5),
                    TimeSpan.FromMinutes(5));

                return true;
            }
            else
            {
                LastError = $"SAE init returned code: {result}. Response: {xmlOutput}";
                _logger.LogError("SAE initialization failed. Code: {Code}, Response: {Response}", result, xmlOutput);
                return false;
            }
        }
        finally
        {
            _semaphore.Release();
        }
    }

    /// <summary>
    /// Executes a SAE command in a thread-safe serialized manner.
    /// </summary>
    public async Task<(int code, string response)> ExecuteSaeAsync(
        string commandName,
        string xmlInput)
    {
        if (!_isInitialized)
        {
            throw new InvalidOperationException(
                "SAE session is not initialized. POST /api/sae/init to initialize.");
        }

        await _semaphore.WaitAsync();
        try
        {
            _logger.LogDebug("Dispatching SAE operation: {Command}", commandName);
            string xmlOutput;
            int code = DispatchSaeCommand(commandName, xmlInput, out xmlOutput);
            _logger.LogDebug("SAE operation {Command} completed with code: {Code}", commandName, code);
            return (code, xmlOutput);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "SAE operation {Command} failed", commandName);
            throw;
        }
        finally
        {
            _semaphore.Release();
        }
    }

    /// <summary>
    /// Keep-alive callback — calls ContinuaIntSAE to prevent session timeout.
    /// </summary>
    private void KeepAliveCallback(object? state)
    {
        if (!_isInitialized) return;

        _semaphore.Wait();
        try
        {
            string output;
            var result = DispatchSaeCommand("ContinuaIntSAE", "", out output);
            if (result != 0)
            {
                _logger.LogWarning("ContinuaIntSAE returned: {Code}. Response: {Response}", result, output);
            }
            else
            {
                _logger.LogDebug("SAE keep-alive ping successful");
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "SAE keep-alive failed");
        }
        finally
        {
            _semaphore.Release();
        }
    }

    /// <summary>
    /// Gracefully terminates the SAE session.
    /// </summary>
    public void Dispose()
    {
        _keepAliveTimer?.Dispose();

        if (_isInitialized)
        {
            _semaphore.Wait();
            try
            {
                _logger.LogInformation("Terminating SAE session...");
                string output;
                DispatchSaeCommand("TerminaInterfazSAE", "", out output);
                _isInitialized = false;
                _logger.LogInformation("SAE session terminated. Response: {Response}", output);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error terminating SAE session");
            }
            finally
            {
                _semaphore.Release();
            }
        }

        _semaphore.Dispose();
        _dynamicLoader?.Dispose();
    }
}

/// <summary>
/// Configuration for the SAE connection.
/// Loaded from appsettings.json → "Sae" section.
/// </summary>
public class SaeConfig
{
    /// <summary>Path to the SAE program directory (where DLLs live). Used for SetDllDirectory.</summary>
    public string RutaPrograma { get; set; } = @"C:\Program Files (x86)\Aspel\Aspel-SAE\";
    /// <summary>Path to SAE data directory (where databases/config live). Passed in XML init.</summary>
    public string RutaDatos { get; set; } = @"C:\Program Files (x86)\Common Files\Aspel\Sistemas Aspel\SAE9.00\";
    public string Usuario { get; set; } = "";
    public string Password { get; set; } = "";
    public int NumEmpresa { get; set; } = 1;
}
