# Phase 2 Enhancement & Integration - Task Breakdown

**文档版本**: 1.1
**创建日期**: 2026-01-27
**最后更新**: 2026-01-27 (Sprint 1 完成后补充 Q2 规划)
**基于**: Product-Analysis-Report-2026-01-27.md
**总工期**: 8周 (Q1 Sprint 1-3 + Q2规划)
**总工作量**: 146.5-209.5小时 (约18-26个工作日)

---

## 执行摘要

### 项目范围

Phase 2 聚焦于三大目标：
1. **P0 技术债务清理**: 修复关键问题，集成错误追踪
2. **P1 国际化与质量**: i18n支持、可访问性、测试覆盖率
3. **P2 用户体验增强**: 用户引导、移动端优化、性能监控

### 优先级分布

| 优先级 | 工作量 | 主要内容 |
|--------|--------|----------|
| **P0 (Critical)** | 44.5-66.5小时 | README修复、技术债务清理、Sentry集成 |
| **P1 (Important)** | 56-82小时 | i18n、可访问性、测试覆盖率、API集成 |
| **P2 (Nice-to-have)** | 46-61小时 | 用户引导、移动端、性能监控、反馈机制 |

### 关键里程碑

```
Q1 Sprint 1 End (Week 2): P0任务全部完成，生产环境稳定性保障
Q1 Sprint 2 End (Week 4): i18n基础完成，可访问性审计通过
Q1 Sprint 3 End (Week 6): 测试覆盖率≥70%，用户引导流程上线
Q2 开始 (Week 7+): 团队协作、计费系统、SSO集成
```

### 风险与依赖

- **最大风险**: 技术债务清理涉及20+ TODO，需要逐个评估影响
- **外部依赖**: Sentry账号、i18n翻译资源
- **缓解策略**: 优先处理影响用户的TODO，低优先级TODO可延后

---

## Q1 Sprint 1: P0 Critical Issues (Week 1-2)

**目标**: 修复所有P0级别问题，确保生产环境稳定性

**总工作量**: 44.5-66.5小时 (5.5-8天 full-time)

### Task 1.1: README文档修复 (0.5小时)

**Task 1.1.1: 架构图修正** (0.5小时)
- [ ] 打开 `README.md` 第59-72行
- [ ] 将 "MongoDB" 修改为 "PostgreSQL"
- [ ] 更新架构图中的数据库连接描述
- [ ] 验证其他技术栈描述的准确性

```markdown
# 修改前 (错误)
│   Backend   │─────▶│   MongoDB   │

# 修改后 (正确)
│   Backend   │─────▶│ PostgreSQL  │
│             │      │ + pgvector  │
```

**文件位置**: `README.md`
**验证**: README中技术栈描述与CLAUDE.md一致

---

### Task 1.2: Sentry错误追踪集成 (4-6小时)

**Task 1.2.1: Sentry SDK安装与配置** (2-3小时)
- [ ] 安装 `@sentry/react` 和 `@sentry/browser` 依赖
- [ ] 创建 Sentry项目并获取DSN
- [ ] 配置环境变量 `VITE_SENTRY_DSN`
- [ ] 在 `main.tsx` 中初始化Sentry SDK
- [ ] 配置Source Maps上传

```typescript
// frontend/src/main.tsx
import * as Sentry from "@sentry/react";

Sentry.init({
  dsn: import.meta.env.VITE_SENTRY_DSN,
  integrations: [
    Sentry.browserTracingIntegration(),
    Sentry.replayIntegration(),
  ],
  tracesSampleRate: 1.0,
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,
  environment: import.meta.env.MODE,
});
```

**Task 1.2.2: 错误边界集成** (1-2小时)
- [ ] 更新 `App.tsx` 中的ErrorBoundary使用Sentry
- [ ] 配置错误上报中的用户上下文
- [ ] 添加自定义错误标签 (页面、功能模块)
- [ ] 测试错误上报功能

