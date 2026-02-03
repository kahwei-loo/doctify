# Doctify 功能恢复计划

> **创建日期**: 2026-01-28
> **最后更新**: 2026-01-28
> **状态**: 进行中
> **监督者**: KahWei

---

## 一、问题总结

### 核心问题
重构项目从旧项目（MongoDB）迁移到新项目（PostgreSQL）后，核心功能严重退化：
- 原本功能完整度: **100%**
- 重构后功能完整度: **~20%**

### 主要缺失功能
1. **Project Configuration UI** - 字段配置、表格配置、Sample Output 完全缺失
2. **Document Preview** - 文件无法正确预览和下载
3. **OCR结果存储** - 字段名不匹配导致数据丢失
4. **前后端状态映射** - 状态值不一致导致页面报错

---

## 二、设计决策：现代化方案

### 2.1 核心原则

**复刻思路，而非复刻代码**

| 保留 | 现代化 |
|------|--------|
| ✅ 配置流程和逻辑 | ✅ Python/PostgreSQL 命名规范 |
| ✅ expected_json_output 三重用途 | ✅ 行业标准术语 |
| ✅ Function Calling 机制 | ✅ 统一的代码风格 |
| ✅ JSONB 存储灵活配置 | ✅ 前后端转换层 |

### 2.2 命名规范对比

| 旧项目 (camelCase) | 新项目 (snake_case) | 理由 |
|-------------------|---------------------|------|
| `fieldName` | `name` | 简洁，上下文已明确 |
| `fieldDescription` | `description` | 简洁 |
| `mandatory` | `required` | JSON Schema / OpenAPI 标准 |
| `outputType` | `type` | 通用术语 |
| `columnName` | `name` | 简洁 |
| `tableDescription` | `description` | 简洁 |

### 2.3 为什么现代化方案更好

1. **代码一致性** - 整个后端 snake_case，无混合风格
2. **行业标准** - `required`、`type` 是 JSON Schema、OpenAPI、Pydantic 通用术语
3. **前端转换是标准做法** - axios 拦截器一行代码自动转换
4. **核心逻辑完全保留** - 只是命名更规范

---

## 三、旧项目架构分析（参考）

> 本节记录旧项目的实现方式，用于理解核心逻辑，但不会完全复制其命名规范。

### 3.1 旧项目数据流向

```
┌─────────────────────────────────────────────────────────────────────────┐
│                     User Configuration                                   │
├─────────────────────────────────────────────────────────────────────────┤
│  message_content: {"fields":[...], "table":{...}}                       │
│  expected_json_output: {"documentNo":"", "lineItems":[...]}             │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
        ┌───────────────────────────┼───────────────────────────┐
        ▼                           ▼                           ▼
┌───────────────────┐   ┌───────────────────┐   ┌───────────────────┐
│  提示词生成        │   │  Function Calling │   │   输出验证         │
│  prepare_text_    │   │  build_function_  │   │   normalize_to_   │
│  content()        │   │  schema()         │   │   template()      │
├───────────────────┤   ├───────────────────┤   ├───────────────────┤
│ message_content   │   │ expected_json_    │   │ expected_json_    │
│ 插入到提示词中     │   │ output 生成       │   │ output 作为       │
│ 作为 "PROJECT     │   │ JSON Schema       │   │ 验证模板          │
│ CONFIGURATION"    │   │ 用于 tool_call    │   │                   │
└───────────────────┘   └───────────────────┘   └───────────────────┘
```

### 3.2 关键发现：expected_json_output 的三重用途

| 用途 | 说明 |
|------|------|
| **1. 提示词示例** | 作为 `{expected_output}` 插入提示词，告诉 AI 期望的输出格式 |
| **2. Function Calling Schema** | 生成 JSON Schema 约束 AI 输出结构 |
| **3. 输出验证模板** | 验证和标准化 AI 返回结果，补齐缺失字段 |

> 💡 **重要**: Sample Output 不仅仅是显示用的，它是 AI 理解输出结构的核心！

### 3.3 Output Types (仅4种)

| Type | 说明 |
|------|------|
| `text` | 文本字符串 |
| `number` | 数字 (整数或小数) |
| `date` | 日期 (YYYY-MM-DD) |
| `boolean` | 布尔值 (true/false) |

> ⚠️ **注意**: 没有 `array` 类型！表格数据通过 `line_items` 数组处理。

---

## 四、恢复计划概览

