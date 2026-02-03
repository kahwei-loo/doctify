# WebSocket Investigation Report
**Date**: 2026-01-24
**Role**: Senior Frontend Developer
**Scope**: WebSocket connection issues on /documents and /chat pages

---

## Issues Reported by User

1. **WebSocket errors on /documents page**: `WebSocket is closed before the connection is established`
2. **"conversations.map is not a function" on /chat page**: API returning invalid data structure

---

## Investigation Summary

### Issue 1: conversations.map Error (Chat Page)
**Status**: ✅ ALREADY FIXED (by previous backend changes)

**Root Cause**: Backend `chat_service.py` was passing entity objects instead of dictionaries to `repository.create()`

**Resolution**: Fixed in previous session by modifying `backend/app/services/chat/chat_service.py` to pass dictionaries

**Verification**: Chat page loads successfully with conversation list displayed

### Issue 2: WebSocket Connection Failures
**Status**: ✅ FIXED

**Root Cause Analysis**:
Three interconnected issues were identified and resolved:

#### Problem 1: React useEffect Dependency Array Bug
**Location**: `frontend/src/features/documents/hooks/useDocumentListWebSocket.ts`

**Issue**: useEffect included `connect` and `disconnect` functions in dependency array, causing reconnection loops when callbacks changed

**Fix**: Changed dependency array to only include `enabled` flag

**Code Before**:
```typescript
useEffect(() => {
  connect();
  return () => disconnect();
}, [connect, disconnect]); // ❌ BUG: These change frequently!
```

**Code After**:
```typescript
useEffect(() => {
  // ... connection logic
}, [enabled]); // ✅ Only reconnect when enabled changes
```

#### Problem 2: Stale Closure in Event Handlers
**Location**: `frontend/src/features/documents/hooks/useDocumentListWebSocket.ts`

**Issue**: `handleMessage` function was created with useCallback, capturing stale references to callbacks

**Fix**: Moved `handleMessage` function definition inside useEffect to access current `callbacksRef`

**Pattern Applied**:
```typescript
// Store callbacks in refs to avoid stale closures
const callbacksRef = useRef({ onDocumentUpdate, onDocumentProgress, ... });

// Update ref when callbacks change
useEffect(() => {
  callbacksRef.current = { onDocumentUpdate, onDocumentProgress, ... };
}, [onDocumentUpdate, onDocumentProgress, ...]);

// Define handler inside useEffect using callbacksRef
useEffect(() => {
  const handleMessage = (event: MessageEvent) => {
    // Use callbacksRef.current to access latest callbacks
    callbacksRef.current.onDocumentUpdate?.(data);
  };
  // ... create WebSocket with handleMessage
}, [enabled]);
```

#### Problem 3: Premature Connection Closure (Root Cause)
**Location**: `frontend/src/shared/utils/websocket.ts` - WebSocketFactory

**Issue**: Factory was immediately closing existing WebSocket connections even if they were still CONNECTING (during handshake)

**Code Before**:
```typescript
static createDocumentListConnection(options: WebSocketOptions = {}): WebSocketManager {
  const key = 'document-list';

  // ❌ BUG: Closes connection even during CONNECTING state
  if (this.connections.has(key)) {
    this.connections.get(key)?.close();
  }

  const ws = new WebSocketManager(url, options);
  this.connections.set(key, ws);
  return ws;
}
```

**Code After**:
```typescript
static createDocumentListConnection(options: WebSocketOptions = {}): WebSocketManager {
  const key = 'document-list';
  const url = this.buildWsUrl(WEBSOCKET_ENDPOINTS.DOCUMENT_LIST);

  // ✅ FIX: Reuse connection if still CONNECTING or OPEN
  const existing = this.connections.get(key);
  if (existing) {
    const state = existing.getReadyState();
    if (state === WebSocket.CONNECTING || state === WebSocket.OPEN) {
      logger.debug('Reusing existing document list WebSocket connection');
      return existing;
    }
    // Only close if CLOSING or CLOSED
    existing.close();
  }

  const ws = new WebSocketManager(url, options);
  this.connections.set(key, ws);
  return ws;
}
```

#### Problem 4: Connection Guard Not Resetting
**Location**: `frontend/src/features/documents/hooks/useDocumentListWebSocket.ts`

**Issue**: `isConnectingRef` flag was set to `true` but never reset, preventing reconnection attempts

**Fix**: Reset `isConnectingRef` in all WebSocket event handlers

