using System.Runtime.InteropServices;
using System.Text;

namespace SaeBridge.Interop;

/// <summary>
/// P/Invoke declarations for InterfaseSae70.dll (native Delphi DLL).
/// 
/// Provides ALL dispatcher variants with both ANSI and Unicode CharSets
/// so the diagnostics endpoint can determine which one works at runtime.
/// </summary>
public static class SaeNative
{
    private const string DLL_PATH = @"C:\Program Files (x86)\Aspel\Aspel-SAE\InterfaseSae70.dll";

    // ═══════════════════════════════════════════════════════════════
    // EjecutaComando — Traditional ANSI dispatcher
    // ═══════════════════════════════════════════════════════════════
    [DllImport(DLL_PATH, EntryPoint = "EjecutaComando", CallingConvention = CallingConvention.StdCall, CharSet = CharSet.Ansi, SetLastError = true)]
    public static extern IntPtr EjecutaComando_Ansi(string cmd, string xml, StringBuilder output);

    [DllImport(DLL_PATH, EntryPoint = "EjecutaComando", CallingConvention = CallingConvention.StdCall, CharSet = CharSet.Unicode, SetLastError = true)]
    public static extern IntPtr EjecutaComando_Unicode(string cmd, string xml, StringBuilder output);

    // ═══════════════════════════════════════════════════════════════
    // EjecutaComandoXE — Delphi XE dispatcher (should be Unicode)
    // ═══════════════════════════════════════════════════════════════
    [DllImport(DLL_PATH, EntryPoint = "EjecutaComandoXE", CallingConvention = CallingConvention.StdCall, CharSet = CharSet.Ansi, SetLastError = true)]
    public static extern IntPtr EjecutaComandoXE_Ansi(string cmd, string xml, [Out] byte[] output);

    [DllImport(DLL_PATH, EntryPoint = "EjecutaComandoXE", CallingConvention = CallingConvention.StdCall, CharSet = CharSet.Unicode, SetLastError = true)]
    public static extern IntPtr EjecutaComandoXE_Unicode(string cmd, string xml, StringBuilder output);

    // ═══════════════════════════════════════════════════════════════
    // EjecutaComandoPuente — Bridge variant (designed for integrations)
    // ═══════════════════════════════════════════════════════════════
    [DllImport(DLL_PATH, EntryPoint = "EjecutaComandoPuente", CallingConvention = CallingConvention.StdCall, CharSet = CharSet.Ansi, SetLastError = true)]
    public static extern IntPtr EjecutaComandoPuente_Ansi(string cmd, string xml, StringBuilder output);

    [DllImport(DLL_PATH, EntryPoint = "EjecutaComandoPuente", CallingConvention = CallingConvention.StdCall, CharSet = CharSet.Unicode, SetLastError = true)]
    public static extern IntPtr EjecutaComandoPuente_Unicode(string cmd, string xml, StringBuilder output);

    // ═══════════════════════════════════════════════════════════════
    // EjecutaComandoXE_Movil — Mobile variant
    // ═══════════════════════════════════════════════════════════════
    [DllImport(DLL_PATH, EntryPoint = "EjecutaComandoXE_Movil", CallingConvention = CallingConvention.StdCall, CharSet = CharSet.Ansi, SetLastError = true)]
    public static extern IntPtr EjecutaComandoXE_Movil_Ansi(string cmd, string xml, StringBuilder output);

    [DllImport(DLL_PATH, EntryPoint = "EjecutaComandoXE_Movil", CallingConvention = CallingConvention.StdCall, CharSet = CharSet.Unicode, SetLastError = true)]
    public static extern IntPtr EjecutaComandoXE_Movil_Unicode(string cmd, string xml, StringBuilder output);

    // ═══════════════════════════════════════════════════════════════
    // Windows API helpers
    // ═══════════════════════════════════════════════════════════════
    [DllImport("kernel32.dll", CharSet = CharSet.Unicode, SetLastError = true)]
    [return: MarshalAs(UnmanagedType.Bool)]
    public static extern bool SetDllDirectory(string lpPathName);

    /// <summary>
    /// All dispatcher variants as named delegates for systematic testing.
    /// </summary>
    public delegate IntPtr DispatcherFunc(string cmd, string xml, StringBuilder output);

    public static readonly (string Name, DispatcherFunc Func)[] AllDispatchers = new[]
    {
        ("EjecutaComando_Ansi",            (DispatcherFunc)EjecutaComando_Ansi),
        ("EjecutaComando_Unicode",         (DispatcherFunc)EjecutaComando_Unicode),
        ("EjecutaComandoXE_Unicode",       (DispatcherFunc)EjecutaComandoXE_Unicode),
        ("EjecutaComandoPuente_Ansi",      (DispatcherFunc)EjecutaComandoPuente_Ansi),
        ("EjecutaComandoPuente_Unicode",   (DispatcherFunc)EjecutaComandoPuente_Unicode),
        ("EjecutaComandoXE_Movil_Ansi",    (DispatcherFunc)EjecutaComandoXE_Movil_Ansi),
        ("EjecutaComandoXE_Movil_Unicode", (DispatcherFunc)EjecutaComandoXE_Movil_Unicode),
    };
}
