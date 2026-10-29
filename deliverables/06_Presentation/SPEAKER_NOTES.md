# OmniCast: Capstone Defense Presentation & Speaker Guide
**Dual-Course Joint Project:** PRN232 (Back-End Engineering) + PRM393 (Mobile Applications Development)  
**Institution:** Department of Software Engineering — FPT University  
**Language:** English  
**Recommended Total Presentation Time:** 15 – 20 Minutes (followed by 10 Minutes Committee Q&A)

---

## Defense Structure & Timing Breakdown

| Section | Slides | Recommended Time | Core Speaker Focus |
| :--- | :---: | :---: | :--- |
| **Opening & System Overview** | 1 – 3 | 2 Minutes | Problem statement, dual-course synergy, big-picture architecture |
| **PART 1: PRN232 Back-End** | 4 – 10 | 6 – 7 Minutes | NestJS 10, Supabase, 24/7 EPG scheduling, AI curator, gRPC telemetry |
| **PART 2: PRM393 Mobile App** | 11 – 17 | 6 – 7 Minutes | Flutter 3.x, Clean Architecture, BLoC, OmniPlayer WebRTC, offline sync |
| **Synthesis & Evaluation** | 18 – 21 | 2 – 3 Minutes | Synergy matrix, live cloud deployment, demo accounts, wrap-up |

---

## Slide-by-Slide Detailed Speaker Script

### Slide 1: Title Slide (Cover)
* **Visual:** Full Cinema Dark aesthetic with dual-course badges (PRN232 & PRM393) and core project metrics.
* **Speaker Script:**
  > "Good morning, respected committee members and faculty evaluators. Welcome to our capstone defense presentation for **OmniCast: Enterprise Media & Broadcast Intelligence Network**.
  > 
  > This project represents a unified, production-grade engineering endeavor combining two specialized curricula:
  > - **PRN232:** Building Cross-Platform Back-End Applications with NestJS, microservices, and a Next.js 15 studio portal.
  > - **PRM393:** Mobile Applications Development with Flutter, Dart, Clean Architecture, and offline-first capabilities.
  > 
  > Across both disciplines, the system encompasses **142,897 physical lines of code** and **482 automated test suites** executed with a **100% pass rate**."

---

### Slide 2: Executive Summary & Project Motivation
* **Visual:** Two comparison cards: The Industry Dilemma vs The OmniCast Solution.
* **Speaker Script:**
  > "In the enterprise broadcasting landscape, organizations face a critical trade-off: traditional linear TV systems lack digital interactivity, while modern OTT streaming services suffer from high egress costs, complex schedules, and fragmented clients.
  > 
  > OmniCast solves this by delivering an end-to-end media network featuring:
  > 1. Continuous 24/7 linear playout with zero dead-air.
  > 2. Sub-500ms ultra-low-latency WebRTC streaming coupled with HTTP Live Streaming (HLS) fallbacks.
  > 3. AI-powered metadata curation using large language models.
  > 4. Full dual-client synergy across web broadcasters and native mobile consumers."

---

### Slide 3: End-to-End System Architecture (The Big Picture)
* **Visual:** Architectural topology diagram illustrating Next.js Web, Flutter Mobile, NestJS Core API, MediaMTX, Supabase PostgreSQL, and gRPC Audit Service.
* **Speaker Script:**
  > "Here is our top-level architectural blueprint. OmniCast is organized into three primary operational tiers:
  > - **Ingest & Distribution:** Broadcasters ingest WebRTC streams via WHIP into MediaMTX, which handles real-time transcoding and demuxing to WHEP and HLS.
  > - **Core Application Layer:** Our NestJS 10 core API orchestrates 19 modular domains, providing 140+ REST endpoints and bidirectional WebSockets on the `/live` namespace.
  > - **Persistence & Telemetry:** Backed by Supabase PostgreSQL with 21 relational models and connection pooling, paired with an isolated gRPC microservice on Render for immutable audit telemetry."

---

### PART 1: PRN232 Back-End Application

#### Slide 4: Part 1 Title Divider
* **Visual:** Part 1 Title divider card.
* **Speaker Script:**
  > "Now we transition into **Part 1 of our defense**, focusing on **PRN232: Building Cross-Platform Back-End Application**, covering our enterprise server architecture, database modeling, playout automation, and the broadcaster web portal."

