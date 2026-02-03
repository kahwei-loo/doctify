# Week 1: Documents页增量优化 - 详细任务计划

**工期**: 5天 (10-12小时 full-time equivalent)
**开始日期**: Phase 1 Week 1
**目标**: 补充OCR确认流程 + 完善Critical States，无需重构现有功能

---

## 📋 任务概览

| 任务ID | 任务名称 | 工作量 | 优先级 | 依赖 |
|--------|---------|--------|--------|------|
| **前端任务** | | **8-10h** | | |
| T1.1 | OCR确认页面实现 | 6-8h | 🔴 Critical | None |
| T1.2 | Critical States补充 | 2-3h | 🟡 High | T1.1 |
| **后端任务** | | **2-3h** | | |
| T2.1 | 新增confirm endpoint | 2-3h | 🔴 Critical | None |

---

## 🎯 当前状态评估

### ✅ 已完整实现功能（无需开发）

```yaml
Navigation:
  ✅ Sidebar L1导航 (Sidebar.tsx - 220行)
     - 8个导航项，可展开/收起
     - 选中状态高亮
     - Tooltip支持

Project Management:
  ✅ ProjectPanel L2侧边栏 (ProjectPanel.tsx - 240行)
     - 项目列表 + Overall View
     - 项目选择器 + 搜索
     - Create New Project按钮
     - 可收起/展开

Document Display:
  ✅ DocumentTable L3内容区 (DocumentTable.tsx - 400行)
     - 文档列表（文件名、状态、日期、操作）
     - 批量操作（删除、导出、重试）
     - 排序/筛选/搜索

Upload Workflow:
  ✅ DocumentUploadZone (200行)
     - 拖拽上传区域
     - 文件类型验证 (PDF, images, office)
     - 文件大小验证 (10MB limit)
     - 预览缩略图

  ✅ UploadQueue (210行)
     - 多文件并行上传
     - 上传进度显示
     - 取消/重试功能
     - 错误处理

  ✅ Full-page Drag & Drop (DocumentsPage.tsx lines 169-230)
     - 全页面拖拽支持
     - 拖拽时视觉反馈
     - 项目验证（必须选择项目）

Real-time Updates:
  ✅ useDocumentListWebSocket (150行)
     - WebSocket连接管理
     - 实时文档状态更新
     - 进度事件处理

  ✅ Connection indicator (DocumentsPage.tsx lines 407-423)
     - Live/Connecting状态显示
     - 绿/黄色指示灯

Partial Critical States:
  ✅ Empty State: "Select a project to upload" (DocumentsPage.tsx lines 456-475)
  ✅ Loading States: Skeleton screens + Spinners
  ✅ Error Handling: Toast notifications
```

### ❌ 缺失功能（需要开发）

```yaml
OCR Confirmation Flow:
  ❌ OCR结果确认页面（左右分栏）
  ❌ 可编辑表单字段（用户修正提取错误）
  ❌ Confirm & Save / Discard按钮
  ❌ 后端confirm endpoint

Enhanced Critical States:
  ❌ OCR处理失败Error State（带重试）
  ❌ 删除确认Dialogs（显示影响范围）
  ❌ 放弃编辑确认Dialog
```

---

## 📝 详细任务分解

### Task 1.1: OCR确认页面实现 (6-8小时)

**目标**: 用户可查看OCR提取结果，修正错误，确认保存

#### 1.1.1 Confirmation Tab基础布局 (2-3小时)

**文件**: `frontend/src/pages/DocumentDetailPage.tsx`

**当前状态**:
```typescript
// DocumentDetailPage.tsx 当前可能存在基础框架
// 需要添加新的Tab: "Confirm Extraction"
```

**实施步骤**:

