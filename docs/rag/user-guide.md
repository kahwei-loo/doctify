# RAG User Guide - Doctify AI-Powered Q&A

## Overview

Doctify's RAG (Retrieval-Augmented Generation) system allows you to ask questions about your uploaded documents and receive AI-generated answers based on the actual content. The system intelligently searches through your documents, retrieves relevant information, and provides contextualized answers with source citations.

**Key Capabilities:**
- Ask natural language questions about your documents
- Receive AI-generated answers with source citations
- Search across multiple documents simultaneously
- Get relevant context even from large document collections

---

## Quick Start

### 1. Upload Documents

Before using RAG, you need documents in your Doctify account:

1. Navigate to **Documents** page
2. Click **Upload Document**
3. Select PDF, JPEG, PNG, TIFF, or WebP files (max 50MB)
4. Wait for OCR processing to complete
5. Document is automatically indexed for RAG queries

**Tip:** For best results, ensure your documents have clear, readable text. OCR quality directly affects RAG accuracy.

---

### 2. Ask Your First Question

Navigate to the **RAG** or **Ask AI** section:

1. **Enter your question** in natural language
   - Good: "What are the quarterly revenue numbers?"
   - Good: "What security features does the platform have?"
   - Avoid: Single keywords like "revenue" (be specific!)

2. **Click Ask** and wait for response (typically 2-5 seconds)

3. **Review the answer** with source citations

**Example Interaction:**

```
Question: What is Doctify?

Answer: Doctify is an enterprise-grade AI-powered SaaS platform
designed for intelligent document processing, OCR, and advanced
document management. [Source 1: doctify_info.txt, Chunk 0]

Sources:
  ✓ doctify_info.txt (Chunk 0, Similarity: 0.695)
```

---

## Understanding RAG Responses

### Answer Components

Each RAG response includes:

1. **Answer**: AI-generated response based on document context
2. **Sources**: Document chunks used to generate the answer
3. **Similarity Scores**: How relevant each source is (0.0-1.0)
4. **Confidence**: Overall answer confidence (0.0-1.0)
5. **Model Used**: AI model that generated the answer (e.g., gpt-4)

### Interpreting Similarity Scores

Similarity scores indicate how closely document chunks match your question:

- **0.7-1.0** (High): Very strong match, highly relevant
- **0.5-0.7** (Medium): Good match, relevant context
- **0.3-0.5** (Low-Medium): Somewhat relevant, may be useful
- **Below 0.3**: Weak match, may be tangentially related

**Default threshold:** 0.5 (only chunks scoring ≥ 0.5 are used)

### Confidence Scores

Answer confidence reflects how well the AI could answer based on available context:

- **0.8-1.0**: High confidence, strong evidence in documents
- **0.6-0.8**: Medium confidence, adequate information found
- **0.4-0.6**: Low confidence, limited relevant information
- **Below 0.4**: Very low confidence, answer may be speculative

---

## Advanced Usage

### Searching Specific Documents

To search within specific documents only:

1. Select documents from the **Document Filter** dropdown
2. Ask your question as normal
3. RAG will only search selected documents

**Use Case:** You have multiple projects and want answers from specific project documents only.

### Adjusting Search Parameters

Advanced users can fine-tune RAG behavior:

#### Top K (Number of Chunks)

- **Default:** 5 chunks
- **Range:** 1-20 chunks
- **When to adjust:**
  - Simple questions → Use 3-5 chunks (faster, more focused)
  - Complex questions → Use 8-15 chunks (more context)
  - Comprehensive answers → Use 15-20 chunks (maximum context)

#### Similarity Threshold

- **Default:** 0.5
- **Range:** 0.0-1.0
- **When to adjust:**
  - Too few results → Lower to 0.3-0.4 (more permissive)
  - Too many irrelevant results → Raise to 0.6-0.7 (more strict)
  - Exploratory questions → Lower threshold
  - Specific factual queries → Higher threshold

**Example API Request:**
```json
{
  "question": "What are the risk factors?",
  "top_k": 10,
  "similarity_threshold": 0.4,
  "document_ids": ["uuid-1", "uuid-2"]
}
```

---

## Best Practices

### Writing Effective Questions

✅ **DO:**
- Be specific: "What were Q4 2023 revenue numbers?" vs. "revenue?"
- Use natural language: Ask questions as you would to a colleague
- Provide context: "In the security documentation, what authentication methods are supported?"
- Ask one thing at a time: Focused questions get better answers

❌ **DON'T:**
- Use single keywords: "security", "pricing" (too vague)
- Ask questions with no context in documents
- Combine multiple unrelated questions
- Expect answers to information not in your documents

### Optimizing Document Content

For best RAG performance, your documents should:

1. **Have clear structure**: Headers, sections, organized content
2. **Use readable text**: Clean OCR, proper formatting
3. **Include context**: Don't rely heavily on abbreviations without definitions
4. **Be relevant**: Upload documents pertinent to expected questions

### When RAG Cannot Answer

You'll receive "I don't have relevant documents..." when:

- No documents uploaded yet
- Question is completely unrelated to document content
- Similarity threshold too high (all chunks filtered out)
- Documents don't contain the requested information

