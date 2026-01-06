use std::sync::Mutex;
use crate::sidecar::PythonSidecar;
use std::path::PathBuf;

/// Global Python sidecar state
#[derive(Default)]
pub struct SidecarState {
    sidecar: Mutex<Option<PythonSidecar>>,
}

impl SidecarState {
    /// Initialize and start the Python sidecar
    pub fn start(&self, rpc_script_path: PathBuf) -> Result<(), String> {
        let mut guard = self.sidecar.lock()
            .map_err(|e| format!("Failed to lock sidecar state: {}", e))?;

        // Stop existing sidecar if running
        if let Some(ref mut existing) = *guard {
            let _ = existing.stop();
        }

        // Start new sidecar
        let new_sidecar = PythonSidecar::start(&rpc_script_path)?;
        *guard = Some(new_sidecar);

        Ok(())
    }

    /// Stop the Python sidecar
    pub fn stop(&self) -> Result<(), String> {
        let mut guard = self.sidecar.lock()
            .map_err(|e| format!("Failed to lock sidecar state: {}", e))?;

        if let Some(ref mut sidecar) = *guard {
            sidecar.stop()?;
        }

        *guard = None;
        Ok(())
    }

    /// Get the RPC client if sidecar is running
    pub fn rpc_client(&self) -> Option<crate::sidecar::AsyncRpcClient> {
        let guard = self.sidecar.lock()
            .ok()?;

        guard.as_ref()?.async_rpc_client()
    }

    /// Check if sidecar is running
    pub fn is_running(&self) -> bool {
        if let Ok(mut guard) = self.sidecar.lock() {
            if let Some(ref mut sidecar) = *guard {
                return sidecar.is_running();
            }
        }
        false
    }

    /// Restart the sidecar
    pub fn restart(&self) -> Result<(), String> {
        let mut guard = self.sidecar.lock()
            .map_err(|e| format!("Failed to lock sidecar state: {}", e))?;

        if let Some(ref mut sidecar) = *guard {
            sidecar.restart()?;
        }

        Ok(())
    }
}
