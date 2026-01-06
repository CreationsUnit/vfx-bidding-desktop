use serde::{Deserialize, Serialize};
use serde_json::json;
use tauri::{Window, State, Emitter};
use std::time::{SystemTime, UNIX_EPOCH};
use crate::state::SidecarState;

/// Chat message from user
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ChatMessage {
    pub role: String,
    pub content: String,
    pub timestamp: i64,
}

/// Command execution request
#[derive(Debug, Serialize, Deserialize)]
pub struct CommandRequest {
    pub command: String,
    pub args: Vec<String>,
}

/// Get current timestamp as Unix seconds
fn current_timestamp() -> i64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap()
        .as_secs() as i64
}

/// Send a chat message and get response from LLM
///
/// This calls the Python sidecar which processes the message through:
/// 1. Chat command processor (pattern matching for queries)
/// 2. LLM for complex intent parsing
/// 3. Returns structured action or query result
#[tauri::command]
pub async fn send_message(
    message: String,
    window: Window,
    sidecar_state: State<'_, SidecarState>,
) -> Result<String, String> {
    let timestamp = current_timestamp();

    log::info!("Chat message: {}", message);

    // Emit user message
    window.emit("chat-message", ChatMessage {
        role: "user".to_string(),
        content: message.clone(),
        timestamp,
    }).map_err(|e| e.to_string())?;

    // Check if sidecar is running
    if !sidecar_state.is_running() {
        let error_msg = "Python sidecar is not running. Please restart the application.".to_string();

        window.emit("chat-message", ChatMessage {
            role: "assistant".to_string(),
            content: error_msg.clone(),
            timestamp: current_timestamp(),
        }).map_err(|e| e.to_string())?;

        return Err(error_msg);
    }

    // Get RPC client
    let rpc_client = sidecar_state.rpc_client()
        .ok_or_else(|| "Failed to get RPC client".to_string())?;

    // Call Python RPC to process chat command
    let params = json!({
        "message": message,
        "bid_context": null  // Python will use loaded bid if available
    });

    let result = rpc_client.call("chat_command".to_string(), params).await?;

    // Parse response
    let explanation = result.get("explanation")
        .and_then(|e| e.as_str())
        .unwrap_or("Processed")
        .to_string();

    let action_type = result.get("action_type")
        .and_then(|a| a.as_str())
        .unwrap_or("unknown")
        .to_string();

    // If there's a query result, format it nicely
    let response_content = if let Some(query_result) = result.get("query_result") {
        format_query_response(action_type, query_result)
    } else {
        explanation
    };

    // Emit assistant response
    window.emit("chat-message", ChatMessage {
        role: "assistant".to_string(),
        content: response_content.clone(),
        timestamp: current_timestamp(),
    }).map_err(|e| e.to_string())?;

    Ok(response_content)
}

/// Execute a natural language command
#[tauri::command]
pub async fn execute_command(
    request: CommandRequest,
    window: Window,
    sidecar_state: State<'_, SidecarState>,
) -> Result<String, String> {
    log::info!("Executing command: {}", request.command);

    window.emit("command-executing", &request)
        .map_err(|e| e.to_string())?;

    // Check if sidecar is running
    if !sidecar_state.is_running() {
        return Err("Python sidecar is not running. Please restart the application.".to_string());
    }

    // Get RPC client
    let rpc_client = sidecar_state.rpc_client()
        .ok_or_else(|| "Failed to get RPC client".to_string())?;

    // For now, we just route to chat_command
    // In the future, we might have separate command handlers
    let message = format!("{} {}", request.command, request.args.join(" "));

    let params = json!({
        "message": message,
        "bid_context": null
    });

    let result = rpc_client.call("chat_command".to_string(), params).await?;

    let response = result.get("explanation")
        .and_then(|e| e.as_str())
        .unwrap_or("Command executed")
        .to_string();

    window.emit("command-complete", &response)
        .map_err(|e| e.to_string())?;

    Ok(response)
}

/// Format query result for display to user
fn format_query_response(action_type: String, result: &serde_json::Value) -> String {
    match action_type.as_str() {
        "query" => {
            // Try to format various query types
            if let Some(total) = result.get("total_budget").and_then(|v| v.as_f64()) {
                let shot_count = result.get("shot_count").and_then(|v| v.as_u64()).unwrap_or(0);
                let avg = result.get("average_cost").and_then(|v| v.as_f64()).unwrap_or(0.0);

                return format!(
                    "Total Budget: ${:.2}\nShots: {}\nAverage: ${:.2}",
                    total, shot_count, avg
                );
            }

            if let Some(shots) = result.get("shots").and_then(|s| s.as_array()) {
                return format!("Found {} shots", shots.len());
            }

            serde_json::to_string_pretty(result).unwrap_or_else(|_| "Query result available".to_string())
        }
        "update_complexity" => {
            "Complexity updated".to_string()
        }
        "group_shots" => {
            "Shots grouped".to_string()
        }
        _ => {
            serde_json::to_string_pretty(result).unwrap_or_else(|_| "Result available".to_string())
        }
    }
}
