using Microsoft.AspNetCore.Mvc;
using SaeBridge.Interop;
using System.Runtime.InteropServices;
using System.Text;

namespace SaeBridge.Controllers;

/// <summary>
/// V2 Diagnostics — reads raw memory from return codes to discover error messages,
/// and tests alternative P/Invoke marshalling strategies.
/// </summary>
[ApiController]
[Route("api/sae")]
public class DiagnosticsController : ControllerBase
{
    private readonly SaeConfig _config;

    public DiagnosticsController(SaeConfig config)
    {
        _config = config;
    }

    [HttpGet("diagnostics")]
    public IActionResult RunDiagnostics()
    {
        var results = new Dictionary<string, object>();

        // ─── 1. Registry info ───
        results["registry"] = ReadRegistryInfo();

        // ─── 2. Test EjecutaComandoXE_Ansi (most promising from v1 data) ───
        var rutaPaths = new[]
        {
            @"C:\Program Files (x86)\Aspel\Aspel-SAE\",
            @"C:\Program Files (x86)\Common Files\Aspel\",
            @"C:\Program Files (x86)\Common Files\Aspel\Sistemas Aspel\SAE9.00\",
            @"C:\Program Files (x86)\Common Files\Aspel\Sistemas Aspel\SAE9.00\Ejemplos\",
        };

        var initTests = new List<object>();
        foreach (var ruta in rutaPaths)
        {
            initTests.Add(TestInitWithPointerRead(ruta));
        }
        results["initTests"] = initTests;

        // ─── 3. Test with ref IntPtr output ───
        results["refPtrTest"] = TestRefIntPtrOutput();

        // ─── 5. Full sequence test: init → query (using EjecutaComandoXE_Ansi) ───
        results["sequenceTest"] = TestFullSequence();

        // ─── 6. Check if Aspel SAE is running ───
        results["aspelProcesses"] = CheckAspelProcesses();

        return Ok(results);
    }

    private object TestInitWithPointerRead(string rutaDatos)
    {
        string xmlInit = $@"<?xml version=""1.0"" encoding=""UTF-8""?>
<DATAPACKET>
  <ROWDATA>
    <ROW RutaDatos=""{rutaDatos}"" 
         Usuario=""{_config.Usuario}"" 
         Password=""{_config.Password}"" 
         NumEmpresa=""{_config.NumEmpresa}"" />
  </ROWDATA>
</DATAPACKET>";

        var test = new Dictionary<string, object> { ["rutaDatos"] = rutaDatos };

            try
            {
                var sb = new StringBuilder(1024 * 1024);
                IntPtr codePtr = SaeNative.EjecutaComandoXE_Unicode("IniciaInterfazSAE", xmlInit, sb);
                string output = sb.ToString();

                long codeVal = codePtr.ToInt64();
                test["code"] = codeVal;
                test["codeHex"] = $"0x{codeVal:X16}";
                test["output"] = output;
                test["outputLength"] = output.Length;

                // Try to read the return code as a string pointer (Delphi error message)
                test["ptrAsAnsiString"] = TryReadPointerAsString(codePtr, false);
                test["ptrAsUnicodeString"] = TryReadPointerAsString(codePtr, true);

                // Also check if the output buffer has data beyond the first null
                test["rawBufferFirst100Bytes"] = ReadRawBuffer(sb, 100);
            }
        catch (Exception ex)
        {
            test["error"] = $"{ex.GetType().Name}: {ex.Message}";
        }

        return test;
    }

    [DllImport("kernel32.dll", SetLastError = true)]
    [return: MarshalAs(UnmanagedType.Bool)]
    private static extern bool IsBadReadPtr(IntPtr lp, UIntPtr ucb);

    private static bool IsPointerReadable(IntPtr ptr, uint bytes = 1)
    {
        if (ptr == IntPtr.Zero) return false;
        if (ptr.ToInt64() < 0x1000) return false;
        try
        {
            return !IsBadReadPtr(ptr, (UIntPtr)bytes);
        }
        catch
        {
            return false;
        }
    }

