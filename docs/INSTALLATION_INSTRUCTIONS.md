# VFX Bidding AI v1.0.0 - Installation Instructions

## Quick Installation (5 minutes)

### Option 1: Using the DMG Installer (Recommended)

1. **Download the DMG**
   - File: `VFX Bidding AI_1.0.0_aarch64.dmg` (1.9 MB)
   - For Apple Silicon Macs (M1/M2/M3)

2. **Open the DMG**
   - Double-click the downloaded .dmg file
   - A window will appear with the app

3. **Install the App**
   - Drag "VFX Bidding AI.app" to the Applications folder
   - Wait for the copy to complete

4. **Launch the App**
   - Open Applications folder
   - Double-click "VFX Bidding AI.app"
   - If you see a security warning, see "First Launch" below

5. **Run Setup Wizard**
   - Follow the on-screen prompts
   - Download the AI model (6.5 GB, ~9 minutes)
   - You're ready to use the app!

### Option 2: Manual Installation

1. **Download the Distribution Package**
   - Unzip `VFX-Bidding-AI-v1.0.0-macOS.zip`
   - Contains app bundle and documentation

2. **Copy to Applications**
   ```bash
   cp -R "VFX Bidding AI.app" /Applications/
   ```

3. **Launch**
   ```bash
   open "/Applications/VFX Bidding AI.app"
   ```

## First Launch - Security Warning

When you first launch the app, macOS may show a warning:
"VFX Bidding AI.app cannot be opened because the developer cannot be verified"

### Solution 1: Right-Click Method (Recommended)
1. Right-click (or Control-click) the app
2. Select "Open" from the menu
3. Click "Open" in the confirmation dialog
4. The app will launch and be remembered for future launches

### Solution 2: Terminal Method
```bash
xattr -cr "/Applications/VFX Bidding AI.app"
open "/Applications/VFX Bidding AI.app"
```

### Solution 3: System Settings (Permanent)
1. Open System Settings → Privacy & Security
2. Find "VFX Bidding AI" in the list of blocked apps
3. Click "Open Anyway"
4. Confirm with admin password

This is normal for unsigned apps. The app is safe to run.

## Setup Wizard Walkthrough

### Step 1: System Check (30 seconds)
The wizard checks:
- ✓ Python 3.9+ installation
- ✓ 15GB free disk space
- ✓ Internet connection

If any check fails, follow the on-screen instructions.

### Step 2: Install Python Packages (2 minutes)
Required packages:
- PyPDF2 - PDF parsing
- openpyxl - Excel generation
- requests - HTTP client
- tqdm - Progress bars

These install automatically via pip3.

### Step 3: Download AI Model (9 minutes)
- Downloads Floppa-12B-Gemma3-Uncensored.Q4_K_S.gguf
- Size: 6.5 GB
- Location: ~/Models/
- Source: Hugging Face (no account needed)
- Progress bar shows download status

**Important:** This download cannot resume if interrupted. Make sure you have stable internet.

### Step 4: Configuration (10 seconds)
Creates configuration file at:
`~/.config/vfx-bidding-app/config.toml`

Default settings:
- Model path: ~/Models/Floppa-12B-Gemma3-Uncensored.Q4_K_S.gguf
- Context size: 8192 tokens
- Temperature: 0.7
- Max tokens: 2048

## Verification

After installation, verify everything is working:

```bash
cd /path/to/distribution
./distribution/verify_install.sh
```

Expected output:
```
✓ Application installed
✓ Python 3: Python 3.x.x
✓ pip3 available
✓ Setup completed
✓ AI Model: 6.5G
```

## Uninstall

To completely remove the app:

```bash
# Remove app
rm -rf "/Applications/VFX Bidding AI.app"

# Remove config and data
rm -rf ~/.config/vfx-bidding-app
rm -rf ~/Library/Logs/VFX\ Bidding\ AI
rm -rf ~/Library/Caches/VFX\ Bidding\ AI

# Remove model (optional, if you want to keep it for other apps)
rm -rf ~/Models/Floppa-12B-Gemma3-Uncensored.Q4_K_S.gguf
```

## Troubleshooting

### App won't launch
- Check macOS version (10.15+)
- Verify Python 3.9+ installed: `python3 --version`
- Check disk space
- Try launching from Terminal to see errors

### Setup fails - Python not found
Install Python from python.com or via Homebrew:
```bash
brew install python@3.11
```

### Model download fails
- Check internet connection
- Verify firewall settings
- Try downloading manually:
  1. Visit: https://huggingface.co/bartowski/Floppa-12B-Gemma3-Uncensored-GGUF
  2. Download: Floppa-12B-Gemma3-Uncensored.Q4_K_S.gguf
  3. Place in: ~/Models/

### Out of disk space
The app needs 15GB free:
- 6.5 GB for AI model
- 500 MB for app
- 8 GB for temporary files

Free up space or move the model location in settings.

### Analysis is slow
- Close other apps
- Make sure you have 8GB+ RAM
- Check the model is on an SSD (not HDD)
- Consider using "Low Memory Mode" in settings

## File Locations

After installation:

| Component | Location |
|-----------|----------|
| Application | /Applications/VFX Bidding AI.app |
| Configuration | ~/.config/vfx-bidding-app/config.toml |
| AI Model | ~/Models/Floppa-12B-Gemma3-Uncensored.Q4_K_S.gguf |
| Logs | ~/Library/Logs/VFX Bidding AI/ |
| Cache | ~/Library/Caches/VFX Bidding AI/ |

## System Requirements

### Minimum
- macOS 10.15 (Catalina)
- Apple Silicon M1 or later
- 8GB RAM
- 15GB free disk space
- Internet connection (setup only)
- Python 3.9+

### Recommended
- macOS 13 (Ventura) or later
- 16GB RAM
- 50GB free disk space
- SSD storage
- Fast internet connection

## Next Steps

After installation:

1. **Read the User Guide**
   - Open USER_GUIDE.txt for complete documentation

2. **Try the Demo**
   - The app includes sample scripts to test

3. **Import Your First Script**
   - Drag & drop a PDF script
   - Or use Chat mode

4. **Explore Features**
   - Script analysis
   - Cost calculation
   - Excel export
   - Bid comparison

## Support

If you encounter issues:

1. Check the User Guide (USER_GUIDE.txt)
2. Run verify_install.sh to check installation
3. Check logs: ~/Library/Logs/VFX Bidding AI/
4. Visit: https://github.com/vfx-bidding/vfx-bidding-desktop/issues

## File Integrity

Verify your download with checksums:

```bash
# Verify DMG
shasum -a 256 VFX\ Bidding\ AI_1.0.0_aarch64.dmg
# Should output: 192699f0f81797540f82f6c42a049becba2fd30457ac26c066ee8d713e67fd72

# Verify App Bundle
shasum -a 256 -c distribution/checksums.txt
```

---

**Installation complete!** Welcome to VFX Bidding AI.

For updates and news, visit: https://vfxbidding.ai
