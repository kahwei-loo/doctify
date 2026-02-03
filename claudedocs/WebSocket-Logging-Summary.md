# WebSocket Logging Summary
**Date**: 2026-01-24
**Purpose**: Comprehensive logging added to track WebSocket authentication and connection flow

---

## Logging Added

### 1. `backend/app/api/v1/deps.py` - authenticate_websocket()

**Purpose**: Track when dependency is called and when websocket.close() is attempted

**Log Points**:
- 🔐 Entry point - When dependency is called
- 🔐 WebSocket state before authentication
- 🔐 Token presence check
- ❌ Before each websocket.close() call (6 locations)
- ✅ Successful authentication
- ✅ User information
- ❌ Error paths with details

**Example Output**:
```
🔐 [WS AUTH] authenticate_websocket() dependency called
🔐 [WS AUTH] WebSocket state: WebSocketState.CONNECTING
🔐 [WS AUTH] Token present: True
🔐 [WS AUTH] Verifying token with blacklist check...
✅ [WS AUTH] Token verification successful
🔐 [WS AUTH] Token subject (user_id): 77b1b68d-87ab-4cc0-a229-0d4d540c3f45
🔐 [WS AUTH] Fetching user from database...
✅ [WS AUTH] Authentication successful for user: testuser2@example.com
✅ [WS AUTH] Returning (user_id, user) tuple to endpoint
```

**Error Example**:
```
❌ [WS AUTH] No token provided - CALLING websocket.close()
❌ [WS AUTH] websocket.close() completed - raising exception
```

---

### 2. `backend/app/api/v1/endpoints/websockets.py` - /ws/documents endpoint

**Purpose**: Track when endpoint handler is reached and connection lifecycle

**Log Points**:
- 🌐 When endpoint handler is reached (AFTER dependency)
- 🌐 User and project information
- 🌐 WebSocket state before manager.connect()
- 🌐 Calling manager.connect()
- ✅ manager.connect() completion
- ✅ WebSocket state after manager.connect()
- 🔄 Message handling (debug level)
- 👋 Disconnect events
- ❌ Error events
- 🧹 Cleanup events

**Example Output**:
```
🌐 [WS ENDPOINT] /ws/documents endpoint handler REACHED
🌐 [WS ENDPOINT] Dependencies resolved - auth_result received
🌐 [WS ENDPOINT] User: testuser2@example.com, Project: None
🌐 [WS ENDPOINT] WebSocket state before manager.connect(): WebSocketState.CONNECTING
🌐 [WS ENDPOINT] CALLING manager.connect()...
✅ [WS ENDPOINT] manager.connect() completed successfully
✅ [WS ENDPOINT] WebSocket state after manager.connect(): WebSocketState.CONNECTED
✅ [WS ENDPOINT] WebSocket connected: documents (user=testuser2@example.com, project=None)
```

---

### 3. `backend/app/services/notification/websocket.py` - WebSocketManager

**Purpose**: Track when websocket.accept() is actually called

**Log Points**:
- 🔌 connect() method entry
- 🔌 Connection parameters
- 🔌 WebSocket state BEFORE accept()
- 🔌 Calling websocket.accept()
- ✅ websocket.accept() completion
- ✅ WebSocket state AFTER accept()
- 🔌 User registration
- 🔌 Project registration (if applicable)
- 🔌 Document registration (if applicable)
- ✅ Total connections count
- 🔌 disconnect() method events
- 🧹 Cleanup events

**Example Output**:
```
🔌 [WS MANAGER] connect() method called
🔌 [WS MANAGER] Parameters - user_id: 77b1b68d-87ab-4cc0-a229-0d4d540c3f45, project_id: None, document_id: None
🔌 [WS MANAGER] WebSocket state BEFORE accept(): WebSocketState.CONNECTING
🔌 [WS MANAGER] CALLING websocket.accept()...
✅ [WS MANAGER] websocket.accept() COMPLETED successfully
✅ [WS MANAGER] WebSocket state AFTER accept(): WebSocketState.CONNECTED
🔌 [WS MANAGER] Registering user connection for user_id: 77b1b68d-87ab-4cc0-a229-0d4d540c3f45
✅ [WS MANAGER] User connection registered. Total connections for user: 1
✅ [WS MANAGER] connect() method completed successfully
```