```typescript
// frontend/src/App.tsx
import * as Sentry from "@sentry/react";

// 替换现有ErrorBoundary
<Sentry.ErrorBoundary
  fallback={<ErrorFallback />}
  onError={(error, componentStack) => {
    Sentry.captureException(error, {
      extra: { componentStack }
    });
  }}
>
  <App />
</Sentry.ErrorBoundary>
```

**Task 1.2.3: 性能监控配置** (1小时)
- [ ] 启用Performance Monitoring
- [ ] 配置Transaction采样率
- [ ] 添加自定义Span (API调用、页面渲染)
- [ ] 验证Sentry Dashboard数据

**文件位置**:
- `frontend/src/main.tsx`
- `frontend/src/App.tsx`
- `frontend/.env` (新增VITE_SENTRY_DSN)

**验证**: 故意触发错误，确认Sentry Dashboard收到报告

---

### Task 1.3: 技术债务清理 - 关键TODO (40-60小时)

根据产品分析报告，20+ TODO分为以下优先级处理：

#### 1.3.1: Celery任务触发 (8-12小时)

**Task 1.3.1.1: 文档处理Celery任务** (4-6小时)
- [ ] 实现 `backend/app/api/v1/endpoints/documents.py:137` - 上传后触发Celery OCR任务
- [ ] 创建 `tasks/document_processing.py` - 文档处理任务定义
- [ ] 添加任务状态追踪 (pending, processing, completed, failed)
- [ ] 实现WebSocket状态推送

```python
# backend/app/tasks/document_processing.py
from celery import shared_task
from app.services.ocr.orchestrator import OCROrchestrator

@shared_task(bind=True, max_retries=3)
def process_document_task(self, document_id: str):
    """异步处理文档OCR"""
    try:
        orchestrator = OCROrchestrator()
        result = orchestrator.process(document_id)
        return {"status": "completed", "result": result}
    except Exception as exc:
        self.retry(exc=exc, countdown=60)
```

**Task 1.3.1.2: 数据源Celery任务** (4-6小时)
- [ ] 实现 `backend/app/api/v1/endpoints/data_sources.py:549` - 网站爬虫任务
- [ ] 实现 `backend/app/api/v1/endpoints/data_sources.py:635` - 任务状态检查
- [ ] 创建 `tasks/crawler.py` - 爬虫任务定义
- [ ] 添加爬虫进度追踪

#### 1.3.2: Embedding生成任务 (6-8小时)

**Task 1.3.2.1: Embedding Celery任务** (4-6小时)
- [ ] 实现 `backend/app/api/v1/endpoints/embeddings.py:107` - 触发向量化任务
- [ ] 创建批量处理逻辑 (chunk_size=100)
- [ ] 添加进度回调 (processed/total)
- [ ] 实现失败重试机制

**Task 1.3.2.2: Repository过滤方法** (2小时)
- [ ] 实现 `backend/app/api/v1/endpoints/embeddings.py:205` - 过滤方法
- [ ] 实现 `backend/app/api/v1/endpoints/embeddings.py:230` - 计数方法
- [ ] 添加按状态、来源、日期过滤
- [ ] 编写单元测试

#### 1.3.3: Knowledge Base处理 (8-12小时)

**Task 1.3.3.1: 文本提取与分块** (6-8小时)
- [ ] 实现 `backend/app/tasks/knowledge_base.py:74` - 文本提取
- [ ] 实现 `backend/app/tasks/knowledge_base.py:89` - 文本分块
- [ ] 实现 `backend/app/tasks/knowledge_base.py:92` - 批量Embedding生成
- [ ] 支持多种文档格式 (PDF, DOCX, TXT)

```python
# backend/app/tasks/knowledge_base.py
def extract_text(data_source_id: str) -> str:
    """提取数据源文本内容"""
    data_source = DataSourceRepository.get(data_source_id)

    if data_source.type == "document":
        return extract_from_document(data_source.content)
    elif data_source.type == "text":
        return data_source.content
    elif data_source.type == "qa_pairs":
        return format_qa_pairs(data_source.content)

def chunk_text(text: str, chunk_size: int = 500, overlap: int = 50) -> List[str]:
    """将文本分块"""
    chunks = []
    # 实现滑动窗口分块
    return chunks
```