```typescript
// Step 1: 添加Tab导航 (30分钟)
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const DocumentDetailPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'preview' | 'confirm' | 'history'>('preview');

  return (
    <div className="container mx-auto p-6">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="preview">Preview</TabsTrigger>
          <TabsTrigger value="confirm">Confirm Extraction</TabsTrigger>
          <TabsTrigger value="history">Edit History</TabsTrigger>
        </TabsList>

        <TabsContent value="preview">
          {/* 现有Preview内容 */}
        </TabsContent>

        <TabsContent value="confirm">
          <DocumentConfirmationView documentId={documentId} />
        </TabsContent>

        <TabsContent value="history">
          {/* 现有History内容 */}
        </TabsContent>
      </Tabs>
    </div>
  );
};

// Step 2: 创建DocumentConfirmationView组件 (1.5-2小时)
// 文件: frontend/src/features/documents/components/DocumentConfirmationView.tsx

interface DocumentConfirmationViewProps {
  documentId: string;
}

const DocumentConfirmationView: React.FC<DocumentConfirmationViewProps> = ({ documentId }) => {
  const { data: document, isLoading } = useGetDocumentQuery(documentId);
  const [editedData, setEditedData] = useState<ExtractedData | null>(null);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    if (document?.extracted_data) {
      setEditedData(document.extracted_data);
    }
  }, [document]);

  const handleFieldChange = (field: string, value: any) => {
    setEditedData(prev => ({ ...prev, [field]: value }));
    setHasChanges(true);
  };

  if (isLoading) return <Skeleton className="h-[600px]" />;
  if (!document) return <div>Document not found</div>;

  return (
    <div className="grid grid-cols-2 gap-6 h-[calc(100vh-200px)]">
      {/* 左侧: 原始图片预览 */}
      <div className="border rounded-lg p-4 overflow-auto">
        <h3 className="text-lg font-semibold mb-4">Original Document</h3>
        <DocumentPreview
          document={document}
          highlightedField={null} // TODO: 实现字段高亮
        />
      </div>

      {/* 右侧: 可编辑提取结果 */}
      <div className="border rounded-lg p-4 overflow-auto">
        <h3 className="text-lg font-semibold mb-4">Extracted Data</h3>
        {editedData && (
          <>
            <ExtractedStructuredView
              data={editedData}
              editable={true}
              onChange={handleFieldChange}
            />
            <LineItemsTable
              items={editedData.line_items || []}
              editable={true}
              onChange={(items) => handleFieldChange('line_items', items)}
            />
          </>
        )}
      </div>
    </div>
  );
};

// Step 3: 使ExtractedStructuredView可编辑 (30分钟)
// 文件: frontend/src/features/documents/components/ExtractedStructuredView.tsx
// 添加editable和onChange props
// 将只读字段改为Input组件

interface ExtractedStructuredViewProps {
  data: ExtractedData;
  editable?: boolean;
  onChange?: (field: string, value: any) => void;
}

// 示例: 将只读字段改为可编辑
{editable ? (
  <Input
    value={data.invoice_number}
    onChange={(e) => onChange?.('invoice_number', e.target.value)}
  />
) : (
  <span>{data.invoice_number}</span>
)}
```

**验收标准**:
- [ ] DocumentDetailPage有3个Tab: Preview, Confirm, History
- [ ] Confirm Tab显示左右分栏布局
- [ ] 左侧显示原始文档图片
- [ ] 右侧显示提取数据（可编辑）
- [ ] 编辑字段后hasChanges状态正确更新

---

#### 1.1.2 确认操作按钮 (1-2小时)

**实施步骤**:

```typescript
// Step 1: 添加底部操作栏 (30分钟)
const DocumentConfirmationView: React.FC = ({ documentId }) => {
  const [confirmDocument] = useConfirmDocumentMutation();
  const [isSaving, setIsSaving] = useState(false);

  const handleDiscard = () => {
    if (hasChanges) {
      // 显示确认Dialog
      setShowDiscardDialog(true);
    } else {
      // 直接返回列表
      navigate('/documents');
    }
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      await confirmDocument({
        documentId,
        data: {
          ocr_data: editedData,
          user_confirmed: true,
        },
      }).unwrap();

      toast.success('Document confirmed successfully');
      navigate('/documents');
    } catch (error: any) {
      toast.error(error?.data?.detail || 'Failed to confirm document');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      <div className="grid grid-cols-2 gap-6">
        {/* ... 左右分栏内容 ... */}
      </div>

      {/* 底部操作栏 */}
      <div className="flex items-center justify-between mt-6 pt-6 border-t">
        <div className="text-sm text-muted-foreground">
          {hasChanges && (
            <span className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-orange-500" />
              You have unsaved changes
            </span>
          )}
        </div>

        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={handleDiscard}
            disabled={isSaving}
          >
            Discard
          </Button>
          <Button
            onClick={handleSave}
            disabled={!hasChanges || isSaving}
          >
            {isSaving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              'Save & Confirm'
            )}
          </Button>
        </div>
      </div>
    </>
  );
};

// Step 2: 实现Discard确认Dialog (30分钟)
const DiscardConfirmDialog: React.FC = ({ open, onOpenChange, onConfirm }) => (
  <AlertDialog open={open} onOpenChange={onOpenChange}>
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle>Discard changes?</AlertDialogTitle>
        <AlertDialogDescription>
          You have unsaved changes to the extracted data.
          If you discard, all your corrections will be lost.
        </AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel>Continue Editing</AlertDialogCancel>
        <AlertDialogAction onClick={onConfirm} className="bg-destructive">
          Discard Changes
        </AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
);

// Step 3: 添加页面离开前确认 (30分钟)
useEffect(() => {
  const handleBeforeUnload = (e: BeforeUnloadEvent) => {
    if (hasChanges) {
      e.preventDefault();
      e.returnValue = '';
    }
  };

  window.addEventListener('beforeunload', handleBeforeUnload);
  return () => window.removeEventListener('beforeunload', handleBeforeUnload);
}, [hasChanges]);
```

**验收标准**:
- [ ] 底部显示操作栏（Discard + Save & Confirm按钮）
- [ ] 有未保存修改时显示提示文字
- [ ] Discard按钮点击显示确认Dialog
- [ ] Save按钮调用confirm API并显示loading状态
- [ ] 保存成功后自动返回Documents列表
- [ ] 页面离开前有未保存修改提示

---

#### 1.1.3 状态管理与错误处理 (2-3小时)

**实施步骤**:

```typescript
// Step 1: 添加Redux API endpoint (1小时)
// 文件: frontend/src/store/api/documentsApi.ts

export const documentsApi = createApi({
  // ... existing endpoints ...

  confirmDocument: builder.mutation<Document, ConfirmDocumentRequest>({
    query: ({ documentId, data }) => ({
      url: `/documents/${documentId}/confirm`,
      method: 'POST',
      body: data,
    }),
    invalidatesTags: (result, error, { documentId }) => [
      { type: 'Document', id: documentId },
      { type: 'Document', id: 'LIST' },
    ],
  }),
});

export const { useConfirmDocumentMutation } = documentsApi;

// Step 2: 字段级别修改追踪 (30分钟)
interface FieldChange {
  field: string;
  originalValue: any;
  newValue: any;
  timestamp: Date;
}

const [changes, setChanges] = useState<FieldChange[]>([]);

const handleFieldChange = (field: string, value: any) => {
  const originalValue = document?.extracted_data?.[field];

  if (originalValue !== value) {
    setChanges(prev => [
      ...prev.filter(c => c.field !== field),
      { field, originalValue, newValue: value, timestamp: new Date() },
    ]);
  }

  setEditedData(prev => ({ ...prev, [field]: value }));
  setHasChanges(true);
};

// Step 3: 保存失败重试机制 (30分钟)
const [retryCount, setRetryCount] = useState(0);
const MAX_RETRIES = 3;

const handleSaveWithRetry = async () => {
  try {
    setIsSaving(true);
    await confirmDocument({
      documentId,
      data: { ocr_data: editedData, user_confirmed: true },
    }).unwrap();

    toast.success('Document confirmed successfully');
    navigate('/documents');
  } catch (error: any) {
    if (retryCount < MAX_RETRIES) {
      setRetryCount(prev => prev + 1);
      toast.error(`Save failed. Retrying... (${retryCount + 1}/${MAX_RETRIES})`);

      // Exponential backoff
      await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, retryCount)));
      handleSaveWithRetry();
    } else {
      toast.error(error?.data?.detail || 'Failed to confirm document after multiple retries');
    }
  } finally {
    setIsSaving(false);
  }
};

// Step 4: 实时保存草稿（可选，1小时）
useEffect(() => {
  if (!hasChanges) return;

  const timer = setTimeout(() => {
    // 保存到localStorage作为草稿
    localStorage.setItem(`draft_${documentId}`, JSON.stringify(editedData));
  }, 2000); // 2秒debounce

  return () => clearTimeout(timer);
}, [editedData, documentId, hasChanges]);

// 页面加载时恢复草稿
useEffect(() => {
  const draft = localStorage.getItem(`draft_${documentId}`);
  if (draft) {
    const shouldRestore = confirm('Found unsaved changes. Restore draft?');
    if (shouldRestore) {
      setEditedData(JSON.parse(draft));
      setHasChanges(true);
    } else {
      localStorage.removeItem(`draft_${documentId}`);
    }
  }
}, [documentId]);
```