```
Phase 0: 紧急修复 -----> Phase 1: 核心功能恢复 -----> Phase 2: 文档预览修复 -----> Phase 3: OCR配置集成 -----> Phase 4: 质量保证
   (已完成)                    (1-2周)                      (3-5天)                     (3-5天)                    (1周)
```

---

## 五、Phase 0: 紧急修复 ✅ 已完成

### 任务清单

| # | 任务 | 状态 | 完成日期 |
|---|------|------|----------|
| 0.1 | 修复OCR结果存储字段名 (`extraction_result` → `extracted_data`) | ✅ 完成 | 2026-01-28 |
| 0.2 | 修复前端DocumentStatus类型（添加`completed`, `cancelled`） | ✅ 完成 | 2026-01-28 |
| 0.3 | 修复API返回格式（`result` → `extraction_result`） | ✅ 完成 | 2026-01-28 |
| 0.4 | 修复_mark_document_failed字段名 | ✅ 完成 | 2026-01-28 |

---

## 六、Phase 1: 核心功能恢复 ⏳ 待开始

### 目标
恢复完整的 Project Configuration 功能，**复刻旧项目思路，采用现代化实现**

### 任务清单

| # | 任务 | 说明 | 状态 | 预估 |
|---|------|------|------|------|
| 1.1 | 创建 ProjectConfig 数据模型 | 后端 Pydantic 模型 (snake_case) | ⏳ 待开始 | 1h |
| 1.2 | 创建 ProjectConfig API 端点 | CRUD 操作 | ⏳ 待开始 | 2h |
| 1.3 | 创建 FieldConfigBuilder 组件 | 字段配置 UI | ⏳ 待开始 | 3h |
| 1.4 | 创建 TableConfigBuilder 组件 | 表格配置 UI (单表格) | ⏳ 待开始 | 3h |
| 1.5 | 创建 SampleOutputEditor 组件 | JSON 编辑器 | ⏳ 待开始 | 2h |
| 1.6 | 创建 ConfigurationForm 组件 | 整合所有配置区块 | ⏳ 待开始 | 2h |
| 1.7 | 创建 ProjectConfigModal 组件 | 弹窗容器 | ⏳ 待开始 | 1h |
| 1.8 | 集成到 Documents 页面 | 替换现有简化设置 | ⏳ 待开始 | 2h |

### 详细规格

#### 1.1 后端数据模型 (现代化方案)

```python
# backend/app/models/project_config.py

from pydantic import BaseModel, Field, field_validator, ConfigDict
from typing import List, Optional, Literal
from datetime import datetime
from uuid import UUID
import json

# 类型定义
OutputType = Literal["text", "number", "date", "boolean"]


class FieldDefinition(BaseModel):
    """字段定义 - 使用 snake_case"""
    name: str                           # 字段名 (必填)
    description: str = ""               # 字段描述
    required: bool = False              # 是否必填
    type: OutputType = "text"           # 类型: text | number | date | boolean
    default_value: str = ""             # 默认值
    fixed_value: str = ""               # 固定值


class ColumnDefinition(BaseModel):
    """表格列定义"""
    name: str                           # 列名 (必填)
    description: str = ""               # 列描述
    required: bool = False              # 是否必填
    type: OutputType = "text"           # 类型: text | number | date | boolean
    default_value: str = ""             # 默认值
    fixed_value: str = ""               # 固定值


class TableConfiguration(BaseModel):
    """表格配置 - 单个表格"""
    description: str = ""               # 表格描述
    columns: List[ColumnDefinition] = []


class MessageContent(BaseModel):
    """message_content 字段的 JSON 结构"""
    fields: List[FieldDefinition] = []
    table: TableConfiguration = Field(default_factory=TableConfiguration)


class ProjectConfigBase(BaseModel):
    """Project Configuration 基础模型"""
    project_title: str
    project_description: str = ""
    message_content: str              # JSON string of MessageContent
    expected_json_output: str = "{}"  # JSON string - 期望的输出格式

    @field_validator('message_content')
    @classmethod
    def validate_message_content(cls, v):
        """验证 message_content 是有效的 JSON"""
        if isinstance(v, dict):
            return json.dumps(v, ensure_ascii=False)
        try:
            json.loads(v)
            return v
        except json.JSONDecodeError as e:
            raise ValueError(f"Invalid JSON format: {e}")

    @field_validator('expected_json_output')
    @classmethod
    def validate_expected_json_output(cls, v):
        """验证 expected_json_output 是有效的 JSON"""
        if isinstance(v, dict):
            return json.dumps(v, ensure_ascii=False)
        try:
            parsed = json.loads(v)
            return json.dumps(parsed, ensure_ascii=False)
        except json.JSONDecodeError as e:
            raise ValueError(f"Invalid JSON format: {e}")


class ProjectConfigCreate(ProjectConfigBase):
    """创建配置请求"""
    pass


class ProjectConfigUpdate(BaseModel):
    """更新配置请求 - 所有字段可选"""
    project_title: Optional[str] = None
    project_description: Optional[str] = None
    message_content: Optional[str] = None
    expected_json_output: Optional[str] = None


class ProjectConfigResponse(ProjectConfigBase):
    """配置响应"""
    id: UUID
    project_id: UUID
    created_by: UUID
    version: str = "1.0"
    is_default: bool = False
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
```

