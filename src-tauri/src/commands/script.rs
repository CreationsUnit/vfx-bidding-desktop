use serde::{Deserialize, Serialize};
use serde_json::json;
use tauri::{State, Window, Emitter};
use crate::state::{BidState, SidecarState};
use super::bid::ShotData;
use std::path::PathBuf;

/// Script processing result
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ScriptAnalysis {
    pub shots: Vec<ShotData>,
    pub metadata: ScriptMetadata,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ScriptMetadata {
    pub title: Option<String>,
    pub total_shots: usize,
    pub vfx_categories: Vec<String>,
}

/// Process a script file and generate VFX bid Excel
///
/// This calls the Python sidecar via JSON-RPC to run the VFX bidding pipeline.
/// The pipeline will:
/// 1. Parse the script (PDF/TXT/MD)
/// 2. Extract VFX shots using LLM analysis
/// 3. Calculate pricing based on industry standards
/// 4. Generate Excel bid document
#[tauri::command]
pub async fn process_script(
    file_path: String,
    window: Window,
    bid_state: State<'_, BidState>,
    sidecar_state: State<'_, SidecarState>,
) -> Result<ScriptAnalysis, String> {
    log::info!("Processing script: {}", file_path);

    // Emit progress event
    window.emit("script-processing-start", &file_path)
        .map_err(|e| e.to_string())?;

    // Check if sidecar is running
    if !sidecar_state.is_running() {
        return Err("Python sidecar is not running. Please restart the application.".to_string());
    }

    // Get RPC client
    let rpc_client = sidecar_state.rpc_client()
        .ok_or_else(|| "Failed to get RPC client".to_string())?;

    // Resolve file path
    let path = PathBuf::from(&file_path);
    let absolute_path = path.canonicalize()
        .map_err(|e| format!("Invalid file path: {}", e))?;

    if !absolute_path.exists() {
        return Err(format!("File not found: {}", file_path));
    }

    // Call Python RPC to process script
    let params = json!({
        "path": absolute_path.to_string_lossy().to_string(),
        "output_path": null  // Use default output path
    });

    let result = rpc_client.call("process_script".to_string(), params).await?;

    // Parse response
    let excel_path = result.get("excel_path")
        .and_then(|p| p.as_str())
        .ok_or_else(|| "No excel_path in response".to_string())?;

    log::info!("Generated bid: {}", excel_path);

    // Load the generated bid into memory
    load_bid_internal(excel_path.to_string(), &bid_state, &sidecar_state).await?;

    // Get loaded shots
    let shots = bid_state.get_shots();

    let metadata = ScriptMetadata {
        title: Some(absolute_path.file_name()
            .and_then(|n| n.to_str())
            .unwrap_or("Unknown")
            .to_string()),
        total_shots: shots.len(),
        vfx_categories: extract_vfx_categories(&shots),
    };

    let analysis = ScriptAnalysis {
        shots,
        metadata,
    };

    window.emit("script-processing-complete", &analysis)
        .map_err(|e| e.to_string())?;

    Ok(analysis)
}

/// Load an existing bid from Excel file
///
/// This calls the Python sidecar to load and parse an Excel bid into memory.
#[tauri::command]
pub async fn load_bid(
    file_path: String,
    bid_state: State<'_, BidState>,
    sidecar_state: State<'_, SidecarState>,
) -> Result<ScriptAnalysis, String> {
    log::info!("Loading bid: {}", file_path);

    // Check if sidecar is running
    if !sidecar_state.is_running() {
        return Err("Python sidecar is not running. Please restart the application.".to_string());
    }

    let analysis = load_bid_internal(file_path, &bid_state, &sidecar_state).await?;

    Ok(analysis)
}

/// Internal function to load bid (shared by process_script and load_bid)
async fn load_bid_internal(
    file_path: String,
    _bid_state: &BidState,
    sidecar_state: &SidecarState,
) -> Result<ScriptAnalysis, String> {
    let rpc_client = sidecar_state.rpc_client()
        .ok_or_else(|| "Failed to get RPC client".to_string())?;

    // Resolve file path
    let path = PathBuf::from(&file_path);
    let absolute_path = path.canonicalize()
        .map_err(|e| format!("Invalid file path: {}", e))?;

    if !absolute_path.exists() {
        return Err(format!("File not found: {}", file_path));
    }

    // Call Python RPC to load bid
    let params = json!({
        "path": absolute_path.to_string_lossy().to_string()
    });

    let result = rpc_client.call("load_bid".to_string(), params).await?;

    // Parse summary
    let summary = result.get("summary")
        .and_then(|s| s.as_object())
        .ok_or_else(|| "No summary in response".to_string())?;

    let total_shots = summary.get("total_shots")
        .and_then(|v| v.as_u64())
        .unwrap_or(0) as usize;

    // For now, we don't get detailed shots from load_bid
    // The caller can call bid_query to get specific data
    // This is a limitation of the current Python RPC implementation

    Ok(ScriptAnalysis {
        shots: vec![],
        metadata: ScriptMetadata {
            title: summary.get("script_name")
                .and_then(|s| s.as_str())
                .map(|s| s.to_string()),
            total_shots,
            vfx_categories: vec![],
        },
    })
}

/// Export bid to Excel format
///
/// Currently this is a placeholder. The Excel is generated during process_script.
#[tauri::command]
pub async fn export_bid(
    output_path: String,
    _bid_state: State<'_, BidState>,
) -> Result<String, String> {
    log::info!("Exporting bid to: {}", output_path);

    // TODO: Implement Excel export via Python RPC
    // For now, the Excel is generated during process_script

    Ok(format!("Export not yet implemented. Use process_script to generate Excel."))
}

/// Extract unique VFX categories from shots
fn extract_vfx_categories(shots: &[ShotData]) -> Vec<String> {
    use std::collections::HashSet;

    let mut categories = HashSet::new();

    for shot in shots {
        for vfx_type in &shot.vfx_types {
            categories.insert(vfx_type.clone());
        }
    }

    let mut sorted: Vec<_> = categories.into_iter().collect();
    sorted.sort();
    sorted
}
