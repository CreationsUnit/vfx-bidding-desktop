//! Setup Wizard Tauri Commands
//!
//! Frontend commands for the setup wizard

use crate::setup_wizard::*;
use tauri::{Window, State, Manager, Emitter};
use std::sync::Mutex;
use serde::{Deserialize, Serialize};
use std::path::PathBuf;

/// Setup state managed during the wizard process
#[derive(Debug, Default)]
pub struct SetupWizardState {
    pub config_dir: Option<PathBuf>,
    pub model_path: Option<PathBuf>,
    pub python_path: Option<String>,
    pub completed_steps: Vec<SetupStep>,
}

/// Detailed status response for frontend
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct SetupStatusResponse {
    pub is_first_run: bool,
    pub can_proceed: bool,
    pub python: Option<PythonStatus>,
    pub system: Option<SystemRequirements>,
    pub model_configured: bool,
    pub model_path: Option<String>,
}

/// Dependency check response
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct DependencyStatus {
    pub python_ok: bool,
    pub packages_ok: bool,
    pub model_ok: bool,
    pub missing_packages: Vec<String>,
    pub can_start: bool,
}

/// Check if this is the first run and get overall setup status
#[tauri::command]
pub async fn check_setup_status(
    state: State<'_, Mutex<SetupWizardState>>,
    app: tauri::AppHandle,
) -> Result<SetupStatusResponse, String> {
    let config_dir = app.path().app_config_dir()
        .map_err(|e| format!("Failed to get config dir: {}", e))?;

    // Get first run status
    let is_first_run = is_first_run(&config_dir).await?;

    // If not first run, return minimal status
    if !is_first_run {
        return Ok(SetupStatusResponse {
            is_first_run: false,
            can_proceed: true,
            python: None,
            system: None,
            model_configured: true,
            model_path: None,
        });
    }

    // First run - check everything
    let python_status = check_python().await?;
    let system_reqs = check_system_requirements()?;

    let model_path = get_default_model_path();
    let model_ok = model_path.exists();

    // Update state
    let mut state_guard = state.lock().unwrap();
    state_guard.config_dir = Some(config_dir.clone());
    state_guard.model_path = Some(model_path.clone());
    if let Some(ref path) = python_status.executable_path {
        state_guard.python_path = Some(path.clone());
    }

    let can_proceed = python_status.installed
        && system_reqs.ram_sufficient
        && system_reqs.disk_sufficient;

    Ok(SetupStatusResponse {
        is_first_run: true,
        can_proceed,
        python: Some(python_status),
        system: Some(system_reqs),
        model_configured: model_ok,
        model_path: Some(model_path.to_string_lossy().to_string()),
    })
}

/// Start the setup process
#[tauri::command]
pub async fn start_setup(
    _state: State<'_, Mutex<SetupWizardState>>,
    window: Window,
) -> Result<String, String> {
    window.emit("setup-started", ()).ok();

    // Emit initial progress
    window.emit("setup-progress", serde_json::json!({
        "step": "Welcome",
        "message": "Welcome to VFX Bidding AI Setup",
        "percent": 0
    })).ok();

    Ok("Setup started".to_string())
}

/// Verify system requirements
#[tauri::command]
pub async fn verify_system_requirements(
    window: Window,
) -> Result<SystemRequirements, String> {
    window.emit("setup-progress", serde_json::json!({
        "step": "SystemCheck",
        "message": "Checking system requirements...",
        "percent": 10
    })).ok();

    let reqs = check_system_requirements()?;

    window.emit("setup-progress", serde_json::json!({
        "step": "SystemCheck",
        "message": "System check complete",
        "percent": 20
    })).ok();

    Ok(reqs)
}