**验收标准**:
- [ ] Redux API endpoint正确配置
- [ ] 字段修改被追踪（显示修改历史）
- [ ] 保存失败自动重试（最多3次）
- [ ] 草稿自动保存到localStorage（可选）
- [ ] 页面刷新后可恢复草稿（可选）

---

### Task 1.2: Critical States补充 (2-3小时)

#### 1.2.1 Error States增强 (1-1.5小时)

```typescript
// Step 1: OCR处理失败State (30分钟)
// 文件: frontend/src/features/documents/components/OCRErrorState.tsx

const OCRErrorState: React.FC<{ document: Document; onRetry: () => void }> = ({
  document,
  onRetry,
}) => (
  <Card className="border-destructive/50 bg-destructive/5">
    <CardContent className="pt-6">
      <div className="flex items-start gap-4">
        <div className="p-3 rounded-full bg-destructive/10">
          <AlertCircle className="h-6 w-6 text-destructive" />
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-lg mb-2">OCR Processing Failed</h3>
          <p className="text-muted-foreground mb-4">
            {document.error_message || 'Unable to extract text from this document.'}
          </p>

          {/* 可能的原因 */}
          <div className="bg-background rounded-lg p-3 mb-4">
            <p className="text-sm font-medium mb-2">Possible reasons:</p>
            <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
              <li>Poor image quality or low resolution</li>
              <li>Unsupported document format</li>
              <li>Document is encrypted or password-protected</li>
              <li>Text is handwritten or in an unsupported language</li>
            </ul>
          </div>

          {/* 解决方案 */}
          <div className="flex gap-2">
            <Button onClick={onRetry}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Retry Processing
            </Button>
            <Button variant="outline" onClick={() => window.open('/docs/ocr-troubleshooting')}>
              Troubleshooting Guide
            </Button>
          </div>
        </div>
      </div>
    </CardContent>
  </Card>
);

// Step 2: 网络错误State (30分钟)
const NetworkErrorState: React.FC = ({ onRetry }) => (
  <div className="flex flex-col items-center justify-center h-64 gap-4">
    <WifiOff className="h-12 w-12 text-muted-foreground" />
    <div className="text-center">
      <h3 className="font-semibold text-lg mb-1">Connection Lost</h3>
      <p className="text-muted-foreground">
        Unable to connect to the server. Please check your internet connection.
      </p>
    </div>
    <Button onClick={onRetry} variant="outline">
      <RefreshCw className="mr-2 h-4 w-4" />
      Retry Connection
    </Button>
  </div>
);

// Step 3: 文件损坏Error (30分钟)
const CorruptedFileError: React.FC = () => (
  <Alert variant="destructive">
    <AlertCircle className="h-4 w-4" />
    <AlertTitle>File Corrupted</AlertTitle>
    <AlertDescription>
      This file appears to be corrupted and cannot be processed.
      Please try uploading a different version of the file.
    </AlertDescription>
  </Alert>
);
```

