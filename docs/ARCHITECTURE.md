# EcoSynTech Local Core - Architecture Documentation

## 1. System Architecture Overview

```mermaid
graph TB
    subgraph "Client Layer"
        A[Web Dashboard]
        B[Mobile App]
        C[ESP32 Firmware]
    end

    subgraph "API Gateway Layer"
        D[Express.js Server]
        E[Rate Limiter]
        F[Auth Middleware]
    end

    subgraph "Business Logic Layer"
        G[Device Management]
        H[Sensor Processing]
        I[AI/ML Engine]
        J[Automation Rules]
    end

    subgraph "Data Layer"
        K[(SQLite Database)]
        L[Ingest Queue]
        M[Redis Cache]
    end

    subgraph "IoT Integration"
        N[MQTT Broker]
        O[WebSocket]
        P[GAS Integration]
    end

    A --> D
    B --> D
    C --> F
    D --> E
    E --> F
    F --> G
    F --> H
    F --> I
    G --> K
    H --> L
    L --> K
    I --> K
    I --> M
    C --> N
    N --> O
    O --> A
    P --> F
```

## 2. Data Flow Diagram

```mermaid
flowchart LR
    subgraph Sensors
        T1[Temp/Humidity]
        T2[Soil Moisture]
        T3[Light]
        T4[Water Level]
    end

    subgraph Ingestion
        Q[Ingest Queue]
        B[Batch Processor]
    end

    subgraph Processing
        V[Validation]
        A[AI Inference]
        S[Store to DB]
    end

    subgraph Output
        R[API Response]
        W[WebSocket Push]
        M[MQTT Publish]
    end

    T1 --> Q
    T2 --> Q
    T3 --> Q
    T4 --> Q
    Q --> B
    B --> V
    V --> A
    A --> S
    S --> R
    S --> W
    S --> M
```

## 3. Authentication Flow

```mermaid
sequenceDiagram
    participant U as User
    participant A as Auth Middleware
    participant J as JWT
    participant D as Database
    participant L as Lockout Service

    U->>A: POST /api/auth/login
    A->>D: Query user by email
    D-->>A: User data
    A->>A: checkAccountLocked()
    alt Account Locked
        A-->>U: HTTP 423 Locked
    else Account Active
        A->>A: Verify password
        alt Invalid Password
            A->>L: recordFailedLogin()
            L-->>A: attempt count
            A-->>U: HTTP 401 + attempts remaining
        else Valid Password
            A->>J: Generate JWT
            J-->>A: token + refreshToken
            A-->>U: Success + tokens
        end
    end
```

## 4. IoT Device Communication

```mermaid
flowchart TB
    subgraph ESP32
        S[Sensor Data]
        H[HMAC Sign]
        P[Payload]
    end

    subgraph Server
        V[Verify Signature]
        Q[Ingest Queue]
        DB[(Database)]
        R[Response Sign]
    end

    S --> H
    H --> P
    P --> V
    V --> Q
    Q --> DB
    DB --> R
    R --> ESP32
```

## 5. Module Structure

```mermaid
graph TD
    subgraph src/
        M[middleware/]
        S[services/]
        R[routes/]
        C[config/]
        I[i18n/]
    end

    M -->|auth| S
    M -->|device| S
    S -->|data| R
    R -->|response| M
    C -->|config| S
    I -->|i18n| R
```

## 6. Database Schema

```mermaid
erDiagram
    USERS ||--o{ SESSIONS : has
    USERS ||--o{ API_KEYS : owns
    DEVICES ||--o{ SENSOR_READINGS : generates
    DEVICES ||--o{ DEVICE_ACTIONS : receives
    SENSORS ||--o{ SENSOR_READINGS : captures
    RULES ||--o{ RULE_ACTIONS : triggers
    ALERTS ||--o{ ALERT_ACKS : acknowledged

    USERS {
        string id PK
        string email
        string password
        string role
        timestamp created_at
    }

    DEVICES {
        string id PK
        string name
        string type
        string status
        string firmware_version
        timestamp last_seen
    }

    SENSOR_READINGS {
        string id PK
        string device_id FK
        string sensor_type
        float value
        string unit
        timestamp timestamp
    }

    RULES {
        string id PK
        string name
        string condition
        string action
        boolean enabled
    }
```

## 7. Deployment Architecture

```mermaid
graph LR
    subgraph Docker
        API[API Server]
        DB[(SQLite)]
        MQ[MQTT Broker]
        RED[Redis]
    end

    subgraph External
        ESP[ESP32 Devices]
        GAS[Google Apps Script]
        CL[Cloud Services]
    end

    ESP -->|MQTT| MQ
    MQ --> API
    API --> DB
    API --> RED
    API --> GAS
    CL -->|Webhook| API
```

---

## Revision History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 1.0 | 2026-04-28 | Initial architecture diagrams | EcoSynTech Team |

---

*Document generated following ISO 27001 documentation standards*