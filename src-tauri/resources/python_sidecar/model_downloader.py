#!/usr/bin/env python3
"""
Model Downloader for VFX Bidding AI
====================================
Downloads GGUF models from Hugging Face with resume capability and progress tracking.

Supported Models:
- Floppa-12B-Gemma3-Uncensored (mradermacher GGUF)
- Any other Hugging Face GGUF models

Features:
- Resume interrupted downloads
- Progress reporting via callbacks or stdout
- Checksum verification
- Multiple quantization options
- Speed estimation
"""

import os
import sys
import json
import hashlib
import requests
import argparse
import time
from pathlib import Path
from typing import Optional, Callable, Dict, List
from dataclasses import dataclass


@dataclass
class ModelInfo:
    """Information about a downloadable model."""
    repo_id: str
    filename: str
    display_name: str
    size_gb: float
    quantization: str

    def get_download_url(self) -> str:
        """Get direct download URL from Hugging Face."""
        return f"https://huggingface.co/{self.repo_id}/resolve/main/{self.filename}"


class ModelDownloader:
    """
    Download GGUF models from Hugging Face with resume capability.
    """

    # Recommended models
    RECOMMENDED_MODELS = {
        "floppa-12b-q4": ModelInfo(
            repo_id="mradermacher/Floppa-12B-Gemma3-Uncensored-GGUF",
            filename="Floppa-12B-Gemma3-Uncensored.Q4_K_S.gguf",
            display_name="Floppa-12B (Q4_K_S)",
            size_gb=6.46,
            quantization="Q4_K_S"
        ),
        "floppa-12b-q5": ModelInfo(
            repo_id="mradermacher/Floppa-12B-Gemma3-Uncensored-GGUF",
            filename="Floppa-12B-Gemma3-Uncensored.Q5_K_M.gguf",
            display_name="Floppa-12B (Q5_K_M)",
            size_gb=7.93,
            quantization="Q5_K_M"
        ),
        "floppa-12b-q6": ModelInfo(
            repo_id="mradermacher/Floppa-12B-Gemma3-Uncensored-GGUF",
            filename="Floppa-12B-Gemma3-Uncensored.Q6_K.gguf",
            display_name="Floppa-12B (Q6_K)",
            size_gb=9.41,
            quantization="Q6_K"
        ),
    }

    def __init__(
        self,
        model_info: ModelInfo,
        output_dir: str,
        progress_callback: Optional[Callable[[float, str], None]] = None
    ):
        """
        Initialize downloader.

        Args:
            model_info: ModelInfo object with model details
            output_dir: Directory to save the model
            progress_callback: Optional callback(percent, message) for progress updates
        """
        self.model_info = model_info
        self.output_dir = Path(output_dir)
        self.progress_callback = progress_callback or self._default_progress

        # Create output directory
        self.output_dir.mkdir(parents=True, exist_ok=True)

        # File paths
        self.final_path = self.output_dir / model_info.filename
        self.temp_path = self.output_dir / f"{model_info.filename}.download"

        # Progress tracking
        self._last_progress_time = 0
        self._last_downloaded_bytes = 0
        self._start_time = None

    def _default_progress(self, percent: float, message: str):
        """Default progress handler (prints to stdout)."""
        if message:
            print(f"\r{message}", end='', flush=True)

    def _report_progress(self, downloaded: int, total: int, speed: float = 0):
        """Report progress via callback."""
        percent = (downloaded / total * 100) if total > 0 else 0

        # Format message
        downloaded_mb = downloaded / (1024 * 1024)
        total_mb = total / (1024 * 1024)

        if speed > 0:
            eta_seconds = (total - downloaded) / (speed * 1024 * 1024)
            eta_str = f"{eta_seconds/60:.1f}m" if eta_seconds > 60 else f"{eta_seconds:.0f}s"
            message = f"Progress: {percent:.1f}% ({downloaded_mb:.1f}/{total_mb:.1f} MB) - Speed: {speed:.2f} MB/s - ETA: {eta_str}"
        else:
            message = f"Progress: {percent:.1f}% ({downloaded_mb:.1f}/{total_mb:.1f} MB)"

        self.progress_callback(percent, message)

    def check_resume_support(self, url: str) -> bool:
        """Check if server supports resume (Range requests)."""
        try:
            response = requests.head(
                url,
                headers={'User-Agent': 'Mozilla/5.0'},
                allow_redirects=True,
                timeout=10
            )
            return response.headers.get('accept-ranges') == 'bytes'
        except Exception:
            return False

    def get_remote_size(self, url: str) -> int:
        """Get remote file size in bytes."""
        try:
            response = requests.head(
                url,
                headers={'User-Agent': 'Mozilla/5.0'},
                allow_redirects=True,
                timeout=10
            )
            return int(response.headers.get('content-length', 0))
        except Exception as e:
            raise Exception(f"Could not get remote file size: {e}")

    def verify_download(self, expected_size: Optional[int] = None) -> bool:
        """Verify downloaded file integrity."""
        if not self.final_path.exists():
            return False

        actual_size = self.final_path.stat().st_size

        if expected_size is not None:
            return actual_size == expected_size

        return actual_size > 0

    def download(self, resume: bool = True) -> Path:
        """
        Download the model with progress and resume support.

        Args:
            resume: Allow resuming interrupted downloads

        Returns:
            Path to downloaded file

        Raises:
            Exception: If download fails
        """
        url = self.model_info.get_download_url()
        remote_size = self.get_remote_size(url)

        if remote_size == 0:
            raise Exception("Could not determine remote file size")

        self.progress_callback(0, f"Starting download: {self.model_info.display_name}")

        # Check if file already exists
        if self.final_path.exists():
            if self.verify_download(remote_size):
                self.progress_callback(100, f"Model already downloaded: {self.final_path}")
                return self.final_path
            else:
                self.progress_callback(0, "Existing file incomplete, re-downloading...")

        # Check for partial download
        downloaded = self.temp_path.stat().st_size if self.temp_path.exists() else 0

        if downloaded > 0:
            if resume and self.check_resume_support(url):
                self.progress_callback(0, f"Resuming from byte {downloaded:,}")
            else:
                # Delete partial download if resume not supported
                self.temp_path.unlink(missing_ok=True)
                downloaded = 0

        # Prepare headers
        headers = {'User-Agent': 'Mozilla/5.0'}
        if downloaded > 0:
            headers['Range'] = f'bytes={downloaded}-'

        # Start download
        self._start_time = time.time()
        self._last_downloaded_bytes = downloaded

        try:
            response = requests.get(url, headers=headers, stream=True, timeout=30)
            response.raise_for_status()

            mode = 'ab' if downloaded > 0 else 'wb'

            with open(self.temp_path, mode) as f:
                for chunk in response.iter_content(chunk_size=64 * 1024):  # 64KB chunks
                    if chunk:
                        f.write(chunk)
                        downloaded += len(chunk)

                        # Report progress every second
                        current_time = time.time()
                        if current_time - self._last_progress_time >= 1.0:
                            elapsed = current_time - self._start_time
                            speed = (downloaded - self._last_downloaded_bytes) / elapsed if elapsed > 0 else 0
                            self._report_progress(downloaded, remote_size, speed)
                            self._last_progress_time = current_time

            # Final progress report
            self._report_progress(downloaded, remote_size, 0)

            # Verify download
            if downloaded != remote_size:
                raise Exception(f"Download incomplete: {downloaded} != {remote_size}")

            # Move to final location
            self.temp_path.rename(self.final_path)

            self.progress_callback(100, f"Download complete: {self.final_path}")

            return self.final_path

        except requests.exceptions.RequestException as e:
            raise Exception(f"Download failed: {e}")
        except Exception as e:
            raise Exception(f"Download error: {e}")

    def calculate_checksum(self, algorithm: str = 'md5') -> str:
        """Calculate checksum of downloaded file."""
        if not self.final_path.exists():
            raise Exception("File not downloaded")

        hash_func = hashlib.new(algorithm)

        with open(self.final_path, 'rb') as f:
            for chunk in iter(lambda: f.read(8192), b''):
                hash_func.update(chunk)

        return hash_func.hexdigest()

    @classmethod
    def list_available_models(cls) -> Dict[str, ModelInfo]:
        """List all available recommended models."""
        return cls.RECOMMENDED_MODELS.copy()

    @classmethod
    def get_model_info(cls, model_key: str) -> ModelInfo:
        """Get model info by key."""
        if model_key not in cls.RECOMMENDED_MODELS:
            raise ValueError(f"Unknown model: {model_key}. Available: {list(cls.RECOMMENDED_MODELS.keys())}")
        return cls.RECOMMENDED_MODELS[model_key]