**Task 1.3.3.2: 网站爬虫** (2-4小时)
- [ ] 实现 `backend/app/tasks/knowledge_base.py:213` - 基础爬虫
- [ ] 支持配置 (max_depth, include_patterns)
- [ ] 添加robots.txt遵守
- [ ] 实现内容提取 (BeautifulSoup)

#### 1.3.4: OCR与导出任务 (6-8小时)

**Task 1.3.4.1: OCR失败处理** (3-4小时)
- [ ] 实现 `backend/app/tasks/document/ocr.py:486` - 失败文档查询
- [ ] 添加重试机制 (max_retries=3)
- [ ] 实现失败原因记录
- [ ] 添加管理员通知

**Task 1.3.4.2: 导出清理逻辑** (2-3小时)
- [ ] 实现 `backend/app/tasks/document/export.py:465` - 清理临时文件
- [ ] 添加定时清理任务 (每日凌晨)
- [ ] 配置文件保留策略 (7天)

#### 1.3.5: 认证与服务 (4-6小时)

**Task 1.3.5.1: 批量令牌撤销** (2-3小时)
- [ ] 实现 `backend/app/services/auth/token_blacklist.py:149`
- [ ] 支持按用户ID批量撤销
- [ ] 添加Redis批量操作
- [ ] 编写测试用例

**Task 1.3.5.2: Insights服务** (2-3小时)
- [ ] 实现 `backend/app/services/insights/dataset_service.py:492` - GPT推理
- [ ] 集成OpenAI API
- [ ] 添加缓存层 (Redis)

#### 1.3.6: 前端TODO (4-6小时)

**Task 1.3.6.1: 数据源配置对话框** (3-4小时)
- [ ] 实现 `frontend/src/features/knowledge-base/components/KBDetailPage.tsx:131`
- [ ] 创建 `<DataSourceConfigDialog>` 组件
- [ ] 支持4种数据源类型配置
- [ ] 添加表单验证

**Task 1.3.6.2: Document类型定义** (1-2小时)
- [ ] 修复 `frontend/src/features/documents/components/DocumentConfirmationView.tsx:40`
- [ ] 创建完整的Document类型定义
- [ ] 确保类型在各组件间一致

### Task 1.4: 文档统计端点 (4-6小时)

**Task 1.4.1: 文档总数统计** (2-3小时)
- [ ] 实现 `backend/app/api/v1/endpoints/documents.py:237`
- [ ] 添加按状态统计 (pending, processing, completed, failed)
- [ ] 添加按项目统计
- [ ] 添加时间范围筛选

**Task 1.4.2: 项目总数统计** (2-3小时)
- [ ] 实现 `backend/app/api/v1/endpoints/projects.py:198`
- [ ] 添加按用户统计
- [ ] 添加活跃项目统计

### 依赖关系
```
Task 1.1 (README) → 独立，可并行
Task 1.2 (Sentry) → 独立，可并行
Task 1.3.1 (Celery基础) → Task 1.3.2, 1.3.3, 1.3.4
Task 1.3.5 (认证) → 独立
Task 1.3.6 (前端) → Task 1.4 (统计API)
```

### Sprint 1 End Milestone
✅ **Deliverables**:
- README技术栈描述准确
- Sentry错误追踪上线
- 关键Celery任务实现
- 文档/项目统计API完成
- 前端TODO全部处理

---

## Q1 Sprint 2: 国际化与可访问性 (Week 3-4)

**目标**: 实现i18n基础架构，通过WCAG 2.1 AA可访问性审计

**总工作量**: 36-46小时 (4.5-6天 full-time)

### Task 2.1: i18n国际化实现 (16-24小时)

**Task 2.1.1: i18n架构搭建** (4-6小时)
- [ ] 安装 `react-i18next`, `i18next`, `i18next-browser-languagedetector`
- [ ] 创建 `frontend/src/i18n/` 目录结构
- [ ] 配置i18next实例
- [ ] 创建语言切换组件

