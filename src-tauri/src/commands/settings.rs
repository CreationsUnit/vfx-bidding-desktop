use serde::{Deserialize, Serialize};

/// Application settings
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Settings {
    /// LLM server configuration
    pub llm: LlmSettings,
    /// File paths
    pub paths: PathSettings,
    /// UI preferences
    pub ui: UiSettings,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct LlmSettings {
    pub server_url: String,
    pub model_name: String,
    pub context_size: usize,
    pub temperature: f32,
    pub max_tokens: usize,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct PathSettings {
    pub python_path: String,
    pub scripts_dir: String,
    pub templates_dir: String,
    pub output_dir: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct UiSettings {
    pub theme: String,
    pub auto_save: bool,
    pub show_console: bool,
}

impl Default for Settings {
    fn default() -> Self {
        Self {
            llm: LlmSettings {
                server_url: "http://localhost:8080".to_string(),
                model_name: "Floppa-12B-Gemma3-Uncensored.Q4_K_S.gguf".to_string(),
                context_size: 8192,
                temperature: 0.1,
                max_tokens: 4096,
            },
            paths: PathSettings {
                python_path: "python3".to_string(),
                scripts_dir: "".to_string(),
                templates_dir: "".to_string(),
                output_dir: "".to_string(),
            },
            ui: UiSettings {
                theme: "dark".to_string(),
                auto_save: true,
                show_console: false,
            },
        }
    }
}

/// Get current settings
#[tauri::command]
pub fn get_settings() -> Settings {
    // TODO: Load from persistent storage
    Settings::default()
}

/// Update settings
#[tauri::command]
pub fn update_settings(_settings: Settings) -> Result<(), String> {
    // TODO: Save to persistent storage
    Ok(())
}

/// Test LLM connection
#[tauri::command]
pub async fn test_llm_connection(settings: Settings) -> Result<String, String> {
    use reqwest::Client;

    let client = Client::new();
    let response = client
        .get(&format!("{}/health", settings.llm.server_url))
        .send()
        .await;

    match response {
        Ok(resp) if resp.status().is_success() => {
            Ok("LLM connection successful".to_string())
        }
        Ok(resp) => {
            Err(format!("LLM returned error: {}", resp.status()))
        }
        Err(e) => {
            Err(format!("Failed to connect to LLM: {}", e))
        }
    }
}
