# Frontend WebSocket Logging Summary

**Date**: 2026-01-24
**Purpose**: Track WebSocket connection lifecycle to understand dual connection pattern

---

## Logging Added

### 1. `frontend/src/shared/utils/websocket.ts` - WebSocketManager.connect()

**Purpose**: Track when WebSocket objects are created and their state transitions

**Log Markers**:
- 🔌 **[WS Client]**: WebSocket client operations
- ✅ **Success**: Connection successful
- ❌ **Error**: Connection error
- 👋 **Close**: Connection closed
- 🔄 **Reconnect**: Attempting reconnection

**Key Log Points**:
- Entry: When connect() is called with timestamp
- WebSocket creation: When `new WebSocket(url)` is instantiated
- readyState transitions: Log state at each event (CONNECTING=0, OPEN=1, CLOSING=2, CLOSED=3)
- Event handlers: onopen, onerror, onclose with detailed context
- Reconnection logic: When auto-reconnect triggers

**Example Output**:
```
🔌 [WS Client] connect() called at 2026-01-24T10:30:45.123Z
🔌 [WS Client] URL: ws://localhost:50080/api/v1/ws/documents?token=...
🔌 [WS Client] Auto-reconnect: true
🔌 [WS Client] Reconnect attempts so far: 0
🔌 [WS Client] Creating new WebSocket object...
🔌 [WS Client] WebSocket object created, initial readyState: 0 (0=CONNECTING)
```

### 2. `frontend/src/shared/utils/websocket.ts` - WebSocketFactory.createDocumentListConnection()

**Purpose**: Track when factory method is called and connection reuse decisions

**Log Markers**:
- 🏭 **[WS Factory]**: Factory operations
- ✅ **Success**: Factory decision successful
- ⚠️ **Warning**: Stale connection being closed

**Key Log Points**:
- Entry: When factory method is called with timestamp
- Connection map check: Whether existing connection found
- readyState check: State of existing connection
- Reuse decision: Whether to reuse existing or create new
- Stale connection cleanup: Closing old connections

**Example Output**:
```
🏭 [WS Factory] createDocumentListConnection() called at 2026-01-24T10:30:45.120Z
🏭 [WS Factory] Connection key: document-list
🏭 [WS Factory] URL: ws://localhost:50080/api/v1/ws/documents
🏭 [WS Factory] Existing connection found, readyState: 3 (3=CLOSED)
⚠️ [WS Factory] Closing stale connection (state=3) before creating new one
🏭 [WS Factory] Creating NEW WebSocketManager instance...
```

### 3. `frontend/src/features/documents/hooks/useDocumentListWebSocket.ts` - React Hook

**Purpose**: Track when useEffect fires and initiates connections

**Log Markers**:
- 🎣 **[WS Hook]**: React hook operations
- ✅ **Success**: Hook operation successful
- ❌ **Error**: Hook operation error
- ⏸️ **Skip**: Hook skipped execution
- ⚠️ **Warning**: Duplicate prevention triggered
- 🧹 **Cleanup**: useEffect cleanup function

**Key Log Points**:
- useEffect fire: When useEffect executes with timestamp
- Condition checks: enabled, isConnecting, wsRef state
- Skip reasons: Why execution was skipped
- Factory call: When createDocumentListConnection() is invoked
- Connect call: When ws.connect() is invoked
- Callbacks: onOpen, onError, onClose events
- Cleanup: When useEffect cleanup runs

**Example Output**:
```
🎣 [WS Hook] useEffect FIRED at 2026-01-24T10:30:45.115Z
🎣 [WS Hook] enabled: true
🎣 [WS Hook] isConnectingRef.current: false
🎣 [WS Hook] wsRef.current exists: false
🎣 [WS Hook] wsRef.current?.isConnected(): undefined
🎣 [WS Hook] Setting isConnectingRef.current = true
🎣 [WS Hook] Calling WebSocketFactory.createDocumentListConnection()...
```

---

## Expected Execution Flow (NORMAL)

```
1. 🎣 [WS Hook] useEffect FIRED
2. 🎣 [WS Hook] Calling WebSocketFactory.createDocumentListConnection()...
   ↓
3. 🏭 [WS Factory] createDocumentListConnection() called
4. 🏭 [WS Factory] No existing connection found
5. 🏭 [WS Factory] Creating NEW WebSocketManager instance...
   ↓
6. 🎣 [WS Hook] Calling ws.connect()...
   ↓
7. 🔌 [WS Client] connect() called
8. 🔌 [WS Client] Creating new WebSocket object...
9. 🔌 [WS Client] WebSocket object created, readyState: 0 (CONNECTING)
   ↓
10. ✅ [WS Client] WebSocket OPEN event fired
11. ✅ [WS Client] readyState: 1 (OPEN)
12. ✅ [WS Hook] onOpen callback fired - connection successful!
13. ✅ [WS Hook] Document list WebSocket connected
```

---

## Expected Pattern (CURRENT BUG - DUAL CONNECTION)