/// Install Python dependencies
#[tauri::command]
pub async fn install_python_dependencies(
    python_path: String,
    window: Window,
    _state: State<'_, Mutex<SetupWizardState>>,
) -> Result<(), String> {
    window.emit("setup-progress", serde_json::json!({
        "step": "InstallDependencies",
        "message": "Installing Python packages...",
        "percent": 30
    })).ok();

    install_packages(&python_path, |message| {
        window.emit("setup-progress", serde_json::json!({
            "step": "InstallDependencies",
            "message": message,
            "percent": 30
        })).ok();
    }).await?;

    window.emit("setup-progress", serde_json::json!({
        "step": "InstallDependencies",
        "message": "Dependencies installed successfully",
        "percent": 50
    })).ok();

    Ok(())
}

/// Download or locate the model file
#[tauri::command]
pub async fn setup_model_file(
    source_type: String,
    source_path: String,
    state: State<'_, Mutex<SetupWizardState>>,
    window: Window,
) -> Result<String, String> {
    window.emit("setup-progress", serde_json::json!({
        "step": "DownloadModel",
        "message": "Setting up model file...",
        "percent": 55
    })).ok();

    let model_path = get_default_model_path();

    let source = match source_type.as_str() {
        "local" => {
            // Verify local file exists
            let path = PathBuf::from(&source_path);
            if !path.exists() {
                return Err(format!("File not found: {}", source_path));
            }

            // Copy to model directory
            if let Some(parent) = model_path.parent() {
                std::fs::create_dir_all(parent)
                    .map_err(|e| format!("Failed to create model directory: {}", e))?;
            }

            std::fs::copy(&path, &model_path)
                .map_err(|e| format!("Failed to copy model file: {}", e))?;

            ModelSource::LocalFile(model_path.clone())
        }
        "url" => {
            ModelSource::DirectUrl {
                url: source_path,
                filename: "Floppa-12B-Gemma3-Uncensored.Q4_K_S.gguf".to_string(),
            }
        }
        _ => {
            return Err("Invalid source type".to_string());
        }
    };

    // If it's a URL, download it
    if matches!(source, ModelSource::DirectUrl { .. }) {
        download_model(window.clone(), source, model_path.clone()).await?;
    }

    // Verify the model
    window.emit("setup-progress", serde_json::json!({
        "step": "DownloadModel",
        "message": "Verifying model file...",
        "percent": 95
    })).ok();

    let verified = verify_model(&model_path).await?;

    if !verified {
        return Err("Model file verification failed".to_string());
    }

    // Update state
    let mut state_guard = state.lock().unwrap();
    state_guard.model_path = Some(model_path.clone());

    window.emit("setup-progress", serde_json::json!({
        "step": "DownloadModel",
        "message": "Model setup complete",
        "percent": 100
    })).ok();

    Ok(model_path.to_string_lossy().to_string())
}

/// Skip model download for advanced users who will configure later
#[tauri::command]
pub async fn skip_model_setup(
    state: State<'_, Mutex<SetupWizardState>>,
) -> Result<(), String> {
    let mut state_guard = state.lock().unwrap();
    state_guard.model_path = Some(PathBuf::from("")); // Empty path = will configure later
    Ok(())
}

/// Complete the setup process
#[tauri::command]
pub async fn complete_setup_process(
    state: State<'_, Mutex<SetupWizardState>>,
    window: Window,
) -> Result<(), String> {
    let config_dir = {
        let state_guard = state.lock().unwrap();
        state_guard.config_dir.clone()
            .ok_or_else(|| "Config directory not set".to_string())?
    };

    complete_setup(&config_dir).await?;

    window.emit("setup-complete", ()).ok();

    Ok(())
}

