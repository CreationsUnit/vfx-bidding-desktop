//! Setup Wizard Module
//!
//! Handles first-run setup including:
//! - Python environment detection
//! - Package installation
//! - Model download/setup
//! - Configuration initialization

use std::path::{Path, PathBuf};
use std::process::Command;
use std::fs;
use tauri::Emitter;
use serde::{Deserialize, Serialize};

#[cfg(target_os = "macos")]
use std::os::unix::process::ExitStatusExt;

/// Setup configuration constants
const MODEL_SIZE_BYTES: u64 = 6_500_000_000; // ~6.5GB
const REQUIRED_DISK_SPACE: u64 = 15_000_000_000; // 15GB free space needed
const MIN_RAM_GB: u64 = 8; // Minimum 8GB RAM

/// Python installation status
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct PythonStatus {
    pub installed: bool,
    pub version: Option<String>,
    pub executable_path: Option<String>,
    pub pip_available: bool,
    pub packages_installed: Vec<String>,
    pub missing_packages: Vec<String>,
}

/// System requirements check
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct SystemRequirements {
    pub ram_sufficient: bool,
    pub ram_total_gb: u64,
    pub disk_sufficient: bool,
    pub disk_free_gb: u64,
    pub platform: String,
    pub architecture: String,
}

/// Setup progress update
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct SetupProgress {
    pub step: SetupStep,
    pub message: String,
    pub percent: u8,
    pub completed: bool,
}

/// Setup wizard steps
#[derive(Debug, Serialize, Deserialize, Clone, PartialEq)]
pub enum SetupStep {
    Welcome,
    SystemCheck,
    InstallDependencies,
    DownloadModel,
    Complete,
}

/// Overall setup status
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct SetupStatus {
    pub is_first_run: bool,
    pub completed_steps: Vec<SetupStep>,
    pub current_step: Option<SetupStep>,
    pub can_proceed: bool,
}

/// Required Python packages
const REQUIRED_PACKAGES: &[&str] = &[
    "openpyxl",
    "pandas",
    "chromadb",
    "llama-cpp-python",
    "pdfplumber",
    "PyPDF2",
];

/// Model download sources
#[derive(Debug, Clone)]
pub enum ModelSource {
    LocalFile(PathBuf),
    HuggingFace {
        repo: String,
        file: String,
        requires_auth: bool,
    },
    DirectUrl {
        url: String,
        filename: String,
    },
}

impl Default for SetupStatus {
    fn default() -> Self {
        Self {
            is_first_run: true,
            completed_steps: Vec::new(),
            current_step: None,
            can_proceed: false,
        }
    }
}

/// Check if this is the first run
pub async fn is_first_run(config_dir: &Path) -> Result<bool, String> {
    let setup_file = config_dir.join("setup_complete.json");

    Ok(!setup_file.exists())
}

/// Mark setup as complete
pub async fn complete_setup(config_dir: &Path) -> Result<(), String> {
    let setup_file = config_dir.join("setup_complete.json");

    // Create config directory if it doesn't exist
    if !config_dir.exists() {
        fs::create_dir_all(config_dir)
            .map_err(|e| format!("Failed to create config directory: {}", e))?;
    }

    // Write completion marker
    let data = serde_json::json!({
        "completed": true,
        "timestamp": chrono::Utc::now().to_rfc3339(),
        "version": env!("CARGO_PKG_VERSION")
    });

    fs::write(setup_file, serde_json::to_string_pretty(&data).unwrap())
        .map_err(|e| format!("Failed to write setup completion: {}", e))?;

    Ok(())
}

/// Get current setup status
pub async fn get_setup_status(config_dir: &Path) -> Result<SetupStatus, String> {
    let is_first = is_first_run(config_dir).await?;

    Ok(SetupStatus {
        is_first_run: is_first,
        ..Default::default()
    })
}