```typescript
// frontend/src/i18n/config.ts
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import enTranslations from './locales/en.json';
import zhTranslations from './locales/zh.json';

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: enTranslations },
      zh: { translation: zhTranslations },
    },
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false,
    },
  });

export default i18n;
```

**Task 2.1.2: 英文语言包创建** (4-6小时)
- [ ] 提取所有UI硬编码文本
- [ ] 创建 `frontend/src/i18n/locales/en.json`
- [ ] 按模块组织翻译键 (common, documents, dashboard, assistants, kb)
- [ ] 添加复数形式支持

```json
// frontend/src/i18n/locales/en.json
{
  "common": {
    "save": "Save",
    "cancel": "Cancel",
    "delete": "Delete",
    "loading": "Loading...",
    "noResults": "No results found for \"{{query}}\""
  },
  "dashboard": {
    "greeting": "Good {{timeOfDay}}, {{name}}!",
    "stats": {
      "documents": "{{count}} Document",
      "documents_plural": "{{count}} Documents"
    }
  },
  "documents": {
    "upload": "Upload Document",
    "emptyState": {
      "title": "No documents yet",
      "description": "Upload your first document to get started"
    }
  }
}
```

**Task 2.1.3: 中文语言包创建** (4-6小时)
- [ ] 翻译所有UI文本到中文
- [ ] 创建 `frontend/src/i18n/locales/zh.json`
- [ ] 处理中文特殊格式 (日期、数字)
- [ ] 审核翻译质量

**Task 2.1.4: 组件国际化迁移** (4-6小时)
- [ ] 迁移Dashboard组件
- [ ] 迁移Documents组件
- [ ] 迁移Knowledge Base组件
- [ ] 迁移Assistants组件
- [ ] 迁移通用组件 (Header, Sidebar, Dialogs)

```typescript
// 迁移示例
// Before
<h1>Good morning, {user?.full_name}</h1>

// After
import { useTranslation } from 'react-i18next';
const { t } = useTranslation();
<h1>{t('dashboard.greeting', { timeOfDay: getTimeOfDay(), name: user?.full_name })}</h1>
```

### Task 2.2: 可访问性改进 (12-16小时)

**Task 2.2.1: WCAG审计** (2-3小时)
- [ ] 安装 `@axe-core/react` 开发依赖
- [ ] 运行自动化审计
- [ ] 生成问题清单
- [ ] 按影响程度排序

**Task 2.2.2: 键盘导航修复** (4-5小时)
- [ ] 为所有交互元素添加 `tabIndex`
- [ ] 实现模态框focus trap
- [ ] 添加skip-to-content链接
- [ ] 修复表格键盘导航

```typescript
// 模态框focus trap示例
import { FocusTrap } from '@headlessui/react';

<FocusTrap>
  <Dialog>
    {/* Dialog content */}
  </Dialog>
</FocusTrap>
```

**Task 2.2.3: ARIA属性补充** (4-5小时)
- [ ] 为表格添加 `role`, `aria-label`
- [ ] 为表单添加 `aria-describedby` 错误提示
- [ ] 为图表添加 `aria-label` 描述
- [ ] 为动态内容添加 `aria-live` 区域

```typescript
// 表格可访问性示例
<table role="grid" aria-label={t('documents.documentList')}>
  <thead>
    <tr role="row">
      <th role="columnheader" scope="col">{t('documents.filename')}</th>
    </tr>
  </thead>
</table>
```

**Task 2.2.4: 颜色对比度修复** (2-3小时)
- [ ] 运行颜色对比度检查工具
- [ ] 调整文本颜色 (确保≥4.5:1比例)
- [ ] 调整图标颜色
- [ ] 更新Tailwind配置

### Task 2.3: 测试覆盖率提升 (8-12小时)

**Task 2.3.1: 前端测试覆盖率** (4-6小时)
- [ ] 配置Vitest覆盖率报告
- [ ] 为关键组件编写测试 (Dashboard, Documents, CommandPalette)
- [ ] 为自定义hooks编写测试
- [ ] 目标: ≥70%覆盖率

