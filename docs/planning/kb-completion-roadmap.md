# Knowledge Base Module - Completion Roadmap

**Created**: 2026-02-10
**Goal**: Complete and polish KB module before AI Assistants
**Status**: Post-PR#3 Enhancement
**Branch Strategy**: `feature/kb-completion`

---

## 🎯 Strategy Rationale

### Why KB First?

1. **Foundation for AI Assistants** - Assistants依赖KB知识库
2. **Clear User Value** - 知识管理和检索是独立功能
3. **Well-Defined Scope** - 不涉及多渠道集成的复杂性
4. **Current State Issues** - 多个critical gaps需要修复

### Why Not AI Assistants Now?

1. **Requirements Mismatch** - 当前实现是simple chatbot，需求是客服系统
2. **Complex Integration** - WhatsApp/Messenger API集成需要架构设计
3. **Human-in-Loop** - 人工介入机制需要单独设计
4. **Depends on KB** - KB不完整时无法properly测试Assistants

---

## 🔴 Phase 1: Critical Fixes (P0) - Week 1

### 1.1 Fix Uploaded Documents Upload Flow

**Current State**:
- ✅ `UploadedDocsSource.tsx` component exists (fully functional)
- ❌ Not integrated into `DataSourceConfigDialog.tsx`
- ❌ Only shows placeholder: "Document upload will be available after creating..."
- ❌ No "Step 2" upload interface after creation

**Target State**:
- ✅ Two-step flow: Create Data Source → Upload Files
- ✅ Use existing `UploadedDocsSource.tsx` component
- ✅ Files uploaded to backend via `/api/v1/documents` endpoint
- ✅ Document UUIDs stored in `data_source.config.document_ids`

**Implementation**:

**Files to Modify**:
1. `DataSourceConfigDialog.tsx`:
   ```typescript
   // Remove hardcoded placeholder at line 344-354
   // Import and use UploadedDocsSource component instead

   import { UploadedDocsSource } from './sources/UploadedDocsSource';

   const renderUploadedDocsForm = () => (
     <UploadedDocsSource
       onFilesSelected={handleUploadedFiles}
     />
   );

   const handleUploadedFiles = (files: File[]) => {
     // Store files in state for upload after creation
     setSelectedFiles(files);
   };
   ```

2. `api.ts`:
   ```typescript
   // Add uploadDocuments function
   export const uploadDocuments = async (
     knowledgeBaseId: string,
     dataSourceId: string,
     files: File[]
   ): Promise<string[]> => {
     const formData = new FormData();
     files.forEach(file => formData.append('files', file));

     const response = await apiClient.post(
       `/api/v1/knowledge-bases/${knowledgeBaseId}/data-sources/${dataSourceId}/upload`,
       formData,
       { headers: { 'Content-Type': 'multipart/form-data' } }
     );

     return response.data.document_ids;
   };
   ```

3. Backend endpoint (if missing):
   - Check if `/api/v1/knowledge-bases/{kb_id}/data-sources/{ds_id}/upload` exists
   - Should accept multipart/form-data
   - Process files, create document records, return UUIDs
   - Update data_source.config.document_ids

**Alternative Approach** (Simpler):
- Create Data Source → Redirect to Data Source Detail page
- Detail page has "Upload Documents" section
- Uses `UploadedDocsSource.tsx` component
- Direct upload API call

**Effort**: 2-3 days
**Priority**: P0 (Critical - blocks user workflow)

---

### 1.2 Verify Complete KB Pipeline

**Current State**:
- ✅ Data sources can be created (Website, Text, Q&A, Structured Data)
- ❌ **No embeddings generated** (`document_embeddings` table has 0 rows)
- ❓ Chunking pipeline unknown status
- ❓ RAG query unknown status
- ❓ Vector retrieval unknown status

**Target State**:
- ✅ Data sources trigger embedding generation automatically
- ✅ `document_embeddings` table populated with vectors
- ✅ Test Query功能返回相关结果
- ✅ 向量检索precision >70%

**Verification Steps**:

1. **Test Chunking**:
   ```bash
   # Create a Text data source with known content
   # Check if chunks are created
   docker-compose exec doctify-postgres psql -U doctify -d doctify_development \
     -c "SELECT chunk_index, substring(chunk_text, 1, 100) FROM document_embeddings WHERE data_source_id = '...';"
   ```