    private string TryReadPointerAsString(IntPtr codePtr, bool unicode)
    {
        if (codePtr == IntPtr.Zero) return "(null pointer)";
        if (!IsPointerReadable(codePtr, 2)) return "(unreadable pointer)";

        try
        {
            string? s;
            if (unicode)
                s = Marshal.PtrToStringUni(codePtr, 100); // Read up to 100 chars
            else
                s = Marshal.PtrToStringAnsi(codePtr, 100);

            if (s == null) return "(null)";

            var cleaned = new string(s.Where(c => !char.IsControl(c) || c == '\n' || c == '\r' || c == '\t').ToArray());
            return cleaned.Length > 0 ? cleaned : "(empty/non-printable)";
        }
        catch
        {
            return "(read failed)";
        }
    }

    private string ReadRawBuffer(StringBuilder sb, int maxBytes)
    {
        try
        {
            // Get the underlying buffer as a string (which may have null chars)
            string fullContent = sb.ToString(0, Math.Min(sb.Length, maxBytes));
            
            // Convert to hex dump for inspection
            var bytes = System.Text.Encoding.UTF8.GetBytes(fullContent);
            return BitConverter.ToString(bytes).Replace("-", " ");
        }
        catch
        {
            return "(could not read)";
        }
    }

    // ═══════════════════════════════════════════════════════════════
    // ref IntPtr output test
    // ═══════════════════════════════════════════════════════════════

    [DllImport(@"C:\Program Files (x86)\Aspel\Aspel-SAE\InterfaseSae70.dll",
        EntryPoint = "EjecutaComandoXE",
        CallingConvention = CallingConvention.StdCall, CharSet = CharSet.Ansi)]
    private static extern int EjecutaComandoXE_RefPtr(
        string cmd,
        string xml,
        ref IntPtr output
    );

    [DllImport(@"C:\Program Files (x86)\Aspel\Aspel-SAE\InterfaseSae70.dll",
        EntryPoint = "EjecutaComando",
        CallingConvention = CallingConvention.StdCall, CharSet = CharSet.Ansi)]
    private static extern int EjecutaComando_RefPtr(
        string cmd,
        string xml,
        ref IntPtr output
    );

    private object TestRefIntPtrOutput()
    {
        string xmlInit = $@"<?xml version=""1.0"" encoding=""UTF-8""?>
<DATAPACKET>
  <ROWDATA>
    <ROW RutaDatos=""{_config.RutaPrograma}"" 
         Usuario=""{_config.Usuario}"" 
         Password=""{_config.Password}"" 
         NumEmpresa=""{_config.NumEmpresa}"" />
  </ROWDATA>
</DATAPACKET>";

        var tests = new List<object>();

        // Test EjecutaComandoXE with ref IntPtr
        try
        {
            IntPtr outputPtr = IntPtr.Zero;
            int code = EjecutaComandoXE_RefPtr("IniciaInterfazSAE", xmlInit, ref outputPtr);

            string outputAsAnsi = "(not readable)";
            string outputAsUnicode = "(not readable)";
            if (outputPtr != IntPtr.Zero && IsPointerReadable(outputPtr, 2))
            {
                outputAsAnsi = CleanString(Marshal.PtrToStringAnsi(outputPtr, 200));
                outputAsUnicode = CleanString(Marshal.PtrToStringUni(outputPtr, 200));
            }

            tests.Add(new
            {
                variant = "EjecutaComandoXE_RefPtr",
                code,
                codeHex = $"0x{code:X8}",
                outputPtr = $"0x{outputPtr:X8}",
                outputAsAnsi,
                outputAsUnicode,
                returnCodeAsAnsi = TryReadPointerAsString(new IntPtr(code), false),
                returnCodeAsUnicode = TryReadPointerAsString(new IntPtr(code), true)
            });
        }
        catch (Exception ex)
        {
            tests.Add(new { variant = "EjecutaComandoXE_RefPtr", error = $"{ex.GetType().Name}: {ex.Message}" });
        }

