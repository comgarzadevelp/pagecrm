using Microsoft.AspNetCore.Mvc;
using SaeBridge.Interop;
using SaeBridge.Models;

namespace SaeBridge.Controllers;

/// <summary>
/// Client (Cliente) management endpoints.
/// All SAE functions follow the pattern: int FunctionName(string xmlInput, ref string xmlOutput)
/// </summary>
[ApiController]
[Route("api/sae/clientes")]
public class ClientesController : ControllerBase
{
    private readonly SaeSessionManager _session;
    private readonly ILogger<ClientesController> _logger;

    public ClientesController(SaeSessionManager session, ILogger<ClientesController> logger)
    {
        _session = session;
        _logger = logger;
    }

    /// <summary>
    /// GET /api/sae/clientes — Query clients catalog.
    /// </summary>
    [HttpGet]
    public async Task<IActionResult> GetClientes([FromQuery] string filtro = "")
    {
        try
        {
            var result = await _session.ExecuteSaeAsync("ConsultaClientesXML", filtro);

            if (result.code == 0)
                return Ok(SaeResponse<string>.Ok(result.response, "Clientes consultados"));

            return StatusCode(500, SaeResponse.Error(result.code,
                $"Error al consultar clientes. Código: {result.code}. Respuesta: {result.response}"));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in GetClientes");
            return StatusCode(500, SaeResponse.Error($"Error interno: {ex.Message}"));
        }
    }

    /// <summary>
    /// GET /api/sae/clientes/validar/{clave} — Check if a client exists.
    /// </summary>
    [HttpGet("validar/{clave}")]
    public async Task<IActionResult> ValidarCliente(string clave)
    {
        try
        {
            var result = await _session.ExecuteSaeAsync("ValidaCliente", clave);

            return Ok(SaeResponse<object>.Ok(
                new { Clave = clave, Exists = result.code == 0, SaeResponse = result.response },
                result.code == 0 ? "Cliente encontrado" : "Cliente no encontrado"
            ));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in ValidarCliente");
            return StatusCode(500, SaeResponse.Error($"Error interno: {ex.Message}"));
        }
    }

    /// <summary>
    /// POST /api/sae/clientes — Create a new client in SAE.
    /// Body: { "xml": "..." } with XML in SAE format.
    /// </summary>
    [HttpPost]
    public async Task<IActionResult> CrearCliente([FromBody] SaeXmlRequest request)
    {
        try
        {
            var result = await _session.ExecuteSaeAsync("GrabaCliente", request.Xml);

            if (result.code == 0)
                return Ok(SaeResponse<string>.Ok(result.response, "Cliente creado correctamente en SAE"));

            return StatusCode(500, SaeResponse.Error(result.code,
                $"Error al crear cliente. Código: {result.code}. Respuesta: {result.response}"));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in CrearCliente");
            return StatusCode(500, SaeResponse.Error($"Error interno: {ex.Message}"));
        }
    }

    /// <summary>
    /// PUT /api/sae/clientes — Modify an existing client.
    /// This is the SAFE way to edit client data instead of direct SQL!
    /// </summary>
    [HttpPut]
    public async Task<IActionResult> ModificarCliente([FromBody] SaeXmlRequest request)
    {
        try
        {
            var result = await _session.ExecuteSaeAsync("ModCliente", request.Xml);

            if (result.code == 0)
                return Ok(SaeResponse<string>.Ok(result.response, "Cliente modificado correctamente en SAE"));

            return StatusCode(500, SaeResponse.Error(result.code,
                $"Error al modificar cliente. Código: {result.code}. Respuesta: {result.response}"));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in ModificarCliente");
            return StatusCode(500, SaeResponse.Error($"Error interno: {ex.Message}"));
        }
    }
}

/// <summary>
/// Simple request model for XML-based operations.
/// </summary>
public class SaeXmlRequest
{
    public string Xml { get; set; } = string.Empty;
}
