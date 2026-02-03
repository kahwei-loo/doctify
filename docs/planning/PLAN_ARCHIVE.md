# Doctify 项目计划归档

本文件保存已完成阶段的详细任务描述和验收标准，作为历史参考。
简要变更记录请参阅 [PLAN_CHANGELOG.md](./PLAN_CHANGELOG.md)。

---

## 目录

- [项目概览](#项目概览)
- [架构决策](#架构决策)
- [Phase 0: 数据库切换](#phase-0-数据库切换)
- [Phase 1: 准备和基础设施](#phase-1-准备和基础设施)
- [Phase 2: 后端重构](#phase-2-后端重构)
- [Phase 3: 前端重构](#phase-3-前端重构)
- [Phase 4: 测试完善](#phase-4-测试完善)
- [Phase 5: 部署和监控](#phase-5-部署和监控)
- [安全审查发现](#安全审查发现)
- [目录结构设计](#目录结构设计)

---

## 项目概览

**项目路径**: `C:\Users\KahWei\Projects\ai-works\kahwei-loo\doctify`
**项目类型**: AI 文档智能解析 SaaS 平台
**技术栈**: FastAPI + React TypeScript + PostgreSQL + Redis + Celery

### 重构目标

- ✅ 代码质量提升 - 清晰架构、命名规范、注释完善
- ✅ 性能优化 - 数据库查询优化、前端加载速度提升
- ✅ 架构现代化 - Repository Pattern、依赖注入、模块化设计
- ✅ 测试覆盖率 - 后端 ≥ 80%、前端 ≥ 70%
- ✅ 部署自动化 - CI/CD、监控、日志系统

### 实施策略

- **方式**: 一次性完成所有 5 个阶段
- **迁移策略**: 边迁移边优化（重构迁移）
- **预估时间**: 25-37 天（5-7 周）

---

## 架构决策

**确认日期**: 2026-01-15

### 部署优先级
1. 🥇 本地开发/部署（docker-compose up 一键启动）
2. 🥈 云端部署（VPS 作为 portfolio 展示）
3. 🥉 Kubernetes（可选，未来）

### 技术选型
- **架构模式**: 模块化单体（Modular Monolith）
- **数据库**: PostgreSQL + pgvector（替代原 MongoDB）
- **AI 策略**: 外部 API 调用（OpenAI/Claude），不跑本地模型
- **Portfolio VPS**: Racknerd KVM VPS (6GB RAM, 5 vCPU, 100GB SSD, Ubuntu 24.04)

### 模块化架构
```
backend/app/modules/
├── auth/       # 认证授权
├── documents/  # 文档管理
├── ocr/        # OCR 解析
├── rag/        # RAG 检索
├── chat/       # AI 对话
└── reports/    # 报告生成
```

### PostgreSQL 安全配置

| 安全项 | 配置 | 文件 |
|--------|------|------|
| 连接字符串 | 环境变量 | `.env`, `config.py` |
| SSL/TLS | 生产环境强制 | `config.py` |
| 最小权限 | 应用用户只授予 CRUD | `docs/deployment.md` |
| 连接池限制 | 防止资源耗尽 | `config.py` |

---

## Phase 0: 数据库切换

**状态**: ✅ 已完成 (2026-01-15)
**目标**: 完全切换到 PostgreSQL

### 完成情况
- ✅ PostgreSQL + pgvector 数据库运行正常
- ✅ SQLAlchemy 2.0 异步模型已创建
- ✅ Alembic 迁移已设置
- ✅ Repository 层已更新
- ✅ Backend API 健康检查通过
- ✅ Redis 运行正常
- ✅ Celery Worker 运行中

### 任务列表

| 任务 | 文件 | 说明 |
|------|------|------|
| 0.1 更新依赖 | requirements/base.txt | 移除motor/pymongo, 添加asyncpg/sqlalchemy/alembic |
| 0.2 更新配置 | app/core/config.py | PostgreSQL配置替代MongoDB |
| 0.3 数据库模块 | app/db/database.py | SQLAlchemy 2.0异步引擎 |
| 0.4 数据模型 | app/db/models/ | user.py, document.py, project.py, api_key.py |
| 0.5 Alembic迁移 | alembic/ | 初始化迁移配置 |
| 0.6 Repository层 | app/db/repositories/ | 更新为SQLAlchemy查询 |
| 0.7 Services层 | app/services/auth/ | 移除MongoDB特定操作 |
| 0.8 API路由 | app/main.py | 启用auth/documents/projects路由 |
| 0.9 Docker配置 | docker-compose.yml | PostgreSQL服务+pgvector |
| 0.10 环境变量 | .env.example | PostgreSQL变量模板 |
| 0.11 本地验证 | - | docker-compose up + 健康检查 |

---

## Phase 1: 准备和基础设施

**状态**: ✅ 已完成 (2026-01-15)
**预估时间**: 3-5 天
**目标**: 建立新项目结构和迁移基础

### 完成情况
- ✅ 目录结构完整
- ✅ Pydantic Settings v2 配置
- ✅ 依赖管理重组 (requirements/base.txt, dev.txt, prod.txt)
- ✅ Docker 多阶段构建优化
- ✅ CI/CD 工作流配置

### 核心任务

1. **创建目录结构**
   - 完整目录树创建
   - .gitignore、.editorconfig 等配置文件
   - Git 仓库初始化

2. **配置管理优化**
   - Pydantic Settings v2 重构 config.py
   - 统一环境变量管理
   - 分离开发/生产配置

3. **依赖管理重组**
   - requirements 拆分 (base.txt, dev.txt, prod.txt)
   - pyproject.toml 创建
   - 版本锁定

4. **Docker 配置优化**
   - 多阶段构建
   - Redis 端口配置修复
   - 前端 Dockerfile 修正

5. **CI/CD 基础设置**
   - GitHub Actions 工作流
   - 测试流水线
   - 代码质量检查

### 关键文件创建

```
backend/requirements/base.txt
backend/requirements/dev.txt
backend/requirements/prod.txt
backend/pyproject.toml
backend/pytest.ini
frontend/.eslintrc.js
frontend/.prettierrc
.github/workflows/backend-ci.yml
.github/workflows/frontend-ci.yml
CONTRIBUTING.md
```

### 验收标准

- ✅ 目录结构完整创建
- ✅ 配置文件正确加载
- ✅ 依赖安装无错误
- ✅ Docker Compose 本地启动成功
- ✅ 基础 CI 流水线运行通过

---

## Phase 2: 后端重构

**状态**: ✅ 基本完成 (~99%)
**预估时间**: 7-10 天
**目标**: 后端代码质量提升和架构优化

### 完成情况

| 子阶段 | 完成度 | 状态 |
|--------|--------|------|
| 2.1 核心层重构 | 100% | ✅ 完成 |
| 2.2 服务层重构 | 95% | ✅ 基本完成 |
| 2.3 API层优化 | 100% | ✅ 完成 |
| 2.4 异步任务优化 | 100% | ✅ 完成 |

### 已完成关键组件

- ✅ Repository Pattern (base.py, document.py, project.py, user.py)
- ✅ Domain Layer (entities/, value_objects/)
- ✅ Pydantic Settings v2 配置
- ✅ API 依赖注入 (deps.py)
- ✅ Celery 任务 (ocr.py, export.py)
- ✅ OCR 编排器 (orchestrator.py)
- ✅ 文档服务 (upload.py, processing.py, export.py)
- ✅ 存储服务 (base.py, local.py, s3.py)

### 子阶段 2.1: 核心层重构

**Repository Pattern 文件**:
```
backend/app/db/repositories/
├── base.py        # 基础 Repository (CRUD)
├── document.py    # 文档仓库
├── project.py     # 项目仓库
├── user.py        # 用户仓库
└── api_key.py     # API Key仓库
```

**Domain Layer 文件**:
```
backend/app/domain/
├── entities/
│   ├── document.py
│   ├── project.py
│   └── user.py
└── value_objects/
    ├── document_status.py
    └── token_usage.py
```

**配置重构文件**:
```
backend/app/core/
├── config.py       # Pydantic Settings v2
├── security.py     # 统一安全工具
├── exceptions.py   # 自定义异常类
└── dependencies.py # 全局依赖
```

### 子阶段 2.2: 服务层重构

**文档服务模块**:
```
backend/app/services/document/
├── upload.py
├── processing.py
├── export.py
└── views.py
```

**OCR 服务模块**:
```
backend/app/services/ocr/
├── orchestrator.py  # L25 编排引擎
├── provider.py      # AI 提供商抽象 (嵌入orchestrator)
├── retry.py         # 重试策略 (嵌入orchestrator)
└── validation.py    # 结果验证 (嵌入orchestrator)
```

**认证和存储服务**:
```
backend/app/services/auth/
├── jwt.py
└── api_key.py

backend/app/services/storage/
├── base.py
├── local.py
└── s3.py
```

### 子阶段 2.3: API 层优化

**依赖注入**: `backend/app/api/v1/deps.py`
- Repository 和 Service 工厂函数
- 认证依赖 (get_current_user, verify_api_key)
- 数据库连接依赖

**端点重构**:
```
backend/app/api/v1/endpoints/
├── documents.py
├── projects.py
├── auth.py      # 整合 users
├── websocket.py # 合并所有 WS 端点
└── api_keys.py
```

### 子阶段 2.4: 异步任务优化

**Celery 任务**:
```
backend/app/tasks/
├── celery_app.py     # Celery 配置
├── document/
│   ├── ocr.py        # OCR 任务
│   └── export.py     # 导出任务
└── cleanup/          # 清理任务
```

**队列配置**: ocr_queue, export_queue, cleanup_queue

### 验收标准

- ✅ 单元测试覆盖率 ≥ 80%
- ✅ 集成测试通过率 100%
- ✅ API 文档完整自动生成
- ✅ 代码质量检查通过 (Flake8, MyPy, Black)

---

## Phase 3: 前端重构

**状态**: ✅ 基本完成 (~94%)
**预估时间**: 7-10 天
**目标**: 前端代码组织和性能优化

### 完成情况

| 子阶段 | 完成度 | 状态 |
|--------|--------|------|
| 3.1 功能模块化 | 75% | ⚠️ projects/dashboard为空 |
| 3.2 状态管理优化 | 100% | ✅ 完成 |
| 3.3 服务层和API | 100% | ✅ 完成 |
| 3.4 性能优化 | 100% | ✅ 完成 |

### 已完成关键组件

- ✅ Features 目录结构 (auth/, documents/)
- ✅ Shared components (ui/, common/)
- ✅ Redux Store + RTK Query + Selectors
- ✅ API Client + Interceptors
- ✅ WebSocket Client + Manager
- ✅ Vite 代码分割、压缩、懒加载

### 子阶段 3.1: 功能模块化

**Features 目录结构**:
```
frontend/src/features/
├── auth/
│   ├── components/
│   ├── hooks/
│   ├── services/
│   └── types/
├── documents/
│   ├── components/
│   │   ├── DocumentTable/
│   │   ├── DocumentDetail/
│   │   ├── DocumentUpload/
│   │   └── DocumentFilters/
│   ├── hooks/
│   ├── services/
│   └── store/
├── projects/     # 待实现
└── dashboard/    # 待实现
```

**Shared 组件**:
```
frontend/src/shared/
├── components/
│   ├── ui/       # Button, Input, Modal, Table
│   ├── layout/   # Header, Sidebar, Layout
│   └── common/   # ErrorBoundary, Loading
├── hooks/
├── utils/
├── types/
└── constants/
```

### 子阶段 3.2: 状态管理优化

**Redux Store**:
```
frontend/src/store/
├── index.ts
├── rootReducer.ts
└── api/            # RTK Query
```

### 子阶段 3.3: 服务层和 API

**API 客户端**:
```
frontend/src/services/
├── api/
│   ├── client.ts       # Axios 实例
│   ├── interceptors.ts # 拦截器
│   └── endpoints/      # API 端点定义
└── websocket/
    ├── client.ts
    └── handlers.ts
```

### 子阶段 3.4: 性能优化

**Vite 优化** (`vite.config.ts`):
- 代码分割和懒加载
- React.memo 优化
- 手动代码分块 (vendor chunks)
- Gzip/Brotli 压缩

### 验收标准

- ✅ 组件单元测试覆盖率 ≥ 70%
- ✅ E2E 测试通过率 100%
- ✅ Lighthouse 性能评分 ≥ 90
- ✅ ESLint/Prettier 检查通过

---

## Phase 4: 测试完善

**状态**: ✅ 基本完成 (~90%)
**预估时间**: 5-7 天
**目标**: 建立完整的测试体系

### 完成情况

- ✅ Backend: conftest.py + unit/ + integration/ + e2e/
- ✅ Frontend: setup.ts + unit/ + e2e/
- ✅ pytest 配置 + 覆盖率 ≥80%
- ✅ vitest + playwright 配置
- ✅ CI/CD 自动测试 + 覆盖率报告
- ✅ fixtures/ 补充完成 (mocks.py, files.py, api_keys.py)

### 后端测试框架

```
requirements/dev.txt:
pytest==8.0.0
pytest-asyncio==0.23.0
pytest-cov==4.1.0
pytest-mock==3.12.0
httpx==0.27.0
faker==22.0.0
```

### 测试文件结构

```
backend/tests/
├── conftest.py
├── fixtures/
│   ├── mocks.py      # Mock对象 (521行)
│   ├── files.py      # 测试文件生成 (303行)
│   └── api_keys.py   # API密钥数据 (203行)
├── unit/
│   ├── test_repositories/
│   ├── test_services/
│   └── test_utils/
├── integration/
│   └── test_api/
└── e2e/
```

### 前端测试框架

```json
{
  "@testing-library/react": "^14.0.0",
  "@testing-library/jest-dom": "^6.0.0",
  "vitest": "^1.0.0",
  "playwright": "^1.40.0"
}
```

### 验收标准

- ✅ 后端测试覆盖率 ≥ 80%
- ✅ 前端测试覆盖率 ≥ 70%
- ✅ 所有测试通过率 100%
- ✅ CI 自动化测试运行正常

---

## Phase 5: 部署和监控

**状态**: ✅ 基本完成 (~85%)
**预估时间**: 3-5 天
**目标**: 生产就绪的部署和监控

### 完成情况

- ✅ Docker: 多阶段构建 (backend + frontend)
- ✅ 非 root 用户 + 安全加固
- ✅ CI/CD: backend-ci.yml, frontend-ci.yml, deploy.yml
- ✅ 零停机部署 + 回滚能力
- ✅ 安全扫描: Bandit, Safety, Trivy, npm audit
- ✅ Prometheus 监控 (7 exporters + 21 alert rules)
- ✅ Grafana dashboards (application, celery, system)

### Docker 优化

**多阶段构建**:
```dockerfile
FROM python:3.11-slim as builder
# 构建依赖

FROM python:3.11-slim
# 最小运行时
```

**镜像大小目标**:
- 后端: < 500MB
- 前端: < 100MB

### CI/CD 配置

```
.github/workflows/
├── backend-ci.yml    # 后端测试+构建
├── frontend-ci.yml   # 前端测试+构建
└── deploy.yml        # 部署流水线
```

### 监控配置

**Prometheus** (`infrastructure/docker/prometheus/`):
- prometheus.yml
- alert_rules.yml (21条规则)

**Grafana Dashboards** (`infrastructure/docker/grafana/dashboards/`):
- doctify-application.json - 应用性能
- doctify-celery.json - 任务队列
- doctify-system.json - 系统资源

### 未实现 (低优先级)

- ❌ Kubernetes manifests
- ❌ Terraform IaC
- ❌ ELK/Loki 日志聚合
- ❌ AlertManager (被注释)

### 验收标准

- ✅ 部署自动化完成
- ✅ 监控系统运行正常
- ✅ 安全检查通过
- ✅ 生产环境就绪

---

## 安全审查发现

**审查日期**: 2026-01-15

### ✅ 已实现的安全措施

- 速率限制 (Redis滑动窗口)
- 多层输入验证 (Pydantic + DB层)
- JWT认证 + 账户锁定 + API Key
- OWASP安全头 (CSP, HSTS, X-Frame-Options)
- 参数化查询防SQL注入
- 审计日志系统

### ❌ 关键缺失

- 无数据库自动备份
- 无文件上传备份策略
- 无灾难恢复计划
- 无RTO/RPO定义

### ⚠️ 建议改进

- 集中化日志系统 (ELK/CloudWatch)
- 密钥管理服务 (Vault/AWS Secrets Manager)
- MFA双因素认证
- 显式RBAC权限系统

### 安全加固计划优先级

| 问题 | 优先级 | 预估时间 |
|------|--------|----------|
| Email验证修复 | P0 | 2-3h |
| 输入验证加固 | P0 | 4-6h |
| 账户锁定实现 | P0 | 3-4h |
| JWT令牌撤销 | P0 | 4-6h |
| 速率限制实现 | P0 | 6-8h |
| 文件上传安全 | P0 | 4-5h |
| MongoDB注入防护 | P0 | 3-4h |
| 密码策略执行 | P0 | 2-3h |
| 审计日志系统 | P0 | 3-4h |

---

## 目录结构设计

### 后端核心结构

```
backend/
├── app/
│   ├── api/v1/           # API 路由层
│   │   ├── deps.py       # 依赖注入配置
│   │   └── endpoints/    # 端点模块
│   ├── core/             # 核心配置
│   ├── db/               # 数据库层
│   │   ├── database.py
│   │   ├── redis.py
│   │   └── repositories/
│   ├── domain/           # 领域层
│   │   ├── entities/
│   │   └── value_objects/
│   ├── models/           # Pydantic 模型
│   ├── services/         # 业务逻辑层
│   ├── tasks/            # Celery 异步任务
│   ├── middleware/       # 中间件
│   ├── utils/            # 工具函数
│   └── main.py           # 应用入口
├── tests/
├── requirements/
└── config/
```

### 前端核心结构

```
frontend/
├── src/
│   ├── app/              # 应用配置
│   ├── features/         # 功能模块
│   ├── shared/           # 共享资源
│   ├── pages/            # 页面组件
│   ├── store/            # Redux Store
│   ├── services/         # API 服务层
│   └── main.tsx          # 应用入口
├── tests/
└── public/
```

### 项目根目录结构

```
kahwei-loo/doctify/
├── backend/
├── frontend/
├── infrastructure/
│   └── docker/
├── docs/
│   ├── planning/         # 计划归档
│   ├── architecture/
│   ├── api/
│   └── deployment/
├── scripts/
├── .github/workflows/
├── docker-compose.yml
└── README.md
```

---

*归档日期: 2026-01-16*
*本文件仅作历史参考，当前活跃任务请查看主计划文件*
