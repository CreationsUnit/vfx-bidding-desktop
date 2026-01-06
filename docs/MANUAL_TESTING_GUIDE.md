# Manual Testing Guide for VFX Bidding AI

**Purpose:** Step-by-step instructions for manual end-to-end testing  
**Last Updated:** 2026-01-06  
**Prerequisites:** All automated tests must pass first

---

## Pre-Test Setup

### 1. Environment Variables
Open a terminal and set the required environment variables:

```bash
# Set Python path (required by Rust sidecar)
export VFX_PYTHON_PATH=/Volumes/MacWork/VFX-BIDDING/venv/bin/python

# Set model path (required by LLM)
export MODEL_PATH=/Volumes/MacWork/VFX-BIDDING/Models/Floppa-12B-Gemma3-Uncensored.Q4_K_S.gguf

# Verify settings
echo "Python: $VFX_PYTHON_PATH"
echo "Model: $MODEL_PATH"
```

### 2. Quick Verification
Before launching the app, verify components work independently:

```bash
# Test Python RPC server
cd /Volumes/MacWork/VFX-BIDDING
echo '{"jsonrpc":"2.0","method":"ping","params":{},"id":1}' | source venv/bin/activate && python3 python_sidecar/rpc_server.py

# Expected output:
# {"jsonrpc":"2.0","result":{"status":"ok","version":"1.0.0","message":"VFX Bidding AI Sidecar is running"},"id":1}
```

### 3. Test Resources Available
Verify test files exist:
```bash
# Test script
ls -lh /Volumes/MacWork/VFX-BIDDING/Scripts/Tucker_and_Dale_vs_Evil_2010.pdf

# Demo bid for loading tests
ls -lh /Volumes/MacWork/VFX-BIDDING/Templates/DEMO_PROJECT_VFX_BID_2026-01-05.xlsx

# Model file
ls -lh /Volumes/MacWork/VFX-BIDDING/Models/Floppa-12B-Gemma3-Uncensored.Q4_K_S.gguf
```

---

## Test Scenario 1: Development Mode Launch

### Objective
Verify the Tauri app launches without errors and Python sidecar starts correctly.

### Steps

1. **Navigate to desktop app directory:**
   ```bash
   cd /Volumes/MacWork/VFX-BIDDING/vfx-bidding-desktop
   ```

2. **Launch in development mode:**
   ```bash
   npm run tauri:dev
   ```

3. **Observe console output:**

   **Expected to see:**
   - Vite dev server starting on port 1420
   - Cargo compiling Rust code (first time only)
   - Tauri window appearing
   - Python sidecar process spawning
   - No ERROR or FATAL messages

   **Good output indicators:**
   ```
   > vfx-bidding-desktop@0.1.0 tauri:dev
   > tauri dev
   
   VITE v6.0.3  ready in XXX ms

   ➜  Local:   http://localhost:1420/
   
   Running Tauri CLI...
   Finished dev profile [unoptimized] debuginfo] target(s) in X.XXs
   ```

4. **Check window appearance:**
   - Window should open at 1200x800 resolution
   - Title should read "VFX Bidding AI Assistant"
   - Window should be resizable
   - No visual glitches

### Expected Results Checklist
- [ ] Terminal shows no ERROR messages
- [ ] Vite server starts successfully
- [ ] Rust backend compiles without errors
- [ ] Window appears with correct title
- [ ] Window dimensions are 1200x800
- [ ] Window is resizable

### Troubleshooting

**Issue:** "Python not found" error  
**Solution:** Set VFX_PYTHON_PATH environment variable

**Issue:** "Model not found" error  
**Solution:** Set MODEL_PATH environment variable

**Issue:** Port 1420 already in use  
**Solution:**
```bash
# Kill process on port 1420
lsof -ti:1420 | xargs kill -9
```

**Issue:** Rust compilation fails  
**Solution:**
```bash
cd src-tauri
cargo clean
cargo build
```

---

## Test Scenario 2: Script Processing (Quick Generate)

### Objective
Test the complete pipeline: script → LLM analysis → Excel generation

### Prerequisites
- App must be launched successfully (Scenario 1)
- Test script available: `/Volumes/MacWork/VFX-BIDDING/Scripts/Tucker_and_Dale_vs_Evil_2010.pdf`

### Steps

1. **Launch app** (if not already running)

2. **Navigate to "Quick Generate" mode:**
   - Look for tab or button labeled "Quick Generate"
   - UI should show file drop zone or "Select Script" button

3. **Load test script:**
   - Drag and drop: `/Volumes/MacWork/VFX-BIDDING/Scripts/Tucker_and_Dale_vs_Evil_2010.pdf`
   - OR click "Select Script" and navigate to the file

4. **Monitor progress:**
   - Watch for progress indicators
   - Monitor console for log messages

