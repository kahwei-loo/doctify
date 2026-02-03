### New console messages
- [ERROR] Failed to load resource: the server responded with a status of 500 (Internal Server Error) @...
- Failed to fetch dynamically imported module: http://localhost:3003/src/pages/ChatPage.tsx?t=17691647...
- [ERROR] Error handled by React Router default ErrorBoundary: TypeError: Failed to fetch dynamically ...
- [ERROR] Error handled by React Router default ErrorBoundary: TypeError: Failed to fetch dynamically ...
- Failed to fetch dynamically imported module: http://localhost:3003/src/pages/ChatPage.tsx?t=17691647...
- [ERROR] Error handled by React Router default ErrorBoundary: TypeError: Failed to fetch dynamically ...
- [ERROR] Error handled by React Router default ErrorBoundary: TypeError: Failed to fetch dynamically ...
- [ERROR] The above error occurred in one of your React components:

    at Lazy
    at Suspense
    a...
- [ERROR] React Router caught the following error during render TypeError: Failed to fetch dynamically...

### Page state
- Page URL: http://localhost:3003/chat
- Page Title: Doctify - AI Document Processing
- Page Snapshot:
```yaml
- generic [active] [ref=e1]:
  - generic [ref=e7]:
    - heading "Unexpected Application Error!" [level=2] [ref=e8]
    - 'heading "Failed to fetch dynamically imported module: http://localhost:3003/src/pages/ChatPage.tsx?t=1769164795004" [level=3] [ref=e9]'
    - generic [ref=e10]: "TypeError: Failed to fetch dynamically imported module: http://localhost:3003/src/pages/ChatPage.tsx?t=1769164795004"
    - paragraph [ref=e11]: 💿 Hey developer 👋
    - paragraph [ref=e12]:
      - text: You can provide a way better UX than this when your app throws errors by providing your own
      - code [ref=e13]: ErrorBoundary
      - text: or
      - code [ref=e14]: errorElement
      - text: prop on your route.
  - generic [ref=e17]:
    - generic [ref=e18]: "[plugin:vite:import-analysis] Failed to resolve import \"@/shared/components/ui/card\" from \"src/features/chat/components/ChatWindow.tsx\". Does the file exist?"
    - generic [ref=e19]: /app/src/features/chat/components/ChatWindow.tsx:10:57
    - generic [ref=e20]: "18 | import { useState, useEffect, useRef } from \"react\"; 19 | import { Send, Loader2 } from \"lucide-react\"; 20 | import { Card, CardContent, CardHeader, CardTitle } from \"@/shared/components/ui/card\"; | ^ 21 | import { Button } from \"@/shared/components/ui/button\"; 22 | import { Textarea } from \"@/shared/components/ui/textarea\";"
    - generic [ref=e21]: at TransformPluginContext._formatError (file:///app/node_modules/vite/dist/node/chunks/dep-BK3b2jBa.js:49258:41) at TransformPluginContext.error (file:///app/node_modules/vite/dist/node/chunks/dep-BK3b2jBa.js:49253:16) at normalizeUrl (file:///app/node_modules/vite/dist/node/chunks/dep-BK3b2jBa.js:64307:23) at process.processTicksAndRejections (node:internal/process/task_queues:95:5) at async file:///app/node_modules/vite/dist/node/chunks/dep-BK3b2jBa.js:64439:39 at async Promise.all (index 5) at async TransformPluginContext.transform (file:///app/node_modules/vite/dist/node/chunks/dep-BK3b2jBa.js:64366:7) at async PluginContainer.transform (file:///app/node_modules/vite/dist/node/chunks/dep-BK3b2jBa.js:49099:18) at async loadAndTransform (file:///app/node_modules/vite/dist/node/chunks/dep-BK3b2jBa.js:51978:27) at async viteTransformMiddleware (file:///app/node_modules/vite/dist/node/chunks/dep-BK3b2jBa.js:62106:24
    - generic [ref=e22]:
      - text: Click outside, press Esc key, or fix the code to dismiss.
      - text: You can also disable this overlay by setting
      - code [ref=e23]: server.hmr.overlay
      - text: to
      - code [ref=e24]: "false"
      - text: in
      - code [ref=e25]: vite.config.ts
      - text: .
```
