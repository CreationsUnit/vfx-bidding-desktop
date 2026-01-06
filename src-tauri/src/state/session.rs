use std::sync::Mutex;
use crate::commands::settings::Settings;

/// User session state
#[derive(Default)]
pub struct SessionState {
    settings: Mutex<Option<Settings>>,
    current_script: Mutex<Option<String>>,
}

impl SessionState {
    pub fn set_settings(&self, settings: Settings) {
        *self.settings.lock().unwrap() = Some(settings);
    }

    pub fn get_settings(&self) -> Option<Settings> {
        self.settings.lock().unwrap().clone()
    }

    pub fn set_current_script(&self, path: String) {
        *self.current_script.lock().unwrap() = Some(path);
    }

    pub fn get_current_script(&self) -> Option<String> {
        self.current_script.lock().unwrap().clone()
    }
}
