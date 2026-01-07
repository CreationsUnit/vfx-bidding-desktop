// Prevents additional console window on Windows in release
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod commands;
mod sidecar;
mod state;
mod setup_wizard;

use commands::{bid, chat, script, settings, setup};
use state::{bid::BidState, sidecar::SidecarState};
use tauri::{Manager, State};
use std::path::PathBuf;
use std::sync::Mutex;

#[tokio::main]
async fn main() {
    // Initialize logger
    env_logger::init();

    tauri::Builder::default()
        // Initialize global state
        .manage(BidState::default())
        .manage(SidecarState::default())
        .manage(setup::SetupWizardState::default())
        // Register all Tauri commands
        .invoke_handler(tauri::generate_handler![
            // Setup wizard commands
            setup::check_setup_status,
            setup::start_setup,
            setup::verify_system_requirements,
            setup::install_python_dependencies,
            setup::setup_model_file,
            setup::skip_model_setup,
            setup::complete_setup_process,
            setup::verify_dependencies,
            setup::select_local_model,
            setup::get_model_download_instructions,
            setup::reset_setup,
            // Script commands
            script::process_script,
            script::load_bid,
            script::export_bid,
            // Chat commands
            chat::send_message,
            chat::execute_command,
            // Bid commands
            bid::get_shot,
            bid::update_shot,
            bid::group_shots,
            bid::get_all_shots,
            bid::bid_query,
            // Settings commands
            settings::get_settings,
            settings::update_settings,
            settings::test_llm_connection,
        ])
        // Setup application
        .setup(|app| {
            // NOTE: Temporarily disabled devtools due to crash
            // #[cfg(debug_assertions)]
            // {
            //     let window = app.get_webview_window("main").unwrap();
            //     window.open_devtools();
            // }

            // Start Python sidecar on application startup
            let sidecar_state: State<SidecarState> = app.state();

            // Find the Python RPC server script
            // Try multiple possible locations
            let possible_paths = vec![
                // Absolute path to parent directory (works in dev)
                PathBuf::from("/Volumes/MacWork/VFX-BIDDING/python_sidecar/rpc_server.py"),
                // App bundle resources (production)
                app.path().resource_dir()
                    .unwrap_or_else(|_| PathBuf::from("."))
                    .join("python_sidecar/rpc_server.py"),
                // Relative to project root (development)
                PathBuf::from("../../python_sidecar/rpc_server.py"),
                // Relative to project root (alternative)
                PathBuf::from("../python_sidecar/rpc_server.py"),
            ];

            let resource_path = possible_paths.into_iter()
                .find(|p| p.exists())
                .unwrap_or_else(|| PathBuf::from("python_sidecar/rpc_server.py"));

            println!("Starting Python sidecar from: {:?}", resource_path);

            // Start the sidecar - this will spawn the Python process
            match sidecar_state.start(resource_path) {
                Ok(_) => println!("Python sidecar started successfully"),
                Err(e) => {
                    eprintln!("Failed to start Python sidecar: {}", e);
                    eprintln!("Application will continue but RPC calls will fail");
                }
            }

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