```typescript
// vitest.config.ts
export default defineConfig({
  test: {
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      thresholds: {
        lines: 70,
        functions: 70,
        branches: 60,
      },
    },
  },
});
```

**Task 2.3.2: 后端测试覆盖率** (4-6小时)
- [ ] 配置pytest-cov
- [ ] 为Repository层编写测试
- [ ] 为Service层编写测试
- [ ] 目标: ≥80%覆盖率

### 依赖关系
```
Task 2.1.1 (i18n架构) → Task 2.1.2, 2.1.3 → Task 2.1.4 (组件迁移)
Task 2.2.1 (审计) → Task 2.2.2, 2.2.3, 2.2.4
Task 2.3 独立，可并行
```

### Sprint 2 End Milestone
✅ **Deliverables**:
- i18n支持中英文切换
- WCAG 2.1 AA审计通过
- 前端测试覆盖率≥70%
- 后端测试覆盖率≥80%

---

## Q1 Sprint 3: 用户体验与集成 (Week 5-6)

**目标**: 完成前后端API集成，实现用户引导流程

**总工作量**: 28-36小时 (3.5-4.5天 full-time)

### Task 3.1: 前后端API集成 (8-12小时)

**Task 3.1.1: Assistants Mock数据替换** (4-6小时)
- [ ] 替换 `mockAssistantsService.ts` 为真实API调用
- [ ] 更新RTK Query endpoints
- [ ] 处理API错误状态
- [ ] 更新类型定义

```typescript
// frontend/src/features/assistants/services/assistantsApi.ts
export const assistantsApi = api.injectEndpoints({
  endpoints: (builder) => ({
    getAssistants: builder.query<AssistantListResponse, AssistantFilters>({
      query: (filters) => ({
        url: '/assistants',
        params: filters,
      }),
      providesTags: ['Assistants'],
    }),
    // ... 其他endpoints
  }),
});
```

**Task 3.1.2: WebSocket实时更新** (4-6小时)
- [ ] 完成Assistants页WebSocket集成
- [ ] 实现对话实时更新
- [ ] 添加连接状态指示器
- [ ] 处理断线重连

### Task 3.2: 用户引导流程 (12-16小时)

**Task 3.2.1: 引导组件基础** (4-5小时)
- [ ] 安装 `react-joyride` 依赖
- [ ] 创建 `<OnboardingProvider>` 组件
- [ ] 实现引导步骤配置
- [ ] 添加引导状态持久化 (localStorage)

```typescript
// frontend/src/shared/components/onboarding/OnboardingProvider.tsx
import Joyride, { Step, CallBackProps } from 'react-joyride';

const ONBOARDING_STEPS: Step[] = [
  {
    target: '.sidebar-documents',
    content: t('onboarding.documentsIntro'),
    disableBeacon: true,
  },
  {
    target: '.upload-button',
    content: t('onboarding.uploadIntro'),
  },
  // ... 更多步骤
];

export const OnboardingProvider: React.FC<PropsWithChildren> = ({ children }) => {
  const [run, setRun] = useState(false);
  const [completed, setCompleted] = useLocalStorage('onboarding_completed', false);

  useEffect(() => {
    if (!completed) {
      setRun(true);
    }
  }, [completed]);

  return (
    <>
      <Joyride
        steps={ONBOARDING_STEPS}
        run={run}
        continuous
        showSkipButton
        callback={handleCallback}
      />
      {children}
    </>
  );
};
```

**Task 3.2.2: 功能Tooltips** (4-5小时)
- [ ] 为复杂功能添加Tooltip提示
- [ ] 实现首次访问自动显示
- [ ] 添加"不再显示"选项
- [ ] 支持i18n

**Task 3.2.3: 空状态引导优化** (4-6小时)
- [ ] 优化现有Empty States文案
- [ ] 添加视频/GIF教程链接
- [ ] 实现快速入门卡片
- [ ] 添加帮助中心链接

### Task 3.3: API文档生成 (8-10小时)

**Task 3.3.1: OpenAPI规范完善** (4-5小时)
- [ ] 为所有API端点添加完整描述
- [ ] 添加请求/响应示例
- [ ] 配置认证说明
- [ ] 添加错误码文档

