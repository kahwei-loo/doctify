# WebSocket Investigation - Next Steps

**Date**: 2026-01-24
**Status**: Frontend logging added, awaiting rebuild to see new logs

---

## Summary of Investigation So Far

### ✅ Backend Investigation Complete

**Root Cause Identified**: In `backend/app/api/v1/deps.py`, the `authenticate_websocket()` dependency calls `await websocket.close()` at 6 locations BEFORE the WebSocket connection is accepted.

**Backend Logs Show**: Successful connection flow:
```
✅ [WS AUTH] Authentication successful for user: testuser2@example.com
✅ [WS AUTH] Returning (user_id, user) tuple to endpoint
🌐 [WS ENDPOINT] /ws/documents endpoint handler REACHED
🔌 [WS MANAGER] CALLING websocket.accept()...
INFO: WebSocket /api/v1/ws/documents [accepted]
✅ [WS MANAGER] websocket.accept() COMPLETED successfully
INFO: connection open
```

**No errors in backend!** Backend is working correctly.

### ⚠️ Frontend Shows Dual Connection Pattern

**Current Browser Console Shows**:
1. **First connection FAILS** (msgid 312-317):
   - "WebSocket is closed before the connection is established"
   - Code: 1006 (abnormal closure)

2. **Second connection SUCCEEDS** (msgid 319-340):
   - "WebSocket connected" ✅
   - Messages being received ✅

**Mystery**: Backend only logs ONE successful connection, but frontend shows TWO attempts.

---

## Frontend Logging Added (Awaiting Rebuild)

I've added detailed logging to 3 frontend files to track the connection lifecycle:

### 1. ✅ `frontend/src/shared/utils/websocket.ts`
- **WebSocketManager.connect()**: Logs WebSocket object creation and state transitions
- **WebSocketFactory.createDocumentListConnection()**: Logs connection reuse decisions

**New Log Markers**:
- 🔌 [WS Client] - WebSocket client operations
- 🏭 [WS Factory] - Factory operations
- ✅ Success, ❌ Error, 👋 Close, 🔄 Reconnect

### 2. ✅ `frontend/src/features/documents/hooks/useDocumentListWebSocket.ts`
- Logs when useEffect fires
- Logs connection creation flow
- Logs cleanup function execution

**New Log Markers**:
- 🎣 [WS Hook] - React hook operations
- 🧹 Cleanup

### 3. ✅ `claudedocs/Frontend-WebSocket-Logging-Summary.md`
- Documentation of expected log patterns
- How to correlate frontend and backend logs
- What to look for in different scenarios

---

## Required Next Steps

### Step 1: Rebuild Frontend with New Logging

The frontend Docker container needs to be restarted to pick up the new logging code:

```bash
# Option 1: Restart just the frontend container
docker-compose restart doctify-frontend

# Option 2: Rebuild if restart doesn't work
docker-compose up -d --build doctify-frontend

# Option 3: Full rebuild (if needed)
docker-compose down
docker-compose up -d --build
```

### Step 2: Test and Capture New Logs

Once frontend is rebuilt:

1. **Hard refresh the page** (Ctrl+Shift+R or Cmd+Shift+R)
2. **Watch browser console** for new emoji markers:
   - 🎣 [WS Hook] useEffect FIRED
   - 🏭 [WS Factory] createDocumentListConnection() called
   - 🔌 [WS Client] connect() called
   - ✅/❌ Connection result

3. **Count the sequence**:
   - How many times does useEffect fire? (should be once)
   - How many WebSocket objects are created? (should be one)
   - Does first connection fail immediately?
   - Does auto-reconnect create second connection?

### Step 3: Correlate Frontend and Backend Logs

**Frontend Log Example** (expected after rebuild):
```
🎣 [WS Hook] useEffect FIRED at 2026-01-24T10:30:45.115Z
🏭 [WS Factory] createDocumentListConnection() called at 2026-01-24T10:30:45.120Z
🔌 [WS Client] connect() called at 2026-01-24T10:30:45.123Z
🔌 [WS Client] WebSocket object created, readyState: 0 (CONNECTING)
```

**Backend Log** (existing):
```
INFO: 127.0.0.1:xxxxx - "WebSocket /api/v1/ws/documents" [accepted]
🔐 [WS AUTH] authenticate_websocket() dependency called
✅ [WS AUTH] Authentication successful
🌐 [WS ENDPOINT] endpoint handler REACHED
🔌 [WS MANAGER] CALLING websocket.accept()...
```

**Compare timestamps** to match frontend connection attempts with backend processing.

---

## Three Possible Scenarios

