# AI Assistant Chat Sequence Diagram

## Overview
Shows the complete flow from public user initiating a conversation to staff management.

## Public User Initiates Conversation

```mermaid
sequenceDiagram
    autonumber
    participant PU as Public User
    participant Widget as Chat Widget
    participant API as FastAPI
    participant Rate as Rate Limiter
    participant Session as Session Tracker
    participant PCS as PublicChatService
    participant AI as AI Provider
    participant KB as Knowledge Base
    participant DB as PostgreSQL
    participant Cache as Redis

    rect rgb(230, 245, 255)
        Note over PU, Cache: Phase 1: Initialize Widget
        PU->>Widget: Click widget button
        Widget->>Widget: Check localStorage
        alt Has session_id
            Widget->>Widget: Use existing session_id
        else No session_id
            Widget->>Widget: Generate new session_id
            Widget->>Widget: Store in localStorage
        end
        Widget->>API: GET /public/chat/{assistant_id}/config
        API->>DB: SELECT assistant
        DB-->>API: assistant (widget_config)
        API-->>Widget: {name, welcome_message, primary_color}
        Widget->>Widget: Apply style configuration
        Widget-->>PU: Show chat window
    end

    rect rgb(255, 243, 224)
        Note over PU, Cache: Phase 2: Send Message
        PU->>Widget: Type message and send
        Widget->>API: POST /public/chat/{assistant_id}/message
        Note over API: Headers:<br/>X-Session-ID: abc123<br/>X-Forwarded-For: 1.2.3.4

        API->>Rate: check_rate_limit(IP)
        Rate->>Cache: INCR rate:{IP}
        Cache-->>Rate: count

        alt Exceeded limit (>20/min)
            Rate-->>API: RateLimitExceeded
            API-->>Widget: 429 Too Many Requests
            Widget-->>PU: "Too many requests, please wait"
        else Within limit
            Rate-->>API: OK
        end

        API->>Session: get_or_create_session(assistant_id, fingerprint)
        Session->>DB: SELECT conversation WHERE session_id=...
        alt Existing session
            DB-->>Session: existing_conversation
        else New session
            Session->>DB: INSERT assistant_conversation
            DB-->>Session: new_conversation_id
        end
        Session-->>API: conversation_id

        API->>PCS: send_message(conversation_id, content)
        PCS->>DB: INSERT assistant_message (role='user')
        PCS->>DB: UPDATE conversation.last_message_at
    end

    rect rgb(232, 245, 233)
        Note over PU, KB: Phase 3: AI Response Generation
        PCS->>PCS: build_context(conversation_id)
        PCS->>DB: SELECT recent_messages LIMIT 10
        DB-->>PCS: message_history

        alt Assistant has linked KB
            PCS->>KB: query(question, kb_id)
            KB-->>PCS: relevant_context
            PCS->>PCS: Merge KB context into prompt
        end

        PCS->>AI: POST /chat/completions (stream=true)
        Note over AI: System Prompt +<br/>Message History +<br/>KB Context (optional) +<br/>User Question
    end

    rect rgb(243, 229, 245)
        Note over PU, DB: Phase 4: Streaming Response
        loop SSE Streaming
            AI-->>PCS: chunk
            PCS-->>API: SSE: data: {"chunk": "..."}
            API-->>Widget: SSE event
            Widget->>Widget: Append display (typewriter effect)
        end

        AI-->>PCS: [DONE]
        PCS->>DB: INSERT assistant_message (role='assistant', content=full_response)
        PCS->>DB: UPDATE conversation.message_count++
        PCS-->>API: SSE: data: {"done": true}
        API-->>Widget: SSE final event
        Widget-->>PU: Show complete response
    end
```

## Staff Views and Manages Conversations