**验收标准**:
- [ ] OCR失败显示详细错误原因
- [ ] 提供可能原因列表
- [ ] 提供重试和Troubleshooting Guide链接
- [ ] 网络错误显示连接丢失提示
- [ ] 文件损坏显示明确错误信息

---

#### 1.2.2 Confirmation Dialogs (1-1.5小时)

```typescript
// Step 1: 删除项目确认Dialog (30分钟)
// 文件: frontend/src/features/projects/components/DeleteProjectDialog.tsx

const DeleteProjectDialog: React.FC<{
  project: Project;
  onConfirm: () => void;
  onCancel: () => void;
}> = ({ project, onConfirm, onCancel }) => (
  <AlertDialog open={true} onOpenChange={onCancel}>
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle>Delete "{project.name}"?</AlertDialogTitle>
        <AlertDialogDescription asChild>
          <div className="space-y-3">
            <p>This will permanently delete:</p>
            <ul className="list-disc list-inside text-sm space-y-1">
              <li><strong>{project.document_count}</strong> documents</li>
              <li>All extracted data and processing history</li>
              <li>All project configuration and settings</li>
            </ul>
            <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3">
              <p className="text-sm font-medium text-destructive">
                ⚠️ This action cannot be undone.
              </p>
            </div>
          </div>
        </AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel>Cancel</AlertDialogCancel>
        <AlertDialogAction onClick={onConfirm} className="bg-destructive hover:bg-destructive/90">
          Delete Project
        </AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
);

// Step 2: 批量删除文档确认Dialog (30分钟)
const DeleteDocumentsDialog: React.FC<{
  documentIds: string[];
  onConfirm: () => void;
}> = ({ documentIds, onConfirm }) => {
  const count = documentIds.length;

  return (
    <AlertDialog>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            Delete {count} {count === 1 ? 'document' : 'documents'}?
          </AlertDialogTitle>
          <AlertDialogDescription>
            {count === 1 ? 'This document' : 'These documents'} will be permanently deleted
            along with all extracted data and processing history.

            {count > 5 && (
              <div className="mt-3 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg p-3">
                <p className="text-sm text-orange-800 dark:text-orange-200">
                  ⚠️ You are about to delete {count} documents. This is a large operation.
                </p>
              </div>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm} className="bg-destructive">
            Delete {count === 1 ? 'Document' : `${count} Documents`}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

// Step 3: 放弃OCR编辑确认Dialog (30分钟)
// 已在Task 1.1.2实现
```

**验收标准**:
- [ ] 删除项目Dialog显示影响范围（文档数）
- [ ] 批量删除显示文档数量
- [ ] 大批量操作（>5个）显示额外警告
- [ ] 所有Dialog有明确的"无法撤销"警告
- [ ] 按钮颜色使用destructive样式

---

### Task 2.1: 后端confirm endpoint (2-3小时)

**文件**: `backend/app/api/v1/endpoints/documents.py`

**实施步骤**:

```python
# Step 1: 创建Pydantic Schema (30分钟)
# 文件: backend/app/models/documents.py

class DocumentConfirmRequest(BaseModel):
    """Request schema for confirming OCR extraction."""
    ocr_data: Dict[str, Any] = Field(
        ...,
        description="User-corrected OCR data"
    )
    user_confirmed: bool = Field(
        default=True,
        description="Confirmation flag"
    )

    class Config:
        json_schema_extra = {
            "example": {
                "ocr_data": {
                    "invoice_number": "INV-2024-001",
                    "date": "2024-01-15",
                    "total": 1250.00,
                    "line_items": [
                        {"description": "Service A", "amount": 1000.00},
                        {"description": "Service B", "amount": 250.00}
                    ]
                },
                "user_confirmed": True
            }
        }


# Step 2: 实现endpoint (1-1.5小时)
@router.post(
    "/{document_id}/confirm",
    response_model=DocumentResponse,
    summary="Confirm OCR extraction results",
    description="Save user-corrected OCR data and mark document as confirmed"
)
async def confirm_document_extraction(
    document_id: str,
    data: DocumentConfirmRequest,
    current_user: User = Depends(get_current_user),
    repo: DocumentRepository = Depends(get_document_repository)
) -> DocumentResponse:
    """
    Confirm OCR extraction results with optional user corrections.

    Updates document status to 'confirmed' and saves user-corrected data.
    """
    # 1. 验证文档存在和权限
    document = await repo.get_by_id(document_id)
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")

    if document.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to access this document")

    # 2. 验证文档状态（必须是completed才能confirm）
    if document.status != "completed":
        raise HTTPException(
            status_code=400,
            detail=f"Cannot confirm document in '{document.status}' status. "
                   "Document must be 'completed' first."
        )

    # 3. 保存user_corrected_data
    updated_document = await repo.update(
        document_id,
        {
            "status": "confirmed",
            "user_corrected_data": data.ocr_data,
            "confirmed_at": datetime.utcnow(),
            "confirmed_by": current_user.id,
        }
    )

    # 4. 记录审计日志
    await audit_log_service.log(
        user_id=current_user.id,
        action="document.confirmed",
        resource_type="document",
        resource_id=document_id,
        details={"has_corrections": data.ocr_data != document.extracted_data}
    )

    return updated_document


# Step 3: 添加Unit Tests (1小时)
# 文件: backend/tests/unit/test_api/test_documents.py

@pytest.mark.asyncio
async def test_confirm_document_extraction_success(
    client: AsyncClient,
    test_user: User,
    test_document: Document
):
    """Test successful document confirmation."""
    # Setup: Document in 'completed' status
    test_document.status = "completed"
    test_document.extracted_data = {"invoice_number": "INV-001"}

    response = await client.post(
        f"/api/v1/documents/{test_document.id}/confirm",
        json={
            "ocr_data": {"invoice_number": "INV-002"},  # User corrected
            "user_confirmed": True
        },
        headers={"Authorization": f"Bearer {test_user.access_token}"}
    )

    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "confirmed"
    assert data["user_corrected_data"]["invoice_number"] == "INV-002"
    assert data["confirmed_at"] is not None


@pytest.mark.asyncio
async def test_confirm_document_not_completed(
    client: AsyncClient,
    test_user: User,
    test_document: Document
):
    """Test confirming document that's not completed."""
    # Setup: Document in 'processing' status
    test_document.status = "processing"

    response = await client.post(
        f"/api/v1/documents/{test_document.id}/confirm",
        json={"ocr_data": {}, "user_confirmed": True},
        headers={"Authorization": f"Bearer {test_user.access_token}"}
    )

    assert response.status_code == 400
    assert "completed" in response.json()["detail"].lower()


@pytest.mark.asyncio
async def test_confirm_document_unauthorized(
    client: AsyncClient,
    test_user: User,
    other_users_document: Document
):
    """Test confirming document owned by another user."""
    response = await client.post(
        f"/api/v1/documents/{other_users_document.id}/confirm",
        json={"ocr_data": {}, "user_confirmed": True},
        headers={"Authorization": f"Bearer {test_user.access_token}"}
    )

    assert response.status_code == 403
```

**验收标准**:
- [ ] POST /documents/{document_id}/confirm endpoint就绪
- [ ] 验证文档归属权限
- [ ] 验证文档状态（必须是completed）
- [ ] 保存user_corrected_data到数据库
- [ ] 更新status为confirmed
- [ ] 记录confirmed_at和confirmed_by
- [ ] Unit tests覆盖率 >80%
- [ ] API文档自动生成（FastAPI /docs）

---

## 📊 进度追踪模板

### Day 1-2: OCR确认页面

```markdown
- [ ] **Task 1.1.1**: Confirmation Tab基础布局 (2-3h)
  - Status: 📋 Not Started
  - Assignee: [Frontend Dev Name]
  - Start Date: YYYY-MM-DD
  - Completion Date: YYYY-MM-DD
  - Blockers: None
  - Notes:

- [ ] **Task 1.1.2**: 确认操作按钮 (1-2h)
  - Status: 📋 Not Started
  - Assignee: [Frontend Dev Name]
  - Blockers: Depends on Task 1.1.1
  - Notes:

- [ ] **Task 2.1**: 后端confirm endpoint (2-3h)
  - Status: 📋 Not Started
  - Assignee: [Backend Dev Name]
  - Blockers: None
  - Notes:
```