#### Slide 5: Modular Back-End Architecture & Design Patterns
* **Visual:** Clean modular layout showing Dependency Injection, Onion/Clean Layering, and Repository/Service segregation.
* **Speaker Script:**
  > "Our back-end is constructed on **NestJS 10**, strictly adhering to Clean Architecture principles. Every domain is an independent, loosely coupled module:
  > - Controllers handle HTTP/WebSocket validation using class-validator DTOs.
  > - Services implement core domain logic, isolated from persistence.
  > - Repositories interface with Prisma ORM.
  > - Cross-cutting concerns—such as JWT authentication, RBAC authorization guards, and exception filters—intercept all requests globally."

#### Slide 6: Relational Data Modeling & Supabase Infrastructure
* **Visual:** 21 Prisma models, Foreign Key integrity, Indexing strategy, Connection pooling.
* **Speaker Script:**
  > "Our persistence layer utilizes **PostgreSQL hosted on Supabase (Seoul AWS ap-northeast-2)**:
  > - It comprises **21 models** covering users, media assets, channels, schedules, comments, donations, and audit trails.
  > - To ensure rock-solid data integrity under high concurrent loads, we employ strict foreign key cascade rules and compound indexes on `(channel_id, start_time)`.
  > - Database connections are managed via Supabase's transaction pooler (`pgBouncer`), preventing socket exhaustion during viewer surges."

#### Slide 7: 24/7 EPG Linear Scheduling & Deterministic Playout
* **Visual:** Interval overlap prevention algorithm, deterministic pseudo-random backfill for dead air elimination.
* **Speaker Script:**
  > "One of our most technically demanding challenges was the **24/7 Electronic Program Guide (EPG)**.
  > 
  > 1. **Airtime Overlap Elimination:** We implemented atomic interval checks using PostgreSQL expressions: `(start_time < :new_end) AND (end_time > :new_start)`. Any collision triggers an atomic rollback.
  > 2. **Dead-Air Elimination:** If a broadcaster schedules partial programming, our playout daemon detects gaps and fills them using a deterministic, seed-based pseudo-random algorithm. Viewers across different devices always experience synchronized filler programming down to the exact second."

#### Slide 8: AI-Powered Media Curation & GPT-4o Integration
* **Visual:** Single-turn structured output pipeline, automated taxonomy classification, fallback resiliency.
* **Speaker Script:**
  > "To automate digital asset management, we integrated an **AI Media Curator** backed by OpenAI's `gpt-4o`:
  > - Broadcasters upload raw media and trigger AI analysis.
  > - The module prompts GPT-4o with strict JSON Schema constraints, producing categorized tags, SEO-optimized summaries, and content warnings.
  > - If OpenAI rate limits or network issues occur, the system safely falls back to a deterministic heuristic keyword extractor, guaranteeing zero service interruption."

#### Slide 9: Distributed Microservices & gRPC Telemetry
* **Visual:** Protobuf definition, binary RPC transport, low latency vs REST benchmark.
* **Speaker Script:**
  > "For administrative auditing and compliance, we decoupled the **Audit-Logger Microservice**:
  > - Communicates over **gRPC (HTTP/2 with Protocol Buffers)** on port 50051.
  > - Binary serialization provides a 60% payload reduction and 4x faster throughput compared to standard JSON REST APIs.
  > - Deployed independently on Render Cloud, ensuring security audit records remain isolated from the primary user database."

#### Slide 10: Next.js 15 Web Portal & Broadcaster Studio
* **Visual:** Server Components, React 19 Client Studio, WebRTC WHIP broadcaster, Real-time metrics dashboard.
* **Speaker Script:**
  > "The frontend companion for PRN232 is our **Next.js 15 Web Portal**, deployed on Vercel:
  > - Leverages the App Router with React Server Components for instantaneous initial page loads.
  > - Broadcaster Studio: Allows content creators to publish live camera and screen feeds directly into MediaMTX via WebRTC WHIP.
  > - Real-time metrics: Incorporates Chart.js dashboards showing viewer concurrency, stream bitrate, and donation receipts over WebSocket channels."

---

### PART 2: PRM393 Mobile Application

#### Slide 11: Part 2 Title Divider
* **Visual:** Part 2 Title divider card.
* **Speaker Script:**
  > "We now proceed to **Part 2 of our defense**, focusing on **PRM393: Mobile Applications Development**, covering our Flutter 3 native mobile client, Clean Architecture, BLoC state management, OmniPlayer engine, and offline synchronization."