### Scenario A: Auto-Reconnect (Most Likely)

**Expected Frontend Log Pattern**:
```
🎣 [WS Hook] useEffect FIRED (once)
🔌 [WS Client] connect() called (attempt 1)
🔌 [WS Client] WebSocket object created, readyState: 0
❌ [WS Client] WebSocket ERROR event fired
👋 [WS Client] WebSocket CLOSE event, Code: 1006
🔄 [WS Client] Will attempt reconnect (attempt 1/5)
🔌 [WS Client] connect() called (attempt 2)  ← Auto-reconnect
✅ [WS Client] WebSocket OPEN event fired
```

**Diagnosis**: First connection closes before handshake, auto-reconnect creates second connection.

**Root Cause**: Backend authentication dependency bug (already identified).

**Fix**: Remove `websocket.close()` calls from `authenticate_websocket()` dependency.

### Scenario B: React Duplicate Render

**Expected Frontend Log Pattern**:
```
🎣 [WS Hook] useEffect FIRED (first time)
🔌 [WS Client] connect() called
🔌 [WS Client] WebSocket object created
❌ [WS Client] ERROR or immediate close
🎣 [WS Hook] useEffect FIRED (second time)  ← Duplicate render
🏭 [WS Factory] Existing connection found, readyState: 3 (CLOSED)
⚠️ [WS Factory] Closing stale connection
🏭 [WS Factory] Creating NEW WebSocketManager
✅ [WS Client] WebSocket OPEN event fired
```

**Diagnosis**: React component re-rendering causing duplicate connection attempts.

**Possible Causes**:
- React StrictMode double-render in development
- Component state change triggering re-render
- Dependency array issue in useEffect

**Fix**: Adjust useEffect dependencies or add better duplicate prevention.

### Scenario C: Race Condition

**Expected Frontend Log Pattern**:
```
🎣 [WS Hook] useEffect FIRED
🏭 [WS Factory] createDocumentListConnection() called
🔌 [WS Client] connect() called
🔌 [WS Client] WebSocket object created
[Some delay or async issue]
🔌 [WS Client] Another connect() called before first completes
```

**Diagnosis**: Timing issue causing multiple connection attempts.

---

## What I Need from You

### Immediate Actions:

1. **Rebuild frontend** to get new logging:
   ```bash
   docker-compose restart doctify-frontend
   # Wait for rebuild (watch logs: docker-compose logs -f doctify-frontend)
   ```

2. **Hard refresh browser** (Ctrl+Shift+R) after frontend rebuilds

3. **Share the new console logs** with emoji markers (🎣, 🏭, 🔌)

4. **Share backend logs** for the same time period to correlate:
   ```bash
   docker-compose logs --tail=50 doctify-backend | grep "\[WS"
   ```

### Information Needed:

- **How many times does `🎣 [WS Hook] useEffect FIRED` appear?** (Should be 1, if it's 2+ then React is re-rendering)
- **How many times does `🔌 [WS Client] connect() called` appear?** (Should be 1, if it's 2+ then multiple connections are being created)
- **Does first connection show ERROR (❌) or CLOSE (👋) immediately?**
- **What are the exact timestamps** of frontend logs and backend logs?

---

## Expected Resolution Path

Once we have the new logs, we'll know:

1. **If auto-reconnect is the issue** → Fix backend authentication bug (remove premature close() calls)
2. **If React re-render is the issue** → Fix useEffect dependencies or add better duplicate prevention
3. **If both are issues** → Fix both problems

---

## Files Modified

### Backend (Already Has Logging):
- ✅ `backend/app/api/v1/deps.py`
- ✅ `backend/app/api/v1/endpoints/websockets.py`
- ✅ `backend/app/services/notification/websocket.py`

### Frontend (New Logging Added, Needs Rebuild):
- ✅ `frontend/src/shared/utils/websocket.ts` (2 functions modified)
- ✅ `frontend/src/features/documents/hooks/useDocumentListWebSocket.ts`

### Documentation Created:
- ✅ `claudedocs/WebSocket-Logging-Summary.md` (Backend)
- ✅ `claudedocs/Frontend-WebSocket-Logging-Summary.md` (Frontend)
- ✅ `claudedocs/WebSocket-Investigation-Next-Steps.md` (This file)

---

## Current Status

**Backend**: ✅ Fully instrumented with logging, no errors detected
**Frontend**: ⚠️ Logging code added but not yet visible (needs rebuild)
**Root Cause**: 🔍 Partially identified (backend bug), frontend investigation pending new logs

**Next Blocker**: Frontend rebuild required to see new emoji-marked logs