### First Connection Attempt (FAILS)
```
1. 🎣 [WS Hook] useEffect FIRED (first time)
2. 🏭 [WS Factory] createDocumentListConnection() called
3. 🔌 [WS Client] connect() called
4. 🔌 [WS Client] WebSocket object created, readyState: 0
   ↓
5. ❌ [WS Client] WebSocket ERROR event fired  ← First connection fails!
6. ❌ [WS Client] readyState: 3 (CLOSED)
7. 👋 [WS Client] WebSocket CLOSE event fired
8. 👋 [WS Client] Code: 1006, Reason: (empty), Clean: false
9. 🔄 [WS Client] Will attempt reconnect
   ↓
```

### Second Connection Attempt (SUCCEEDS - Auto-Reconnect)
```
10. 🔌 [WS Client] connect() called (reconnect attempt 1)
11. 🔌 [WS Client] Creating new WebSocket object...
12. 🔌 [WS Client] WebSocket object created, readyState: 0
    ↓
13. ✅ [WS Client] WebSocket OPEN event fired  ← Second connection succeeds!
14. ✅ [WS Hook] onOpen callback fired
15. ✅ [WS Hook] Document list WebSocket connected
```

### OR: Second Connection via Duplicate useEffect
```
1a. 🎣 [WS Hook] useEffect FIRED (second time)  ← React re-render?
2a. 🎣 [WS Hook] Calling WebSocketFactory.createDocumentListConnection()...
    ↓
3a. 🏭 [WS Factory] Existing connection found, readyState: 3 (CLOSED)
4a. ⚠️ [WS Factory] Closing stale connection before creating new one
5a. 🏭 [WS Factory] Creating NEW WebSocketManager instance...
    ↓
6a. 🔌 [WS Client] connect() called
7a. ✅ [WS Client] WebSocket OPEN event fired  ← New connection succeeds!
```

---

## What to Look For

### Scenario 1: Auto-Reconnect Causing Dual Connection
**Indicators**:
- Single useEffect fire (🎣)
- First connection fails with error (❌)
- Automatic reconnect triggers (🔄)
- Second connection succeeds (✅)

**Root Cause**: First connection closes before handshake completes (code 1006)

### Scenario 2: Duplicate useEffect Calls
**Indicators**:
- Multiple useEffect fires (🎣 appears twice)
- First connection succeeds initially but then gets replaced
- Factory finds existing connection with readyState 3 (CLOSED)
- New connection created

**Root Cause**: React component re-rendering, StrictMode double-render, or dependency array issues

### Scenario 3: Connection Reuse Working
**Indicators**:
- Multiple useEffect fires (🎣)
- Factory finds existing connection with readyState 0 or 1
- "Reusing existing connection" message (✅)
- No new WebSocket object created

**Expected Behavior**: This is the correct behavior when component re-renders

---

## How to Test

### 1. Open Browser Console
```
Navigate to: http://localhost:3003/documents
Open Developer Tools → Console tab
```

### 2. Filter Logs
```
Filter by: [WS Hook]    # See React hook behavior
Filter by: [WS Factory] # See connection reuse decisions
Filter by: [WS Client]  # See WebSocket lifecycle
```

### 3. Test Scenarios

**Scenario A: Fresh Page Load**
1. Hard refresh page (Ctrl+Shift+R)
2. Watch for sequence of logs
3. Count how many times useEffect fires
4. Count how many WebSocket objects created

**Scenario B: Navigation Away and Back**
1. Navigate to another page (e.g., /dashboard)
2. Watch for cleanup logs (🧹)
3. Navigate back to /documents
4. Watch for new connection sequence

**Scenario C: Network Error Simulation**
1. Disconnect network briefly
2. Watch for reconnection attempts
3. Restore network
4. Watch for successful reconnection

---

## Correlation with Backend Logs

**Frontend timestamp format**: `2026-01-24T10:30:45.123Z` (ISO 8601 with milliseconds)
**Backend timestamp format**: `2026-01-24 10:30:45,123` (Python logging format)

**Correlation Steps**:
1. Find frontend log: `🎣 [WS Hook] useEffect FIRED at <timestamp>`
2. Find corresponding backend log: `🔐 [WS AUTH] authenticate_websocket() dependency called`
3. Compare timestamps to match connection attempts
4. Identify which frontend attempt succeeded vs failed

---

## Next Steps Based on Findings

### If Auto-Reconnect is the Issue:
- First connection fails before handshake completes
- Backend rejects connection (code 1006)
- Need to investigate WHY backend closes connection prematurely
- **Fix**: Resolve backend authentication dependency bug (already identified)

### If Duplicate useEffect is the Issue:
- React StrictMode causing double-render in development
- Dependency array causing unnecessary re-renders
- Component lifecycle issue
- **Fix**: Adjust useEffect dependencies or add better duplicate prevention

### If Connection Reuse is Working:
- Multiple renders but connection properly reused
- This is expected behavior
- No fix needed

---

## Testing Checklist

- [ ] Fresh page load shows single connection attempt
- [ ] Hard refresh shows proper cleanup and new connection
- [ ] Navigation away triggers cleanup (🧹)
- [ ] Navigation back creates new connection
- [ ] Auto-reconnect works when network disconnected
- [ ] No duplicate WebSocket objects created unnecessarily
- [ ] Connection reuse works when useEffect fires multiple times

---

**Goal**: Identify whether dual connection is caused by:
1. Backend authentication bug (already identified)
2. Frontend React re-render issue
3. Auto-reconnect mechanism masking initial failure
4. Some combination of the above