```mermaid
sequenceDiagram
    autonumber
    participant Staff as Staff
    participant FE as Dashboard
    participant API as FastAPI
    participant AS as AssistantService
    participant CS as ConversationService
    participant DB as PostgreSQL

    rect rgb(230, 245, 255)
        Note over Staff, DB: Phase 1: Enter Assistants Page
        Staff->>FE: Navigate to /assistants
        FE->>API: GET /assistants/stats
        API->>AS: get_stats(user_id)
        AS->>DB: Aggregate statistics query
        DB-->>AS: {total, active, total_conversations, unresolved}
        AS-->>API: stats
        API-->>FE: stats
        FE-->>Staff: Show stats cards

        FE->>API: GET /assistants
        API->>AS: list_assistants(user_id)
        AS->>DB: SELECT assistants with counts
        DB-->>AS: assistants[]
        AS-->>API: assistants
        API-->>FE: assistants[]
        FE-->>Staff: Show assistant list
    end

    rect rgb(255, 243, 224)
        Note over Staff, DB: Phase 2: Select Assistant to View Conversations
        Staff->>FE: Click assistant "Product Support"
        FE->>API: GET /assistants/{id}/conversations?status=unresolved
        API->>CS: get_conversations(assistant_id, filters)
        CS->>DB: SELECT conversations ORDER BY last_message_at DESC
        DB-->>CS: conversations[]
        CS-->>API: conversations
        API-->>FE: conversations[]
        FE-->>Staff: Show conversation list (Inbox left pane)
    end

    rect rgb(232, 245, 233)
        Note over Staff, DB: Phase 3: View Conversation Details
        Staff->>FE: Click conversation
        FE->>API: GET /assistants/conversations/{id}/messages
        API->>CS: get_messages(conversation_id)
        CS->>DB: SELECT messages ORDER BY created_at
        DB-->>CS: messages[]
        CS-->>API: messages
        API-->>FE: messages[]
        FE-->>Staff: Show message history (Inbox right pane)
    end

    rect rgb(243, 229, 245)
        Note over Staff, DB: Phase 4: Staff Actions
        alt Send Reply
            Staff->>FE: Enter reply content
            FE->>API: POST /assistants/conversations/{id}/messages
            API->>CS: add_staff_message(conversation_id, content)
            CS->>DB: INSERT message (role='assistant', manual=true)
            CS->>DB: UPDATE conversation.last_message_at
            DB-->>CS: message
            CS-->>API: message
            API-->>FE: message
            FE-->>Staff: Show sent message

        else Change Status
            Staff->>FE: Click "Mark as Resolved"
            FE->>API: PATCH /assistants/conversations/{id}/status
            API->>CS: update_status(conversation_id, 'resolved')
            CS->>DB: UPDATE status='resolved', resolved_at=now()
            DB-->>CS: success
            CS-->>API: conversation
            API-->>FE: {status: 'resolved'}
            FE-->>Staff: Move conversation to "Resolved" list
        end
    end
```

## Rate Limiting Detailed Flow

```mermaid
sequenceDiagram
    autonumber
    participant Widget as Widget
    participant API as FastAPI
    participant SlowAPI as SlowAPI
    participant Cache as Redis

    Widget->>API: POST /public/chat/{id}/message
    API->>SlowAPI: @limiter.limit("20/minute")

    SlowAPI->>Cache: GET rate_limit:{IP}:{window}
    Cache-->>SlowAPI: current_count

    alt count < 20
        SlowAPI->>Cache: INCR rate_limit:{IP}:{window}
        SlowAPI->>Cache: EXPIRE rate_limit:{IP}:{window} 60
        SlowAPI-->>API: Allow request
        API->>API: Process request
        API-->>Widget: 200 OK

    else count = 15 (near limit)
        SlowAPI-->>API: Allow request
        API->>API: Process request
        API-->>Widget: 200 OK + X-RateLimit-Remaining: 5
        Widget->>Widget: Show warning "5 requests remaining"

    else count >= 20
        SlowAPI-->>API: Reject request
        API-->>Widget: 429 Too Many Requests
        Note over Widget: Response Headers:<br/>Retry-After: 45<br/>X-RateLimit-Reset: 1706000000
        Widget->>Widget: Show countdown
        Widget-->>Widget: "Please wait 45 seconds"
    end
```