        // Test EjecutaComando with ref IntPtr
        try
        {
            IntPtr outputPtr = IntPtr.Zero;
            int code = EjecutaComando_RefPtr("IniciaInterfazSAE", xmlInit, ref outputPtr);

            string outputAsAnsi = "(not readable)";
            string outputAsUnicode = "(not readable)";
            if (outputPtr != IntPtr.Zero && IsPointerReadable(outputPtr, 2))
            {
                outputAsAnsi = CleanString(Marshal.PtrToStringAnsi(outputPtr, 200));
                outputAsUnicode = CleanString(Marshal.PtrToStringUni(outputPtr, 200));
            }

            tests.Add(new
            {
                variant = "EjecutaComando_RefPtr",
                code,
                codeHex = $"0x{code:X8}",
                outputPtr = $"0x{outputPtr:X8}",
                outputAsAnsi,
                outputAsUnicode
            });
        }
        catch (Exception ex)
        {
            tests.Add(new { variant = "EjecutaComando_RefPtr", error = $"{ex.GetType().Name}: {ex.Message}" });
        }

        return tests;
    }

    // ═══════════════════════════════════════════════════════════════
    // Full sequence test
    // ═══════════════════════════════════════════════════════════════

    private object TestFullSequence()
    {
        var steps = new List<object>();

        string xmlInit = $@"<?xml version=""1.0"" encoding=""UTF-8""?>
<DATAPACKET>
  <ROWDATA>
    <ROW RutaDatos=""{_config.RutaPrograma}"" 
         Usuario=""{_config.Usuario}"" 
         Password=""{_config.Password}"" 
         NumEmpresa=""{_config.NumEmpresa}"" />
  </ROWDATA>
</DATAPACKET>";

            try
            {
                var sb = new StringBuilder(1024 * 1024);

                // Step 1: Init
                IntPtr initPtr = SaeNative.EjecutaComandoXE_Unicode("IniciaInterfazSAE", xmlInit, sb);
                long initVal = initPtr.ToInt64();
                steps.Add(new { step = "init", code = initVal, hex = $"0x{initVal:X16}", output = sb.ToString() });

                // Step 2: Try query regardless
                sb.Clear();
                IntPtr queryPtr = SaeNative.EjecutaComandoXE_Unicode("ConsultaClientesXML", "", sb);
                long queryVal = queryPtr.ToInt64();
                string queryOut = sb.ToString();
                steps.Add(new { step = "query_empty", code = queryVal, hex = $"0x{queryVal:X16}", output = queryOut.Length > 500 ? queryOut.Substring(0, 500) : queryOut, length = queryOut.Length });

                // Step 3: Try with XML filter
                sb.Clear();
                string xmlQuery = @"<?xml version=""1.0"" encoding=""UTF-8""?><DATAPACKET><ROWDATA><ROW /></ROWDATA></DATAPACKET>";
                IntPtr queryPtr2 = SaeNative.EjecutaComandoXE_Unicode("ConsultaClientesXML", xmlQuery, sb);
                long queryVal2 = queryPtr2.ToInt64();
                string queryOut2 = sb.ToString();
                steps.Add(new { step = "query_xml", code = queryVal2, hex = $"0x{queryVal2:X16}", output = queryOut2.Length > 500 ? queryOut2.Substring(0, 500) : queryOut2, length = queryOut2.Length });

                // Step 4: Try DameEmpresas
                sb.Clear();
                IntPtr empPtr = SaeNative.EjecutaComandoXE_Unicode("DameEmpresas", "", sb);
                long empVal = empPtr.ToInt64();
                string empOut = sb.ToString();
                steps.Add(new { step = "DameEmpresas", code = empVal, hex = $"0x{empVal:X16}", output = empOut.Length > 500 ? empOut.Substring(0, 500) : empOut, length = empOut.Length });

                // Step 5: Try DameEmpresa
                sb.Clear();
                IntPtr empPtr2 = SaeNative.EjecutaComandoXE_Unicode("DameEmpresa", xmlInit, sb);
                long empVal2 = empPtr2.ToInt64();
                string empOut2 = sb.ToString();
                steps.Add(new { step = "DameEmpresa", code = empVal2, hex = $"0x{empVal2:X16}", output = empOut2.Length > 500 ? empOut2.Substring(0, 500) : empOut2, length = empOut2.Length });

                // Step 6: Try GetTotalEmpresasSAE
                sb.Clear();
                IntPtr totalPtr = SaeNative.EjecutaComandoXE_Unicode("GetTotalEmpresasSAE", "", sb);
                long totalVal = totalPtr.ToInt64();
                string totalOut = sb.ToString();
                steps.Add(new { step = "GetTotalEmpresasSAE", code = totalVal, hex = $"0x{totalVal:X16}", output = totalOut, length = totalOut.Length });

                // Step 7: Try DameRutaDatosSae
                sb.Clear();
                IntPtr rutaPtr = SaeNative.EjecutaComandoXE_Unicode("DameRutaDatosSae", "", sb);
                long rutaVal = rutaPtr.ToInt64();
                string rutaOut = sb.ToString();
                steps.Add(new { step = "DameRutaDatosSae", code = rutaVal, hex = $"0x{rutaVal:X16}", output = rutaOut, length = rutaOut.Length });

                // Step 8: Try InicializaParametrosSAE5
                sb.Clear();
                IntPtr paramPtr = SaeNative.EjecutaComandoXE_Unicode("InicializaParametrosSAE5", xmlInit, sb);
                long paramVal = paramPtr.ToInt64();
                string paramOut = sb.ToString();
                steps.Add(new { step = "InicializaParametrosSAE5", code = paramVal, hex = $"0x{paramVal:X16}", output = paramOut, length = paramOut.Length });

                // Cleanup
                sb.Clear();
                SaeNative.EjecutaComandoXE_Unicode("TerminaInterfazSAE", "", sb);
            }
        catch (Exception ex)
        {
            steps.Add(new { step = "EXCEPTION", error = $"{ex.GetType().Name}: {ex.Message}" });
        }

