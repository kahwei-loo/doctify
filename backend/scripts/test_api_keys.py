#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Test AI Provider API Keys
Tests OpenAI, Anthropic, and Google AI API keys to verify connectivity.
"""

import os
import sys
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from dotenv import load_dotenv

# Load environment variables
env_path = Path(__file__).parent.parent / ".env"
if env_path.exists():
    load_dotenv(env_path)
    print(f"[OK] Loaded .env from: {env_path}\n")
else:
    print(f"[WARN] No .env file found at: {env_path}")
    print("Using system environment variables\n")


def test_openai():
    """Test OpenAI API key."""
    print("=" * 60)
    print("Testing OpenAI API")
    print("=" * 60)

    api_key = os.getenv("OPENAI_API_KEY")

    if not api_key:
        print("[FAIL] OPENAI_API_KEY not found in environment")
        return False

    print(f"[OK] API Key found: {api_key[:10]}...{api_key[-4:]}")

    try:
        from openai import OpenAI

        client = OpenAI(api_key=api_key)

        # Test 1: Simple completion
        print("\n[TEST] Test 1: Testing text generation...")
        response = client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[{"role": "user", "content": "Say 'API test successful'"}],
            max_tokens=20
        )
        print(f"[OK] Text generation: {response.choices[0].message.content}")

        # Test 2: Embedding generation (for RAG)
        print("\n[TEST] Test 2: Testing embedding generation...")
        embedding_response = client.embeddings.create(
            model="text-embedding-3-small",
            input="Test document for embedding"
        )
        embedding_dim = len(embedding_response.data[0].embedding)
        print(f"[OK] Embedding generated: {embedding_dim} dimensions")

        print("\n[PASS] OpenAI API: ALL TESTS PASSED")
        return True

    except Exception as e:
        print(f"\n[FAIL] OpenAI API Error: {type(e).__name__}")
        print(f"   Details: {str(e)}")
        return False


def test_anthropic():
    """Test Anthropic API key."""
    print("\n" + "=" * 60)
    print("Testing Anthropic API")
    print("=" * 60)

    api_key = os.getenv("ANTHROPIC_API_KEY")

    if not api_key:
        print("[FAIL] ANTHROPIC_API_KEY not found in environment")
        return False

    print(f"[OK] API Key found: {api_key[:10]}...{api_key[-4:]}")

    try:
        from anthropic import Anthropic

        client = Anthropic(api_key=api_key)

        # Test: Simple message
        print("\n[TEST] Testing message generation...")
        message = client.messages.create(
            model="claude-3-haiku-20240307",
            max_tokens=20,
            messages=[{"role": "user", "content": "Say 'API test successful'"}]
        )
        print(f"[OK] Message generation: {message.content[0].text}")

        print("\n[PASS] Anthropic API: ALL TESTS PASSED")
        return True

    except Exception as e:
        print(f"\n[FAIL] Anthropic API Error: {type(e).__name__}")
        print(f"   Details: {str(e)}")
        return False


def test_google_ai():
    """Test Google AI API key."""
    print("\n" + "=" * 60)
    print("Testing Google AI API")
    print("=" * 60)

    api_key = os.getenv("GOOGLE_AI_API_KEY")

    if not api_key:
        print("[FAIL] GOOGLE_AI_API_KEY not found in environment")
        return False

    print(f"[OK] API Key found: {api_key[:10]}...{api_key[-4:]}")

    try:
        import google.generativeai as genai

        genai.configure(api_key=api_key)

        # Test: Simple generation
        print("\n[TEST] Testing text generation...")
        model = genai.GenerativeModel('gemini-pro')
        response = model.generate_content("Say 'API test successful'")
        print(f"[OK] Text generation: {response.text}")

        print("\n[PASS] Google AI API: ALL TESTS PASSED")
        return True

    except Exception as e:
        print(f"\n[FAIL] Google AI API Error: {type(e).__name__}")
        print(f"   Details: {str(e)}")
        return False


def main():
    """Run all API tests."""
    print("\n" + "=" * 60)
    print("AI Provider API Key Tests")
    print("=" * 60)
    print()

    results = {
        "OpenAI": test_openai(),
        "Anthropic": test_anthropic(),
        "Google AI": test_google_ai(),
    }

    # Summary
    print("\n" + "=" * 60)
    print("Test Summary")
    print("=" * 60)

    for provider, passed in results.items():
        status = "[PASS]" if passed else "[FAIL]"
        print(f"{provider:15} {status}")

    # Overall result
    all_passed = all(results.values())
    any_passed = any(results.values())

    print("\n" + "=" * 60)
    if all_passed:
        print("SUCCESS: ALL API KEYS WORKING!")
        print("=" * 60)
        return 0
    elif any_passed:
        print("PARTIAL: SOME API KEYS WORKING (L25 orchestration will use available providers)")
        print("=" * 60)
        return 0
    else:
        print("FAILED: NO API KEYS WORKING")
        print("=" * 60)
        print("\nPlease check:")
        print("1. API keys are correctly set in .env file")
        print("2. API keys are valid and not expired")
        print("3. API accounts have sufficient credits")
        print("4. Network connection is working")
        return 1


if __name__ == "__main__":
    sys.exit(main())
