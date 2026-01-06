use crate::commands::bid::ShotData;
use std::sync::Mutex;

/// Global bid state
#[derive(Default)]
pub struct BidState {
    shots: Mutex<Vec<ShotData>>,
}

impl BidState {
    pub fn get_shots(&self) -> Vec<ShotData> {
        self.shots.lock().unwrap().clone()
    }

    pub fn set_shots(&self, shots: Vec<ShotData>) {
        *self.shots.lock().unwrap() = shots;
    }

    pub fn update_shot(&self, id: String, updates: ShotData) -> Result<ShotData, String> {
        let mut shots = self.shots.lock().unwrap();

        let index = shots
            .iter()
            .position(|s| s.id == id)
            .ok_or_else(|| format!("Shot {} not found", id))?;

        shots[index] = updates.clone();
        Ok(updates)
    }

    pub fn add_shot(&self, shot: ShotData) {
        self.shots.lock().unwrap().push(shot);
    }

    pub fn clear(&self) {
        self.shots.lock().unwrap().clear();
    }
}
