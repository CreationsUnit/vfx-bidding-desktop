// Python sidecar process management
pub mod process;
pub mod rpc;

// Public exports
pub use process::{PythonSidecar, start_sidecar, stop_sidecar};
pub use rpc::{RpcClient, AsyncRpcClient, RpcRequest, RpcResponse, RpcError, ProgressEvent};
