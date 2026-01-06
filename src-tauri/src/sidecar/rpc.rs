use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::io::{BufRead, Write};
use std::sync::{Arc, Mutex};
use std::time::Duration;

/// JSON-RPC 2.0 request
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct RpcRequest {
    pub jsonrpc: String,
    pub method: String,
    pub params: Value,
    pub id: String,
}

impl RpcRequest {
    /// Create a new JSON-RPC request
    pub fn new(method: String, params: Value) -> Self {
        Self {
            jsonrpc: "2.0".to_string(),
            method,
            params,
            id: uuid::Uuid::new_v4().to_string(),
        }
    }

    /// Create a request with custom ID
    pub fn with_id(method: String, params: Value, id: String) -> Self {
        Self {
            jsonrpc: "2.0".to_string(),
            method,
            params,
            id,
        }
    }
}

/// JSON-RPC 2.0 response
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct RpcResponse {
    pub jsonrpc: String,
    pub result: Option<Value>,
    pub error: Option<RpcError>,
    pub id: String,
}

/// JSON-RPC error
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct RpcError {
    pub code: i32,
    pub message: String,
    pub data: Option<Value>,
}

impl std::fmt::Display for RpcError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "RPC Error ({}): {}", self.code, self.message)
    }
}

impl std::error::Error for RpcError {}

/// Progress event from Python sidecar (emitted via stderr)
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ProgressEvent {
    pub event: String,
    pub data: Value,
}

/// RPC client for communicating with Python sidecar via stdin/stdout
pub struct RpcClient {
    stdin: Arc<Mutex<Box<dyn Write + Send>>>,
    stdout: Arc<Mutex<Box<dyn BufRead + Send>>>,
    timeout: Duration,
}

impl RpcClient {
    /// Create a new RPC client with stdin/stdout handles
    pub fn new(
        stdin: Arc<Mutex<Box<dyn Write + Send>>>,
        stdout: Arc<Mutex<Box<dyn BufRead + Send>>>,
    ) -> Self {
        Self {
            stdin,
            stdout,
            timeout: Duration::from_secs(120), // Default 2 minute timeout
        }
    }

    /// Set request timeout
    pub fn with_timeout(mut self, timeout: Duration) -> Self {
        self.timeout = timeout;
        self
    }

    /// Send a JSON-RPC request and wait for response
    ///
    /// This is a synchronous call that blocks until response is received
    /// or timeout occurs.
    pub fn call(&self, method: &str, params: Value) -> Result<Value, RpcError> {
        let request = RpcRequest::new(method.to_string(), params);

        // Serialize request
        let request_json = serde_json::to_string(&request)
            .map_err(|e| RpcError {
                code: -32700,
                message: format!("Failed to serialize request: {}", e),
                data: None,
            })?;

        // Send request to Python via stdin
        {
            let mut stdin = self.stdin.lock()
                .map_err(|e| RpcError {
                    code: -32603,
                    message: format!("Failed to lock stdin: {}", e),
                    data: None,
                })?;

            writeln!(stdin, "{}", request_json)
                .map_err(|e| RpcError {
                    code: -32603,
                    message: format!("Failed to write to stdin: {}", e),
                    data: None,
                })?;

            stdin.flush()
                .map_err(|e| RpcError {
                    code: -32603,
                    message: format!("Failed to flush stdin: {}", e),
                    data: None,
                })?;
        }

        // Read response from Python via stdout
        let response = self.read_response(&request.id)?;

        // Check for errors
        if let Some(error) = response.error {
            return Err(error);
        }

        // Return result
        response.result.ok_or_else(|| RpcError {
            code: -32603,
            message: "No result in RPC response".to_string(),
            data: None,
        })
    }

    /// Read a response from stdout, matching the request ID
    fn read_response(&self, expected_id: &str) -> Result<RpcResponse, RpcError> {
        let mut stdout = self.stdout.lock()
            .map_err(|e| RpcError {
                code: -32603,
                message: format!("Failed to lock stdout: {}", e),
                data: None,
            })?;

        let mut line = String::new();

        // Read lines until we find our response or timeout
        // Note: In a real implementation, we'd want non-blocking I/O
        // or a timeout mechanism here
        loop {
            line.clear();

            stdout.read_line(&mut line)
                .map_err(|e| RpcError {
                    code: -32603,
                    message: format!("Failed to read from stdout: {}", e),
                    data: None,
                })?;

            let line = line.trim();
            if line.is_empty() {
                continue;
            }

            // Try to parse as JSON-RPC response
            if let Ok(response) = serde_json::from_str::<RpcResponse>(line) {
                if response.id == expected_id {
                    return Ok(response);
                } else {
                    log::warn!("Received response for different request ID: {}", response.id);
                }
            }

            // Try to parse as progress event
            if let Ok(event) = serde_json::from_str::<ProgressEvent>(line) {
                log::info!("Progress event: {}", event.event);
                // TODO: Could emit to a callback channel here
                continue;
            }

            log::debug!("Unrecognized output: {}", line);
        }
    }

    /// Send a notification (no response expected)
    pub fn notify(&self, method: &str, params: Value) -> Result<(), RpcError> {
        let request = RpcRequest {
            jsonrpc: "2.0".to_string(),
            method: method.to_string(),
            params,
            id: "notify".to_string(), // Notifications don't need unique IDs
        };

        let request_json = serde_json::to_string(&request)
            .map_err(|e| RpcError {
                code: -32700,
                message: format!("Failed to serialize notification: {}", e),
                data: None,
            })?;

        let mut stdin = self.stdin.lock()
            .map_err(|e| RpcError {
                code: -32603,
                message: format!("Failed to lock stdin: {}", e),
                data: None,
            })?;

        writeln!(stdin, "{}", request_json)
            .map_err(|e| RpcError {
                code: -32603,
                message: format!("Failed to write notification: {}", e),
                data: None,
            })?;

        stdin.flush()
            .map_err(|e| RpcError {
                code: -32603,
                message: format!("Failed to flush notification: {}", e),
                data: None,
            })?;

        Ok(())
    }
}

/// Convenience function to create RPC client from PythonSidecar
impl crate::sidecar::process::PythonSidecar {
    /// Get RPC client for this sidecar
    pub fn rpc_client(&self) -> Option<RpcClient> {
        let stdin = self.stdin()?;
        let stdout = self.stdout()?;
        Some(RpcClient::new(stdin, stdout))
    }
}

/// RPC client wrapper for async operations
pub struct AsyncRpcClient {
    client: Arc<Mutex<RpcClient>>,
}

impl AsyncRpcClient {
    /// Create async wrapper around sync RPC client
    pub fn new(client: RpcClient) -> Self {
        Self {
            client: Arc::new(Mutex::new(client)),
        }
    }

    /// Send RPC request asynchronously
    pub async fn call(&self, method: String, params: Value) -> Result<Value, String> {
        let client = self.client.clone();
        let method = method.clone();

        tokio::task::spawn_blocking(move || {
            client.lock()
                .map_err(|e| format!("Failed to lock client: {}", e))?
                .call(&method, params)
                .map_err(|e| format!("RPC error: {}", e))
        })
        .await
        .map_err(|e| format!("Task join error: {}", e))?
    }
}

/// AsyncRpcClient wrapper for PythonSidecar
impl crate::sidecar::process::PythonSidecar {
    /// Get async RPC client for this sidecar
    pub fn async_rpc_client(&self) -> Option<AsyncRpcClient> {
        self.rpc_client().map(AsyncRpcClient::new)
    }
}
