# Fix SST File Cache Error

## Problem
Turbopack cache error: "Unable to write SST file" or "Another write batch or compaction is already active"

## Solution

### Option 1: Manual Clean (Recommended)
1. **Stop the dev server** (Ctrl+C in terminal)
2. **Delete cache folders**:
   - Delete `.next` folder in `receivai/`
   - Delete `node_modules/.cache` if it exists
   - Delete `.turbo` folder if it exists
3. **Restart dev server**: `npm run dev`

### Option 2: PowerShell Script
Run this in PowerShell from the `receivai` directory:
```powershell
Remove-Item -Recurse -Force .next -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force node_modules\.cache -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force .turbo -ErrorAction SilentlyContinue
npm run dev
```

### Option 3: Fresh Start
If the error persists:
1. Stop dev server
2. Delete `.next`, `node_modules/.cache`, `.turbo`
3. Clear npm cache: `npm cache clean --force`
4. Reinstall: `npm install`
5. Restart: `npm run dev`

## Prevention
- The `.gitignore` file now includes cache directories
- Restart dev server if you see cache-related errors
- Clear cache before major updates
