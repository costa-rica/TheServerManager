---
created_at: 2026-05-17
updated_at: 2026-05-17
created_by: claude (sonnet-4)
modified_by: claude (sonnet-4)
---

# Fix Log Location Configuration (20260517)

## Summary

Three related fixes to update MongoDB records and TSM web interface to use `/home/limited_user/logs/` instead of stale `/home/nick/logs/` paths:

1. **One-time MongoDB migration** - Update all `servicesArray[].pathToLogs` records from `/home/nick/logs/` to `/home/limited_user/logs/`
2. **Web default update** - Change hardcoded default in "Add Machine" modal from `/home/nick/logs/` to `/home/limited_user/logs/`
3. **Fix Edit modal usability** - Make services expanded by default so "Path to Logs" field is visible and editable

## Problem Statement

- Current MongoDB record (e.g., nws-go-lightly-prod GoLightly04API) has stale `pathToLogs: "/home/nick/logs/"` even though `machine.userHomeDir` is `/home/limited_user`
- ModalMachineAdd.tsx hardcodes old path `/home/nick/logs/` for new services
- ModalMachineEdit.tsx collapses services by default, hiding the "Path to Logs" field from users who expect it to be visible and editable

## Implementation Plan

### 1. Create MongoDB Migration Script

**File**: `scripts/update-logs-paths.js`

**Responsibilities**:
- Connect to MongoDB using `MONGODB_URI` from `.env`
- Query all Machine documents with `servicesArray.pathToLogs` containing `/home/nick/logs/`
- Support `--dry-run` flag to preview changes without applying
- Support `--apply` flag to commit changes (default is dry-run)
- Log detailed output: machines affected, services updated, before/after paths
- Include rollback guidance

**Safety Features**:
- Dry-run mode enabled by default (shows what would change)
- Explicit `--apply` flag required to modify database
- Count and display affected records before applying
- Exit with error codes on failure
- Timestamp backups (optional but recommended)

**Usage**:
```bash
cd api
npm run update-logs-paths -- --dry-run
npm run update-logs-paths -- --apply
```

**Key Implementation Details**:
- Use Mongoose or MongoDB driver to query: `servicesArray.pathToLogs: { $regex: "/home/nick/logs/" }`
- Update using: `Machine.updateMany()` or individual `findByIdAndUpdate()` with logging
- Replace exact pattern: `/home/nick/logs/` → `/home/limited_user/logs/`
- Log results: total machines, total services updated, errors if any
- Handle edge cases:
  - Empty servicesArray (skip)
  - Already-updated paths (no-op, but log)
  - Mixed paths in same service (update all occurrences)

**Verification Steps**:
1. Run in dry-run mode first
2. Review output for accuracy
3. Run with --apply if satisfied
4. Query database to confirm changes:
   ```javascript
   db.machines.find({ "servicesArray.pathToLogs": /\/home\/nick\/logs/ })
   // Should return empty after successful migration
   ```

**Rollback**:
- Reverse direction: `/home/limited_user/logs/` → `/home/nick/logs/`
- Keep a manual backup of pre-migration state for safety
- Document timestamp of migration in script output

---

### 2. Update ModalMachineAdd.tsx Defaults

**File**: `web/src/components/ui/modal/ModalMachineAdd.tsx`

**Changes**:
- Line 31: Replace `pathToLogs: "/home/nick/logs/",` → `pathToLogs: "/home/limited_user/logs/",`
- Line 60: Replace `pathToLogs: "/home/nick/logs/",` → `pathToLogs: "/home/limited_user/logs/",`
- Line 24: Replace `/home/nick` in nginxPaths default → `/home/limited_user` (for consistency)

**Rationale**:
- ModalMachineEdit.tsx already uses dynamic default from `machine.userHomeDir` (line 27-29), which is correct
- ModalMachineAdd.tsx should match this new user default
- Ensures new services are created with correct path from the start

**Testing**:
- Open "Add Machine" modal
- Verify default "Path to Logs" shows `/home/limited_user/logs/`
- Add a new service and confirm default is present

---

### 3. Fix ModalMachineEdit.tsx Service Visibility

**File**: `web/src/components/ui/modal/ModalMachineEdit.tsx`

**Problem**:
- Line 51-53: Existing services default to collapsed state
- "Path to Logs" field is inside `{expandedServices[index] && ...}` (line 359)
- Users cannot see or edit the field without expanding first

**Solution**:
- Change line 52 to expand first service by default: `machine.servicesArray.map((_, i) => i === 0)`
- Alternative approach (if preferred): Expand all services by default: `machine.servicesArray.map(() => true)`

**Recommended Change (line 51-54)**:
```typescript
const [expandedServices, setExpandedServices] = useState<boolean[]>(
  machine.servicesArray && machine.servicesArray.length > 0
    ? machine.servicesArray.map((_, i) => i === 0)  // First service expanded, rest collapsed
    : [true]
);
```

**Rationale**:
- First service is the most important - users expect to see and edit it immediately
- Remaining services collapsed to avoid overwhelming the UI with large forms
- Consistent with behavior for new empty service (line 53: `[true]`)

**Testing**:
1. Open Edit Machine modal
2. Existing services should show first one expanded with "Path to Logs" field visible
3. Click other service headers to expand/collapse
4. Verify "Path to Logs" field is fully editable and updates state correctly
5. Submit form and confirm changes persist

---

## Files to Modify

| File | Type | Changes |
|------|------|---------|
| `scripts/update-logs-paths.js` | NEW | MongoDB migration script with dry-run/apply modes |
| `web/src/components/ui/modal/ModalMachineAdd.tsx` | EDIT | Change hardcoded paths from `/home/nick/logs/` to `/home/limited_user/logs/` |
| `web/src/components/ui/modal/ModalMachineEdit.tsx` | EDIT | Change default expanded state for services (expand first service) |

## Execution Order

1. **Create MongoDB script** (no dependencies)
2. **Run dry-run** to identify affected records
3. **Run with --apply** after verification
4. **Update web defaults** (ModalMachineAdd.tsx)
5. **Fix Edit modal visibility** (ModalMachineEdit.tsx)
6. **Test full flow** - add new machine, edit existing machine

## Verification Checklist

- [ ] MongoDB script runs in dry-run mode without errors
- [ ] Dry-run output shows correct records to be updated
- [ ] MongoDB update applied successfully
- [ ] Database query confirms all `/home/nick/logs/` paths replaced
- [ ] ModalMachineAdd.tsx displays `/home/limited_user/logs/` default
- [ ] ModalMachineEdit.tsx expands first service by default
- [ ] "Path to Logs" field is visible and editable in Edit modal
- [ ] New service additions use correct default path
- [ ] Form submissions save changes correctly

## Rollback Plan

- **MongoDB**: Run script with `--apply` and reversed paths (nick → limited_user)
- **Web changes**: Git revert or manual restoration of original code
- **Timeline**: All changes are independent and can be rolled back individually

## Notes

- Do NOT modify `api/package-lock.json` or `api/.env-obe` per instructions
- Script should follow existing project patterns for error handling and logging
- ModalMachineEdit.tsx change is minimal and low-risk UI improvement
- API routes already support pathToLogs updates via PATCH /machines/:publicId