2. **Test Embedding Generation**:
   ```bash
   # Verify embeddings exist
   SELECT COUNT(*), AVG(array_length(embedding::float[], 1)) as avg_dim
   FROM document_embeddings;

   # Expected: count > 0, avg_dim = 1536 (for OpenAI embeddings)
   ```

3. **Test RAG Query** (via API):
   ```bash
   curl -X POST http://localhost:50080/api/v1/knowledge-bases/{kb_id}/query \
     -H "Authorization: Bearer $TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"query": "test question", "top_k": 5}'

   # Should return relevant chunks from embeddings
   ```

4. **Test Vector Retrieval**:
   - Query: "What is X?"
   - Expected: Top 5 results should be semantically relevant
   - Measure precision: How many of top 5 are actually relevant?

**If Pipeline Broken**:
- Check Celery tasks: `docker-compose logs doctify-celery`
- Check embedding service logs
- Verify OpenAI API key configured
- Test embedding generation manually

**Effort**: 1-2 days (investigation + fixes)
**Priority**: P0 (Critical - core功能)

---

## 🟡 Phase 2: UX & Completeness (P1) - Week 2

### 2.1 User Flow Enhancement

**Goals**:
- Clear step-by-step guidance
- Loading states and progress indicators
- Error handling with actionable messages
- Success confirmation with next steps

**Features**:

1. **Onboarding Guide** (First-time users):
   - Welcome modal explaining KB workflow
   - Step-by-step tutorial overlay
   - Sample data source templates

2. **Progress Indicators**:
   - File upload progress bars
   - "Processing..." states for Website Crawler
   - "Generating embeddings..." status
   - Estimated time remaining

3. **Error Handling**:
   - Network errors: Retry button
   - File validation errors: Clear messages
   - Processing errors: Support contact info
   - API errors: User-friendly translations

4. **Success States**:
   - "Data source created successfully!" with checkmark
   - "X documents uploaded and processing"
   - "Ready for queries" badge when embeddings complete

**Effort**: 2-3 days
**Priority**: P1 (High - user experience)

---

### 2.2 KB Detail Page Polish

**Current Issues** (if any):
- Data source list display
- Edit/Delete functionality
- Statistics and metrics
- Search and filtering

**Target State**:
- ✅ Beautiful, responsive data source cards
- ✅ Quick actions (Edit, Delete, Sync)
- ✅ Status badges (Ready, Processing, Error)
- ✅ Statistics: Document count, Embedding count, Last synced
- ✅ Search and filter data sources
- ✅ Bulk operations (Delete multiple, Re-sync all)

**Effort**: 2-3 days
**Priority**: P1

---

### 2.3 Test Query Feature Enhancement

**Current State**: Unknown (need to verify exists and works)

**Target State**:
- ✅ Test Query tab/section in KB detail page
- ✅ Input: Natural language question
- ✅ Output: Top 5 relevant chunks with:
  - Source document/data source name
  - Relevance score
  - Highlighted matching text
  - "View full document" link
- ✅ Query history (last 10 queries)
- ✅ Example queries for demo

**Effort**: 1-2 days
**Priority**: P1 (Essential for validation)

---

## 🟢 Phase 3: Features & Polish (P2) - Week 3-4

### 3.1 Data Source Management

**Features**:
- Edit data source configuration
- Re-sync/Refresh data (for Website, Structured Data)
- Duplicate data source
- Export data source configuration
- Data source versioning (track changes)

**Effort**: 2-3 days
**Priority**: P2

---

### 3.2 Advanced Search & Filtering

**Features**:
- Full-text search across all data sources
- Filter by type, status, date created
- Sort by name, date, document count
- Saved searches/filters
- Search within specific data source

**Effort**: 1-2 days
**Priority**: P2

---

### 3.3 Analytics & Insights

**Features**:
- KB Overview Dashboard:
  - Total data sources by type (pie chart)
  - Total documents/embeddings (numbers)
  - Storage used (progress bar)
  - Processing status (active/queued/failed)
- Query Analytics:
  - Most common queries
  - Average response time
  - Retrieval precision metrics
- Data Source Health:
  - Last sync date
  - Failed syncs
  - Embedding coverage

