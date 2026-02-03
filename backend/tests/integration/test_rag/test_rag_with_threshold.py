#!/usr/bin/env python3
"""Test RAG query with custom similarity threshold"""
import requests
import json

# Login
login_response = requests.post(
    "http://localhost:50080/api/v1/auth/login",
    json={"email": "ragtest@example.com", "password": "TestPass123@"}
)
print("Login status:", login_response.status_code)
login_data = login_response.json()
token = login_data["data"]["access_token"]
print(f"Token: {token[:20]}...\n")

# Test RAG query with lower threshold
headers = {
    "Authorization": f"Bearer {token}",
    "Content-Type": "application/json"
}

# Test with threshold 0.3
print("=" * 60)
print("Testing with similarity_threshold=0.3")
print("=" * 60)
rag_response = requests.post(
    "http://localhost:50080/api/v1/rag/query",
    headers=headers,
    json={
        "question": "What is Doctify?",
        "similarity_threshold": 0.3,
        "top_k": 5
    }
)

print("RAG Query Status:", rag_response.status_code)
print("\nRAG Response:")
response_data = rag_response.json()
print(json.dumps(response_data, indent=2, ensure_ascii=False))

# Show sources if any
if response_data.get("sources"):
    print("\n" + "=" * 60)
    print("SOURCES FOUND:")
    print("=" * 60)
    for i, source in enumerate(response_data["sources"], 1):
        print(f"\nSource {i}:")
        print(f"  Similarity: {source.get('similarity_score', 'N/A')}")
        print(f"  Document: {source.get('document_name', 'N/A')}")
        print(f"  Chunk: {source.get('chunk_index', 'N/A')}")
        print(f"  Text: {source.get('chunk_text', '')[:100]}...")