/// Check Python installation and packages
pub async fn check_python() -> Result<PythonStatus, String> {
    let python_cmds = if cfg!(target_os = "windows") {
        vec!["python", "python3"]
    } else {
        vec!["python3", "python"]
    };

    let mut python_path = None;
    let mut version = None;

    // Find Python executable
    for cmd in python_cmds {
        match Command::new(cmd).arg("--version").output() {
            Ok(output) => {
                if output.status.success() {
                    let ver_str = String::from_utf8_lossy(&output.stdout);
                    version = Some(ver_str.trim().to_string());
                    python_path = Some(cmd.to_string());
                    break;
                }
            }
            _ => continue,
        }
    }

    let installed = python_path.is_some();

    // Check pip availability
    let pip_available = if let Some(ref cmd) = python_path {
        Command::new(cmd)
            .args(["-m", "pip", "--version"])
            .output()
            .map(|o| o.status.success())
            .unwrap_or(false)
    } else {
        false
    };

    // Check installed packages
    let mut packages_installed = Vec::new();
    let mut missing_packages = Vec::new();

    if installed {
        for package in REQUIRED_PACKAGES {
            let installed = Command::new(python_path.as_ref().unwrap())
                .args(["-m", "pip", "show", package])
                .output()
                .map(|o| o.status.success())
                .unwrap_or(false);

            if installed {
                packages_installed.push(package.to_string());
            } else {
                missing_packages.push(package.to_string());
            }
        }
    } else {
        missing_packages = REQUIRED_PACKAGES.iter().map(|s| s.to_string()).collect();
    }

    Ok(PythonStatus {
        installed,
        version,
        executable_path: python_path,
        pip_available,
        packages_installed,
        missing_packages,
    })
}

/// Check system requirements
pub fn check_system_requirements() -> Result<SystemRequirements, String> {
    // Get platform info
    let platform = std::env::consts::OS.to_string();
    let architecture = std::env::consts::ARCH.to_string();

    // Check RAM (simplified - in production would use sys-info crate)
    let ram_total_gb = get_total_ram_gb();
    let ram_sufficient = ram_total_gb >= MIN_RAM_GB;

    // Check disk space
    let disk_free_gb = get_free_disk_gb()?;
    let disk_sufficient = disk_free_gb >= (REQUIRED_DISK_SPACE / 1_000_000_000);

    Ok(SystemRequirements {
        ram_sufficient,
        ram_total_gb,
        disk_sufficient,
        disk_free_gb,
        platform,
        architecture,
    })
}

/// Get total RAM in GB
fn get_total_ram_gb() -> u64 {
    #[cfg(target_os = "macos")]
    {
        use std::process::Command;
        let output = Command::new("sysctl")
            .args(["hw.memsize"])
            .output()
            .unwrap_or_else(|_| std::process::Output {
                status: std::process::ExitStatus::from_raw(1),
                stdout: vec![],
                stderr: vec![],
            });

        if output.status.success() {
            let str_output = String::from_utf8_lossy(&output.stdout);
            let bytes: u64 = str_output
                .split(':')
                .nth(1)
                .and_then(|s| s.trim().parse().ok())
                .unwrap_or(8_000_000_000);
            bytes / 1_000_000_000
        } else {
            8 // Assume 8GB minimum
        }
    }

    #[cfg(target_os = "linux")]
    {
        // Linux implementation would go here
        8
    }

    #[cfg(target_os = "windows")]
    {
        // Windows implementation would go here
        8
    }
}

/// Get free disk space in GB
fn get_free_disk_gb() -> Result<u64, String> {
    #[cfg(target_os = "macos")]
    {
        use std::process::Command;
        let output = Command::new("df")
            .arg("-H")
            .arg(".")
            .output()
            .map_err(|e| format!("Failed to check disk space: {}", e))?;

        if output.status.success() {
            let str_output = String::from_utf8_lossy(&output.stdout);
            // Parse df output
            let lines: Vec<&str> = str_output.lines().collect();
            if lines.len() > 1 {
                let parts: Vec<&str> = lines[1].split_whitespace().collect();
                if parts.len() > 3 {
                    let free_str = parts[3].trim_end_matches('G');
                    return free_str.parse::<u64>()
                        .map_err(|e| format!("Failed to parse disk space: {}", e));
                }
            }
        }
        Ok(0)
    }

    #[cfg(target_os = "linux")]
    {
        Ok(20)
    }

    #[cfg(target_os = "windows")]
    {
        Ok(20)
    }
}

/// Install Python packages via pip
pub async fn install_packages(
    python_path: &str,
    progress_callback: impl Fn(String),
) -> Result<(), String> {
    progress_callback("Installing Python packages...".to_string());

    let total_packages = REQUIRED_PACKAGES.len();
    let mut installed = 0;

    for package in REQUIRED_PACKAGES {
        progress_callback(format!("Installing {}...", package));

        let output = Command::new(python_path)
            .args(["-m", "pip", "install", package])
            .output()
            .map_err(|e| format!("Failed to install {}: {}", package, e))?;

        if !output.status.success() {
            let error = String::from_utf8_lossy(&output.stderr);
            return Err(format!("Failed to install {}: {}", package, error));
        }

        installed += 1;
        let progress = ((installed as f32 / total_packages as f32) * 100.0) as u8;
        progress_callback(format!("Progress: {}% ({}/{})", progress, installed, total_packages));
    }

    progress_callback("All Python packages installed successfully!".to_string());
    Ok(())
}