5. **Expected console output:**
   ```
   Starting Python sidecar: /path/to/python rpc_server.py
   Processing script: /path/to/Tucker_and_Dale_vs_Evil_2010.pdf
   
   # Progress events (via stderr):
   {"event":"stage","data":{"stage":"init","message":"Initializing pipeline"}}
   {"event":"stage","data":{"stage":"parsing","message":"Parsing PDF script"}}
   {"event":"stage","data":{"stage":"analyzing","message":"Analyzing VFX requirements"}}
   {"event":"stage","data":{"stage":"generating","message":"Generating Excel bid"}}
   {"event":"stage","data":{"stage":"complete","message":"Pipeline complete"}}
   
   Generated bid: Tucker_and_Dale_vs_Evil_2010_vfx_bid_YYYY-MM-DD.xlsx
   ```

6. **Wait for completion:**
   - Expected processing time: 30-90 seconds
   - LLM inference is the longest step

7. **Verify output:**
   - Check project directory for generated Excel file
   - File should be named: `Tucker_and_Dale_vs_Evil_2010_vfx_bid_YYYY-MM-DD.xlsx`

### Expected Results Checklist
- [ ] File drop works (drag & drop or file picker)
- [ ] Progress events fire and display
- [ ] Processing completes without errors
- [ ] Excel file is created
- [ ] Excel file contains VFX breakdown data
- [ ] Total time is under 2 minutes

### Verification Commands

```bash
# Check if output file exists
ls -lh /Volumes/MacWork/VFX-BIDDING/Tucker_and_Dale_vs_Evil_2010_vfx_bid_*.xlsx

# Open Excel file to verify content
open /Volumes/MacWork/VFX-BIDDING/Tucker_and_Dale_vs_Evil_2010_vfx_bid_*.xlsx
```

### What to Check in Excel File
- Sheet with shot breakdown
- VFX types identified
- Cost estimates calculated
- Scene numbers mapped
- Complexity ratings assigned

### Troubleshooting

**Issue:** "Script parsing failed"  
**Solution:** Verify PDF is not password-protected or corrupted

**Issue:** "LLM timeout"  
**Solution:** 
- Check model file is accessible
- Increase timeout in Python config
- Verify sufficient RAM (8GB minimum)

**Issue:** "Excel generation failed"  
**Solution:**
- Check write permissions in output directory
- Verify openpyxl is installed: `pip install openpyxl`

---

## Test Scenario 3: Load Existing Bid

### Objective
Test loading and querying existing Excel bids

### Prerequisites
- App must be launched
- Demo bid available: `/Volumes/MacWork/VFX-BIDDING/Templates/DEMO_PROJECT_VFX_BID_2026-01-05.xlsx`

### Steps

1. **Navigate to "Load Existing Bid" mode:**
   - Click tab or button for loading bids
   - File picker dialog should appear

2. **Select demo bid:**
   - Navigate to: `/Volumes/MacWork/VFX-BIDDING/Templates/`
   - Select: `DEMO_PROJECT_VFX_BID_2026-01-05.xlsx`

3. **Monitor console output:**
   ```
   Loading bid: /path/to/DEMO_PROJECT_VFX_BID_2026-01-05.xlsx
   Bid loaded successfully: XX shots, $XXX,XXX total
   ```

4. **Verify bid data displays:**
   - Shot list should populate
   - Total cost should show
   - Scene breakdown should be available

### Expected Results Checklist
- [ ] File picker opens correctly
- [ ] Excel file loads without errors
- [ ] UI updates with bid data
- [ ] Shot count displays
- [ ] Total cost displays
- [ ] No console errors

### Troubleshooting

**Issue:** "Invalid Excel format"  
**Solution:** Verify Excel file has required sheets (Shots, Budget, etc.)

**Issue:** "Data loading failed"  
**Solution:** Check Excel file is not corrupted (open in Excel first)

---

## Test Scenario 4: Chat Commands

### Objective
Test natural language query interface

### Prerequisites
- App launched
- Bid loaded (either generated or existing)

### Steps

1. **Locate chat interface:**
   - Text input field
   - Chat history or response display area

2. **Test commands:**

   **Command 1: Show total cost**
   ```
   Input: show total cost
   Expected: Displays formatted currency total
   ```

   **Command 2: Show all shots**
   ```
   Input: show me all shots
   Expected: Lists all VFX shots with details
   ```

   **Command 3: Most expensive shot**
   ```
   Input: what's the most expensive shot?
   Expected: Identifies highest-cost shot
   ```

   **Command 4: Shots by scene**
   ```
   Input: show shots in scene 5
   Expected: Filters shots by scene number
   ```

   **Command 5: Complexity breakdown**
   ```
   Input: breakdown by complexity
   Expected: Groups shots by Low/Medium/High
   ```

3. **Monitor console:**
   ```
   Chat command received: show total cost
   Parsed action_type: query
   Query result: {"total_cost": XXXX}
   Response sent to frontend
   ```

### Expected Results Checklist
- [ ] Chat input accepts text
- [ ] Commands are parsed correctly
- [ ] Responses display in UI
- [ ] Query results are accurate
- [ ] No parsing errors

### Troubleshooting

**Issue:** "No bid loaded" error  
**Solution:** Load a bid first (Scenario 3)

