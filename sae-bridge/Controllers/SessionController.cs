using Microsoft.AspNetCore.Mvc;
using SaeBridge.Interop;
using SaeBridge.Models;

namespace SaeBridge.Controllers;

/// <summary>
/// Health check and session management endpoints.
/// </summary>
[ApiController]
[Route("api/sae")]
public class SessionController : ControllerBase
{
    private readonly SaeSessionManager _session;
    private readonly ILogger<SessionController> _logger;
    private static readonly DateTime _startedAt = DateTime.Now;

    public SessionController(SaeSessionManager session, ILogger<SessionController> logger)
    {
        _session = session;
        _logger = logger;
    }

    /// <summary>
    /// GET /api/sae/status — Diagnostics and connection health check.
    /// </summary>
    [HttpGet("status")]
    public IActionResult GetStatus()
    {
        var status = new SaeStatusInfo
        {
            SessionActive = _session.IsInitialized,
            LastError = _session.LastError,
            StartedAt = _startedAt,
            Version = "1.0.0"
        };

        return Ok(SaeResponse<SaeStatusInfo>.Ok(status, "Estado de la conexión obtenido"));
    }

    /// <summary>
    /// GET /api/sae/status/ruta — Diagnostics endpoint to get active database path.
    /// </summary>
    [HttpGet("status/ruta")]
    public async Task<IActionResult> GetSaeActivePath()
    {
        try
        {
            var result = await _session.ExecuteSaeAsync("DameRutaDatosSae", "");
            return Ok(new { success = true, code = result.code, path = result.response });
        }
        catch (Exception ex)
        {
            return StatusCode(500, SaeResponse.Error($"Error: {ex.Message}"));
        }
    }

    /// <summary>
    /// POST /api/sae/init — Explicitly starts/restores the SAE session.
    /// Normally called on startup, but useful to restore connection if it drops.
    /// </summary>
    [HttpPost("init")]
    public async Task<IActionResult> InitializeSession()
    {
        try
        {
            if (_session.IsInitialized)
            {
                return Ok(SaeResponse.Ok("La sesión del SAE ya está activa"));
            }

            var success = await _session.InitializeAsync();
            if (success)
            {
                return Ok(SaeResponse.Ok("Sesión de Aspel-SAE inicializada correctamente"));
            }

            return StatusCode(500, SaeResponse.Error($"No se pudo inicializar la sesión: {_session.LastError}"));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in InitializeSession endpoint");
            return StatusCode(500, SaeResponse.Error($"Error en el servidor: {ex.Message}"));
        }
    }

    /// <summary>
    /// POST /api/sae/terminate — Explicitly closes the SAE session.
    /// </summary>
    [HttpPost("terminate")]
    public IActionResult TerminateSession()
    {
        try
        {
            if (!_session.IsInitialized)
            {
                return BadRequest(SaeResponse.Error("No hay ninguna sesión activa para terminar"));
            }

            _session.Dispose();
            return Ok(SaeResponse.Ok("Sesión de Aspel-SAE terminada correctamente"));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in TerminateSession endpoint");
            return StatusCode(500, SaeResponse.Error($"Error en el servidor: {ex.Message}"));
        }
    }
}
