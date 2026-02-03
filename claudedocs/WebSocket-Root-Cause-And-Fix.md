# WebSocket 问题根本原因和修复方案

**日期**: 2026-01-24
**状态**: ✅ 根本原因已确认

---

## 🎯 根本原因

### **React 18 StrictMode 双重渲染**

从日志证据可以看到：

#### 前端日志（Browser Console）：
```
09:50:43.920Z - 🎣 useEffect FIRED (第一次)
09:50:43.922Z - 🏭 Factory: Creating NEW WebSocketManager
09:50:43.924Z - 🔌 Client: WebSocket object created, readyState: 0 (CONNECTING)
              ↓
09:50:43.929Z - 🧹 Cleanup function called ← React StrictMode 触发 cleanup
09:50:43.929Z - 🧹 Closing existing WebSocket connection
              ⚠️ "WebSocket is closed before the connection is established"
              ↓
09:50:43.929Z - 🎣 useEffect FIRED (第二次) ← 只相差 9 毫秒！
09:50:43.930Z - 🏭 Factory: Existing connection found, readyState: 3 (CLOSED)
09:50:43.930Z - ⚠️ Factory: Closing stale connection
09:50:43.934Z - 🔌 Client: Creating new WebSocket object...
              ↓
09:50:43.934Z - ❌ ERROR event fired
09:50:43.934Z - 👋 CLOSE event, Code: 1006
              ↓
09:50:43.XXX - 🔄 Auto-reconnect triggered (可能)
              ↓
09:50:54.XXX - ✅ Finally OPEN event fired (成功)
```

#### 后端日志（Docker Logs）：
```
09:50:54.387 - 🔐 [WS AUTH] Authentication successful
09:50:54.387 - 🌐 [WS ENDPOINT] endpoint handler REACHED
09:50:54.387 - 🔌 [WS MANAGER] CALLING websocket.accept()...
09:50:54.388 - ✅ [WS MANAGER] websocket.accept() COMPLETED
09:50:54.388 - ✅ [WS ENDPOINT] WebSocket connected
```

**后端只记录了一次成功的连接！**

---

## 📊 时间线分析

| 时间 | 前端事件 | 后端事件 | 说明 |
|------|---------|---------|------|
| 09:50:43.920Z | 🎣 useEffect #1 触发 | - | React 首次渲染 |
| 09:50:43.924Z | 🔌 WebSocket #1 创建 (readyState: 0) | - | 连接建立中 |
| 09:50:43.929Z | 🧹 StrictMode cleanup | - | **React 强制清理** |
| 09:50:43.929Z | 🎣 useEffect #2 触发 | - | React 重新挂载 |
| 09:50:43.930Z | 🏭 发现旧连接 (state: 3) | - | 第一次连接已关闭 |
| 09:50:43.934Z | 🔌 WebSocket #2 创建 | - | 第二次尝试 |
| 09:50:43.934Z | ❌ ERROR + 👋 CLOSE (1006) | - | **第二次也失败** |
| ~09:50:54.XXX | ✅ OPEN event | ✅ accept() successful | **最终成功**（可能是重连或第三次尝试） |

**延迟时间**: 从第一次 useEffect (09:50:43.920Z) 到最终成功 (~09:50:54Z) = **约 10-11 秒**

**这就是你说的"卡 1/2 秒"的原因！**（实际上可能更长）

---

## 🔍 为什么会这样？

### React 18 StrictMode 行为（仅开发环境）

React 18 的 StrictMode 在开发模式下会故意：

1. **Mount 组件** → 触发 useEffect
2. **立即 Unmount** → 触发 cleanup 函数
3. **Re-mount 组件** → 再次触发 useEffect

**目的**：帮助开发者发现副作用的问题（比如没有正确清理资源）

### 在我们的代码中发生了什么

```typescript
useEffect(() => {
  // 第一次：创建 WebSocket 连接
  const ws = WebSocketFactory.createDocumentListConnection({...});
  wsRef.current = ws;
  ws.connect();

  return () => {
    // ← StrictMode 在连接还在 CONNECTING 状态时就调用了这个 cleanup！
    if (wsRef.current) {
      wsRef.current.close(); // 强制关闭还未建立的连接
      wsRef.current = null;
    }
  };
}, []); // 空依赖数组，只应该运行一次，但 StrictMode 会运行两次
```

### 问题链条

