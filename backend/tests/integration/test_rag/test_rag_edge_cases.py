#!/usr/bin/env python3
"""Test RAG edge cases"""
import requests
import json

def get_token():
    """Get authentication token"""
    response = requests.post(
        "http://localhost:50080/api/v1/auth/login",
        json={"email": "ragtest@example.com", "password": "TestPass123@"}
    )
    return response.json()["data"]["access_token"]

def test_rag(question, threshold=0.3, top_k=5, description=""):
    """Test RAG query"""
    token = get_token()
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }

    print("\n" + "=" * 70)
    print(f"TEST: {description}")
    print("=" * 70)
    print(f"Question: {question}")
    print(f"Threshold: {threshold}, Top K: {top_k}")

    response = requests.post(
        "http://localhost:50080/api/v1/rag/query",
        headers=headers,
        json={
            "question": question,
            "similarity_threshold": threshold,
            "top_k": top_k
        }
    )

    print(f"Status: {response.status_code}")
    data = response.json()

    # Show results
    if response.status_code == 200:
        print(f"Answer: {data['answer'][:200]}...")
        print(f"Sources: {len(data.get('sources', []))} chunks")
        print(f"Model: {data.get('model_used')}")
        print(f"Confidence: {data.get('confidence_score')}")
        print(f"Tokens: {data.get('tokens_used')}")

        if data.get('sources'):
            print("\nSimilarity scores:")
            for i, src in enumerate(data['sources'], 1):
                print(f"  {i}. Score: {src['similarity_score']}, Chunk {src['chunk_index']}")
    else:
        print(f"Error: {data}")

    return response.status_code, data

# Run tests
print("RAG EDGE CASE TESTING")
print("=" * 70)

# Test 1: Multiple chunks retrieval
test_rag(
    "Tell me about Doctify's technical architecture and features",
    threshold=0.2,  # Lower threshold to get more chunks
    top_k=5,
    description="Multiple chunks retrieval (lower threshold)"
)

# Test 2: Empty question
try:
    test_rag(
        "",
        description="Empty question (should fail)"
    )
except Exception as e:
    print(f"Expected error: {e}")

# Test 3: Very specific question
test_rag(
    "What security features does Doctify have?",
    threshold=0.3,
    description="Specific question about security"
)

# Test 4: Irrelevant question
test_rag(
    "How do I cook pasta?",
    threshold=0.3,
    description="Irrelevant question (no context)"
)

# Test 5: High threshold (should return fewer results)
test_rag(
    "What is Doctify?",
    threshold=0.9,  # Very high threshold
    top_k=5,
    description="High similarity threshold"
)

# Test 6: Request more chunks than exist
test_rag(
    "Tell me everything about Doctify",
    threshold=0.1,  # Very low threshold
    top_k=10,  # More than 5 chunks exist
    description="Request more chunks than exist"
)

print("\n" + "=" * 70)
print("EDGE CASE TESTING COMPLETE")
print("=" * 70)
