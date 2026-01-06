use std::process::{Command, Child, Stdio};
use std::path::{Path, PathBuf};
use std::io::{BufRead, BufReader, Write};
use std::sync::{Arc, Mutex};
use std::thread;

/// Python sidecar process manager
/// Handles the lifecycle of the Python RPC server process
pub struct PythonSidecar {
    child: Option<Child>,
    rpc_path: PathBuf,
    // Keep references to stdin/stdout for RPC communication
    stdin: Option<Arc<Mutex<Box<dyn Write + Send>>>>,
    stdout: Option<Arc<Mutex<Box<dyn BufRead + Send>>>>,
}

impl PythonSidecar {
    /// Start the Python sidecar process
    ///
    /// # Arguments
    /// * `script_path` - Path to the rpc_server.py script
    ///
    /// # Returns
    /// Result containing PythonSidecar instance or error message
    pub fn start(script_path: &Path) -> Result<Self, String> {
        let script_path = if script_path.is_absolute() {
            script_path.to_path_buf()
        } else {
            std::env::current_dir()
                .unwrap()
                .join(script_path)
                .canonicalize()
                .map_err(|e| format!("Failed to resolve script path: {}", e))?
        };

        if !script_path.exists() {
            return Err(format!("RPC server script not found: {}", script_path.display()));
        }

        // Determine Python executable
        // Prefer VFX_PYTHON_PATH env var, otherwise try venv, then system python
        let python = if let Ok(py) = std::env::var("VFX_PYTHON_PATH") {
            py
        } else {
            // Try to find venv Python relative to project root
            if let Ok(cwd) = std::env::current_dir() {
                let venv_python = cwd.join("venv/bin/python");
                if venv_python.exists() {
                    venv_python.to_string_lossy().to_string()
                } else {
                    "python3".to_string()
                }
            } else {
                "python3".to_string()
            }
        };

        log::info!("Starting Python sidecar: {} {}", python, script_path.display());

        // Set PYTHONPATH to include the resources directory
        let resources_dir = script_path.parent()
            .unwrap_or_else(|| Path::new("."));
        let mut cmd = Command::new(&python);
        cmd.arg(&script_path)
            .stdin(Stdio::piped())
            .stdout(Stdio::piped())
            .stderr(Stdio::piped());

        // Add resources directory to PYTHONPATH
        if let Ok(mut pythonpath) = std::env::var("PYTHONPATH") {
            pythonpath.push_str(":");
            pythonpath.push_str(resources_dir.to_string_lossy().as_ref());
            cmd.env("PYTHONPATH", pythonpath);
        } else {
            cmd.env("PYTHONPATH", resources_dir.to_string_lossy().as_ref());
        }

        let mut child = cmd.spawn()
            .map_err(|e| format!("Failed to start Python sidecar: {}", e))?;

        // Get handles to stdin/stdout
        let stdin = child.stdin.take()
            .ok_or_else(|| "Failed to open stdin".to_string())?;
        let stdout = child.stdout.take()
            .ok_or_else(|| "Failed to open stdout".to_string())?;
        let stderr = child.stderr.take()
            .ok_or_else(|| "Failed to open stderr".to_string())?;

        // Spawn a thread to monitor stderr for events and logging
        let stderr_reader = BufReader::new(stderr);
        thread::spawn(move || {
            for line in stderr_reader.lines() {
                match line {
                    Ok(l) => {
                        // Try to parse as JSON event
                        if let Ok(event) = serde_json::from_str::<serde_json::Value>(&l) {
                            if let Some(event_type) = event.get("event").and_then(|e| e.as_str()) {
                                log::info!("Python sidecar event: {}", event_type);
                                // TODO: Emit to Tauri event system
                            }
                        } else {
                            // Regular log line
                            log::debug!("Python sidecar: {}", l);
                        }
                    }
                    Err(e) => {
                        log::error!("Error reading stderr: {}", e);
                        break;
                    }
                }
            }
        });

        Ok(Self {
            child: Some(child),
            rpc_path: script_path,
            stdin: Some(Arc::new(Mutex::new(Box::new(stdin)))),
            stdout: Some(Arc::new(Mutex::new(Box::new(BufReader::new(stdout))))),
        })
    }

    /// Get stdin handle for writing JSON-RPC requests
    pub fn stdin(&self) -> Option<Arc<Mutex<Box<dyn Write + Send>>>> {
        self.stdin.clone()
    }

    /// Get stdout handle for reading JSON-RPC responses
    pub fn stdout(&self) -> Option<Arc<Mutex<Box<dyn BufRead + Send>>>> {
        self.stdout.clone()
    }

    /// Check if the process is still running
    pub fn is_running(&mut self) -> bool {
        if let Some(ref mut child) = self.child {
            match child.try_wait() {
                Ok(Some(status)) => {
                    log::warn!("Python sidecar exited with status: {:?}", status);
                    false
                }
                Ok(None) => true, // Still running
                Err(e) => {
                    log::error!("Error checking sidecar status: {}", e);
                    false
                }
            }
        } else {
            false
        }
    }

    /// Stop the sidecar process
    pub fn stop(&mut self) -> Result<(), String> {
        if let Some(mut child) = self.child.take() {
            log::info!("Stopping Python sidecar...");

            // Try graceful shutdown first
            if let Some(stdin) = &mut self.stdin {
                let _ = stdin.lock().unwrap().flush();
            }

            child.kill()
                .map_err(|e| format!("Failed to stop sidecar: {}", e))?;

            let _ = child.wait();
        }

        self.stdin = None;
        self.stdout = None;

        Ok(())
    }

    /// Restart the sidecar
    pub fn restart(&mut self) -> Result<(), String> {
        self.stop()?;
        let mut new_sidecar = Self::start(&self.rpc_path)?;

        // Manually move the fields
        self.child = new_sidecar.child.take();
        self.stdin = new_sidecar.stdin.take();
        self.stdout = new_sidecar.stdout.take();

        Ok(())
    }
}

impl Drop for PythonSidecar {
    fn drop(&mut self) {
        let _ = self.stop();
    }
}

/// Start sidecar (convenience function)
pub fn start_sidecar(script_path: &Path) -> Result<PythonSidecar, String> {
    PythonSidecar::start(script_path)
}

/// Stop sidecar (convenience function)
pub fn stop_sidecar(sidecar: &mut PythonSidecar) -> Result<(), String> {
    sidecar.stop()
}
