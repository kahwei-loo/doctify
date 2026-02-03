# AI Assistants Module - Component Diagram

## Overview
Shows the internal architecture of the AI Assistants module, including assistant management, public chat widget, and Intercom-style conversation inbox.

## Component Architecture

```mermaid
flowchart TB
    subgraph PublicClient["Public Client (Widget)"]
        Widget["PublicChatWidget<br/>Embeddable chat component"]
        WidgetLauncher["Widget Launcher<br/>Floating button"]
        ChatWindow["Chat Window<br/>Chat interface"]
    end

    subgraph StaffClient["Staff Client (Dashboard)"]
        AssistantsPage["AssistantsPage"]
        AssistantsPanel["AssistantsPanel<br/>Assistant list + stats"]
        ConversationsInbox["ConversationsInbox<br/>Intercom-style inbox"]
        ConversationsList["ConversationsList<br/>Conversation list"]
        ConversationChat["ConversationChat<br/>Chat details"]
    end

    subgraph API["API Layer"]
        subgraph AuthAPI["Authenticated API"]
            AssistantEndpoint["/api/v1/assistants/*"]
            ConvEndpoint["/api/v1/assistants/conversations/*"]
        end
        subgraph PublicAPI["Public API (No Auth)"]
            PublicChatEndpoint["/api/v1/public/chat/*"]
            StreamEndpoint["/api/v1/public/chat/{id}/stream<br/>SSE streaming"]
        end
    end

    subgraph Services["Service Layer"]
        AssistantService["AssistantService<br/>- Assistant CRUD<br/>- Analytics"]
        ConversationService["ConversationService<br/>- Conversation management<br/>- Status transitions"]
        PublicChatService["PublicChatService<br/>- Anonymous sessions<br/>- Rate limiting"]
        MessageService["MessageService<br/>- Message storage<br/>- AI response generation"]
    end

    subgraph Security["Security"]
        RateLimit["Rate Limiter<br/>20 msg/min per IP"]
        SessionTracker["Session Tracker<br/>IP + session_id"]
    end

    subgraph AI["AI Generation"]
        AIService["AI Service<br/>- Multi-provider<br/>- Streaming response"]
        KBIntegration["KB Integration<br/>Optional RAG retrieval"]
    end

    subgraph Repository["Repository Layer"]
        AssistantRepo["AssistantRepository"]
        ConvRepo["AssistantConversationRepository"]
        MsgRepo["AssistantMessageRepository"]
    end

    subgraph Storage["Storage"]
        DB[(PostgreSQL<br/>assistants<br/>assistant_conversations<br/>assistant_messages)]
        Cache[(Redis<br/>Session cache<br/>Rate limiting)]
    end

    %% Public Client Flow
    PublicClient --> PublicChatEndpoint
    PublicClient --> StreamEndpoint
    PublicChatEndpoint --> RateLimit
    PublicChatEndpoint --> SessionTracker
    RateLimit --> PublicChatService
    SessionTracker --> PublicChatService

    %% Staff Client Flow
    StaffClient --> AssistantEndpoint
    StaffClient --> ConvEndpoint
    AssistantEndpoint --> AssistantService
    ConvEndpoint --> ConversationService

    %% Services -> AI
    PublicChatService --> MessageService
    MessageService --> AIService
    AIService --> KBIntegration
    KBIntegration -.->|Optional| KBModule["Knowledge Base Module"]

    %% Services -> Repository
    AssistantService --> AssistantRepo
    ConversationService --> ConvRepo
    MessageService --> MsgRepo

    %% Repository -> Storage
    AssistantRepo --> DB
    ConvRepo --> DB
    MsgRepo --> DB
    RateLimit --> Cache
    SessionTracker --> Cache
```

## Three-Level Navigation Architecture

```mermaid
flowchart LR
    subgraph L1["L1: Sidebar (URL routing)"]
        SidebarItem["Assistants Menu Item"]
        URL["/assistants/:assistantId?"]
    end

    subgraph L2["L2: AssistantsPanel (State management)"]
        Stats["Stats Cards<br/>- Total assistants<br/>- Active assistants<br/>- Unresolved convos"]
        AssistantList["Assistant List<br/>- Name<br/>- Status<br/>- Convo count"]
    end

    subgraph L3["L3: ConversationsInbox (Local state)"]
        ConvList["Conversation List<br/>- Filters<br/>- Sorting"]
        ChatView["Chat View<br/>- Message history<br/>- Reply input"]
    end

    L1 -->|selectedAssistantId| L2
    L2 -->|selectedConversationId| L3

    style L1 fill:#e3f2fd
    style L2 fill:#f3e5f5
    style L3 fill:#e8f5e9
```

## Intercom-Style Inbox Layout

```mermaid
flowchart TB
    subgraph InboxLayout["ConversationsInbox (Resizable split ratio)"]
        subgraph LeftPane["Left Pane (40%)"]
            Filters["Status Filters<br/>All | Unresolved | In Progress | Resolved"]
            ConvItems["Conversation Items<br/>- Last message preview<br/>- Timestamp<br/>- Unread indicator"]
        end

        subgraph Divider["Draggable<br/>Divider"]
        end

        subgraph RightPane["Right Pane (60%)"]
            Header["Conversation Header<br/>- User info<br/>- Status action buttons"]
            Messages["Message List<br/>- User messages<br/>- AI responses<br/>- Staff replies"]
            Input["Reply Input<br/>- Text input<br/>- Send button"]
        end
    end

    Filters --> ConvItems
    ConvItems -->|Select| Header
    Header --> Messages
    Messages --> Input
```