def download_model(
    model_key: str,
    output_dir: str,
    progress_callback: Optional[Callable[[float, str], None]] = None
) -> Path:
    """
    Convenience function to download a model.

    Args:
        model_key: Key from RECOMMENDED_MODELS (e.g., 'floppa-12b-q4')
        output_dir: Directory to save the model
        progress_callback: Optional progress callback

    Returns:
        Path to downloaded model
    """
    model_info = ModelDownloader.get_model_info(model_key)
    downloader = ModelDownloader(model_info, output_dir, progress_callback)
    return downloader.download()


def main():
    """Command-line interface."""
    parser = argparse.ArgumentParser(
        description="Download GGUF models from Hugging Face",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Download recommended model
  %(prog)s --model floppa-12b-q4 --output ~/Models

  # List available models
  %(prog)s --list-models

  # Resume interrupted download
  %(prog)s --model floppa-12b-q4 --output ~/Models --resume

  # Custom model
  %(prog)s --repo-id user/repo --filename model.gguf --output ~/Models
        """
    )

    parser.add_argument(
        '--model',
        choices=list(ModelDownloader.RECOMMENDED_MODELS.keys()),
        help='Model to download (use --list-models to see options)'
    )

    parser.add_argument(
        '--list-models',
        action='store_true',
        help='List available models'
    )

    parser.add_argument(
        '--output-dir',
        default=os.path.expanduser('~/Models'),
        help='Output directory (default: ~/Models)'
    )

    parser.add_argument(
        '--no-resume',
        action='store_true',
        help='Disable resume capability'
    )

    parser.add_argument(
        '--verify',
        action='store_true',
        help='Verify download after completion'
    )

    parser.add_argument(
        '--json',
        action='store_true',
        help='Output progress as JSON (for machine parsing)'
    )

    # Custom model options
    parser.add_argument('--repo-id', help='Custom Hugging Face repo ID')
    parser.add_argument('--filename', help='Custom model filename')

    args = parser.parse_args()

    # List models
    if args.list_models:
        print("Available Models:")
        print("=" * 60)
        for key, info in ModelDownloader.RECOMMENDED_MODELS.items():
            print(f"\n{key}:")
            print(f"  Name: {info.display_name}")
            print(f"  Size: {info.size_gb:.2f} GB")
            print(f"  Quantization: {info.quantization}")
        return 0

    # Validate arguments
    if not args.model and not (args.repo_id and args.filename):
        parser.error("Must specify --model or both --repo-id and --filename")

    # Get model info
    if args.model:
        model_info = ModelDownloader.get_model_info(args.model)
    else:
        model_info = ModelInfo(
            repo_id=args.repo_id,
            filename=args.filename,
            display_name=args.filename,
            size_gb=0,
            quantization="custom"
        )

    # Progress callback
    if args.json:
        def json_progress(percent: float, message: str):
            print(json.dumps({
                "percent": round(percent, 2),
                "message": message.strip(),
                "timestamp": time.time()
            }))
        progress_callback = json_progress
    else:
        progress_callback = None

    # Download
    try:
        print(f"Downloading: {model_info.display_name}")
        print(f"Output directory: {args.output_dir}")
        print(f"Repository: {model_info.repo_id}")
        print("-" * 60)

        downloader = ModelDownloader(model_info, args.output_dir, progress_callback)
        result = downloader.download(resume=not args.no_resume)

        print("\n" + "-" * 60)
        print(f"✓ Download complete: {result}")

        if args.verify:
            print("\nVerifying download...")
            md5 = downloader.calculate_checksum('md5')
            print(f"MD5: {md5}")

        return 0

    except KeyboardInterrupt:
        print("\n\nDownload interrupted by user")
        print(f"Partial download saved to: {downloader.temp_path}")
        print("Run again with --resume to continue")
        return 130

    except Exception as e:
        print(f"\n✗ Error: {e}", file=sys.stderr)
        return 1


if __name__ == '__main__':
    sys.exit(main())
