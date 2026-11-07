const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const SHARED_DIR = __dirname;
const OUT_DIR = path.join(SHARED_DIR, 'rendered_figures');
if (!fs.existsSync(OUT_DIR)) {
  fs.mkdirSync(OUT_DIR, { recursive: true });
}

const XELATEX = path.join(process.env.LOCALAPPDATA, 'Programs', 'MiKTeX', 'miktex', 'bin', 'x64', 'xelatex.exe');
const PDFTOPPM = path.join(process.env.LOCALAPPDATA, 'Programs', 'MiKTeX', 'miktex', 'bin', 'x64', 'pdftoppm.exe');

// High-polish, spacious, crystal-clear TikZ diagrams with ample padding, orthogonal routing, and readable typography
const DIAGRAM_DEFINITIONS = {
  // 1. Overall System Architecture
  architecture: `
\\begin{tikzpicture}[
  node distance=1.4cm and 1.8cm,
  every node/.style={font=\\footnotesize},
  box/.style={draw=omniBorder, fill=white, rounded corners=5pt, minimum height=14mm, align=center, inner sep=8pt, line width=0.9pt, drop shadow={shadow xshift=0.8pt, shadow yshift=-0.8pt, opacity=0.15}},
  layer/.style={box, fill=omniLight!70, draw=omniSlate, line width=1.2pt, font=\\bfseries\\small},
  clientBox/.style={box, fill=omniPurple!8, draw=omniPurple, line width=1.1pt},
  apiBox/.style={box, fill=omniBlue!10, draw=omniBlue, line width=1.3pt},
  svcBox/.style={box, fill=omniTeal!10, draw=omniTeal, line width=1.1pt},
  dataBox/.style={box, fill=omniDark!8, draw=omniDark, line width=1.1pt},
  extBox/.style={box, fill=omniAmber!10, draw=omniAmber, line width=1.1pt},
  flow/.style={-{Latex[length=3mm, width=2mm]}, line width=1.0pt, draw=omniSlate},
  flowAccent/.style={-{Latex[length=3mm, width=2mm]}, line width=1.2pt, draw=omniBlue},
  flowTeal/.style={-{Latex[length=3mm, width=2mm]}, line width=1.1pt, draw=omniTeal},
  flowAmber/.style={-{Latex[length=3mm, width=2mm]}, line width=1.1pt, draw=omniAmber},
  flowPurple/.style={-{Latex[length=3mm, width=2mm]}, line width=1.1pt, draw=omniPurple},
  lbl/.style={fill=white, inner sep=2.5pt, font=\\scriptsize, text=omniSlate, rounded corners=2pt}
]

  % Col 1: Presentation Layer
  \\node[layer, minimum width=4.0cm, fill=omniPurple!15] (l_client) {\\bi{TẦNG GIAO DIỆN CLIENT}{CLIENT PRESENTATION LAYER}};
  \\node[clientBox, below=0.8cm of l_client, minimum width=4.0cm] (web) {\\textbf{Web Portal Client}\\\\Next.js 15 $\\cdot$ React 19 $\\cdot$ App Router\\\\33 Routes $\\cdot$ Cinema Dark UI};
  \\node[clientBox, below=0.9cm of web, minimum width=4.0cm] (mob) {\\textbf{Mobile App Client}\\\\Flutter 3.x $\\cdot$ BLoC Architecture\\\\31 Screens $\cdot$ OmniPlayer};

  % Col 2: Gateway & API Layer
  \\node[layer, right=1.6cm of l_client, minimum width=4.4cm, fill=omniBlue!15] (l_api) {\\bi{TẦNG API \\& ĐIỀU HỢP}{GATEWAY \\& API LAYER}};
  \\node[apiBox, below=0.8cm of l_api, minimum width=4.4cm, minimum height=3.8cm] (api) {\\textbf{NestJS Core Backend Gateway}\\\\19 Business Modules $\\cdot$ 140+ REST APIs\\\\JWT Dual-Token Rotation (Access/Refresh)\\\\4-Tier Role Guard (RBAC) $\\cdot$ OpenAPI/Swagger};

  % Col 3: Microservices & Real-Time Engine
  \\node[layer, right=1.6cm of l_api, minimum width=4.4cm, fill=omniTeal!15] (l_svc) {\\bi{DỊCH VỤ THỜI GIAN THỰC}{REAL-TIME \\& SERVICES}};
  \\node[svcBox, below=0.8cm of l_svc, minimum width=4.4cm] (live) {\\textbf{LiveStreamGateway (/live)}\\\\Socket.IO Engine $\\cdot$ WebRTC Rooms\\\\Live Chat $\\cdot$ 0ms Reactions $\\cdot$ Super Chat};
  \\node[svcBox, below=0.7cm of live, minimum width=4.4cm] (audit) {\\textbf{gRPC Audit Logger}\\\\Microservice $\\cdot$ HTTP/2 Protobuf\\\\Immutable System Operation Audit};
  \\node[extBox, below=0.7cm of audit, minimum width=4.4cm] (media) {\\textbf{MediaMTX Engine}\\\\WHIP Camera Ingest $\\cdot$ WHEP Egress\\\\LL-HLS Sub-Second Stream Distribution};

  % Col 4: Data & Cloud Infrastructure
  \\node[layer, right=1.6cm of l_svc, minimum width=4.4cm, fill=omniDark!15] (l_data) {\\bi{DỮ LIỆU \\& HẠ TẦNG ĐÁM MÂY}{DATA \\& CLOUD SERVICES}};
  \\node[dataBox, below=0.8cm of l_data, minimum width=4.4cm] (db) {\\textbf{PostgreSQL / Supabase}\\\\21 Prisma ORM Models (3NF)\\\\Atomic Transactions $\\cdot$ PgBouncer};
  \\node[extBox, below=0.7cm of db, minimum width=4.4cm] (cloud) {\\textbf{Cloudinary CDN}\\\\VOD Video Library $\\cdot$ Auto HLS\\\\Master Channel \\& Production Assets};
  \\node[extBox, below=0.7cm of cloud, minimum width=4.4cm] (ext) {\\textbf{External Cloud APIs}\\\\OpenAI GPT-4o (AI Curator)\\\\VietQR Napas 24/7 $\\cdot$ PayOS Gateway};

  % Connecting Flows with ample routing
  \\draw[flowPurple] (web.east) -- node[above, lbl] {REST / SSE} (api.west |- web.east);
  \\draw[flowPurple] (mob.east) -- node[below, lbl] {REST / Dio} (api.west |- mob.east);

  \\draw[flowAccent] (api.east |- live.west) -- node[above, lbl] {Event State} (live.west);
  \\draw[flowAccent] (api.east |- audit.west) -- node[above, lbl] {gRPC Client} (audit.west);
  \\draw[flowAccent] (api.east |- media.west) -- node[above, lbl] {Control API} (media.west);

  \\draw[flowTeal] (live.east) -- node[above, lbl] {Persist} (db.west |- live.east);
  \\draw[flowTeal] (audit.east) -- node[above, lbl] {Audit Log} (db.west |- audit.east);
  \\draw[flowAmber] (media.east) -- node[above, lbl] {Media Assets} (cloud.west);
  \\draw[flowAccent] (api.south) -- ++(0,-0.6) -| node[pos=0.25, lbl] {Fintech Webhook \\& AI Stream} (ext.south);

\\end{tikzpicture}
`,

  // 2. Real-Time LiveStream & Live Studio Architecture
  livestream_arch: `
\\begin{tikzpicture}[
  node distance=1.4cm and 1.8cm,
  every node/.style={font=\\footnotesize},
  box/.style={draw=omniBorder, fill=white, rounded corners=5pt, minimum height=14mm, align=center, inner sep=8pt, line width=1.0pt, drop shadow={shadow xshift=0.8pt, shadow yshift=-0.8pt, opacity=0.15}},
  flow/.style={-{Latex[length=3mm, width=2mm]}, line width=1.1pt, draw=omniSlate},
  flowAccent/.style={-{Latex[length=3mm, width=2mm]}, line width=1.3pt, draw=omniBlue},
  flowTeal/.style={-{Latex[length=3mm, width=2mm]}, line width=1.2pt, draw=omniTeal},
  flowAmber/.style={-{Latex[length=3mm, width=2mm]}, line width=1.2pt, draw=omniAmber},
  flowRose/.style={-{Latex[length=3mm, width=2mm]}, line width=1.2pt, draw=omniRose},
  flowPurple/.style={-{Latex[length=3mm, width=2mm]}, line width=1.2pt, draw=omniPurple},
  lbl/.style={fill=white, inner sep=2.5pt, font=\\scriptsize, rounded corners=2pt}
]

  % Col 1: Production & Studio Sources
  \\node[box, fill=omniPurple!12, draw=omniPurple, minimum width=4.6cm] (studio) {\\textbf{Live Studio Director Console}\\\\Multi-Source Program Selector\\\\On-The-Fly Dynamic Program Switch};
  \\node[box, fill=omniPurple!8, draw=omniPurple, below=1.2cm of studio, minimum width=4.6cm] (cam) {\\textbf{Field Broadcaster Device}\\\\Mobile Camera / Screen Capture\\\\WebRTC WHIP Real-Time Ingest (8889)};
  \\node[box, fill=omniPurple!8, draw=omniPurple, below=1.2cm of cam, minimum width=4.6cm] (vod) {\\textbf{Curated VOD Library}\\\\Cloudinary MP4 Master Feeds\\\\Automated Scheduled Broadcasts};

  % Col 2: Core Server Distribution Engines
  \\node[box, fill=omniBlue!12, draw=omniBlue, right=2.2cm of studio, minimum width=4.8cm] (svc) {\\textbf{LiveStudioService (NestJS)}\\\\Atomic Event State Transition\\\\Program Switching Synchronization};
  \\node[box, fill=omniAmber!12, draw=omniAmber, right=2.2cm of cam, minimum width=4.8cm] (mtx) {\\textbf{MediaMTX Streaming Server}\\\\WHIP Ingest Ingestion Gateway\\\\Sub-Second WHEP / LL-HLS Relay (8888)};
  \\node[box, fill=omniTeal!12, draw=omniTeal, right=2.2cm of vod, minimum width=4.8cm] (gateway) {\\textbf{LiveStreamGateway (/live)}\\\\Socket.IO Virtual Channel Rooms\\\\Signalling $\\cdot$ Toast Dispatcher $\\cdot$ Chat};

  % Col 3: Client Consumers & Interactive Features
  \\node[box, fill=omniBlue!10, draw=omniBlue, right=2.2cm of svc, minimum width=4.8cm] (viewers) {\\textbf{Web \\& Mobile Audience}\\\\OmniPlayer Audiovisual Engine\\\\WebRTC WHEP (< 1s Latency) / LL-HLS};
  \\node[box, fill=omniRose!10, draw=omniRose, right=2.2cm of gateway, minimum width=4.8cm] (social) {\\textbf{Real-Time Interactive Engagement}\\\\Live Chat $\\cdot$ 0ms Floating Reactions\\\\Super Chat Banners $\\cdot$ Director Pinned Alerts};

  % Connectors
  \\draw[flowAccent] (studio.east) -- node[above, lbl] {\\bi{Lệnh chuyển chương trình}{Switch Program}} (svc.west);
  \\draw[flowAmber] (cam.east) -- node[above, lbl] {\\bi{Luồng WHIP}{WHIP Feed}} (mtx.west);
  \\draw[flowPurple] (vod.east) -- node[above, lbl] {\\bi{HLS Master}{HLS Video}} (mtx.west |- vod.east);

  \\draw[flowAccent] (svc.south) -- node[right, lbl] {\\bi{Đồng bộ luồng}{Sync Stream}} (mtx.north);
  \\draw[flowTeal] (svc.east) -- ++(1.0,0) |- node[pos=0.25, lbl, right] {\\bi{Phát tín hiệu /live}{Emit /live}} (gateway.north);

  \\draw[flowAmber] (mtx.east) -- node[above, lbl] {\\bi{WHEP / HLS}{WHEP / HLS}} (viewers.west);
  \\draw[flowRose] (gateway.east) -- node[above, lbl] {\\bi{Socket.IO Room}{Socket.IO Room}} (social.west);
  \\draw[flow] (viewers.south) -- node[right, lbl] {\\bi{Tương tác đồng thời}{Concurrent Events}} (social.north);

\\end{tikzpicture}
`,

  // 3. EPG Conflict Detection Algorithm
  conflict: `
\\begin{tikzpicture}[x=1.1cm, y=1.0cm, every node/.style={font=\\footnotesize}]
  % Existing Event Track
  \\draw[draw=omniBorder, fill=omniLight!60, rounded corners=4pt] (-0.2, 4.3) rectangle (10.8, 5.5);
  \\node[font=\\bfseries\\small, text=omniBlue] at (5.3, 5.15) {\\bi{KÊNH PHÁT SÓNG --- SỰ KIỆN ĐÃ TỒN TẠI TRONG CƠ SỞ DỮ LIỆU}{BROADCAST CHANNEL --- EXISTING DATABASE SCHEDULE}};
  
  \\filldraw[fill=omniBlue!25, draw=omniBlue, line width=1.1pt, rounded corners=3pt] (2.2, 4.45) rectangle (7.8, 4.95);
  \\node at (5.0, 4.7) {\\textbf{\\bi{Sự kiện A đã có (14:00 -- 16:00)}{Existing Event A (14:00 -- 16:00)}}};

  % Case 1: Head Overlap
  \\filldraw[fill=omniRose!22, draw=omniRose, line width=1.1pt, rounded corners=3pt] (0.8, 3.1) rectangle (4.5, 3.6);
  \\node at (2.65, 3.35) {\\textbf{\\bi{Lịch mới (13:00 -- 15:00)}{New Event (13:00 -- 15:00)}}};
  \\node[font=\\scriptsize\\bfseries, text=omniRose, fill=white, inner sep=2pt, rounded corners=2pt] at (7.8, 3.35) {\\bi{XUNG ĐỘT GIAO THOA ĐẦU $\\rightarrow$ HTTP 409 CONFLICT}{HEAD OVERLAP DETECTED $\\rightarrow$ HTTP 409 CONFLICT}};
  \\draw[omniRose, dashed, line width=0.9pt] (2.2, 3.1) -- (2.2, 4.45);

  % Case 2: Tail Overlap
  \\filldraw[fill=omniRose!22, draw=omniRose, line width=1.1pt, rounded corners=3pt] (6.0, 2.1) rectangle (9.8, 2.6);
  \\node at (7.9, 2.35) {\\textbf{\\bi{Lịch mới (15:00 -- 17:00)}{New Event (15:00 -- 17:00)}}};
  \\node[font=\\scriptsize\\bfseries, text=omniRose, fill=white, inner sep=2pt, rounded corners=2pt] at (2.8, 2.35) {\\bi{XUNG ĐỘT GIAO THOA ĐUÔI $\\rightarrow$ HTTP 409 CONFLICT}{TAIL OVERLAP DETECTED $\\rightarrow$ HTTP 409 CONFLICT}};
  \\draw[omniRose, dashed, line width=0.9pt] (7.8, 2.1) -- (7.8, 4.45);

  % Case 3: Fully Contained
  \\filldraw[fill=omniRose!22, draw=omniRose, line width=1.1pt, rounded corners=3pt] (3.0, 1.1) rectangle (6.5, 1.6);
  \\node at (4.75, 1.35) {\\textbf{\\bi{Lịch mới (14:30 -- 15:30)}{New Event (14:30 -- 15:30)}}};
  \\node[font=\\scriptsize\\bfseries, text=omniRose, fill=white, inner sep=2pt, rounded corners=2pt] at (8.5, 1.35) {\\bi{NẰM HOÀN TOÀN BÊN TRONG $\\rightarrow$ HTTP 409}{FULLY CONTAINED $\\rightarrow$ HTTP 409}};

  % Case 4: Non-overlapping (Allowed)
  \\filldraw[fill=omniTeal!25, draw=omniTeal, line width=1.1pt, rounded corners=3pt] (8.2, 0.1) rectangle (10.6, 0.6);
  \\node at (9.4, 0.35) {\\textbf{\\bi{Lịch mới (16:30 -- 18:00)}{New Event (16:30 -- 18:00)}}};
  \\node[font=\\scriptsize\\bfseries, text=omniTeal, fill=white, inner sep=2pt, rounded corners=2pt] at (3.8, 0.35) {\\bi{KHÔNG TRÙNG LẶP $\\rightarrow$ THÊM THÀNH CÔNG (HTTP 201 CREATED)}{ZERO OVERLAP $\\rightarrow$ INSERT SUCCEEDED (HTTP 201 CREATED)}};

  % Time Axis with clean ticks
  \\draw[-{Latex[length=3mm, width=2mm]}, line width=1.0pt, draw=omniSlate] (-0.2, -0.4) -- (11.0, -0.4);
  \\foreach \\x/\\lab in {0.8/13:00, 2.2/14:00, 3.6/15:00, 5.0/15:30, 6.4/16:00, 7.8/16:30, 9.2/17:30, 10.4/18:30}{
    \\draw[line width=0.8pt, draw=omniSlate] (\\x, -0.4) -- (\\x, -0.25);
    \\node[font=\\scriptsize\\bfseries, text=omniSlate, below=2pt] at (\\x, -0.4) {\\lab};
  }
\\end{tikzpicture}
`,

  // 4. AI Curator Pipeline
  ai_pipeline: `
\\begin{tikzpicture}[
  node distance=1.2cm and 1.6cm,
  box/.style={draw=omniBorder, fill=white, rounded corners=5pt, minimum height=14mm, align=center, inner sep=8pt, line width=1.0pt, drop shadow={shadow xshift=0.8pt, shadow yshift=-0.8pt, opacity=0.15}},
  flow/.style={-{Latex[length=3mm, width=2mm]}, line width=1.1pt, draw=omniSlate},
  flowTeal/.style={-{Latex[length=3mm, width=2mm]}, line width=1.2pt, draw=omniTeal},
  flowRose/.style={-{Latex[length=3mm, width=2mm]}, line width=1.2pt, draw=omniRose},
  flowAccent/.style={-{Latex[length=3mm, width=2mm]}, line width=1.3pt, draw=omniBlue},
  lbl/.style={fill=white, inner sep=2.5pt, font=\\scriptsize, rounded corners=2pt}
]

  % Main Flow
  \\node[box, fill=omniPurple!10, draw=omniPurple, minimum width=3.8cm] (input) {\\textbf{Raw Program Input}\\\\Title $\\cdot$ Description\\\\Genre $\\cdot$ Production Tags};
  \\node[box, fill=omniBlue!10, draw=omniBlue, right=1.6cm of input, minimum width=4.0cm] (norm) {\\textbf{Input Normaliser}\\\\Structure Cleaning\\\\Field Sanitization};
  \\node[box, fill=omniAmber!12, draw=omniAmber, right=1.6cm of norm, minimum width=3.8cm] (branch) {\\textbf{API Key Dispatcher}\\\\Check Valid OpenAI Key};

  % Branch Upper: OpenAI
  \\node[box, fill=omniTeal!12, draw=omniTeal, above right=0.9cm and 1.6cm of branch, minimum width=4.5cm] (prompt) {\\textbf{Consolidated Prompt Engine}\\\\One-Shot LLM Call Formulation\\\\Strict Zod Output Schema};
  \\node[box, fill=omniTeal!12, draw=omniTeal, right=1.6cm of prompt, minimum width=4.5cm] (call) {\\textbf{OpenAI GPT-4o Execution}\\\\Deterministic Inference (temp=0.3)\\\\Exponential Backoff Retry};
  \\node[box, fill=omniDark!10, draw=omniDark, right=1.6cm of call, minimum width=4.5cm] (validate) {\\textbf{Zod Schema Validator}\\\\Sentiment Score $\\cdot$ Summary\\\\Compliance Flags Check};

  % Branch Lower: Heuristic Fallback
  \\node[box, fill=omniRose!12, draw=omniRose, below right=0.9cm and 1.6cm of branch, minimum width=4.5cm] (fallback) {\\textbf{Heuristic Fallback Engine}\\\\Regex Rule Compliance Check\\\\Keyword Tone Extraction};
  \\node[box, fill=omniPurple!12, draw=omniPurple, right=1.6cm of fallback, minimum width=4.5cm] (conf) {\\textbf{Confidence Scoring}\\\\Algorithmic Baseline Score\\\\Reliable Offline Guarantee};

  % Final Aggregation
  \\node[box, fill=omniBlue!15, draw=omniBlue, below right=1.0cm and 1.6cm of validate, minimum width=4.8cm, minimum height=18mm] (report) {\\textbf{AiCuratorReport Entity}\\\\Persisted in PostgreSQL\\\\JSON Provenance $\\cdot$ Prompt Version};

  % Connectors
  \\draw[flowAccent] (input) -- (norm);
  \\draw[flowAccent] (norm) -- (branch);

  \\draw[flowTeal] (branch) |- node[pos=0.3, above, lbl] {\\bi{Key hợp lệ}{Valid Key}} (prompt);
  \\draw[flowTeal] (prompt) -- (call);
  \\draw[flowTeal] (call) -- (validate);
  \\draw[flowTeal] (validate) -| (report);

  \\draw[flowRose] (branch) |- node[pos=0.3, below, lbl] {\\bi{Không có Key}{No API Key}} (fallback);
  \\draw[flowRose] (fallback) -- (conf);
  \\draw[flowRose] (conf) -| (report);

  \\draw[flowRose, dashed] (validate.south) -- ++(0,-0.6) -| node[pos=0.3, lbl] {\\bi{Lỗi Schema $\\rightarrow$ Chuyển Fallback}{Schema Fail $\\rightarrow$ Fallback}} (fallback.north);

\\end{tikzpicture}
`,

  // 5. 5-Domain Relational Database Architecture
  database: `
\\begin{tikzpicture}[
  node distance=1.4cm and 1.8cm,
  box/.style={draw=omniBorder, fill=white, rounded corners=6pt, minimum height=3.6cm, align=left, inner sep=10pt, line width=1.1pt, drop shadow={shadow xshift=0.8pt, shadow yshift=-0.8pt, opacity=0.15}},
  flow/.style={-{Latex[length=3mm, width=2mm]}, line width=1.2pt, draw=omniSlate},
  flowAccent/.style={-{Latex[length=3mm, width=2mm]}, line width=1.3pt, draw=omniBlue},
  lbl/.style={fill=white, inner sep=3pt, font=\\scriptsize\\bfseries, rounded corners=2pt}
]

  % Domain 1: Identity & Auth
  \\node[box, fill=omniBlue!8, draw=omniBlue, minimum width=5.6cm] (d1) at (0, 4.2) {
    \\textbf{\\large 1. Identity \\& Security Domain}\\\\
    \\rule{5.0cm}{0.8pt}\\\\
    $\\bullet$ \\textbf{User:} UUID, Email, PasswordHash, Role\\\\
    $\\bullet$ \\textbf{Role:} GUEST, VIEWER, STAFF, ADMIN\\\\
    $\\bullet$ \\textbf{RefreshToken:} Rotated Family, Expiry\\\\
    $\\bullet$ \\textbf{UserProfile:} Bio, Avatar, Preferences\\\\
    $\\bullet$ \\textbf{WalletBalance:} Creator Ledger Account
  };

  % Domain 2: Broadcast & EPG
  \\node[box, fill=omniTeal!8, draw=omniTeal, minimum width=6.2cm] (d2) at (7.8, 4.2) {
    \\textbf{\\large 2. Broadcast \\& EPG Domain}\\\\
    \\rule{5.6cm}{0.8pt}\\\\
    $\\bullet$ \\textbf{LiveChannel:} Slug, StreamUrl, isLive\\\\
    $\\bullet$ \\textbf{Program:} Master Title, Synopsis, Duration\\\\
    $\\bullet$ \\textbf{LiveEvent:} scheduledAt, effectiveEnd, State\\\\
    $\\bullet$ \\textbf{Recording:} Catch-up VOD, StorageUrl\\\\
    $\\bullet$ \\textbf{Category:} NEWS, SPORTS, CINE, KIDS
  };

  % Domain 3: Social & Monetisation
  \\node[box, fill=omniPurple!8, draw=omniPurple, minimum width=5.6cm] (d3) at (15.6, 4.2) {
    \\textbf{\\large 3. Social \\& Monetisation}\\\\
    \\rule{5.0cm}{0.8pt}\\\\
    $\\bullet$ \\textbf{StreamDonation:} Super Chat, VietQR\\\\
    $\\bullet$ \\textbf{LiveComment:} Realtime Chat, Pinned\\\\
    $\\bullet$ \\textbf{LiveReaction:} 0ms Floating Counter\\\\
    $\\bullet$ \\textbf{WatchlistItem:} Saved Favourites\\\\
    $\\bullet$ \\textbf{WatchHistory:} Playback Progress
  };

  % Domain 4: Operations & Audit
  \\node[box, fill=omniAmber!8, draw=omniAmber, minimum width=6.6cm] (d4) at (3.5, -0.6) {
    \\textbf{\\large 4. Operations \\& Audit Domain}\\\\
    \\rule{6.0cm}{0.8pt}\\\\
    $\\bullet$ \\textbf{AuditLog:} Immutable Operation Trail, gRPC\\\\
    $\\bullet$ \\textbf{SystemHealth:} Uptime, MediaMTX Ping\\\\
    $\\bullet$ \\textbf{Notification:} In-app Alerts, FCM Push\\\\
    $\\bullet$ \\textbf{DeviceToken:} Mobile APNs / Firebase Registration
  };

  % Domain 5: AI Content Intelligence
  \\node[box, fill=omniRose!8, draw=omniRose, minimum width=6.6cm] (d5) at (12.5, -0.6) {
    \\textbf{\\large 5. AI Content Intelligence}\\\\
    \\rule{6.0cm}{0.8pt}\\\\
    $\\bullet$ \\textbf{AiCuratorReport:} Compliance \\& Rating\\\\
    $\\bullet$ \\textbf{SentimentScore:} Float (0.0 to 1.0)\\\\
    $\\bullet$ \\textbf{EditorialTag:} Suggested Tags, SEO Keywords\\\\
    $\\bullet$ \\textbf{ProvenanceData:} Prompt Version, Model Used
  };

  % Relational Connections
  \\draw[flowAccent] (d1.east) -- node[above, lbl] {\\bi{Sở hữu kênh}{Owns Channel}} (d2.west);
  \\draw[flowAccent] (d2.east) -- node[above, lbl] {\\bi{Sự kiện Live}{Live Activity}} (d3.west);
  \\draw[flow] (d1.south) -- ++(0,-0.6) -| node[pos=0.25, lbl] {\\bi{Nhật ký người dùng}{User Audit}} (d4.north);
  \\draw[flow] (d2.south) -- ++(0,-0.6) -| node[pos=0.25, lbl] {\\bi{Biên tập tự động}{AI Inspection}} (d5.north);

\\end{tikzpicture}
`,

  // 6. JWT Authentication & 4-Tier RBAC Access Control
  auth_flow: `
\\begin{tikzpicture}[
  node distance=1.3cm and 1.8cm,
  box/.style={draw=omniBorder, fill=white, rounded corners=5pt, minimum height=14mm, align=center, inner sep=8pt, line width=1.0pt, drop shadow={shadow xshift=0.8pt, shadow yshift=-0.8pt, opacity=0.15}},
  flow/.style={-{Latex[length=3mm, width=2mm]}, line width=1.1pt, draw=omniSlate},
  flowAccent/.style={-{Latex[length=3mm, width=2mm]}, line width=1.3pt, draw=omniBlue},
  flowTeal/.style={-{Latex[length=3mm, width=2mm]}, line width=1.2pt, draw=omniTeal},
  flowRose/.style={-{Latex[length=3mm, width=2mm]}, line width=1.2pt, draw=omniRose},
  lbl/.style={fill=white, inner sep=2.5pt, font=\\scriptsize, rounded corners=2pt}
]

  % Row 1: Login Sequence
  \\node[box, fill=omniPurple!10, draw=omniPurple, minimum width=4.2cm] (client) {\\textbf{Web / Mobile Client}\\\\User Submits Credentials\\\\(email + password)};
  \\node[box, fill=omniBlue!10, draw=omniBlue, right=1.8cm of client, minimum width=4.4cm] (auth) {\\textbf{AuthController (/auth/login)}\\\\Validate Input DTO\\\\Call AuthService};
  \\node[box, fill=omniTeal!10, draw=omniTeal, right=1.8cm of auth, minimum width=4.4cm] (svc) {\\textbf{AuthService}\\\\bcrypt.compare() Verify\\\\Deactivated Flag Check};
  \\node[box, fill=omniDark!10, draw=omniDark, right=1.8cm of svc, minimum width=4.2cm] (db) {\\textbf{PostgreSQL Store}\\\\User Entity Lookup\\\\Record Login Timestamp};

  % Row 2: Token Issuance & Guard Validation
  \\node[box, fill=omniPurple!12, draw=omniPurple, below=1.4cm of svc, minimum width=4.4cm] (tok) {\\textbf{Token Issuance Engine}\\\\Access Token (60 min)\\\\Refresh Token (90 days, Rotated)};
  \\node[box, fill=omniAmber!12, draw=omniAmber, below=1.4cm of auth, minimum width=4.4cm] (guard) {\\textbf{JwtAuthGuard \\& RolesGuard}\\\\Passport Strategy Verify\\\\Check @Roles(GUEST..ADMIN)};
  \\node[box, fill=omniRose!12, draw=omniRose, below=1.4cm of client, minimum width=4.2cm] (endpoint) {\\textbf{Protected API Endpoint}\\\\HTTP 200 / Business Data\\\\(or HTTP 401/403 Forbidden)};

  % Connectors
  \\draw[flowAccent] (client) -- node[above, lbl] {POST /login} (auth);
  \\draw[flowAccent] (auth) -- (svc);
  \\draw[flowAccent] (svc) -- node[above, lbl] {Query} (db);

  \\draw[flowTeal] (svc) -- node[right, lbl] {\\bi{Mật khẩu khớp}{Valid Hash}} (tok);
  \\draw[flowTeal] (tok) -- node[above, lbl] {\\bi{Kèm Payload Token}{JWT Payload}} (guard);
  \\draw[flowRose] (guard) -- node[above, lbl] {\\bi{Cho phép truy cập}{Role Allowed}} (endpoint);

  \\draw[flow, dashed] (client.south) -- ++(0,-0.6) -| node[pos=0.25, lbl] {\\bi{Các Request sau gửi kèm Bearer Token}{Subsequent Requests with Bearer Token}} (guard.north);

\\end{tikzpicture}
`,

  // 7. Multi-Source Ingest Pipeline
  ingest: `
\\begin{tikzpicture}[
  node distance=1.1cm and 1.8cm,
  box/.style={draw=omniBorder, fill=white, rounded corners=5pt, minimum height=14mm, align=center, inner sep=8pt, line width=1.0pt, drop shadow={shadow xshift=0.8pt, shadow yshift=-0.8pt, opacity=0.15}},
  flow/.style={-{Latex[length=3mm, width=2mm]}, line width=1.1pt, draw=omniSlate},
  flowAmber/.style={-{Latex[length=3mm, width=2mm]}, line width=1.2pt, draw=omniAmber},
  flowTeal/.style={-{Latex[length=3mm, width=2mm]}, line width=1.2pt, draw=omniTeal},
  flowRose/.style={-{Latex[length=3mm, width=2mm]}, line width=1.2pt, draw=omniRose},
  flowAccent/.style={-{Latex[length=3mm, width=2mm]}, line width=1.3pt, draw=omniBlue},
  lbl/.style={fill=white, inner sep=2.5pt, font=\\scriptsize, rounded corners=2pt}
]

  % Sources Col
  \\node[box, fill=omniAmber!10, draw=omniAmber, minimum width=4.2cm] (yt) {\\textbf{YouTube Live Ingest}\\\\Data API v3 $\\cdot$ Channel Feeds};
  \\node[box, fill=omniAmber!10, draw=omniAmber, below=0.8cm of yt, minimum width=4.2cm] (tw) {\\textbf{Twitch Streams}\\\\Helix API $\\cdot$ Stream Metadata};
  \\node[box, fill=omniAmber!10, draw=omniAmber, below=0.8cm of tw, minimum width=4.2cm] (rss) {\\textbf{Broadcast RSS Feeds}\\\\Standard XML / JSON TV Feeds};

  % Processing Col
  \\node[box, fill=omniBlue!10, draw=omniBlue, right=1.8cm of tw, minimum width=4.5cm] (cron) {\\textbf{Automated Scheduler (@Cron)}\\\\Periodic Poll (15/30 Minutes)\\\\Worker Thread Concurrency};
  \\node[box, fill=omniTeal!10, draw=omniTeal, right=1.8cm of cron, minimum width=4.5cm] (norm) {\\textbf{Data Normaliser Engine}\\\\Map to NormalizedLiveEvent\\\\Standardize Start / End Times};

  % Target Col
  \\node[box, fill=omniDark!10, draw=omniDark, right=1.8cm of norm, minimum width=4.5cm] (db) {\\textbf{PostgreSQL Upsert}\\\\Upsert LiveEvent by Channel\\\\Deduplication Key Filter};
  \\node[box, fill=omniRose!12, draw=omniRose, below=1.0cm of db, minimum width=4.5cm] (fill) {\\textbf{24/7 EPG Grid Filler}\\\\Seeded RNG Algorithm\\\\Fill Gaps with Curated VODs};

  % Connectors
  \\draw[flowAmber] (yt.east) -| (cron.north);
  \\draw[flowAmber] (tw.east) -- (cron.west);
  \\draw[flowAmber] (rss.east) -| (cron.south);

  \\draw[flowAccent] (cron) -- node[above, lbl] {\\bi{Kích hoạt nạp}{Trigger Ingest}} (norm);
  \\draw[flowTeal] (norm) -- node[above, lbl] {\\bi{Lưu vào CSDL}{Store Schedule}} (db);
  \\draw[flowRose] (db.south) -- node[right, lbl] {\\bi{Khoảng trống lịch}{Detect Gaps}} (fill.north);

\\end{tikzpicture}
`,

  // 8. CI/CD GitHub Actions Pipeline
  cicd: `
\\begin{tikzpicture}[
  node distance=1.2cm and 1.6cm,
  box/.style={draw=omniBorder, fill=white, rounded corners=5pt, minimum height=14mm, align=center, inner sep=8pt, line width=1.0pt, drop shadow={shadow xshift=0.8pt, shadow yshift=-0.8pt, opacity=0.15}},
  flow/.style={-{Latex[length=3mm, width=2mm]}, line width=1.1pt, draw=omniSlate},
  flowAccent/.style={-{Latex[length=3mm, width=2mm]}, line width=1.3pt, draw=omniBlue},
  flowTeal/.style={-{Latex[length=3mm, width=2mm]}, line width=1.2pt, draw=omniTeal},
  flowAmber/.style={-{Latex[length=3mm, width=2mm]}, line width=1.2pt, draw=omniAmber},
  flowPurple/.style={-{Latex[length=3mm, width=2mm]}, line width=1.2pt, draw=omniPurple},
  lbl/.style={fill=white, inner sep=2.5pt, font=\\scriptsize, rounded corners=2pt}
]

  % Trigger
  \\node[box, fill=omniDark!12, draw=omniDark, minimum width=3.8cm] (push) {\\textbf{git push origin main}\\\\Automated Webhook Trigger};
  \\node[box, fill=omniBlue!12, draw=omniBlue, right=1.6cm of push, minimum width=4.5cm] (gha) {\\textbf{GitHub Actions Runner}\\\\Workflow: \\texttt{ci.yml}\\\\Run ID: 40630318005};

  % 3 Parallel Test Jobs
  \\node[box, fill=omniTeal!10, draw=omniTeal, below left=1.2cm and -0.8cm of gha, minimum width=4.6cm] (be) {\\textbf{Backend Job (163 tests)}\\\\Node.js 20 $\\cdot$ Jest $\\cdot$ Supertest\\\\Prisma Migrate $\\cdot$ Nest Build};
  \\node[box, fill=omniPurple!10, draw=omniPurple, below=1.2cm of gha, minimum width=4.6cm] (fe) {\\textbf{Frontend Job (228 tests)}\\\\Next.js 15 $\\cdot$ Vitest $\\cdot$ Playwright\\\\TypeScript Check $\\cdot$ Next Build};
  \\node[box, fill=omniAmber!10, draw=omniAmber, below right=1.2cm and -0.8cm of gha, minimum width=4.6cm] (mob) {\\textbf{Mobile Job (77 tests)}\\\\Flutter Test Suite (BLoC)\\\\Analyze $\\cdot$ Build Release APK};

  % Quality Gate & Deployment
  \\node[box, fill=omniTeal!15, draw=omniTeal, below=1.2cm of fe, minimum width=6.5cm, line width=1.3pt] (gate) {\\textbf{Quality Gate (468/468 PASSED)}\\\\Aggregate Coverage $\\cdot$ 100\\% Pass Rate};
  \\node[box, fill=omniBlue!15, draw=omniBlue, right=1.6cm of gate, minimum width=4.8cm, line width=1.3pt] (deploy) {\\textbf{Vercel Production Deploy}\\\\Backend Edge $\\cdot$ Frontend Portal\\\\Zero-Downtime Global Edge Delivery};

  % Connectors
  \\draw[flowAccent] (push) -- (gha);
  \\draw[flowTeal] (gha.south) -| (be.north);
  \\draw[flowAccent] (gha.south) -- (fe.north);
  \\draw[flowAmber] (gha.south) -| (mob.north);

  \\draw[flowTeal] (be.south) |- (gate.west);
  \\draw[flowAccent] (fe.south) -- (gate.north);
  \\draw[flowAmber] (mob.south) |- (gate.east);

  \\draw[flowAccent] (gate.east) -- node[above, lbl] {\\bi{Tất cả Đạt}{All Passed}} (deploy.west);

\\end{tikzpicture}
`,

  // 9. Mobile Flutter BLoC Layered Architecture
  mobile_arch: `
\\begin{tikzpicture}[
  node distance=1.1cm and 1.8cm,
  box/.style={draw=omniBorder, fill=white, rounded corners=5pt, minimum height=14mm, align=center, inner sep=8pt, line width=1.0pt, drop shadow={shadow xshift=0.8pt, shadow yshift=-0.8pt, opacity=0.15}},
  layer/.style={box, minimum width=7.2cm, line width=1.2pt},
  flow/.style={-{Latex[length=3mm, width=2mm]}, line width=1.1pt, draw=omniSlate},
  flowAccent/.style={-{Latex[length=3mm, width=2mm]}, line width=1.3pt, draw=omniBlue},
  flowTeal/.style={-{Latex[length=3mm, width=2mm]}, line width=1.2pt, draw=omniTeal},
  flowAmber/.style={-{Latex[length=3mm, width=2mm]}, line width=1.2pt, draw=omniAmber},
  flowRose/.style={-{Latex[length=3mm, width=2mm]}, line width=1.2pt, draw=omniRose},
  lbl/.style={fill=white, inner sep=2.5pt, font=\\scriptsize, rounded corners=2pt}
]

  % Main 4 Layers Stack
  \\node[layer, fill=omniPurple!12, draw=omniPurple] (pres) {
    \\textbf{\\large 1. Presentation Layer (UI)}\\\\
    31 Production Screens $\\cdot$ 22 Custom Widgets\\\\
    GoRouter Navigation $\\cdot$ Responsive Layouts
  };

  \\node[layer, fill=omniBlue!12, draw=omniBlue, below=1.0cm of pres] (logic) {
    \\textbf{\\large 2. Logic Layer (BLoC / Cubit)}\\\\
    12 Business Logic Components $\\cdot$ Events $\\rightarrow$ States\\\\
    Auth, Channels, EPG, Studio, Watchlist BLoC
  };

  \\node[layer, fill=omniTeal!12, draw=omniTeal, below=1.0cm of logic] (data) {
    \\textbf{\\large 3. Data Layer (Repositories)}\\\\
    10 Data Repositories $\\cdot$ Data Transfer Objects (DTO)\\\\
    Dio HTTP Client $\\cdot$ AuthInterceptor Rotation
  };

  \\node[layer, fill=omniDark!10, draw=omniDark, below=1.0cm of data] (core) {
    \\textbf{\\large 4. Core Layer}\\\\
    Service Locator (get\\_it) $\\cdot$ Theme Manager\\\\
    Localization (i18n) $\\cdot$ Common Utilities
  };

  % Right Side Storage and Services
  \\node[box, fill=omniAmber!12, draw=omniAmber, right=2.0cm of data, minimum width=4.8cm] (local) {
    \\textbf{Local Storage Engine}\\\\
    SQLite (sqflite) Cache\\\\
    Offline Watchlist $\\cdot$ Replay Queue
  };

  \\node[box, fill=omniRose!12, draw=omniRose, below=1.0cm of local, minimum width=4.8cm] (remote) {
    \\textbf{Remote Cloud Services}\\\\
    NestJS REST API $\\cdot$ Socket.IO\\\\
    MediaMTX WebRTC $\\cdot$ FCM Push
  };

  % Connectors
  \\draw[flowAccent] (pres.south) -- node[right, lbl] {\\bi{Sự kiện UI}{UI Events}} (logic.north);
  \\draw[flowAccent] (logic.south) -- node[right, lbl] {\\bi{Gọi Repository}{Fetch / Mutate}} (data.north);
  \\draw[flow, dashed] (core.north) -- (data.south);

  \\draw[flowAmber] (data.east) -- node[above, lbl] {\\bi{Đọc/Ghi Offline}{Cache / Replay}} (local.west);
  \\draw[flowRose] (data.east) -- ++(1.0,0) |- node[pos=0.25, lbl, right] {\\bi{Gọi Mạng từ xa}{Remote API}} (remote.west);

\\end{tikzpicture}
`,

  // 10. Complete Mobile 31-Screen Map
  mobile_screens: `
\\begin{tikzpicture}[
  node distance=1.2cm and 1.6cm,
  box/.style={draw=omniBorder, fill=white, rounded corners=5pt, minimum height=14mm, align=center, inner sep=8pt, line width=1.0pt, drop shadow={shadow xshift=0.8pt, shadow yshift=-0.8pt, opacity=0.15}},
  cluster/.style={box, minimum width=5.6cm, minimum height=3.6cm, align=left, inner sep=10pt, line width=1.1pt},
  flow/.style={-{Latex[length=3mm, width=2mm]}, line width=1.1pt, draw=omniSlate},
  flowAccent/.style={-{Latex[length=3mm, width=2mm]}, line width=1.3pt, draw=omniBlue},
  lbl/.style={fill=white, inner sep=2.5pt, font=\\scriptsize, rounded corners=2pt}
]

  % Root & Navigation Shell
  \\node[box, fill=omniDark!12, draw=omniDark, minimum width=6.5cm] (root) {\\textbf{GoRouter App Root}\\\\Splash $\\cdot$ Onboarding $\\cdot$ Auth Guard};
  \\node[box, fill=omniBlue!12, draw=omniBlue, below=1.0cm of root, minimum width=7.2cm] (shell) {\\textbf{MainNavigationShell (6 Tab Bar)}\\\\Home $\\cdot$ Channels $\\cdot$ Schedule (EPG) $\\cdot$ Saved $\\cdot$ History $\\cdot$ Profile};

  % 4 Main Clusters
  \\node[cluster, fill=omniPurple!8, draw=omniPurple] (c1) at (-4.2, -4.5) {
    \\textbf{\\large 1. Khám phá \\& Thư viện}\\\\
    \\rule{5.0cm}{0.8pt}\\\\
    $\\bullet$ \\texttt{HomeScreen} (4K Carousel, 25 Kênh)\\\\
    $\\bullet$ \\texttt{CategoriesScreen} (Lọc Thể loại)\\\\
    $\\bullet$ \\texttt{ProgramListScreen} \\& \\texttt{ProgramDetailScreen}\\\\
    $\\bullet$ \\texttt{SearchScreen} (Tìm kiếm Đa thực thể)\\\\
    $\\bullet$ \\texttt{RecordingsScreen} (Kho Catch-up VOD)
  };

  \\node[cluster, fill=omniAmber!8, draw=omniAmber] (c2) at (4.2, -4.5) {
    \\textbf{\\large 2. Phát sóng \\& EPG 24/7}\\\\
    \\rule{5.0cm}{0.8pt}\\\\
    $\\bullet$ \\texttt{LiveNowScreen} (Tổng hợp Trực tiếp)\\\\
    $\\bullet$ \\texttt{LiveWatchScreen} (Phòng WebRTC 7 Theme)\\\\
    $\\bullet$ \\texttt{EpgScreen} (Lưới 24h đồng bộ vạch Now-Line)\\\\
    $\\bullet$ \\texttt{ChannelsScreen} \\& \\texttt{ChannelDetailScreen}\\\\
    $\\bullet$ \\texttt{OmniPlayer} (WebRTC / HLS đa bitrate)
  };

  \\node[cluster, fill=omniRose!8, draw=omniRose] (c3) at (-4.2, -9.2) {
    \\textbf{\\large 3. Live Studio Di động}\\\\
    \\rule{5.0cm}{0.8pt}\\\\
    $\\bullet$ \\texttt{LiveStudioScreen} (Bàn điều hành 4 Tab)\\\\
    $\\bullet$ \\texttt{MobileStudioRecorderScreen} (Quay WHIP)\\\\
    $\\bullet$ \\texttt{AiCuratorScreen} (Trợ lý Biên tập AI)\\\\
    $\\bullet$ \\texttt{ScheduleFormScreen} (Lập lịch phát sóng)\\\\
    $\\bullet$ \\texttt{StudioAuditScreen} (Kiểm toán Đạo diễn)
  };

  \\node[cluster, fill=omniTeal!8, draw=omniTeal] (c4) at (4.2, -9.2) {
    \\textbf{\\large 4. Cá nhân hóa \\& Quản trị}\\\\
    \\rule{5.0cm}{0.8pt}\\\\
    $\\bullet$ \\texttt{WatchlistScreen} (SQLite Offline-First)\\\\
    $\\bullet$ \\texttt{ProfileScreen} \\& \\texttt{SettingsScreen}\\\\
    $\\bullet$ \\texttt{NotificationsScreen} (Lịch nhắc phát sóng)\\\\
    $\\bullet$ \\texttt{AdminUsersScreen} (Phân quyền 4 Role)\\\\
    $\\bullet$ \\texttt{AdminAuditLogsScreen} (Ghi vết gRPC)
  };

  % Connectors
  \\draw[flowAccent] (root) -- (shell);
  \\draw[flow] (shell.south) -- ++(0,-0.6) -| (c1.north);
  \\draw[flow] (shell.south) -- ++(0,-0.6) -| (c2.north);
  \\draw[flow] (c1.south) -- (c3.north);
  \\draw[flow] (c2.south) -- (c4.north);

\\end{tikzpicture}
`,

  // 11. Offline-First SQLite Caching & Mutation Replay Queue
  offline_sync: `
\\begin{tikzpicture}[
  node distance=1.3cm and 1.8cm,
  box/.style={draw=omniBorder, fill=white, rounded corners=5pt, minimum height=14mm, align=center, inner sep=8pt, line width=1.0pt, drop shadow={shadow xshift=0.8pt, shadow yshift=-0.8pt, opacity=0.15}},
  flow/.style={-{Latex[length=3mm, width=2mm]}, line width=1.1pt, draw=omniSlate},
  flowAccent/.style={-{Latex[length=3mm, width=2mm]}, line width=1.3pt, draw=omniBlue},
  flowTeal/.style={-{Latex[length=3mm, width=2mm]}, line width=1.2pt, draw=omniTeal},
  flowAmber/.style={-{Latex[length=3mm, width=2mm]}, line width=1.2pt, draw=omniAmber},
  flowRose/.style={-{Latex[length=3mm, width=2mm]}, line width=1.2pt, draw=omniRose},
  lbl/.style={fill=white, inner sep=2.5pt, font=\\scriptsize, rounded corners=2pt}
]

  % Top: UI & BLoC
  \\node[box, fill=omniPurple!10, draw=omniPurple, minimum width=4.5cm] (ui) {\\textbf{WatchlistScreen / UI Action}\\\\User Toggles Watchlist Bookmark\\\\(Add or Remove Program)};
  \\node[box, fill=omniBlue!10, draw=omniBlue, right=2.0cm of ui, minimum width=4.5cm] (bloc) {\\textbf{WatchlistBloc}\\\\Emit Optimistic Updated State\\\\Dispatch Mutation Event};
  \\node[box, fill=omniTeal!10, draw=omniTeal, right=2.0cm of bloc, minimum width=4.5cm] (repo) {\\textbf{WatchlistRepository}\\\\Check Network Connectivity\\\\Route to Local or Remote};

  % Bottom: Local SQLite & Mutation Queue & Server
  \\node[box, fill=omniAmber!12, draw=omniAmber, below=1.6cm of repo, minimum width=4.5cm] (sqlite) {\\textbf{Local SQLite Store}\\\\Immediate Offline Cache Write\\\\Persist Favorite Programs};
  \\node[box, fill=omniRose!12, draw=omniRose, below=1.6cm of bloc, minimum width=4.5cm] (queue) {\\textbf{Mutation Replay Queue}\\\\Enqueue Pending POST/DELETE\\\\Retry with Exponential Backoff};
  \\node[box, fill=omniDark!10, draw=omniDark, below=1.6cm of ui, minimum width=4.5cm] (server) {\\textbf{NestJS Server API}\\\\Sync State to PostgreSQL\\\\Return Canonical Source-of-Truth};

  % Connectors
  \\draw[flowAccent] (ui) -- (bloc);
  \\draw[flowAccent] (bloc) -- (repo);
  \\draw[flowAmber] (repo) -- node[right, lbl] {\\bi{Ghi cục bộ ngay}{Immediate Cache}} (sqlite);

  \\draw[flowRose] (sqlite) -- node[above, lbl] {\\bi{Mất mạng $\\rightarrow$ Lưu hàng đợi}{Offline $\\rightarrow$ Enqueue}} (queue);
  \\draw[flowTeal] (queue) -- node[above, lbl] {\\bi{Có mạng lại $\\rightarrow$ Đồng bộ}{Online $\\rightarrow$ Replay Sync}} (server);
  \\draw[flowAccent, dashed] (server) -- node[left, lbl] {\\bi{Cập nhật lại giao diện}{Update UI}} (ui);

\\end{tikzpicture}
`,

  // 12. PayOS & VietQR Napas 24/7 Super Chat Workflow
  donation_flow: `
\\begin{tikzpicture}[
  node distance=1.3cm and 1.8cm,
  box/.style={draw=omniBorder, fill=white, rounded corners=5pt, minimum height=14mm, align=center, inner sep=8pt, line width=1.0pt, drop shadow={shadow xshift=0.8pt, shadow yshift=-0.8pt, opacity=0.15}},
  flow/.style={-{Latex[length=3mm, width=2mm]}, line width=1.1pt, draw=omniSlate},
  flowAccent/.style={-{Latex[length=3mm, width=2mm]}, line width=1.3pt, draw=omniBlue},
  flowTeal/.style={-{Latex[length=3mm, width=2mm]}, line width=1.2pt, draw=omniTeal},
  flowAmber/.style={-{Latex[length=3mm, width=2mm]}, line width=1.2pt, draw=omniAmber},
  flowRose/.style={-{Latex[length=3mm, width=2mm]}, line width=1.2pt, draw=omniRose},
  lbl/.style={fill=white, inner sep=2.5pt, font=\\scriptsize, rounded corners=2pt}
]

  % Top Row: In-room Trigger & Gateway
  \\node[box, fill=omniPurple!12, draw=omniPurple, minimum width=4.4cm] (viewer) {\\textbf{LiveStream Viewer}\\\\Clicks Super Chat / Gift Button\\\\Selects Tier (10k -- 500k₫)};
  \\node[box, fill=omniBlue!12, draw=omniBlue, right=2.0cm of viewer, minimum width=4.6cm] (backend) {\\textbf{BillingService (NestJS)}\\\\Generate Order Code $\\cdot$ SHA256\\\\Prepare Checkout Payload};
  \\node[box, fill=omniAmber!12, draw=omniAmber, right=2.0cm of backend, minimum width=4.6cm] (payos) {\\textbf{PayOS \\& VietQR Gateway}\\\\Generate Napas 24/7 Dynamic QR\\\\Account: MBBank 0935649095};

  % Bottom Row: Bank App, Webhook, and Real-time Broadcast
  \\node[box, fill=omniDark!10, draw=omniDark, below=1.6cm of payos, minimum width=4.6cm] (bank) {\\textbf{Mobile Banking App}\\\\Customer Scans VietQR via App\\\\Executes Instant 24/7 Transfer};
  \\node[box, fill=omniTeal!12, draw=omniTeal, below=1.6cm of backend, minimum width=4.6cm] (webhook) {\\textbf{Webhook Controller}\\\\Validate HMAC-SHA256 Sig\\\\Atomic Prisma walletBalance};
  \\node[box, fill=omniRose!12, draw=omniRose, below=1.6cm of viewer, minimum width=4.4cm] (socket) {\\textbf{LiveStreamGateway (/live)}\\\\Broadcast live:donation:received\\\\0ms Celebratory Toast \\& Banner};

  % Connectors
  \\draw[flowAccent] (viewer) -- node[above, lbl] {\\bi{1. Yêu cầu tặng quà}{1. Donate Req}} (backend);
  \\draw[flowAmber] (backend) -- node[above, lbl] {\\bi{2. Tạo đơn Napas}{2. Create Order}} (payos);
  \\draw[flowAmber] (payos) -- node[right, lbl] {\\bi{3. Hiển thị mã QR}{3. Render QR}} (bank);

  \\draw[flowTeal] (bank) -- node[above, lbl] {\\bi{4. Chuyển khoản thành công}{4. Transfer Confirmed}} (webhook);
  \\draw[flowTeal] (webhook) -- node[above, lbl] {\\bi{5. Cập nhật Ví Creator}{5. Credit Wallet}} (socket);
  \\draw[flowRose] (socket) -- node[left, lbl] {\\bi{6. Thông báo Toast nổi}{6. Realtime Toast}} (viewer);

\\end{tikzpicture}
`,

  // 13. Comprehensive Automated Testing Architecture (468 Tests)
  testing_matrix: `
\\begin{tikzpicture}[
  node distance=1.3cm and 1.8cm,
  box/.style={draw=omniBorder, fill=white, rounded corners=5pt, minimum height=14mm, align=center, inner sep=8pt, line width=1.0pt, drop shadow={shadow xshift=0.8pt, shadow yshift=-0.8pt, opacity=0.15}},
  flowTeal/.style={-{Latex[length=3mm, width=2mm]}, line width=1.3pt, draw=omniTeal},
  flowAccent/.style={-{Latex[length=3mm, width=2mm]}, line width=1.3pt, draw=omniBlue},
  flowAmber/.style={-{Latex[length=3mm, width=2mm]}, line width=1.3pt, draw=omniAmber},
  lbl/.style={fill=white, inner sep=2.5pt, font=\\scriptsize, rounded corners=2pt}
]

  % Top Quality Gate Banner
  \\node[box, fill=omniBlue!15, draw=omniBlue, minimum width=15.8cm, minimum height=1.3cm, line width=1.3pt] (ci) {
    \\textbf{\\large GitHub Actions CI Quality Gate (Run ID 40630318005) --- 468/468 PASSED (100\\% SUCCESS)}
  };

  % 3 Broad Domain Cards
  \\node[box, fill=omniTeal!10, draw=omniTeal, below left=1.2cm and -1.2cm of ci, minimum width=4.8cm, minimum height=3.4cm, align=left] (be) {
    \\textbf{\\large Backend NestJS (163 tests)}\\\\
    \\rule{4.2cm}{0.8pt}\\\\
    $\\bullet$ 19 Service Unit Tests (Jest)\\\\
    $\\bullet$ SQL Conflict Detection Spec\\\\
    $\\bullet$ PayOS Webhook HMAC-SHA256\\\\
    $\\bullet$ gRPC Audit Logger Client Mock\\\\
    $\\bullet$ Seeded EPG 24/7 Filler Integrity
  };

  \\node[box, fill=omniPurple!10, draw=omniPurple, below=1.2cm of ci, minimum width=4.8cm, minimum height=3.4cm, align=left] (fe) {
    \\textbf{\\large Web Portal (228 tests)}\\\\
    \\rule{4.2cm}{0.8pt}\\\\
    $\\bullet$ 33 Routes Navigation Guard\\\\
    $\\bullet$ 4-Tier RBAC Permission Access\\\\
    $\\bullet$ WebRTC Live Stream Room Spec\\\\
    $\\bullet$ Live Studio Console Controls\\\\
    $\\bullet$ Canvas Floating Reaction Engine
  };

  \\node[box, fill=omniAmber!10, draw=omniAmber, below right=1.2cm and -1.2cm of ci, minimum width=4.8cm, minimum height=3.4cm, align=left] (mob) {
    \\textbf{\\large Mobile Flutter (77 tests)}\\\\
    \\rule{4.2cm}{0.8pt}\\\\
    $\\bullet$ 12 BLoC / Cubit State Modules\\\\
    $\\bullet$ SQLite Offline Cache Integrity\\\\
    $\\bullet$ Mutation Replay Queue Retry\\\\
    $\\bullet$ OmniPlayer WHEP / HLS Switching\\\\
    $\\bullet$ Mobile Camera Studio Recording
  };

  % Connectors
  \\draw[flowTeal] (ci.south) -| (be.north);
  \\draw[flowAccent] (ci.south) -- (fe.north);
  \\draw[flowAmber] (ci.south) -| (mob.north);

\\end{tikzpicture}
`
};

