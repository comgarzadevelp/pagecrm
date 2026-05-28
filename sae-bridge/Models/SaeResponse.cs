namespace SaeBridge.Models;

/// <summary>
/// Standard response wrapper for all SAE Bridge API responses.
/// </summary>
public class SaeResponse<T>
{
    public bool Success { get; set; }
    public int SaeCode { get; set; }
    public string Message { get; set; } = string.Empty;
    public T? Data { get; set; }
    public DateTime Timestamp { get; set; } = DateTime.Now;

    public static SaeResponse<T> Ok(T data, string message = "Operación exitosa")
    {
        return new SaeResponse<T>
        {
            Success = true,
            SaeCode = 0,
            Message = message,
            Data = data
        };
    }

    public static SaeResponse<T> Error(int code, string message)
    {
        return new SaeResponse<T>
        {
            Success = false,
            SaeCode = code,
            Message = message
        };
    }

    public static SaeResponse<T> Error(string message)
    {
        return new SaeResponse<T>
        {
            Success = false,
            SaeCode = -1,
            Message = message
        };
    }
}

/// <summary>
/// Non-generic version for responses without data.
/// </summary>
public class SaeResponse : SaeResponse<object?>
{
    public static SaeResponse Ok(string message = "Operación exitosa")
    {
        return new SaeResponse
        {
            Success = true,
            SaeCode = 0,
            Message = message
        };
    }

    public new static SaeResponse Error(int code, string message)
    {
        return new SaeResponse
        {
            Success = false,
            SaeCode = code,
            Message = message
        };
    }

    public new static SaeResponse Error(string message)
    {
        return new SaeResponse
        {
            Success = false,
            SaeCode = -1,
            Message = message
        };
    }
}

/// <summary>
/// Status info for the SAE Bridge health check.
/// </summary>
public class SaeStatusInfo
{
    public bool SessionActive { get; set; }
    public string LastError { get; set; } = string.Empty;
    public string SaePath { get; set; } = string.Empty;
    public int CompanyNumber { get; set; }
    public DateTime StartedAt { get; set; }
    public string Version { get; set; } = "1.0.0";
}
