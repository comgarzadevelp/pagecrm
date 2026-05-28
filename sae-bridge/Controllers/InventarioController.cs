using Microsoft.AspNetCore.Mvc;
using SaeBridge.Interop;
using SaeBridge.Models;

namespace SaeBridge.Controllers;

/// <summary>
/// Inventory and product management endpoints.
/// </summary>
[ApiController]
[Route("api/sae/inventario")]
public class InventarioController : ControllerBase
{
    private readonly SaeSessionManager _session;
    private readonly ILogger<InventarioController> _logger;

    public InventarioController(SaeSessionManager session, ILogger<InventarioController> logger)
    {
        _session = session;
        _logger = logger;
    }

    /// <summary>
    /// GET /api/sae/inventario/productos — Search products.
    /// </summary>
    [HttpGet("productos")]
    public async Task<IActionResult> GetProductos([FromQuery] string filtro = "")
    {
        try
        {
            var result = await _session.ExecuteSaeAsync("ConsProd", filtro);

            if (result.code == 0)
            {
                return Ok(SaeResponse<string>.Ok(result.response, "Productos consultados"));
            }

            return StatusCode(500, SaeResponse.Error(result.code, $"Error al consultar productos. Código SAE: {result.code}. Respuesta: {result.response}"));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in GetProductos");
            return StatusCode(500, SaeResponse.Error($"Error interno: {ex.Message}"));
        }
    }

    /// <summary>
    /// GET /api/sae/inventario/productos/{clave} — Get product detail.
    /// </summary>
    [HttpGet("productos/{clave}")]
    public async Task<IActionResult> GetProductoDetalle(string clave)
    {
        try
        {
            var result = await _session.ExecuteSaeAsync("DetalleProducto", clave);

            if (result.code == 0)
            {
                return Ok(SaeResponse<string>.Ok(result.response, "Detalle del producto obtenido"));
            }

            return StatusCode(404, SaeResponse.Error(result.code, $"Producto no encontrado o error. Código SAE: {result.code}. Respuesta: {result.response}"));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in GetProductoDetalle");
            return StatusCode(500, SaeResponse.Error($"Error interno: {ex.Message}"));
        }
    }

    /// <summary>
    /// GET /api/sae/inventario/existencias/{clave} — Get stock by warehouse.
    /// </summary>
    [HttpGet("existencias/{clave}")]
    public async Task<IActionResult> GetExistencias(string clave)
    {
        try
        {
            var result = await _session.ExecuteSaeAsync("DameExistenciasXAlm", clave);

            if (result.code == 0)
            {
                return Ok(SaeResponse<string>.Ok(result.response, "Existencias por almacén obtenidas"));
            }

            return StatusCode(500, SaeResponse.Error(result.code, $"Error al obtener existencias. Código SAE: {result.code}. Respuesta: {result.response}"));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in GetExistencias");
            return StatusCode(500, SaeResponse.Error($"Error interno: {ex.Message}"));
        }
    }

    /// <summary>
    /// GET /api/sae/inventario/productos/{clave}/imagen — Get product image (Base64).
    /// </summary>
    [HttpGet("productos/{clave}/imagen")]
    public async Task<IActionResult> GetImagenProducto(string clave)
    {
        try
        {
            var result = await _session.ExecuteSaeAsync("obtenImagenProductoBase64", clave);

            if (result.code == 0)
            {
                return Ok(SaeResponse<string>.Ok(result.response, "Imagen obtenida en Base64"));
            }

            return StatusCode(404, SaeResponse.Error(result.code, $"Imagen no disponible. Código SAE: {result.code}. Respuesta: {result.response}"));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in GetImagenProducto");
            return StatusCode(500, SaeResponse.Error($"Error interno: {ex.Message}"));
        }
    }

    /// <summary>
    /// POST /api/sae/inventario/movimientos — Create inventory movement.
    /// </summary>
    [HttpPost("movimientos")]
    public async Task<IActionResult> CrearMovimiento([FromBody] SaeXmlRequest request)
    {
        try
        {
            var result = await _session.ExecuteSaeAsync("AltaMovsInve", request.Xml);

            if (result.code == 0)
            {
                return Ok(SaeResponse<string>.Ok(result.response, "Movimiento de inventario registrado correctamente"));
            }

            return StatusCode(500, SaeResponse.Error(result.code, $"Error al registrar movimiento. Código SAE: {result.code}. Respuesta: {result.response}"));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in CrearMovimiento");
            return StatusCode(500, SaeResponse.Error($"Error interno: {ex.Message}"));
        }
    }

    /// <summary>
    /// GET /api/sae/inventario/almacenes — Get all warehouses.
    /// </summary>
    [HttpGet("almacenes")]
    public async Task<IActionResult> GetAlmacenes([FromQuery] string filtro = "")
    {
        try
        {
            var result = await _session.ExecuteSaeAsync("DameAlmacenes", filtro);

            if (result.code == 0)
            {
                return Ok(SaeResponse<string>.Ok(result.response, "Almacenes obtenidos"));
            }

            return StatusCode(500, SaeResponse.Error(result.code, $"Error al obtener almacenes. Código SAE: {result.code}. Respuesta: {result.response}"));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in GetAlmacenes");
            return StatusCode(500, SaeResponse.Error($"Error interno: {ex.Message}"));
        }
    }

    /// <summary>
    /// GET /api/sae/inventario/precios/{clave} — Get price lists for a product.
    /// </summary>
    [HttpGet("precios/{clave}")]
    public async Task<IActionResult> GetPreciosProducto(string clave)
    {
        try
        {
            var result = await _session.ExecuteSaeAsync("DamePreciosProdXML", clave);

            if (result.code == 0)
            {
                return Ok(SaeResponse<string>.Ok(result.response, "Precios obtenidos"));
            }

            return StatusCode(500, SaeResponse.Error(result.code, $"Error al obtener precios. Código SAE: {result.code}. Respuesta: {result.response}"));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in GetPreciosProducto");
            return StatusCode(500, SaeResponse.Error($"Error interno: {ex.Message}"));
        }
    }
}