## Public Chat Widget

```mermaid
flowchart TB
    subgraph WidgetStates["Widget States"]
        Minimized["Minimized State<br/>Floating button"]
        Expanded["Expanded State<br/>Chat window"]
    end

    subgraph ChatFlow["Chat Flow"]
        Init["Initialize<br/>Check localStorage<br/>Get session_id"]
        Connect["Connect to assistant<br/>GET /config"]
        Send["Send message<br/>POST /message"]
        Stream["Receive streaming response<br/>SSE /stream"]
        Display["Display message<br/>Typewriter effect"]
    end

    subgraph Security["Security Mechanisms"]
        SessionID["Session ID<br/>localStorage storage"]
        Fingerprint["User Fingerprint<br/>IP + session_id"]
        RateLimitCheck["Rate Limiting<br/>20 msg/min"]
        Throttle["Throttle Warning<br/>Alert when near limit"]
    end

    Minimized -->|Click| Expanded
    Expanded -->|Click X| Minimized

    Init --> Connect
    Connect --> Send
    Send --> Stream
    Stream --> Display

    Send --> SessionID
    SessionID --> Fingerprint
    Send --> RateLimitCheck
    RateLimitCheck -->|Near limit| Throttle
```

## Class Diagram

```mermaid
classDiagram
    class AssistantService {
        +create_assistant(user_id, data)
        +get_assistant(assistant_id)
        +list_assistants(user_id)
        +update_assistant(assistant_id, data)
        +delete_assistant(assistant_id)
        +get_stats(user_id)
        +get_analytics(assistant_id, period)
        +toggle_active(assistant_id)
    }

    class ConversationService {
        +get_conversations(assistant_id, filters)
        +get_conversation(conversation_id)
        +update_status(conversation_id, status)
        +get_messages(conversation_id)
        +add_staff_message(conversation_id, content)
    }

    class PublicChatService {
        +get_or_create_session(assistant_id, fingerprint)
        +send_message(session_id, content)
        +stream_response(session_id, content)
        -check_rate_limit(ip)
        -track_session(fingerprint, session_id)
    }

    class MessageService {
        +create_message(conversation_id, role, content)
        +generate_ai_response(conversation_id, user_message)
        +stream_ai_response(conversation_id, user_message)
        -build_context(conversation_id)
        -integrate_kb(assistant)
    }

    AssistantService --> ConversationService
    ConversationService --> MessageService
    PublicChatService --> MessageService
    MessageService --> KBIntegration

    class KBIntegration {
        +query_kb(kb_id, question)
        +build_rag_context(results)
    }
```

## Conversation Status Transitions

```mermaid
stateDiagram-v2
    [*] --> unresolved: New conversation/new message

    unresolved --> in_progress: Staff starts handling
    unresolved --> resolved: Mark as resolved directly

    in_progress --> resolved: Mark as resolved
    in_progress --> unresolved: User sends new message

    resolved --> unresolved: User sends new message
    resolved --> [*]: Archive

    note right of unresolved: Needs attention
    note right of in_progress: Being handled
    note right of resolved: Completed
```

## File Structure

```
backend/app/
├── api/v1/endpoints/
│   ├── assistants.py         # Assistant CRUD + conversation management
│   └── public_chat.py        # Public chat endpoints
├── services/
│   ├── assistant_service.py  # Assistant business logic
│   └── public_chat_service.py # Public chat service
├── db/
│   ├── models/
│   │   ├── assistant.py
│   │   └── assistant_conversation.py
│   └── repositories/
│       ├── assistant_repository.py
│       └── conversation_repository.py
└── middleware/
    └── rate_limit.py         # SlowAPI rate limiting

frontend/src/features/assistants/
├── pages/
│   └── AssistantsPage.tsx
├── components/
│   ├── AssistantsPanel.tsx       # L2: Assistant list
│   ├── ConversationsInbox.tsx    # L3: Inbox layout
│   ├── ConversationsList.tsx     # Conversation list
│   ├── ConversationChat.tsx      # Chat details
│   ├── AssistantFormModal.tsx    # Create/Edit form
│   ├── PublicChatWidget.tsx      # Public chat widget
│   └── EmptyStates.tsx           # Empty state components
├── hooks/
│   ├── useAssistantWebSocket.ts  # WebSocket communication
│   └── usePublicChatSession.ts   # Public session management
└── services/
    ├── assistantsApi.ts          # RTK Query
    └── conversationsApi.ts
```

## Key Technical Points

1. **Intercom-Style Inbox**: Resizable split-pane layout
2. **Three-Level Navigation**: L1 URL routing → L2 Assistant selection → L3 Conversation management
3. **SSE Streaming**: Public chat uses Server-Sent Events for typewriter effect
4. **Rate Limiting**: SlowAPI implementing 20 msg/min per IP
5. **Anonymous Tracking**: IP + session_id fingerprint for anonymous user identification
6. **Optional KB Integration**: Assistants can connect to Knowledge Base for RAG-enhanced responses
