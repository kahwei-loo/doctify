#!/usr/bin/env python3
"""Final RAG system verification test"""
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

# Test RAG query
headers = {
    "Authorization": f"Bearer {token}",
    "Content-Type": "application/json"
}
rag_response = requests.post(
    "http://localhost:50080/api/v1/rag/query",
    headers=headers,
    json={"question": "What is Doctify?"}
)

print("RAG Query Status:", rag_response.status_code)
print("\nRAG Response:")
print(json.dumps(rag_response.json(), indent=2, ensure_ascii=False))