        return steps;
    }

    private object ReadRegistryInfo()
    {
        var info = new Dictionary<string, string>();
        try
        {
            using var key = Microsoft.Win32.Registry.LocalMachine.OpenSubKey(@"SOFTWARE\WOW6432Node\Aspel\Aspel-SAE 9.0");
            if (key != null)
            {
                foreach (var name in key.GetValueNames())
                    info[name] = key.GetValue(name)?.ToString() ?? "(null)";
            }
            else
            {
                info["error"] = "Key not found";
            }

            // Check activation
            using var actKey = Microsoft.Win32.Registry.LocalMachine.OpenSubKey(@"SOFTWARE\WOW6432Node\Aspel\Activacion");
            if (actKey != null)
            {
                foreach (var name in actKey.GetValueNames())
                    info[$"Activacion_{name}"] = actKey.GetValue(name)?.ToString() ?? "(null)";
            }
        }
        catch (Exception ex)
        {
            info["error"] = ex.Message;
        }
        return info;
    }

    private object CheckAspelProcesses()
    {
        try
        {
            var processes = System.Diagnostics.Process.GetProcesses()
                .Where(p => p.ProcessName.Contains("SAE", StringComparison.OrdinalIgnoreCase) ||
                           p.ProcessName.Contains("Aspel", StringComparison.OrdinalIgnoreCase))
                .Select(p => new { p.ProcessName, p.Id })
                .ToList();
            return processes.Any() ? processes : new[] { new { ProcessName = "(none running)", Id = 0 } };
        }
        catch { return "Could not check processes"; }
    }

    private string CleanString(string? s)
    {
        if (s == null) return "(null)";
        var cleaned = new string(s.Where(c => !char.IsControl(c) || c == '\n' || c == '\r' || c == '\t').ToArray());
        return cleaned.Length > 0 ? cleaned.Substring(0, Math.Min(cleaned.Length, 200)) : "(empty/non-printable)";
    }
}
