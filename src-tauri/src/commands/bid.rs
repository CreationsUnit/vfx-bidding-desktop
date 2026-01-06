use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use tauri::State;
use crate::state::{BidState, SidecarState};

/// Shot data with pricing
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ShotData {
    pub id: String,
    pub scene_number: String,
    pub description: String,
    pub vfx_types: Vec<String>,
    pub complexity: String,
    pub estimated_hours: Option<f64>,
    pub rate_per_hour: Option<f64>,
    pub estimated_cost: Option<f64>,
    pub contingency_percent: f64,
    pub overhead_percent: f64,
    pub final_price: Option<f64>,
}

/// Shot grouping for batch operations
#[derive(Debug, Serialize, Deserialize)]
pub struct ShotGroup {
    pub name: String,
    pub shot_ids: Vec<String>,
    pub discount_percent: Option<f64>,
}

/// Query parameters for bid queries
#[derive(Debug, Serialize, Deserialize)]
pub struct BidQueryParams {
    pub query_type: String,
    pub params: Option<Value>,
}

/// Get a single shot by ID
#[tauri::command]
pub fn get_shot(id: String, state: State<'_, BidState>) -> Result<ShotData, String> {
    let shots = state.get_shots();

    shots
        .iter()
        .find(|s| s.id == id)
        .cloned()
        .ok_or_else(|| format!("Shot {} not found", id))
}

/// Update shot data
#[tauri::command]
pub fn update_shot(
    id: String,
    updates: ShotData,
    state: State<'_, BidState>,
) -> Result<ShotData, String> {
    state.update_shot(id, updates)
}

/// Group multiple shots for batch operations
#[tauri::command]
pub fn group_shots(group: ShotGroup) -> Result<String, String> {
    // TODO: Implement shot grouping logic
    Ok(format!("Created group '{}' with {} shots", group.name, group.shot_ids.len()))
}

/// Get all shots in the current bid
#[tauri::command]
pub fn get_all_shots(state: State<'_, BidState>) -> Vec<ShotData> {
    state.get_shots()
}

/// Query bid data from Python sidecar
///
/// This allows querying the loaded bid for various information:
/// - total_cost: Get total budget and breakdown
/// - shots_by_scene: Get all shots in a scene
/// - shots_by_type: Get shots by VFX type
/// - most_expensive_shot: Get the most expensive shot
/// - complexity_breakdown: Get shot counts by complexity
/// - summary: Get complete bid summary
#[tauri::command]
pub async fn bid_query(
    query: BidQueryParams,
    sidecar_state: State<'_, SidecarState>,
) -> Result<Value, String> {
    log::info!("Bid query: {}", query.query_type);

    // Check if sidecar is running
    if !sidecar_state.is_running() {
        return Err("Python sidecar is not running. Please restart the application.".to_string());
    }

    // Get RPC client
    let rpc_client = sidecar_state.rpc_client()
        .ok_or_else(|| "Failed to get RPC client".to_string())?;

    // Call Python RPC to query bid
    let params = json!({
        "query_type": query.query_type,
        "params": query.params.unwrap_or(json!({}))
    });

    let result = rpc_client.call("bid_query".to_string(), params).await?;

    Ok(result)
}
