// Library exports for testing
pub mod commands;
pub mod sidecar;
pub mod state;
pub mod setup_wizard;

pub use commands::{bid, chat, script, settings};
pub use state::{bid::BidState, session::SessionState};
