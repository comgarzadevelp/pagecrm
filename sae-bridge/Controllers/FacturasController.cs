using Microsoft.AspNetCore.Mvc;
using SaeBridge.Interop;
using SaeBridge.Models;

namespace SaeBridge.Controllers;

/// <summary>
/// Invoice/Document management endpoints.
/// </summary>
[ApiController]
[Route("api/sae/facturas")]
public class FacturasController : ControllerBase
{
    private readonly SaeSessionManager _session;
    private readonly ILogger<FacturasController> _logger;

    public FacturasController(SaeSessionManager session, ILogger<FacturasController> logger)
    {
        _session = session;
        _logger = logger;
    }

    /// <summary>
    /// POST /api/sae/facturas — Creates/saves a document (invoice/factura).
    /// </summary>
    [HttpPost]
    public async Task<IActionResult> CrearFactura([FromBody] SaeXmlRequest request)
    {
        try
        {
            var result = await _session.ExecuteSaeAsync("GrabaDocumento", request.Xml);

            if (result.code == 0)
                return Ok(SaeResponse<string>.Ok(result.response, "Factura grabada y timbrada correctamente en SAE"));

            return StatusCode(500, SaeResponse.Error(result.code,
                $"Error al grabar factura. Código: {result.code}. Respuesta: {result.response}"));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in CrearFactura");
            return StatusCode(500, SaeResponse.Error($"Error interno: {ex.Message}"));
        }
    }

    /// <summary>
    /// POST /api/sae/facturas/documentos — Queries documents in XML.
    /// </summary>
    [HttpPost("documentos")]
    public async Task<IActionResult> GetDocumentos([FromBody] SaeXmlRequest request)
    {
        try
        {
            var result = await _session.ExecuteSaeAsync("ObtenDocumentosXML", request.Xml);

            if (result.code == 0)
                return Ok(SaeResponse<string>.Ok(result.response, "Documentos obtenidos"));

            return StatusCode(500, SaeResponse.Error(result.code,
                $"Error al obtener documentos. Código: {result.code}. Respuesta: {result.response}"));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in GetDocumentos");
            return StatusCode(500, SaeResponse.Error($"Error interno: {ex.Message}"));
        }
    }

    /// <summary>
    /// POST /api/sae/facturas/pdf — Gets document as PDF (Base64).
    /// </summary>
    [HttpPost("pdf")]
    public async Task<IActionResult> GetDocumentoPdf([FromBody] SaeXmlRequest request)
    {
        try
        {
            var result = await _session.ExecuteSaeAsync("ObtenDocumentosPDF", request.Xml);

            if (result.code == 0)
                return Ok(SaeResponse<string>.Ok(result.response, "PDF obtenido correctamente (Base64)"));

            return StatusCode(500, SaeResponse.Error(result.code,
                $"Error al obtener PDF. Código: {result.code}. Respuesta: {result.response}"));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in GetDocumentoPdf");
            return StatusCode(500, SaeResponse.Error($"Error interno: {ex.Message}"));
        }
    }
}