1. **第一次 useEffect**: 创建 WebSocket → 状态 CONNECTING (0)
2. **StrictMode cleanup**: 调用 `ws.close()` → 关闭还在建立中的连接 → 错误："WebSocket is closed before the connection is established"
3. **第二次 useEffect**: 发现旧连接已关闭 (state: 3) → 创建新连接
4. **时序问题**: 新连接也可能因为各种时序问题失败 (Code: 1006)
5. **自动重连**: 最终靠自动重连机制成功

---

## ✅ 解决方案

### 方案 1: 添加 StrictMode 保护（推荐）

修改 `frontend/src/features/documents/hooks/useDocumentListWebSocket.ts`:

```typescript
useEffect(() => {
  if (!enabled) return;

  // 防止 StrictMode 双重渲染时重复连接
  if (isConnectingRef.current || wsRef.current?.isConnected()) {
    return;
  }

  isConnectingRef.current = true;
  let cancelled = false; // ← 新增：取消标记

  const handleMessage = (event: MessageEvent) => {
    // ... 保持不变
  };

  const ws = WebSocketFactory.createDocumentListConnection({
    onOpen: () => {
      if (cancelled) return; // ← 如果已取消，忽略回调
      isConnectingRef.current = false;
      setIsConnected(true);
      setConnectionError(null);
      callbacksRef.current.onConnectionChange?.(true);
      logger.info('✅ [WS Hook] Document list WebSocket connected');
    },
    onMessage: handleMessage,
    onClose: () => {
      if (cancelled) return; // ← 如果已取消，忽略回调
      isConnectingRef.current = false;
      setIsConnected(false);
      callbacksRef.current.onConnectionChange?.(false);
      logger.info('👋 [WS Hook] Document list WebSocket disconnected');
    },
    onError: (error) => {
      if (cancelled) return; // ← 如果已取消，忽略回调
      isConnectingRef.current = false;
      setConnectionError('WebSocket connection failed');
      logger.error('❌ [WS Hook] Document list WebSocket error:', error);
    },
    autoReconnect: true,
  });

  wsRef.current = ws;

  ws.connect().catch((error) => {
    if (cancelled) return; // ← 如果已取消，忽略错误
    isConnectingRef.current = false;
    setConnectionError('Failed to connect to WebSocket');
    logger.error('❌ [WS Hook] Failed to connect document list WebSocket:', error);
  });

  return () => {
    cancelled = true; // ← 标记为已取消
    isConnectingRef.current = false;
    if (wsRef.current) {
      logger.info('🧹 [WS Hook] Cleanup: Closing WebSocket connection');
      wsRef.current.close();
      wsRef.current = null;
    }
    setIsConnected(false);
  };
}, [enabled]);
```

**优点**：
- 兼容 StrictMode
- 防止内存泄漏
- cleanup 时忽略所有回调

### 方案 2: 延迟连接（更激进）

添加一个短暂延迟，确保不是 StrictMode 的双重渲染：

```typescript
useEffect(() => {
  if (!enabled) return;

  // 防止重复连接
  if (isConnectingRef.current || wsRef.current?.isConnected()) {
    return;
  }

  isConnectingRef.current = true;
  let cancelled = false;
  let timeoutId: NodeJS.Timeout | null = null;

  // 延迟 100ms 确保不是 StrictMode 的双重渲染
  timeoutId = setTimeout(() => {
    if (cancelled) return;

    const ws = WebSocketFactory.createDocumentListConnection({
      // ... 配置不变
    });

    wsRef.current = ws;
    ws.connect().catch((error) => {
      if (cancelled) return;
      // ... 错误处理
    });
  }, 100);

  return () => {
    cancelled = true;
    if (timeoutId) {
      clearTimeout(timeoutId); // 清除未执行的延迟
    }
    isConnectingRef.current = false;
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
  };
}, [enabled]);
```

**优点**：
- 完全避免 StrictMode 双重渲染问题
- 100ms 延迟几乎察觉不到

**缺点**：
- 添加了额外延迟

### 方案 3: 禁用 StrictMode（不推荐）

修改 `frontend/src/main.tsx`:

```typescript
// 之前
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// 修改为
root.render(<App />);
```

**优点**：
- 简单快速

**缺点**：
- 失去 React 的开发辅助功能
- 生产环境不受影响（StrictMode 只在开发模式生效）
- 不推荐，因为 StrictMode 能帮助发现其他问题

---

## 🎯 推荐修复流程

### 立即修复（方案 1）