#### 1.3-1.5 前端组件规格 (TypeScript)

```typescript
// types/project-config.ts

export type OutputType = 'text' | 'number' | 'date' | 'boolean';

export interface FieldDefinition {
  name: string;
  description: string;
  required: boolean;
  type: OutputType;
  default_value: string;
  fixed_value: string;
}

export interface ColumnDefinition {
  name: string;
  description: string;
  required: boolean;
  type: OutputType;
  default_value: string;
  fixed_value: string;
}

export interface TableConfiguration {
  description: string;
  columns: ColumnDefinition[];
}

export interface MessageContent {
  fields: FieldDefinition[];
  table: TableConfiguration;
}

export interface ProjectConfig {
  id: string;
  project_id: string;
  project_title: string;
  project_description: string;
  message_content: string;      // JSON string
  expected_json_output: string; // JSON string
  version: string;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

// Output Type 选项 (仅4种)
export const OUTPUT_TYPE_OPTIONS: { label: string; value: OutputType }[] = [
  { label: 'Text', value: 'text' },
  { label: 'Number', value: 'number' },
  { label: 'Date', value: 'date' },
  { label: 'Boolean', value: 'boolean' },
];

// 默认字段
export const DEFAULT_FIELD: FieldDefinition = {
  name: '',
  description: '',
  required: false,
  type: 'text',
  default_value: '',
  fixed_value: '',
};

// 默认列
export const DEFAULT_COLUMN: ColumnDefinition = {
  name: '',
  description: '',
  required: false,
  type: 'text',
  default_value: '',
  fixed_value: '',
};

// 默认表格配置
export const DEFAULT_TABLE: TableConfiguration = {
  description: '',
  columns: [],
};

// 默认 MessageContent
export const DEFAULT_MESSAGE_CONTENT: MessageContent = {
  fields: [],
  table: DEFAULT_TABLE,
};
```

```typescript
// components/FieldConfigBuilder.tsx
interface FieldConfigBuilderProps {
  fields: FieldDefinition[];
  onChange: (fields: FieldDefinition[]) => void;
}
// 功能: 添加/编辑/删除字段

// components/TableConfigBuilder.tsx
interface TableConfigBuilderProps {
  table: TableConfiguration;  // 单表格
  onChange: (table: TableConfiguration) => void;
}
// 功能: 编辑表格描述，添加/编辑/删除列

// components/SampleOutputEditor.tsx
interface SampleOutputEditorProps {
  value: string;  // JSON string
  onChange: (value: string) => void;
  error?: string;
}
// 功能: JSON 编辑器，失焦时自动格式化
```

---

## 七、Phase 2: 文档预览修复 ⏳ 待开始

### 任务清单

| # | 任务 | 说明 | 状态 | 预估 |
|---|------|------|------|------|
| 2.1 | 添加文件下载 API | `GET /documents/{id}/file/download` | ⏳ 待开始 | 1h |
| 2.2 | 添加文件预览 API | `GET /documents/{id}/file/preview` 返回文件流 | ⏳ 待开始 | 1h |
| 2.3 | 修复前端 DocumentPreview | 正确获取和显示文件 | ⏳ 待开始 | 2h |
| 2.4 | 添加 PDF 预览支持 | 使用 react-pdf | ⏳ 待开始 | 2h |
| 2.5 | 添加图片预览支持 | 支持 JPEG, PNG, WebP, TIFF | ⏳ 待开始 | 1h |

---