**Task 3.3.2: Swagger UI优化** (4-5小时)
- [ ] 配置API分组 (Tags)
- [ ] 添加环境切换 (开发/生产)
- [ ] 集成API测试功能
- [ ] 生成SDK文档

### 依赖关系
```
Task 3.1.1 (API集成) → Task 3.1.2 (WebSocket)
Task 3.2.1 (引导基础) → Task 3.2.2, 3.2.3
Task 3.3 独立，可并行
```

### Sprint 3 End Milestone
✅ **Deliverables**:
- Assistants页完整使用真实API
- WebSocket实时更新功能完成
- 新用户引导流程上线
- OpenAPI文档完善

---

## P2 低优先级任务 (可延后至Q2)

以下任务可根据资源情况在Q2实施：

### Task 4.1: 移动端优化 (16-20小时)

**Task 4.1.1: 响应式布局优化** (8-10小时)
- [ ] 优化三级导航在移动端的交互
- [ ] 实现表格在小屏幕的横向滚动
- [ ] 添加触摸手势支持 (swipe导航)
- [ ] 测试各断点下的布局

**Task 4.1.2: PWA支持** (8-10小时)
- [ ] 创建 `manifest.json`
- [ ] 配置Service Worker
- [ ] 实现离线缓存策略
- [ ] 添加安装提示

### Task 4.2: 性能监控 (8-12小时)

**Task 4.2.1: Core Web Vitals监控** (4-6小时)
- [ ] 集成 `web-vitals` 库
- [ ] 上报LCP, FID, CLS指标
- [ ] 配置Sentry Performance
- [ ] 设置告警阈值

**Task 4.2.2: Bundle分析** (4-6小时)
- [ ] 配置 `rollup-plugin-visualizer`
- [ ] 分析Bundle大小
- [ ] 识别优化机会
- [ ] 实施代码拆分优化

### Task 4.3: 用户反馈机制 (6-8小时)

**Task 4.3.1: 反馈组件** (4-5小时)
- [ ] 创建反馈按钮 (固定右下角)
- [ ] 实现反馈表单 (Bug报告/功能请求)
- [ ] 集成截图功能
- [ ] 添加后端API存储反馈

**Task 4.3.2: NPS调查** (2-3小时)
- [ ] 实现NPS弹窗组件
- [ ] 配置触发条件 (使用30天后)
- [ ] 添加数据统计

### Task 4.4: 通知系统 (4-5小时)

**Task 4.4.1: 全局Toast通知** (2-3小时)
- [ ] 创建NotificationProvider
- [ ] 实现Toast组件 (success, error, warning, info)
- [ ] 添加队列管理

**Task 4.4.2: 通知中心** (2小时)
- [ ] 创建通知列表组件
- [ ] 实现已读/未读状态
- [ ] 添加通知分类

---

## Q2 规划预览

### 业务功能扩展 (规划中)

| 功能 | 优先级 | 工作量 | 依赖 |
|------|--------|--------|------|
| 团队协作 | P1 | 40-50h | 用户系统 |
| 使用量计费 | P1 | 24-32h | Stripe集成 |
| 审计日志 | P2 | 16-20h | 数据库扩展 |
| Webhook集成 | P2 | 12-16h | API扩展 |
| 导入/导出 | P2 | 8-12h | 文件处理 |

### 技术架构增强 (规划中)

| 功能 | 优先级 | 工作量 | 依赖 |
|------|--------|--------|------|
| 多租户架构 | P1 | 30-40h | 数据库重构 |
| SSO集成 | P1 | 16-20h | SAML/OIDC库 |
| CDN集成 | P2 | 8-10h | 云服务配置 |
| 数据库读写分离 | P2 | 12-16h | 基础设施 |

### Sprint 1 洞察补充 (2026-01-27)

以下为 Sprint 1 完成后识别的中期优化项，建议纳入 Q2 规划：