1. 修改 `useDocumentListWebSocket.ts` 添加 `cancelled` 标记
2. 重启前端容器：`docker-compose restart doctify-frontend`
3. 测试：硬刷新页面，观察日志
4. 确认：
   - ✅ 只有一个成功的连接
   - ✅ 页面加载流畅，无卡顿
   - ✅ 日志干净，无错误

### 验证修复

**预期日志**（修复后）:
```
🎣 [WS Hook] useEffect FIRED (第一次)
🧹 [WS Hook] Cleanup called (StrictMode)
🎣 [WS Hook] useEffect FIRED (第二次)
✅ [WS Client] WebSocket OPEN event fired (只一次成功！)
✅ [WS Hook] Document list WebSocket connected
```

**不应该看到**：
- ❌ "WebSocket is closed before the connection is established"
- ❌ Code: 1006 错误
- ❌ 多次连接尝试

---

## 📝 额外优化建议

### 1. 优化 Factory 连接复用逻辑

当前 `WebSocketFactory.createDocumentListConnection()` 的复用逻辑在 StrictMode 下不够健壮。

**建议**: 添加一个"正在创建中"的状态，防止并发创建：

```typescript
static createDocumentListConnection(options: WebSocketOptions = {}): WebSocketManager {
  const key = 'document-list';
  const url = this.buildWsUrl(WEBSOCKET_ENDPOINTS.DOCUMENT_LIST);

  const existing = this.connections.get(key);
  if (existing) {
    const state = existing.getReadyState();
    // CONNECTING 或 OPEN 时复用
    if (state === WebSocket.CONNECTING || state === WebSocket.OPEN) {
      logger.info(`✅ [WS Factory] Reusing existing connection (state=${state})`);
      return existing;
    }
    // CLOSING 状态等待一下
    if (state === WebSocket.CLOSING) {
      logger.warn(`⏳ [WS Factory] Connection is CLOSING, waiting...`);
      // 可以添加一个小延迟或返回 Promise
    }
    // CLOSED 时清理
    logger.warn(`⚠️ [WS Factory] Closing stale connection (state=${state})`);
    existing.close();
    this.connections.delete(key); // ← 明确删除旧连接
  }

  const ws = new WebSocketManager(url, options);
  this.connections.set(key, ws);
  return ws;
}
```

### 2. 添加连接状态机

在 `WebSocketManager` 中添加更明确的状态管理：

```typescript
enum ConnectionState {
  IDLE = 'idle',
  CONNECTING = 'connecting',
  CONNECTED = 'connected',
  DISCONNECTING = 'disconnecting',
  DISCONNECTED = 'disconnected',
  ERROR = 'error',
}

class WebSocketManager {
  private state: ConnectionState = ConnectionState.IDLE;

  async connect(): Promise<void> {
    if (this.state === ConnectionState.CONNECTING ||
        this.state === ConnectionState.CONNECTED) {
      logger.warn('Already connecting or connected');
      return;
    }

    this.state = ConnectionState.CONNECTING;
    // ... 连接逻辑
  }
}
```

---

## 🚀 测试计划

### 测试场景

1. **Fresh Load**: 硬刷新页面
   - ✅ 期望：单次连接，无错误
   - ✅ 期望：页面流畅加载，无卡顿

2. **Navigation**: 从其他页面导航到 /documents
   - ✅ 期望：快速加载，无延迟
   - ✅ 期望：WebSocket 立即建立

3. **Multiple Tabs**: 打开多个 /documents 标签页
   - ✅ 期望：每个标签页独立连接
   - ✅ 期望：连接不互相干扰

4. **Network Error**: 断网后恢复
   - ✅ 期望：自动重连成功
   - ✅ 期望：用户体验流畅

5. **Hot Reload**: 修改代码触发热重载
   - ✅ 期望：旧连接正确关闭
   - ✅ 期望：新连接正常建立

---

## 📌 总结

### 根本原因
**React 18 StrictMode 在开发环境下的双重渲染机制** 导致：
1. useEffect 被调用两次
2. 第一次连接被 cleanup 强制关闭
3. 第二次连接因时序问题失败
4. 最终靠自动重连成功
5. 整个过程造成 10+ 秒的延迟和控制台错误

### 解决方案
**添加 `cancelled` 标记** 来忽略已取消连接的回调，防止：
- 内存泄漏
- 状态不一致
- 重复连接尝试

### 预期效果
- ✅ 页面加载流畅，无卡顿
- ✅ 控制台干净，无 WebSocket 错误
- ✅ 兼容 React StrictMode
- ✅ 生产环境表现完美