**Effort**: 2-3 days
**Priority**: P2

---

### 3.4 Design System Audit

**Goals**:
- Consistent component styling
- Proper spacing and typography
- Responsive design (mobile/tablet)
- Accessibility (WCAG 2.1 AA)
- Dark mode support

**Effort**: 2-3 days
**Priority**: P2

---

## 📊 Success Criteria

### Functional Requirements ✅

- [ ] All 5 data source types fully functional
- [ ] Uploaded Documents: Files upload to backend
- [ ] Embeddings generated automatically after data source creation
- [ ] Test Query returns relevant results (precision >70%)
- [ ] Website Crawler processes pages and generates embeddings
- [ ] Structured Data schema extraction and embedding

### User Experience ✅

- [ ] Clear user flow from creation to query
- [ ] Loading states for all async operations
- [ ] Error messages are actionable
- [ ] Success states clearly indicate next steps
- [ ] Responsive design works on all devices

### Performance ✅

- [ ] File upload: <2s for 10MB file
- [ ] Embedding generation: <10s for 5 documents
- [ ] Query response: <1s for simple query
- [ ] Page load: <2s for KB detail page

### Quality ✅

- [ ] Zero console errors in production
- [ ] No TypeScript errors
- [ ] All tests passing (unit + integration)
- [ ] Accessibility audit passed
- [ ] Security review completed

---

## 🚀 Implementation Plan

### Week 1: Critical Fixes
- Day 1-2: Fix Uploaded Documents upload flow
- Day 3-4: Verify and fix KB pipeline (embeddings)
- Day 5: Testing and bug fixes

### Week 2: UX Enhancement
- Day 1-2: User flow enhancement (progress, errors, success)
- Day 3-4: KB Detail page polish
- Day 5: Test Query feature enhancement

### Week 3: Features
- Day 1-2: Data source management features
- Day 3: Advanced search & filtering
- Day 4-5: Analytics & insights

### Week 4: Polish & Launch
- Day 1-2: Design system audit
- Day 3: Comprehensive testing
- Day 4: Documentation update
- Day 5: Release prep and deployment

---

## 🔄 Testing Strategy

### Unit Tests
- Data source CRUD operations
- File upload validation
- Config builder functions
- API integration functions

### Integration Tests
- Complete data source creation flow
- File upload → Processing → Embeddings pipeline
- Query → Retrieval → Response flow
- Error scenarios (network, validation, API)

### E2E Tests (Playwright)
- Create each type of data source
- Upload files and verify processing
- Execute test queries and verify results
- Edit/Delete data sources

### Manual Testing Checklist
- [ ] Create Website data source → Verify embeddings generated
- [ ] Upload 5 PDF files → Verify all processed
- [ ] Add Text data source → Query returns relevant chunks
- [ ] Add Q&A pairs → Queries match exact answers
- [ ] Upload CSV → Schema extracted correctly
- [ ] Test Query with 10 different questions → Precision >70%
- [ ] Test on mobile device → Responsive design works
- [ ] Test error scenarios → Messages are clear

---

## 📝 Documentation Updates

### User Documentation
- [ ] KB module overview
- [ ] Data source type comparison guide
- [ ] Step-by-step: Create first data source
- [ ] Best practices: Structuring knowledge
- [ ] Troubleshooting common issues
- [ ] FAQ

### Developer Documentation
- [ ] KB architecture diagram
- [ ] Data flow: Creation → Processing → Embeddings → Query
- [ ] API endpoints reference
- [ ] Database schema for KB tables
- [ ] Celery task queue architecture
- [ ] Testing guide for KB features

---

## 🎯 Post-Completion: AI Assistants Phase

**Only after KB is stable and complete**, create new branch:
`feature/ai-assistants-customer-service`

**Scope**:
- Requirements gathering (customer service system vs. chatbot)
- WhatsApp/Messenger API integration design
- Human-in-loop architecture
- Conversation routing and assignment
- Agent dashboard for human takeover

**Estimated Timeline**: 3-4 weeks (separate from KB work)

---

**Branch**: `feature/kb-completion`
**Starting Point**: Current `main` (includes PR #3)
**Target Merge**: End of Week 4
**Success**: KB module production-ready, all features working end-to-end