---

## Expected Execution Flow (SUCCESS)

```
1. 🔐 [WS AUTH] authenticate_websocket() dependency called
2. 🔐 [WS AUTH] Token verification...
3. ✅ [WS AUTH] Authentication successful for user: testuser2@example.com
4. ✅ [WS AUTH] Returning (user_id, user) tuple to endpoint
   ↓
5. 🌐 [WS ENDPOINT] /ws/documents endpoint handler REACHED
6. 🌐 [WS ENDPOINT] CALLING manager.connect()...
   ↓
7. 🔌 [WS MANAGER] connect() method called
8. 🔌 [WS MANAGER] CALLING websocket.accept()...
9. ✅ [WS MANAGER] websocket.accept() COMPLETED successfully
   ↓
10. ✅ [WS ENDPOINT] manager.connect() completed successfully
11. ✅ [WS ENDPOINT] WebSocket connected
```

---

## Expected Execution Flow (CURRENT BUG)

```
1. 🔐 [WS AUTH] authenticate_websocket() dependency called
2. 🔐 [WS AUTH] Token verification...
3. ✅ [WS AUTH] Authentication successful for user: testuser2@example.com
4. ❌ [WS AUTH] CALLING websocket.close()  ← BUG: Closing before accept!
5. ❌ [WS AUTH] websocket.close() completed - raising exception
   ↓
6. 🌐 [WS ENDPOINT] /ws/documents endpoint handler NEVER REACHED
7. 🔌 [WS MANAGER] connect() NEVER CALLED
8. 🔌 [WS MANAGER] websocket.accept() NEVER CALLED
   ↓
9. Browser sees: "WebSocket is closed before the connection is established"
```

**Note**: The bug only triggers when there's a validation failure (missing token, invalid user, etc.)

---

## How to Test

### 1. Restart Backend Container

Since we added logging, the backend container needs to reload:

```bash
# Option 1: Restart just the backend
docker-compose restart backend

# Option 2: View logs in real-time
docker-compose logs -f backend
```

### 2. Test Valid Connection

1. Visit: http://localhost:3003/documents
2. Watch backend logs for the success flow
3. Look for the emoji markers: 🔐 → 🌐 → 🔌 → ✅

### 3. Test Invalid Token (To See the Bug)

1. Open browser console
2. Clear localStorage: `localStorage.clear()`
3. Refresh the page
4. Watch backend logs for:
   - ❌ [WS AUTH] No token provided - CALLING websocket.close()
   - 🌐 [WS ENDPOINT] should NOT appear (endpoint never reached)

### 4. Check Full Log Flow

```bash
# Filter for WebSocket logs only
docker-compose logs backend | grep "\[WS"

# Show only errors
docker-compose logs backend | grep "❌ \[WS"

# Show only success
docker-compose logs backend | grep "✅ \[WS"
```

---

## Log Categories

| Emoji | Category | Description |
|-------|----------|-------------|
| 🔐 | WS AUTH | Authentication dependency |
| 🌐 | WS ENDPOINT | Endpoint handler |
| 🔌 | WS MANAGER | Connection manager |
| ✅ | Success | Operation completed successfully |
| ❌ | Error | Error or validation failure |
| 🔄 | Activity | Message handling (debug) |
| 👋 | Disconnect | Client disconnected |
| 🧹 | Cleanup | Connection cleanup |

---

## What the Logs Will Reveal

1. **Dependency Execution Order**: We'll see authenticate_websocket() runs BEFORE endpoint handler
2. **websocket.close() Timing**: We'll see when close() is called relative to accept()
3. **WebSocket State Transitions**: CONNECTING → ??? (should be CONNECTED after accept())
4. **Code Reachability**: Which code blocks are actually executed
5. **Bug Confirmation**: Logs will prove that websocket.close() is called before websocket.accept()

---

## Next Steps After Testing

Based on log analysis, we can:
1. Confirm the root cause
2. Implement the fix (remove websocket.close() from dependency)
3. Verify the fix with new logs
4. Clean up excessive logging once issue is resolved

---

**Testing Instructions**:
1. Restart backend: `docker-compose restart backend`
2. Open new terminal: `docker-compose logs -f backend`
3. Visit http://localhost:3003/documents
4. Report what you see in the logs