## Optional KB Integration Flow

```mermaid
sequenceDiagram
    autonumber
    participant PCS as PublicChatService
    participant DB as PostgreSQL
    participant RAG as RAGService
    participant AI as AI Provider

    PCS->>DB: SELECT assistant WHERE id=...
    DB-->>PCS: assistant

    alt assistant.knowledge_base_id IS NOT NULL
        Note over PCS, RAG: Enable RAG enhancement
        PCS->>RAG: query(user_question, kb_id)
        RAG->>RAG: Vector search
        RAG->>RAG: Relevance filtering
        RAG-->>PCS: relevant_chunks[]

        PCS->>PCS: Build enhanced prompt
        Note over PCS: System: You are {assistant.name}...<br/>Answer based on the following knowledge:<br/>{relevant_chunks}<br/>---<br/>User: {question}

        PCS->>AI: POST /chat/completions
        AI-->>PCS: Knowledge-based answer

    else assistant.knowledge_base_id IS NULL
        Note over PCS, AI: Normal chat (no RAG)
        PCS->>PCS: Build normal prompt
        Note over PCS: System: You are {assistant.name}...<br/>User: {question}

        PCS->>AI: POST /chat/completions
        AI-->>PCS: General AI answer
    end
```

## Conversation Status Transitions

```mermaid
sequenceDiagram
    autonumber
    participant PU as Public User
    participant Staff as Staff
    participant DB as PostgreSQL

    Note over DB: Initial state: unresolved

    rect rgb(255, 243, 224)
        PU->>DB: Send new message
        Note over DB: Status remains: unresolved<br/>(if previously resolved, reopen)
    end

    rect rgb(232, 245, 233)
        Staff->>DB: Start handling
        Note over DB: UPDATE status = 'in_progress'
    end

    rect rgb(243, 229, 245)
        Staff->>DB: Mark as resolved
        Note over DB: UPDATE status = 'resolved'<br/>resolved_at = now()
    end

    rect rgb(255, 235, 238)
        PU->>DB: Send new message (conversation was resolved)
        Note over DB: UPDATE status = 'unresolved'<br/>resolved_at = NULL<br/>(reopen conversation)
    end
```

## WebSocket Real-Time Updates (Future Feature)

```mermaid
sequenceDiagram
    autonumber
    participant Staff1 as Staff 1
    participant Staff2 as Staff 2
    participant WS as WebSocket
    participant PU as Public User

    Staff1->>WS: Connect /ws/assistants/{assistant_id}
    Staff2->>WS: Connect /ws/assistants/{assistant_id}

    PU->>WS: Send new message
    WS->>WS: Broadcast event

    par Parallel notification
        WS-->>Staff1: {type: 'new_message', conversation_id, preview}
        WS-->>Staff2: {type: 'new_message', conversation_id, preview}
    end

    Staff1->>Staff1: Refresh conversation list
    Staff2->>Staff2: Refresh conversation list

    Staff1->>WS: Mark conversation as resolved
    WS->>WS: Broadcast event
    WS-->>Staff2: {type: 'status_changed', conversation_id, status: 'resolved'}
    Staff2->>Staff2: Move conversation to resolved list
```

## Key Performance Metrics

| Operation | Expected Duration | Notes |
|-----------|-------------------|-------|
| Widget initialization | 200-500ms | Load config + styles |
| Message send | <100ms | Database insert + queue |
| AI response first byte | 500ms-1s | AI model startup |
| AI complete response | 2-10s | Depends on answer length |
| Rate limit check | <10ms | Redis operation |
| Conversation list load | 100-300ms | Database query |
| Status update | <100ms | Single UPDATE |