**Issue:** "Unknown command"  
**Solution:** Check ChatProcessor NLP patterns in Python

---

## Test Scenario 5: Bid Queries

### Objective
Test structured bid data queries

### Prerequisites
- App launched
- Bid loaded

### Steps

1. **Access query interface:**
   - May be separate from chat
   - Or integrated as "Query" tab

2. **Test query types:**

   **Query 1: Total Cost**
   - Select "Total Cost" query type
   - Expected: Returns total bid amount

   **Query 2: Shots by Scene**
   - Select "Shots by Scene"
   - Enter scene number: 8
   - Expected: Returns shots in scene 8

   **Query 3: Shots by VFX Type**
   - Select "Shots by Type"
   - Enter VFX type: "CG Character"
   - Expected: Returns all character shots

   **Query 4: Complexity Breakdown**
   - Select "Complexity Breakdown"
   - Expected: Returns Low/Medium/High counts

   **Query 5: Most Expensive Shot**
   - Select "Most Expensive Shot"
   - Expected: Returns shot with highest cost

3. **Verify results display:**
   - Data should be formatted
   - Currency should be properly displayed
   - Lists should be readable

### Expected Results Checklist
- [ ] All query types work
- [ ] Results return accurate data
- [ ] Data is properly formatted
- [ ] No errors on missing data
- [ ] Query execution is fast (< 1 second)

---

## Test Scenario 6: Error Handling

### Objective
Verify app handles errors gracefully

### Steps

1. **Test invalid file type:**
   - Try to load a .txt file instead of PDF
   - Expected: Clear error message, no crash

2. **Test missing file:**
   - Try to load non-existent bid
   - Expected: "File not found" error

3. **Test malformed Excel:**
   - Try to load corrupted Excel file
   - Expected: "Invalid format" error

4. **Test empty chat:**
   - Send empty chat message
   - Expected: "No command provided" or ignored

5. **Test query without bid:**
   - Try to query before loading bid
   - Expected: "No bid loaded" error

### Expected Results Checklist
- [ ] All errors show user-friendly messages
- [ ] No crashes or uncaught exceptions
- [ ] Console logs errors appropriately
- [ ] App remains responsive after errors

---

## Performance Monitoring

### Key Metrics to Track

**Startup Performance:**
- [ ] App launch time: < 15 seconds
- [ ] Python sidecar spawn: < 3 seconds
- [ ] LLM model load: < 10 seconds

**Processing Performance:**
- [ ] Script parsing: < 5 seconds
- [ ] LLM inference: < 60 seconds
- [ ] Excel generation: < 3 seconds
- [ ] Total processing: < 90 seconds

**Query Performance:**
- [ ] Chat command response: < 2 seconds
- [ ] Bid query execution: < 1 second
- [ ] File load time: < 2 seconds

### Resource Usage

**Memory:**
- [ ] App baseline: < 200 MB
- [ ] With LLM loaded: < 8 GB
- [ ] No memory leaks during use

**CPU:**
- [ ] Idle: < 5%
- [ ] During LLM inference: 50-100% (expected)
- [ ] During queries: < 20%

---

## Known Limitations

1. **LLM Speed:** First inference is slower (model loading)
2. **Memory Usage:** Requires 8GB+ RAM for LLM
3. **Script Size:** Very long scripts (> 100 pages) may timeout
4. **PDF Format:** Some PDF formats may not parse correctly
5. **Excel Compatibility:** Requires .xlsx format (not .xls)

---

## Bug Reporting Template

If you find bugs, document them using this template:

```markdown
### Bug Report

**Summary:** Brief description

**Steps to Reproduce:**
1. Step 1
2. Step 2
3. Step 3

**Expected Behavior:** What should happen

**Actual Behavior:** What actually happened

**Console Output:**
```
Paste error messages here
```

**Environment:**
- macOS Version:
- Python Version:
- Node Version:
- Rust Version:

**Severity:** Critical / High / Medium / Low
```

---

## Test Completion Checklist

Before marking testing complete, verify:

- [ ] All 6 test scenarios completed
- [ ] All expected results met
- [ ] No critical bugs found
- [ ] Performance acceptable
- [ ] Error handling verified
- [ ] Documentation updated
- [ ] Bugs documented (if any)

---

## Next Steps After Testing

1. **If All Tests Pass:**
   - Mark as "Ready for Beta Testing"
   - Create user documentation
   - Prepare demo for stakeholders

2. **If Bugs Found:**
   - Triage by severity
   - Create GitHub issues
   - Assign fixes
   - Re-test after fixes

3. **If Performance Issues:**
   - Profile bottlenecks
   - Optimize critical paths
   - Consider caching strategies
   - Re-benchmark

---

**Happy Testing!** 🧪

For questions or issues, refer to:
- Main project docs: `/Volumes/MacWork/VFX-BIDDING/CLAUDE.md`
- Integration test report: `/Volumes/MacWork/VFX-BIDDING/vfx-bidding-desktop/TEST_REPORT.md`
- Python sidecar docs: `/Volumes/MacWork/VFX-BIDDING/python_sidecar/README.md`