#### Slide 12: Mobile Client Architecture: Clean Architecture + BLoC
* **Visual:** 4-Tier Clean Architecture diagram: Presentation, Domain (Use Cases), Data (Repositories/DataSources), Core.
* **Speaker Script:**
  > "Our mobile application is engineered with **Flutter 3.x and Dart 3**, structured under strict **Clean Architecture**:
  > - **Presentation Layer:** 31 responsive screens and widgets listening to BLoC streams.
  > - **Domain Layer:** Pure Dart entities and use cases with zero framework dependencies.
  > - **Data Layer:** Concrete repositories orchestrating local SQLite caches and remote REST/WSS datasources.
  > - **Core:** Dependency injection via `get_it`, network interceptors, and custom theme tokens."

#### Slide 13: State Management Pipeline: BLoC Pattern & Reactive Streams
* **Visual:** Event -> BLoC -> State flow diagram, immutable states, UI rebuild isolation.
* **Speaker Script:**
  > "We selected the **BLoC (Business Logic Component)** pattern for predictable, unidirectional data flow:
  > - UI widgets only emit typed events (e.g., `FetchChannelsEvent`, `SubmitDonationEvent`).
  > - BLoCs execute domain use cases and yield immutable states (`LoadingState`, `LoadedState`, `ErrorState`).
  > - This guarantees testability—we can unit test complex user flows without instantiating a single UI widget."

#### Slide 14: OmniPlayer Engine: Dual-Protocol WebRTC & HLS Playout
* **Visual:** Ultra-low latency WebRTC WHEP (<500ms) vs Resilient HLS Playout, Floating PIP mode, adaptive controls.
* **Speaker Script:**
  > "The cornerstone of our mobile experience is the **OmniPlayer Engine**:
  > - **WebRTC Playout (WHEP):** Delivers ultra-low latency sub-second video, essential for live auctions and interactive sports.
  > - **HLS Playout Fallback:** For cellular or unstable Wi-Fi connections, OmniPlayer seamlessly switches to multi-bitrate HLS streaming.
  > - Includes Picture-in-Picture (PiP) support, hardware acceleration, gesture brightness/volume controls, and custom audio track selection."

#### Slide 15: Offline-First Synchronization & SQLite Mutation Queuing
* **Visual:** Offline mutation queue, SQLite local tables, network connectivity listener, idempotent replay.
* **Speaker Script:**
  > "Mobile users frequently experience fluctuating network conditions. We engineered a robust **offline-first sync architecture**:
  > - When the device goes offline, catalog data and schedules remain readable from local SQLite storage.
  > - State modifications (such as bookmarking a stream or saving watch preferences) are appended to a `pending_mutations` table in SQLite.
  > - Upon network recovery, an automated background worker drains the queue and replays requests idempotently to the server."

#### Slide 16: Interactive Features: Live Chat, Donations & Canvas Overlay
* **Visual:** Socket.IO `/live` streaming chat, animated confetti/canvas donation overlays, real-time reactions.
* **Speaker Script:**
  > "To engage mobile audiences, OmniCast includes rich interactive features:
  > - **Live Chat:** Real-time messaging over Socket.IO with sub-100ms message delivery and token-based rate limiting.
  > - **Interactive Donations:** Viewers can send virtual gifts and tips; upon confirmation, a custom particle canvas renders animated confetti across the video stream.
  > - All animations are rendered at 60 FPS using Flutter's CustomPainter without causing video stutter."

#### Slide 17: Mobile Verification: 31 Screens & 91 Automated Tests
* **Visual:** Screen breakdown matrix, 56 Unit Tests (`bloc_test`), 35 Widget Tests, CI pipeline.
* **Speaker Script:**
  > "The mobile client consists of **31 fully implemented screens** across authentication, live discovery, EPG schedule browser, video player, user profiles, and studio management.
  > 
  > Quality is enforced by **91 automated tests**:
  > - **56 Unit Tests:** Covering BLoC state transitions, SQLite repositories, and DTO parsing.
  > - **35 Widget Tests:** Verifying gesture interactions, error boundaries, and offline banners.
  > - All test suites pass with a 100% success rate on our automated CI workflow."

---

### PART 3: SYNERGY & LIVE EVALUATION

#### Slide 18: Cross-Platform Synergy Matrix
* **Visual:** Side-by-side comparative table: PRN232 Back-End vs PRM393 Mobile. Total LOC: 142,897. Total Tests: 482.
* **Speaker Script:**
  > "This matrix highlights the perfect harmony between both courses:
  > - **PRN232** provides the media ingest pipeline, scheduling brain, and relational backbone across 79,568 lines of code and 391 tests.
  > - **PRM393** provides the high-performance native playback, offline resilience, and consumer interaction across 53,922 lines of code and 91 tests.
  > - Together, they form an enterprise broadcast network of **142,897 lines of code and 482 automated tests**, all verified and passing."