## 八、Phase 3: OCR 配置集成 ⏳ 待开始

### 目标
让 Project 配置真正影响 OCR 处理结果

### 任务清单

| # | 任务 | 说明 | 状态 | 预估 |
|---|------|------|------|------|
| 3.1 | 集成 message_content 到提示词 | 参考旧项目 prepare_text_content() | ⏳ 待开始 | 2h |
| 3.2 | 集成 expected_json_output 到 Schema | 参考旧项目 build_function_schema() | ⏳ 待开始 | 2h |
| 3.3 | 实现输出验证 | 参考旧项目 normalize_to_template() | ⏳ 待开始 | 2h |
| 3.4 | 集成 L25 增强功能 | 低置信度重试、马来西亚本地化验证 | ⏳ 待开始 | 3h |

### OCR 配置集成架构

```python
async def process_document_with_config(
    file_path: str,
    project_config: ProjectConfigResponse
) -> dict:
    """
    完整的 OCR 处理流程

    1. 准备提示词
       - message_content → 插入为 "PROJECT CONFIGURATION"
       - expected_json_output → 插入为 "EXAMPLE OUTPUT FORMAT"

    2. 构建 Function Calling Schema
       - 从 expected_json_output 生成 JSON Schema
       - 用于约束 AI 输出结构

    3. 调用 AI API
       - OpenAI: functions + function_call
       - Google: tools + tool_choice

    4. 验证和标准化输出
       - normalize_to_template() 验证输出结构
       - 补齐缺失字段
       - 类型转换

    5. 计算置信度
       - compute_document_confidence()
    """
    pass
```

---

## 九、Phase 4: 质量保证 ⏳ 待开始

### 验收标准

#### 功能验收清单

- [ ] **Project Configuration**
  - [ ] 可以添加/编辑/删除字段 (Field Configuration)
  - [ ] 可以设置字段类型 (text/number/date/boolean)
  - [ ] 可以设置字段属性 (required/default_value/fixed_value)
  - [ ] 可以编辑表格描述 (Table Configuration)
  - [ ] 可以添加/编辑/删除表格列
  - [ ] Sample Output JSON 编辑器正常工作
  - [ ] 配置保存成功并持久化

- [ ] **Document Upload & Processing**
  - [ ] 文档上传成功
  - [ ] OCR 处理使用 Project Config
  - [ ] 提取结果符合配置结构
  - [ ] 前端正确显示结果

- [ ] **Document Preview**
  - [ ] PDF 文件可预览
  - [ ] 图片文件可预览
  - [ ] 文件可下载

---

## 十、进度追踪

### 当前状态

| Phase | 状态 | 完成度 | 备注 |
|-------|------|--------|------|
| Phase 0 | ✅ 完成 | 100% | 紧急修复已完成 |
| Phase 1 | ⏳ 待开始 | 0% | 等待监督者确认开始 |
| Phase 2 | ⏳ 待开始 | 0% | - |
| Phase 3 | ⏳ 待开始 | 0% | - |
| Phase 4 | ⏳ 待开始 | 0% | - |

### 更新记录

| 日期 | 更新内容 | 操作者 |
|------|----------|--------|
| 2026-01-28 | 创建恢复计划文档 | Claude |
| 2026-01-28 | 完成 Phase 0 紧急修复 | Claude |
| 2026-01-28 | 深度分析旧项目架构 | Claude |
| 2026-01-28 | 采用现代化方案 (snake_case + 标准术语) | Claude |

---

## 十一、关键参考

### 旧项目核心函数

| 函数 | 位置 | 用途 |
|------|------|------|
| `prepare_text_content()` | ocr_service.py:1044 | 生成完整提示词 |
| `build_function_schema()` | ocr_service.py:1325 | 生成 Function Calling Schema |
| `normalize_to_template()` | ocr_service.py:417 | 验证和标准化输出 |
| `compute_document_confidence()` | ocr_service.py:720 | 计算文档置信度 |

### 命名映射表 (旧 → 新)

用于阅读旧代码时的快速参考：

| 旧项目 | 新项目 |
|--------|--------|
| `fieldName` | `name` |
| `fieldDescription` | `description` |
| `mandatory` | `required` |
| `outputType` | `type` |
| `defaultValue` | `default_value` |
| `fixedValue` | `fixed_value` |
| `columnName` | `name` |
| `columnDescription` | `description` |
| `tableDescription` | `description` |
| `lineItems` | `line_items` |