/// Verify all dependencies are ready
#[tauri::command]
pub async fn verify_dependencies(
    state: State<'_, Mutex<SetupWizardState>>,
) -> Result<DependencyStatus, String> {
    // Extract needed data from state before await
    let (model_path_exists, python_path) = {
        let state_guard = state.lock().unwrap();
        let model_ok = state_guard.model_path
            .as_ref()
            .map(|p| p.exists() || p.as_os_str().is_empty())
            .unwrap_or(false);
        let py_path = state_guard.python_path.clone();
        (model_ok, py_path)
    };

    // Check Python (this is async, so must be done outside the lock)
    let python_status = check_python().await?;

    let python_ok = python_status.installed && python_status.pip_available;
    let packages_ok = python_status.missing_packages.is_empty();
    let model_ok = model_path_exists;

    let missing_packages = python_status.missing_packages;

    let can_start = python_ok && packages_ok && model_ok;

    Ok(DependencyStatus {
        python_ok,
        packages_ok,
        model_ok,
        missing_packages,
        can_start,
    })
}

/// Select a local model file
#[tauri::command]
pub async fn select_local_model(
    path: String,
    state: State<'_, Mutex<SetupWizardState>>,
) -> Result<String, String> {
    let model_path = PathBuf::from(&path);

    if !model_path.exists() {
        return Err("File does not exist".to_string());
    }

    // Verify file size
    let metadata = std::fs::metadata(&model_path)
        .map_err(|e| format!("Failed to read file: {}", e))?;

    if metadata.len() < 1_000_000_000 {
        return Err("File too small to be a valid model (should be > 1GB)".to_string());
    }

    // Update state
    let mut state_guard = state.lock().unwrap();
    state_guard.model_path = Some(model_path.clone());

    Ok(model_path.to_string_lossy().to_string())
}

/// Get recommended model download instructions
#[tauri::command]
pub async fn get_model_download_instructions() -> Result<ModelDownloadInstructions, String> {
    Ok(ModelDownloadInstructions {
        methods: vec![
            ModelDownloadMethod {
                name: "Manual Download from Hugging Face".to_string(),
                description: "Download manually and select the file".to_string(),
                url: "https://huggingface.co/bartowski/Floppa-12B-Gemma3-Uncensored-GGUF".to_string(),
                requires_auth: true,
                instructions: vec![
                    "1. Visit the Hugging Face repository".to_string(),
                    "2. Sign in or create a Hugging Face account".to_string(),
                    "3. Navigate to the Files tab".to_string(),
                    "4. Download Floppa-12B-Gemma3-Uncensored.Q4_K_S.gguf (~6.5GB)".to_string(),
                    "5. Click 'Select Local File' and choose the downloaded file".to_string(),
                ].join("\n"),
            },
            ModelDownloadMethod {
                name: "Direct URL (if available)".to_string(),
                description: "Download from a direct download link".to_string(),
                url: "".to_string(),
                requires_auth: false,
                instructions: "Paste a direct download URL in the URL field".to_string(),
            },
            ModelDownloadMethod {
                name: "Use Existing Model".to_string(),
                description: "If you already have the model file".to_string(),
                url: "".to_string(),
                requires_auth: false,
                instructions: "Click 'Select Local File' and navigate to your existing model".to_string(),
            },
        ],
        filename: "Floppa-12B-Gemma3-Uncensored.Q4_K_S.gguf".to_string(),
        expected_size: "Approximately 6.5 GB".to_string(),
    })
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ModelDownloadInstructions {
    pub methods: Vec<ModelDownloadMethod>,
    pub filename: String,
    pub expected_size: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ModelDownloadMethod {
    pub name: String,
    pub description: String,
    pub url: String,
    pub requires_auth: bool,
    pub instructions: String,
}

/// Reset setup (for testing or reconfiguration)
#[tauri::command]
pub async fn reset_setup(app: tauri::AppHandle) -> Result<(), String> {
    let config_dir = app.path().app_config_dir()
        .map_err(|e| format!("Failed to get config dir: {}", e))?;

    let setup_file = config_dir.join("setup_complete.json");

    if setup_file.exists() {
        std::fs::remove_file(setup_file)
            .map_err(|e| format!("Failed to remove setup file: {}", e))?;
    }

    Ok(())
}