#### Slide 19: Live Production Deployment & Demo Accounts
* **Visual:** Live URLs, Vercel deployments, GitHub repo, Swagger docs, demo accounts (`admin@omnicast.tv`, `staff@omnicast.tv`, `viewer1@omnicast.tv`).
* **Speaker Script:**
  > "The entire ecosystem is deployed in live production and ready for immediate committee inspection:
  > - **Web Portal:** Accessible at `https://omnicast-fe.vercel.app`.
  > - **API Swagger Docs:** Live at `https://omnicast-api.vercel.app/swagger`.
  > - **Mobile Client:** Signed APK release v1.2.0 is available on GitHub.
  > - **Demo Accounts:** Pre-seeded test accounts with the password `Admin123!` provide full access to RBAC roles from Admin to Viewer."

#### Slide 20: Project Milestones & Lessons Learned
* **Visual:** Engineering milestones achieved, technical lessons from gRPC and BLoC, future roadmap.
* **Speaker Script:**
  > "Key engineering takeaways from this project:
  > 1. Eliminating airtime collisions and dead-air requires mathematical precision at the database layer.
  > 2. gRPC binary serialization provides dramatic efficiency gains for high-frequency internal telemetry.
  > 3. The BLoC pattern completely insulates the mobile UI from network latency and stream rebuffering.
  > 
  > In future iterations, we plan to implement distributed MediaMTX edge clustering and automated AI audio dubbing."

#### Slide 21: Conclusion & Committee Q&A
* **Visual:** Final concluding slide with thank-you banner and live links.
* **Speaker Script:**
  > "In conclusion, OmniCast demonstrates that modern cloud architectures, WebRTC streaming, and Flutter mobile applications can be seamlessly integrated into an enterprise-grade broadcast platform.
  > 
  > We thank the evaluation committee for your time and guidance, and we are now ready to commence our live system demonstration and answer your questions."

---

## Anticipated Committee Questions & Recommended Answers

### Q1: How do you handle dead-air if a broadcaster fails to schedule content?
* **Answer:**  
  "We solved this through our **Deterministic Pseudo-Random Playout Algorithm**. Our scheduling daemon continuously scans the EPG timeline. If an unscheduled gap is detected between programmed blocks, the system calculates the exact duration of the void and queries our fallback filler library. It uses the `(channel_id + date)` as a pseudo-random seed to select bumper clips, music promos, and station IDs that match the exact void duration. Because the seed is deterministic, all concurrent viewers on both Web and Mobile see the exact same filler content synchronized down to the second."

### Q2: Why choose WebRTC WHIP/WHEP instead of RTMP or pure HLS?
* **Answer:**  
  "Traditional RTMP requires legacy Flash-based protocols or complex server wrappers, and pure HLS introduces 4 to 12 seconds of latency, which destroys live viewer interactions like real-time bidding, donations, and chat. WebRTC WHIP (WebRTC HTTP Ingestion Protocol) provides standardized, browser-native stream ingest without external software, while WHEP provides playback latency under 500 milliseconds. We retain HLS as an automated fallback for viewers with poor cellular bandwidth."

### Q3: How do you guarantee offline state consistency in the Flutter app?
* **Answer:**  
  "We employ an **Offline Mutation Queue** stored in local SQLite (`sqflite`). When a user triggers an action without internet connectivity (such as updating their watchlist or bookmarking a channel), the repository generates a UUID-tagged mutation record in the `pending_mutations` table and updates the local UI immediately using optimistic updates. A connectivity listener (`connectivity_plus`) detects when internet connectivity resumes and triggers a background sync worker. The worker posts each queued mutation with an idempotency key to prevent duplicate server writes."

### Q4: How is database performance preserved when hundreds of viewers access the EPG schedule simultaneously?
* **Answer:**  
  "We implemented three defensive layers:
  1. **Compound Indexing:** We created composite B-tree indexes on `epg_programs(channel_id, start_time)` and `epg_programs(start_time, end_time)`.
  2. **Connection Pooling:** We route all NestJS queries through Supabase's transaction pooler (`pgBouncer`), keeping active PostgreSQL connections capped and avoiding thread contention.
  3. **In-Memory Caching:** High-frequency schedule queries are cached with TTLs, so redundant read requests do not hit the disk."

