# EcoSynTech Local Core - Data Flow Documentation

## 1. Sensor Data Flow

### 1.1 Raw Data Ingestion

```mermaid
flowchart LR
    subgraph "Step 1: Device"
        D[ESP32 Device]
        S[Sensors]
    end

    subgraph "Step 2: Protocol"
        P[Payload]
        HM[HMAC Sign]
        H[Headers]
    end

    subgraph "Step 3: Server"
        V[Verify]
        Q[Ingest Queue]
        BP[Batch Process]
    end

    subgraph "Step 4: Storage"
        DB[(SQLite)]
        C[(Cache)]
    end

    S --> D
    D --> HM
    HM --> P
    P --> V
    V --> Q
    Q --> BP
    BP --> DB
    BP --> C
```

### 1.2 Data Processing Pipeline

| Step | Component | Description |
|------|-----------|-------------|
| 1 | Sensor | Collects temperature, humidity, soil moisture, light |
| 2 | ESP32 | Packages data with timestamp and signs with HMAC |
| 3 | deviceAuth | Verifies HMAC signature |
| 4 | IngestQueue | Buffers data (max 10,000 readings) |
| 5 | BatchProcessor | Processes 100 readings per batch |
| 6 | Database | Stores in sensor_readings table |
| 7 | Cache | Updates Redis cache |

## 2. API Request Flow

### 2.1 Authentication Flow

```mermaid
sequenceDiagram
    Client->>+Server: POST /api/auth/login
    Server->>+Database: SELECT user WHERE email=?
    Database-->>-Server: user record
    Server->>+bcrypt: verify password
    bcrypt-->>-Server: true/false
    alt invalid password
        Server->>+Lockout: recordFailedLogin()
        Lockout-->>-Server: attempts count
        Server-->>-Client: 401 + attempts remaining
    else valid password
        Server->>+JWT: sign token
        JWT-->>-Server: access + refresh token
        Server->>+Redis: store refresh token
        Server-->>-Client: 200 + tokens
    end
```

### 2.2 Device Action Flow

```mermaid
flowchart LR
    subgraph Request
        R[REST API]
        A[Auth Check]
    end

    subgraph Processing
        P[Parse Action]
        V[Validate]
        E[Execute]
    end

    subgraph Response
        S[Sign Response]
        RS[Send Response]
    end

    R --> A
    A --> P
    P --> V
    V --> E
    E --> S
    S --> RS
```

## 3. AI/ML Inference Flow

### 3.1 Prediction Pipeline

```mermaid
flowchart TB
    subgraph Input
        D[Historical Data]
        W[Weather Data]
        S[Soil Data]
    end

    subgraph Processing
        F[Feature Extract]
        M[Model Load]
        I[Inference]
    end

    subgraph Output
        P[Prediction]
        C[Confidence]
        A[Action]
    end

    D --> F
    W --> F
    S --> F
    F --> M
    M --> I
    I --> P
    P --> C
    C --> A
```

### 3.2 Model Management Flow

```mermaid
stateDiagram-v2
    [*] --> Training
    Training --> Evaluation
    Evaluation --> Deployed
    Deployed --> Monitoring
    Monitoring --> Drift
    Drift --> Retraining
    Retraining --> Evaluation
    Monitoring --> [*]
```

## 4. WebSocket Real-time Flow

```mermaid
sequenceDiagram
    Client->>+Server: WebSocket Connect
    Server->>+WS: Upgrade connection
    WS-->>-Client: Connection established

    loop Data Stream
        ESP32->>+MQTT: Publish sensor data
        MQTT->>+Server: Receive from topic
        Server->>+AI: Process with model
        AI-->>-Server: Prediction
        Server->>+WS: Broadcast update
        WS-->>-Client: Real-time update
    end

    Client->>+Server: WebSocket Disconnect
    Server->>+WS: Close connection
```

## 5. Automation Rules Flow

```mermaid
flowchart LR
    subgraph Trigger
        S[Sensor Data]
        T[Threshold]
    end

    subgraph Evaluation
        E[Evaluate Rule]
        R[Rule Engine]
    end

    subgraph Action
        A[Execute Action]
        N[Notify]
        L[Log Action]
    end

    S --> T
    T --> E
    E --> R
    R --> A
    A --> N
    A --> L
```

## 6. Data Retention Flow

```mermaid
flowchart LR
    subgraph Collection
        D[Data Points]
    end

    subgraph Short-term
        Q[Queue]
        DB[(SQLite)]
    end

    subgraph Long-term
        B[Backup]
        A[Archive]
    end

    D --> Q
    Q --> DB
    DB --> B
    B --> A
```

### Retention Policy

| Data Type | Short-term | Long-term | Archive |
|-----------|------------|------------|---------|
| Sensor Readings | 7 days | 90 days | 1 year |
| System Logs | 30 days | 1 year | 3 years |
| User Actions | 90 days | 2 years | 5 years |
| AI Predictions | 30 days | 1 year | 3 years |

---

## Revision History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 1.0 | 2026-04-28 | Initial data flow documentation | EcoSynTech Team |

---

*Document follows ISO 27001 information classification guidelines*