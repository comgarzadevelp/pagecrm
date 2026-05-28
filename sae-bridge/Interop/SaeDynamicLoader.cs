using System.Linq;
using System.Runtime.InteropServices;
using Microsoft.Extensions.Logging;
using System.Text;

namespace SaeBridge.Interop;

/// <summary>
/// Dynamic loader that tries to load the Interfase SAE DLL from a program directory,
/// resolve dispatcher functions and invoke them using unmanaged memory. This avoids
/// DllImport signature mismatches and allows probing for ANSI/Unicode/BSTR variants
/// and matching process bitness.
/// </summary>
public sealed class SaeDynamicLoader : IDisposable
{
    private IntPtr _hModule = IntPtr.Zero;
    private IntPtr _procPtr = IntPtr.Zero;
    private readonly ILogger _logger;

    public bool IsLoaded => _hModule != IntPtr.Zero && _procPtr != IntPtr.Zero;
    public string? LoadedPath { get; private set; }

    public SaeDynamicLoader(ILogger logger)
    {
        _logger = logger;
    }

    [UnmanagedFunctionPointer(CallingConvention.StdCall)]
    private delegate IntPtr NativeDispatch(IntPtr cmd, IntPtr xml, IntPtr output);

    [DllImport("kernel32", SetLastError = true, CharSet = CharSet.Unicode)]
    private static extern IntPtr LoadLibrary(string lpFileName);

    [DllImport("kernel32", SetLastError = true)]
    private static extern bool FreeLibrary(IntPtr hModule);

    [DllImport("kernel32", SetLastError = true, CharSet = CharSet.Ansi)]
    private static extern IntPtr GetProcAddress(IntPtr hModule, string procName);

    public bool TryLoadFromPaths(IEnumerable<string> candidatePaths)
    {
        foreach (var path in candidatePaths)
        {
            try
            {
                if (!System.IO.File.Exists(path)) continue;
                _logger.LogInformation("Attempting LoadLibrary on {Path}", path);
                var h = LoadLibrary(path);
                if (h == IntPtr.Zero)
                {
                    var err = Marshal.GetLastWin32Error();
                    _logger.LogWarning("LoadLibrary failed for {Path} (err={Err})", path, err);
                    continue;
                }

                // Try to find common dispatcher names
                var candidates = new[] { "EjecutaComandoXE", "EjecutaComandoPuente", "EjecutaComando" };
                foreach (var cand in candidates)
                {
                    var p = GetProcAddress(h, cand);
                    if (p != IntPtr.Zero)
                    {
                        _hModule = h;
                        _procPtr = p;
                        LoadedPath = path;
                        _logger.LogInformation("Found dispatcher {Name} in {Path}", cand, path);
                        return true;
                    }
                }

                // Not found, free and continue
                FreeLibrary(h);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Error probing {Path}", path);
            }
        }
        return false;
    }

    private static string? DecodeNativePointer(IntPtr ptr)
    {
        if (ptr == IntPtr.Zero) return null;

        try
        {
            string? uni = null;
            string? ansi = null;

            try
            {
                uni = Marshal.PtrToStringUni(ptr);
            }
            catch
            {
                uni = null;
            }

            try
            {
                ansi = Marshal.PtrToStringAnsi(ptr);
            }
            catch
            {
                ansi = null;
            }

            var candidates = new[] { uni, ansi }
                .Where(s => !string.IsNullOrEmpty(s))
                .Select(s => new { Text = s!, Score = ScoreString(s!) })
                .OrderByDescending(x => x.Score)
                .ToList();

            if (candidates.Any())
            {
                return candidates.First().Text;
            }

            return uni ?? ansi;
        }
        catch
        {
            return null;
        }
    }

    private static int ScoreString(string? value)
    {
        if (string.IsNullOrEmpty(value)) return 0;
        if (value.Contains("<DATAPACKET>") || value.Contains("<?xml")) return 1000;
        if (value == "0") return 800;

        var printable = value.Count(c => !char.IsControl(c) || c == '\n' || c == '\r' || c == '\t');
        var ratio = (double)printable / value.Length;
        return (int)(ratio * 100);
    }

    /// <summary>
    /// Invokes the resolved dispatcher using unmanaged buffers. Tries multiple text decodings
    /// when reading the returned pointer to choose the best result.
    /// </summary>
    public (IntPtr resultPtr, string? result, int lastError) Invoke(string cmd, string xml, int outBufferSize = 1024 * 1024)
    {
        if (!IsLoaded) throw new InvalidOperationException("No SAE dispatcher loaded");

        var lastErr = 0;
        IntPtr resultPtr = IntPtr.Zero;
        string? result = null;

        var native = Marshal.GetDelegateForFunctionPointer<NativeDispatch>(_procPtr);

        IntPtr cmdPtr = IntPtr.Zero;
        IntPtr xmlPtr = IntPtr.Zero;
        IntPtr outPtr = IntPtr.Zero;
        try
        {
            cmdPtr = Marshal.StringToHGlobalUni(cmd);
            xmlPtr = Marshal.StringToHGlobalUni(xml ?? string.Empty);
            outPtr = Marshal.AllocHGlobal(outBufferSize);
            Span<byte> zero = new byte[outBufferSize];
            Marshal.Copy(zero.ToArray(), 0, outPtr, outBufferSize);

            resultPtr = native(cmdPtr, xmlPtr, outPtr);
            lastErr = Marshal.GetLastWin32Error();

            if (resultPtr != IntPtr.Zero)
            {
                result = DecodeNativePointer(resultPtr);
            }

            if (string.IsNullOrEmpty(result) && outPtr != IntPtr.Zero)
            {
                result = DecodeNativePointer(outPtr);
            }
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Native invoke failed");
        }
        finally
        {
            if (cmdPtr != IntPtr.Zero) Marshal.FreeHGlobal(cmdPtr);
            if (xmlPtr != IntPtr.Zero) Marshal.FreeHGlobal(xmlPtr);
            if (outPtr != IntPtr.Zero) Marshal.FreeHGlobal(outPtr);
        }

        return (resultPtr, result, lastErr);
    }

    public void Dispose()
    {
        if (_hModule != IntPtr.Zero)
        {
            try { FreeLibrary(_hModule); } catch { }
            _hModule = IntPtr.Zero;
            _procPtr = IntPtr.Zero;
        }
    }
}