**Code Applied**:
```typescript
const ws = WebSocketFactory.createDocumentListConnection({
  onOpen: () => {
    isConnectingRef.current = false; // ✅ Reset on success
    // ... other onOpen logic
  },
  onClose: () => {
    isConnectingRef.current = false; // ✅ Reset to allow reconnection
    // ... other onClose logic
  },
  onError: () => {
    isConnectingRef.current = false; // ✅ Reset to allow retry
    // ... other onError logic
  },
});

// Cleanup also resets
return () => {
  isConnectingRef.current = false; // ✅ Reset on unmount
  // ... cleanup logic
};
```

---

## Files Modified

### 1. `frontend/src/features/documents/hooks/useDocumentListWebSocket.ts`
**Changes**:
- Fixed useEffect dependency array (line 190)
- Moved `handleMessage` inside useEffect to avoid stale closures (lines 118-154)
- Added `isConnectingRef` guard with proper reset logic (lines 84, 158, 165, 170, 179, 189)
- Applied same pattern to `useDocumentProgressWebSocket` hook

### 2. `frontend/src/shared/utils/websocket.ts`
**Changes**:
- Modified `createDocumentListConnection()` to reuse existing connections (lines 269-286)
- Modified `createDocumentStatusConnection()` to reuse existing connections (lines 252-267)
- Modified `createNotificationConnection()` to reuse existing connections (lines 286-302)

---

## Testing Results

### /documents Page
**Before**:
- ❌ WebSocket connection errors: "WebSocket is closed before the connection is established"
- ❌ React Hook ordering errors causing page crashes

**After**:
- ✅ WebSocket successfully connects
- ✅ Page renders without errors
- ✅ Connection indicator shows "Live"
- ✅ Auto-reconnect working correctly

**Backend Logs**:
```
INFO: WebSocket /api/v1/ws/documents?token=... [accepted]
INFO: WebSocket connected: documents (user=testuser2@example.com, project=None)
INFO: connection open
```

**Frontend Console**:
```
[WS] WebSocket connected: ws://localhost:50080/api/v1/ws/documents?token=...
[WS Hook] Document list WebSocket connected
```

### /chat Page
**Before**:
- ❌ "conversations.map is not a function" error
- ❌ WebSocket connection errors

**After**:
- ✅ Conversations list displayed correctly
- ✅ Chat WebSocket connected
- ✅ Connection indicator shows "● Connected"
- ✅ No console errors

**Frontend Console**:
```
Chat WebSocket connected
```

---

## Technical Patterns Applied

### 1. React Hook Dependency Management
- ✅ Minimal dependency arrays (only state/props that should trigger re-execution)
- ✅ Use `useRef` for callback storage to avoid dependency chain
- ✅ Separate `useEffect` for updating refs vs. connection logic

### 2. WebSocket Connection Lifecycle
- ✅ Check connection state before closing
- ✅ Reuse existing connections when appropriate
- ✅ Proper cleanup in useEffect return function
- ✅ Reset connection guards in all event handlers

### 3. Stale Closure Prevention
- ✅ Define event handlers inside useEffect
- ✅ Use `useRef` for callback references
- ✅ Access current values via `.current` property

---

## Lessons Learned

1. **React useCallback can cause reconnection loops**: When callback dependencies change, useEffect sees new function references and re-runs
2. **WebSocket Factory pattern needs state awareness**: Don't blindly close connections; check readyState first
3. **Connection guards must be reset**: Flags like `isConnecting` must be reset in ALL code paths (success, failure, cleanup)
4. **Stale closures are subtle**: Event handlers defined outside useEffect can capture old state/props

---

## Remaining Issues

**None** - All critical WebSocket issues resolved:
- ✅ Document list WebSocket connecting successfully
- ✅ Document progress WebSocket pattern fixed
- ✅ Chat WebSocket connecting successfully
- ✅ Auto-reconnect mechanism working correctly
- ✅ No React Hook ordering errors
- ✅ No "conversations.map" errors

---

## Recommendations

### Short-term
1. ✅ **COMPLETED**: Fix all WebSocket factory methods to reuse connections
2. ✅ **COMPLETED**: Fix all WebSocket hooks to avoid stale closures
3. Monitor WebSocket connection stability in development

### Long-term
1. Consider WebSocket connection pooling strategy for multiple concurrent connections
2. Add connection health monitoring with metrics
3. Implement connection recovery strategies for network failures
4. Add WebSocket connection debugging tools for development

---

**Investigation Conducted By**: Claude Code (Senior Frontend Developer Role)
**Investigation Date**: 2026-01-24
**Investigation Duration**: ~2 hours
**Test Environment**: Docker Development (docker-compose.yml)
**Test Tools**: MCP Chrome DevTools, Backend Logs Analysis, Code Review
