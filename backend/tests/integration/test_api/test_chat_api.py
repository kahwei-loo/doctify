#!/usr/bin/env python3
"""Test chat API endpoints"""
import requests
import json

API_BASE = "http://localhost:50080/api/v1"

# 1. Login
print("1. Testing login...")
login_response = requests.post(
    f"{API_BASE}/auth/login",
    json={"email": "testuser2@example.com", "password": "TestPass123!"}
)
print(f"   Status: {login_response.status_code}")
if login_response.status_code == 200:
    response_data = login_response.json()
    print(f"   Response keys: {list(response_data.keys())}")
    token = response_data.get("access_token") or response_data.get("data", {}).get("access_token")
    if not token:
        print(f"   Error: No access_token found in response")
        print(f"   Response: {json.dumps(response_data, indent=2)}")
        exit(1)
    print(f"   Token obtained (first 50 chars): {token[:50]}...")
else:
    print(f"   Error: {login_response.text}")
    exit(1)

headers = {"Authorization": f"Bearer {token}"}

# 2. Test GET conversations
print("\n2. Testing GET /chat/conversations...")
get_response = requests.get(
    f"{API_BASE}/chat/conversations?limit=50",
    headers=headers
)
print(f"   Status: {get_response.status_code}")
print(f"   Response type: {type(get_response.json())}")
print(f"   Response: {json.dumps(get_response.json(), indent=2)[:500]}...")

# 3. Test POST conversation
print("\n3. Testing POST /chat/conversations...")
post_response = requests.post(
    f"{API_BASE}/chat/conversations",
    headers=headers,
    json={"title": "Test Conversation from Python"}
)
print(f"   Status: {post_response.status_code}")
if post_response.status_code in [200, 201]:
    print(f"   Success! Created: {json.dumps(post_response.json(), indent=2)}")
else:
    print(f"   Error: {post_response.text}")
    print(f"   Response: {json.dumps(post_response.json(), indent=2)}")
