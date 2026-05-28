using Microsoft.AspNetCore.Mvc;
using SaeBridge.Interop;
using SaeBridge.Models;

namespace SaeBridge.Controllers;

/// <summary>
/// Order (Pedido) management endpoints.
/// </summary>
[ApiController]
[Route("api/sae/pedidos")]
public class PedidosController : ControllerBase
{
    private readonly SaeSessionManager _session;
    private readonly ILogger<PedidosController> _logger;

    public PedidosController(SaeSessionManager session, ILogger<PedidosController> logger)
    {
        _session = session;
        _logger = logger;
    }

    /// <summary>
    /// POST /api/sae/pedidos — Creates a new order (pedido) in SAE.
    /// Body: { "xml": "..." } containing the formatted order XML.
    /// </summary>
    [HttpPost]
    public async Task<IActionResult> CrearPedido([FromBody] SaeXmlRequest request)
    {
        try
        {
            var result = await _session.ExecuteSaeAsync("InterfazGrabaPedidoXML", request.Xml);

            if (result.code == 0)
                return Ok(SaeResponse<string>.Ok(result.response, "Pedido creado correctamente en SAE"));

            return StatusCode(500, SaeResponse.Error(result.code,
                $"Error al crear pedido. Código: {result.code}. Respuesta: {result.response}"));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in CrearPedido");
            return StatusCode(500, SaeResponse.Error($"Error interno: {ex.Message}"));
        }
    }

    /// <summary>
    /// GET /api/sae/pedidos/{clave} — Retrieves details for an existing order.
    /// </summary>
    [HttpGet("{clave}")]
    public async Task<IActionResult> GetPedido(string clave)
    {
        try
        {
            var result = await _session.ExecuteSaeAsync("InterfazObtenPedidoXML", clave);

            if (result.code == 0)
                return Ok(SaeResponse<string>.Ok(result.response, "Pedido obtenido con éxito"));

            return StatusCode(404, SaeResponse.Error(result.code,
                $"Pedido no encontrado. Código: {result.code}. Respuesta: {result.response}"));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in GetPedido");
            return StatusCode(500, SaeResponse.Error($"Error interno: {ex.Message}"));
        }
    }

    /// <summary>
    /// PUT /api/sae/pedidos — Modifies an existing order in SAE.
    /// </summary>
    [HttpPut]
    public async Task<IActionResult> ModificarPedido([FromBody] SaeXmlRequest request)
    {
        try
        {
            var result = await _session.ExecuteSaeAsync("ModificaPedidoXML", request.Xml);

            if (result.code == 0)
                return Ok(SaeResponse<string>.Ok(result.response, "Pedido modificado correctamente en SAE"));

            return StatusCode(500, SaeResponse.Error(result.code,
                $"Error al modificar pedido. Código: {result.code}. Respuesta: {result.response}"));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in ModificarPedido");
            return StatusCode(500, SaeResponse.Error($"Error interno: {ex.Message}"));
        }
    }
}