| 功能 | 优先级 | 工作量 | 说明 | 依赖 |
|------|--------|--------|------|------|
| RAG 查询结果排序优化 | P2 | 8-12h | 支持按相关度、时间、来源排序；提升搜索体验 | pgvector 查询优化 |
| 知识库版本控制 | P2 | 16-24h | 支持 KB 配置历史、回滚、变更对比 | 数据库扩展、配合团队协作功能 |

**备注**：
- OCR 准确度反馈机制已包含在 Task 4.3 (用户反馈机制) 中
- 多语言支持 (马来语、中文) 已包含在 Sprint 2 Task 2.1 (i18n) 中

---

## 验收标准

### Sprint 1 验收清单
- [ ] README.md技术栈描述准确 (PostgreSQL + pgvector)
- [ ] Sentry错误追踪上线并接收数据
- [ ] 关键Celery任务运行正常
- [ ] 无影响用户功能的TODO残留

### Sprint 2 验收清单
- [ ] 支持中英文切换
- [ ] axe-core审计无Critical/Serious问题
- [ ] 前端测试覆盖率≥70%
- [ ] 后端测试覆盖率≥80%

### Sprint 3 验收清单
- [ ] Assistants页使用真实API
- [ ] WebSocket连接稳定
- [ ] 新用户首次登录显示引导
- [ ] API文档完整可用

---

## 附录

### A. TODO完整清单 (来源: Product Analysis Report)

```
backend/app/api/v1/endpoints/documents.py:137 - Celery任务触发未实现
backend/app/api/v1/endpoints/documents.py:237 - 文档总数统计未实现
backend/app/api/v1/endpoints/projects.py:198 - 项目总数统计未实现
backend/app/api/v1/endpoints/knowledge_bases.py:589 - Query embedding搜索未实现
backend/app/api/v1/endpoints/data_sources.py:549 - 网站爬虫Celery任务未实现
backend/app/api/v1/endpoints/data_sources.py:635 - Celery任务状态检查未实现
backend/app/api/v1/endpoints/embeddings.py:107 - Embedding生成Celery任务未实现
backend/app/api/v1/endpoints/embeddings.py:205 - Repository过滤方法未实现
backend/app/api/v1/endpoints/embeddings.py:230 - 过滤计数未实现
backend/app/tasks/knowledge_base.py:74 - 文本提取未实现
backend/app/tasks/knowledge_base.py:89 - 文本分块未实现
backend/app/tasks/knowledge_base.py:92 - Embedding批量生成未实现
backend/app/tasks/knowledge_base.py:213 - 网站爬虫未实现
backend/app/tasks/document/ocr.py:486 - 失败文档查询方法未实现
backend/app/tasks/document/export.py:465 - 清理逻辑未实现
backend/app/services/auth/token_blacklist.py:149 - 批量令牌撤销未实现
backend/app/services/insights/dataset_service.py:492 - GPT推理未实现
frontend/src/App.tsx:20 - Sentry错误追踪未集成
frontend/src/features/knowledge-base/components/KBDetailPage.tsx:131 - 数据源配置对话框未实现
frontend/src/features/documents/components/DocumentConfirmationView.tsx:40 - Document类型定义缺失
```

### B. 关键指标目标

| 指标 | 当前 | Sprint 1 | Sprint 2 | Sprint 3 |
|------|------|----------|----------|----------|
| 前端测试覆盖率 | 未知 | - | ≥70% | 维持 |
| 后端测试覆盖率 | 未知 | - | ≥80% | 维持 |
| Lighthouse Performance | 未测 | - | ≥80 | ≥90 |
| Lighthouse Accessibility | 未测 | - | ≥90 | 维持 |
| 错误追踪 | 无 | 有 | 优化 | 完善 |

### C. 相关文档

- `claudedocs/Product-Analysis-Report-2026-01-27.md` - 产品分析报告
- `claudedocs/Phase1-Task-Breakdown-REVISED.md` - Phase 1任务记录
- `claudedocs/assistants-qa-test-report.md` - Assistants QA测试报告
- `CLAUDE.md` - 项目技术文档

---

**文档创建**: 2026-01-27
**作者**: Claude (Product Owner Role)
**下次更新**: Sprint 1完成后
