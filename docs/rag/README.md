# RAG Documentation

Comprehensive documentation for Doctify's RAG (Retrieval-Augmented Generation) system.

## 📚 Documentation Index

### For End Users

**[RAG User Guide](./user-guide.md)**
- How to use RAG for document Q&A
- Understanding answers and sources
- Best practices for asking questions
- Troubleshooting common issues
- API usage examples

**Target Audience:** All Doctify users

---

### For Developers & Administrators

**[RAG Tuning Guide](./tuning-guide.md)**
- Similarity threshold optimization
- Performance tuning and scaling
- Vector index strategies
- Monitoring and debugging
- Advanced configuration

**Target Audience:** Developers, system administrators, DevOps engineers

---

## Quick Reference

### Key Parameters

| Parameter | Default | Range | Purpose |
|-----------|---------|-------|---------|
| `similarity_threshold` | 0.5 | 0.0-1.0 | Minimum relevance score for chunks |
| `top_k` | 5 | 1-20 | Number of chunks to retrieve |

### Performance Targets

- Query latency: < 500ms (P95)
- Answer quality: > 0.6 confidence
- Chunk relevance: > 0.5 similarity

### Common Thresholds by Use Case

```python
# Exploratory questions (broad search)
similarity_threshold = 0.3

# General questions (default)
similarity_threshold = 0.5

# Specific factual queries (precise)
similarity_threshold = 0.6

# Technical documentation (very precise)
similarity_threshold = 0.7
```

---

## Additional Resources

### Technical Reports

- [RAG Test Report](../../RAG_TEST_REPORT.md) - Comprehensive testing and threshold analysis
- [Gap Analysis Report](../../GAP_ANALYSIS_REPORT.md) - Feature gaps and future enhancements

### API Documentation

- Interactive API docs: `/docs` endpoint (development mode)
- OpenAPI schema: `/openapi.json`

### Implementation Details

- **Backend**: `backend/app/services/rag/` - RAG service implementations
- **Database**: `backend/alembic/versions/007_*` - Vector index migration
- **Tests**: `backend/tests/integration/test_api/test_rag.py`

---

## Getting Started

### 1. Upload Documents
```bash
POST /api/v1/documents/upload
```

### 2. Ask Questions
```bash
POST /api/v1/rag/query
{
  "question": "What is Doctify?",
  "top_k": 5,
  "similarity_threshold": 0.5
}
```

### 3. Review Answers
```json
{
  "answer": "Doctify is an AI-powered platform...",
  "sources": [...],
  "confidence_score": 0.75
}
```

---

## Support

### Documentation Issues
- Found errors or unclear sections? [Open an issue](https://github.com/your-repo/issues)
- Want to contribute? See [CONTRIBUTING.md](../../CONTRIBUTING.md)

### Technical Support
- Questions: GitHub Discussions
- Bugs: GitHub Issues
- Security: See [SECURITY.md](../../SECURITY.md)

---

## Version History

- **v1.1** (Jan 23, 2026): Added tuning guide, updated thresholds
- **v1.0** (Jan 21, 2026): Initial RAG documentation

---

**Last Updated:** January 23, 2026
**Status:** Active development (Phase 11)