function buildDiagram(id, lang) {
  const isEn = lang === 'en';
  const outPngName = `fig_${id}_${lang}.png`;
  const outPngPath = path.join(OUT_DIR, outPngName);

  console.log(`==> Compiling spacious diagram [${id}] (${lang})...`);
  const texContent = `\\documentclass[border=12pt]{standalone}
\\usepackage{fontspec}
\\setmainfont{Times New Roman}
\\setsansfont{Arial}
\\setmonofont{Consolas}
\\usepackage{amsmath}
\\usepackage{amssymb}
\\usepackage{xcolor}
\\usepackage{tikz}
\\usetikzlibrary{positioning,arrows.meta,shapes.geometric,fit,backgrounds,calc,shadows,decorations.pathmorphing}

\\newif\\ifomniEN
${isEn ? '\\omniENtrue' : '\\omniENfalse'}
\\newcommand{\\bi}[2]{\\ifomniEN#2\\else#1\\fi}

\\definecolor{omniBlue}{HTML}{0E7490}
\\definecolor{omniDark}{HTML}{0F172A}
\\definecolor{omniTeal}{HTML}{0D9488}
\\definecolor{omniPurple}{HTML}{7C3AED}
\\definecolor{omniAmber}{HTML}{D97706}
\\definecolor{omniRose}{HTML}{E11D48}
\\definecolor{omniSlate}{HTML}{475569}
\\definecolor{omniLight}{HTML}{F1F5F9}
\\definecolor{omniBorder}{HTML}{CBD5E1}

\\begin{document}
${DIAGRAM_DEFINITIONS[id]}
\\end{document}
`;

  const tmpTex = path.join(SHARED_DIR, `_tmp_fig_${id}_${lang}.tex`);
  const tmpPdf = path.join(SHARED_DIR, `_tmp_fig_${id}_${lang}.pdf`);
  const tmpBase = path.join(SHARED_DIR, `_tmp_fig_${id}_${lang}`);

  fs.writeFileSync(tmpTex, texContent, 'utf8');

  try {
    execSync(`"${XELATEX}" -interaction=nonstopmode "${tmpTex}"`, { cwd: SHARED_DIR, stdio: 'ignore' });
    execSync(`"${PDFTOPPM}" -png -r 300 -singlefile "${tmpPdf}" "${tmpBase}"`, { cwd: SHARED_DIR, stdio: 'ignore' });
    
    const genPng = `${tmpBase}.png`;
    if (fs.existsSync(genPng)) {
      fs.copyFileSync(genPng, outPngPath);
      console.log(`    [OK] Generated: ${outPngName}`);
    } else {
      console.error(`    [FAIL] Could not find output PNG for ${id}`);
    }
    // only cleanup on success
    ['.tex', '.pdf', '.aux', '.log', '.png'].forEach(ext => {
      const f = `${tmpBase}${ext}`;
      if (fs.existsSync(f)) fs.unlinkSync(f);
    });
  } catch (err) {
    console.error(`    [ERROR] compiling diagram ${id}:`, err.message);
    const logF = `${tmpBase}.log`;
    if (fs.existsSync(logF)) {
      console.error(fs.readFileSync(logF, 'utf8').slice(-2000));
    }
  }
}

console.log('==> Rendering ALL Redesigned Spacious TikZ Diagrams (High Spacing, Clean Arrows)...');
for (const id of Object.keys(DIAGRAM_DEFINITIONS)) {
  buildDiagram(id, 'vi');
  buildDiagram(id, 'en');
}

// Copy to PRN232/figures and PRM393/figures
const PRN_FIGS = path.resolve(__dirname, '../../01_Reports/PRN232/figures');
const PRM_FIGS = path.resolve(__dirname, '../../01_Reports/PRM393/figures');
if (!fs.existsSync(PRN_FIGS)) fs.mkdirSync(PRN_FIGS, { recursive: true });
if (!fs.existsSync(PRM_FIGS)) fs.mkdirSync(PRM_FIGS, { recursive: true });

const allPngs = fs.readdirSync(OUT_DIR).filter(f => f.endsWith('.png'));
for (const p of allPngs) {
  fs.copyFileSync(path.join(OUT_DIR, p), path.join(PRN_FIGS, p));
  fs.copyFileSync(path.join(OUT_DIR, p), path.join(PRM_FIGS, p));
}
console.log(`==> Successfully rendered and synchronized ${allPngs.length} spacious, non-overlapping diagram images!`);