### Day 3: 状态管理

```markdown
- [ ] **Task 1.1.3**: 状态管理与错误处理 (2-3h)
  - Status: 📋 Not Started
  - Assignee: [Frontend Dev Name]
  - Blockers: Depends on Task 1.1.1, 1.1.2, Task 2.1
  - Notes:
```

### Day 4: Critical States

```markdown
- [ ] **Task 1.2.1**: Error States增强 (1-1.5h)
  - Status: 📋 Not Started
  - Assignee: [Frontend Dev Name]
  - Notes:

- [ ] **Task 1.2.2**: Confirmation Dialogs (1-1.5h)
  - Status: 📋 Not Started
  - Assignee: [Frontend Dev Name]
  - Notes:
```

### Day 5: 测试与验收

```markdown
- [ ] 手动测试OCR确认流程
- [ ] 验证所有Error States
- [ ] 验证所有Confirmation Dialogs
- [ ] Code Review
- [ ] Documentation更新
```

---

## ✅ 验收清单

### 功能验收

**OCR确认流程**:
- [ ] 用户可进入Confirm Extraction Tab
- [ ] 左侧显示原始文档图片
- [ ] 右侧显示可编辑的提取字段
- [ ] 用户修改字段后显示"unsaved changes"提示
- [ ] Discard按钮点击显示确认Dialog
- [ ] Save按钮调用API并显示loading状态
- [ ] 保存成功后自动返回Documents列表
- [ ] 文档状态更新为"Confirmed"

**Critical States**:
- [ ] OCR失败显示详细错误和重试按钮
- [ ] 网络错误显示连接丢失提示
- [ ] 删除项目显示影响范围确认Dialog
- [ ] 批量删除文档显示数量确认Dialog
- [ ] 放弃编辑显示未保存修改警告

### 技术验收

**前端**:
- [ ] TypeScript类型定义完整
- [ ] 组件可复用性良好
- [ ] 响应式设计正常（mobile/tablet/desktop）
- [ ] 无障碍访问（aria-labels, keyboard navigation）
- [ ] ESLint 0 errors
- [ ] 代码通过Code Review

**后端**:
- [ ] API endpoint文档完整（/docs可访问）
- [ ] 权限验证正确
- [ ] 错误处理完整
- [ ] Unit tests覆盖率 >80%
- [ ] Alembic migration无冲突
- [ ] 代码通过Code Review

---

## 🚀 快速开始指南

### 环境准备

```bash
# 1. 启动后端服务
cd backend
uvicorn app.main:app --reload --host 0.0.0.0 --port 8008

# 2. 启动前端服务
cd frontend
npm run dev

# 3. 验证环境
# 访问 http://localhost:3003
# 验证WebSocket连接正常
# 验证PostgreSQL + Redis连接
```

### 第一个任务

```bash
# 1. 创建功能分支
git checkout -b feature/ocr-confirmation-flow

# 2. 开始Task 1.1.1: Confirmation Tab
# 文件: frontend/src/pages/DocumentDetailPage.tsx
# 添加新Tab...

# 3. 提交进度
git add .
git commit -m "feat: add OCR confirmation tab layout"
```

### 开发建议

1. **从简单到复杂**: 先实现基础布局（Task 1.1.1），再添加交互（Task 1.1.2）
2. **前后端并行**: 前端可先用Mock Data，后端完成后对接
3. **增量提交**: 每完成一个Sub-task就提交一次
4. **及时Code Review**: Day 2结束时进行一次中期Review

---

## 📞 需要帮助？

如遇到问题，可以：
1. 查看现有组件实现（ProjectPanel, DocumentTable作为参考）
2. 参考ShadcnUI组件文档
3. 检查WebSocket实现（useDocumentListWebSocket.ts）
4. Review API Gap Analysis文档了解后端现状