**Solution:** Upload relevant documents or rephrase your question to match available content.

---

## Common Issues and Solutions

### Issue: "No relevant documents found"

**Possible Causes:**
1. No documents uploaded
2. Question unrelated to document content
3. Similarity threshold too strict

**Solutions:**
- Upload relevant documents first
- Rephrase question to match document terminology
- Lower similarity threshold to 0.3-0.4

---

### Issue: Answer seems generic or incorrect

**Possible Causes:**
1. Insufficient context retrieved
2. Document content unclear or ambiguous
3. Question too vague

**Solutions:**
- Increase `top_k` to retrieve more context (try 10-15)
- Lower similarity threshold to 0.4
- Ask more specific questions
- Verify document content is accurate

---

### Issue: Slow response times

**Possible Causes:**
1. Large number of documents indexed
2. High `top_k` value
3. Complex AI model processing

**Normal Behavior:**
- First query after upload: 5-10 seconds (indexing)
- Subsequent queries: 2-5 seconds

**Solutions:**
- Use document filters to search specific documents only
- Reduce `top_k` to 5 or fewer for simple questions
- This is expected for comprehensive answers

---

### Issue: Different answers to same question

**This is normal!** RAG can produce slightly different answers because:

1. **AI models are non-deterministic** (by design for natural language)
2. **Context selection may vary** slightly between runs
3. **Document updates** change available information

**For consistent answers:** Use lower AI temperature (requires API access).

---

## Privacy and Security

### Data Handling

- **Document Privacy:** Only you can access your uploaded documents
- **Query History:** Saved for your reference and feedback
- **AI Processing:** Queries sent to OpenAI/Anthropic/Google AI with encryption
- **No Training:** Your data is NOT used to train AI models

### Access Control

- **User Isolation:** RAG only searches your documents, not others'
- **Authentication Required:** All RAG queries require valid login
- **Audit Logging:** All queries are logged for security compliance

---

## Feedback and Improvement

### Rate Answers

After receiving an answer, you can provide feedback:

1. **Star Rating:** 1 (poor) to 5 (excellent)
2. **Text Feedback:** Optional comments about answer quality

**Your feedback helps:**
- Improve RAG system performance
- Identify problematic document types
- Train better document processing models

---

## Query History

Access your previous questions and answers:

1. Navigate to **RAG History**
2. View all past queries with:
   - Original question
   - AI-generated answer
   - Sources used
   - Timestamp
   - Your feedback rating (if provided)

3. Filter by date range or search by keywords

**Use Cases:**
- Review past research
- Track document insights over time
- Share findings with team members

---

## API Access

For developers integrating RAG into applications:

**Endpoint:** `POST /api/v1/rag/query`

**Request:**
```json
{
  "question": "What are the main findings?",
  "top_k": 5,
  "similarity_threshold": 0.5,
  "document_ids": ["optional-uuid-filter"],
  "model": "gpt-4"
}
```

**Response:**
```json
{
  "id": "query-uuid",
  "question": "What are the main findings?",
  "answer": "Based on the research...",
  "sources": [
    {
      "chunk_text": "Key finding...",
      "document_name": "research.pdf",
      "similarity_score": 0.82
    }
  ],
  "confidence_score": 0.75,
  "tokens_used": 450
}
```

**Documentation:** See API documentation at `/docs` (development mode).

---

## Limitations

Current RAG system limitations:

1. **Document Types:** PDF and images only (no Word, Excel, etc.)
2. **Language:** Optimized for English (other languages may work but with reduced accuracy)
3. **Document Size:** 30 pages max per document (hard limit)
4. **Context Window:** Limited to 20 chunks per query
5. **Real-time Updates:** Document changes require re-upload and re-indexing

**Future Enhancements:** See project roadmap for planned features.

---

## Getting Help

### Support Resources

- **Documentation:** `/docs` directory for technical guides
- **Issue Tracker:** GitHub Issues for bug reports
- **Community:** Discussions for questions and tips

### Troubleshooting Checklist

Before requesting support:

1. ✅ Verified documents are uploaded and processed
2. ✅ Tried rephrasing the question
3. ✅ Adjusted `top_k` and `similarity_threshold` parameters
4. ✅ Checked query history for similar successful queries
5. ✅ Reviewed this user guide

---

## Glossary

**Chunk:** A segment of text from a document (typically 200-500 words) used for semantic search.

**Embedding:** Numerical representation of text meaning, used for similarity comparison.

**RAG (Retrieval-Augmented Generation):** AI technique combining document search with answer generation.

**Semantic Search:** Search based on meaning rather than exact keyword matching.

**Similarity Score:** Numerical measure (0.0-1.0) of how closely a text chunk matches your question.

**Vector Index:** Database structure enabling fast semantic search across embeddings.

---

## Changelog

### Version 1.0 (Phase 11 - January 2026)
- Initial RAG implementation
- Semantic search with pgvector
- Multi-AI provider support (OpenAI, Anthropic, Google AI)
- Query history and feedback
- Configurable search parameters

---

**Document Version:** 1.0
**Last Updated:** January 23, 2026
**For:** Doctify v1.0 (Phase 11 RAG Implementation)