/// Download model file
pub async fn download_model(
    window: tauri::Window,
    source: ModelSource,
    destination: PathBuf,
) -> Result<String, String> {
    use reqwest::Client;
    use futures_util::StreamExt;

    let client = Client::builder()
        .timeout(std::time::Duration::from_secs(600))
        .build()
        .map_err(|e| format!("Failed to create HTTP client: {}", e))?;

    let (url, _filename) = match source {
        ModelSource::LocalFile(path) => {
            return Ok(path.to_string_lossy().to_string());
        }
        ModelSource::HuggingFace { repo, file, .. } => {
            // For Hugging Face, we'll provide instructions in the UI
            return Err(format!(
                "Hugging Face repository requires authentication. Please manually download:\n\
                 Repository: {}\n\
                 File: {}\n\
                 \n\
                 Then select the downloaded file.",
                repo, file
            ));
        }
        ModelSource::DirectUrl { url, filename } => (url, filename),
    };

    window.emit("setup-progress", serde_json::json!({
        "step": "DownloadModel",
        "message": "Starting download...",
        "percent": 0
    })).ok();

    let response = client
        .get(&url)
        .send()
        .await
        .map_err(|e| format!("Download failed: {}", e))?;

    if !response.status().is_success() {
        return Err(format!("Server returned error: {}", response.status()));
    }

    let total_size = response.content_length().unwrap_or(MODEL_SIZE_BYTES);
    let mut downloaded = 0u64;
    let mut stream = response.bytes_stream();

    // Create destination directory
    if let Some(parent) = destination.parent() {
        fs::create_dir_all(parent)
            .map_err(|e| format!("Failed to create directory: {}", e))?;
    }

    // Create file
    let mut file = fs::File::create(&destination)
        .map_err(|e| format!("Failed to create file: {}", e))?;

    use std::io::Write;

    while let Some(chunk_result) = stream.next().await {
        let chunk = chunk_result
            .map_err(|e| format!("Download error: {}", e))?;

        file.write_all(&chunk)
            .map_err(|e| format!("Failed to write: {}", e))?;

        downloaded += chunk.len() as u64;
        let percent = ((downloaded as f64 / total_size as f64) * 100.0) as u8;

        window.emit("setup-progress", serde_json::json!({
            "step": "DownloadModel",
            "message": format!("Downloaded {} / {}", format_bytes(downloaded), format_bytes(total_size)),
            "percent": percent
        })).ok();
    }

    window.emit("setup-progress", serde_json::json!({
        "step": "DownloadModel",
        "message": "Download complete!",
        "percent": 100
    })).ok();

    Ok(destination.to_string_lossy().to_string())
}

/// Verify model file integrity
pub async fn verify_model(path: &Path) -> Result<bool, String> {
    if !path.exists() {
        return Ok(false);
    }

    let metadata = fs::metadata(path)
        .map_err(|e| format!("Failed to read file: {}", e))?;

    // Check file size (allow 10% tolerance)
    let file_size = metadata.len();
    let min_size = MODEL_SIZE_BYTES * 90 / 100;
    let max_size = MODEL_SIZE_BYTES * 110 / 100;

    Ok(file_size >= min_size && file_size <= max_size)
}

/// Format bytes to human-readable string
fn format_bytes(bytes: u64) -> String {
    const GB: u64 = 1_000_000_000;
    const MB: u64 = 1_000_000;

    if bytes >= GB {
        format!("{:.2} GB", bytes as f64 / GB as f64)
    } else if bytes >= MB {
        format!("{:.2} MB", bytes as f64 / MB as f64)
    } else {
        format!("{} bytes", bytes)
    }
}

/// Get default model path
pub fn get_default_model_path() -> PathBuf {
    let mut path = dirs::home_dir().unwrap_or_else(|| PathBuf::from("."));
    path.push("VFX-BIDDING");
    path.push("Models");
    path.push("Floppa-12B-Gemma3-Uncensored.Q4_K_S.gguf");
    path
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_check_python() {
        let status = check_python().await.unwrap();
        println!("Python status: {:?}", status);
    }

    #[test]
    fn test_system_requirements() {
        let reqs = check_system_requirements().unwrap();
        println!("System requirements: {:?}", reqs);
    }
}
