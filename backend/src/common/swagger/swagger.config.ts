// ============================================================
// OmniCast - Custom Swagger UI Design & Documentation Config
// ============================================================

import { INestApplication } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder, SwaggerCustomOptions } from '@nestjs/swagger';

export const customSwaggerCss = `
  @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap');

  :root {
    --bg-main: #090d16;
    --bg-card: #0f172a;
    --bg-card-hover: #1e293b;
    --border-color: #1e293b;
    --border-focus: #0ea5e9;
    --text-primary: #f8fafc;
    --text-secondary: #94a3b8;
    --text-muted: #64748b;
    --brand-primary: #0ea5e9;
    --brand-gradient: linear-gradient(135deg, #0ea5e9 0%, #38bdf8 50%, #818cf8 100%);
    --accent-gold: #f59e0b;
    --accent-emerald: #10b981;
    --accent-rose: #f43f5e;
  }

  body, .swagger-ui {
    background-color: var(--bg-main) !important;
    color: var(--text-primary) !important;
    font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif !important;
    -webkit-font-smoothing: antialiased;
  }

  /* Top Bar Branding */
  .swagger-ui .topbar {
    background: linear-gradient(180deg, #0f172a 0%, #090d16 100%) !important;
    border-bottom: 1px solid #1e293b !important;
    padding: 16px 0 !important;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.4) !important;
  }

  .swagger-ui .topbar .topbar-wrapper {
    max-width: 1300px !important;
    margin: 0 auto !important;
    padding: 0 24px !important;
    display: flex !important;
    align-items: center !important;
  }

  .swagger-ui .topbar a {
    display: flex !important;
    align-items: center !important;
    text-decoration: none !important;
  }

  .swagger-ui .topbar a span {
    display: none !important;
  }

  .swagger-ui .topbar a::before {
    content: "📡 OmniCast Broadcast API";
    font-size: 20px;
    font-weight: 800;
    background: var(--brand-gradient);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    letter-spacing: -0.5px;
  }

  .swagger-ui .topbar a::after {
    content: "v1.0 • Enterprise Live";
    font-size: 11px;
    font-weight: 700;
    text-transform: uppercase;
    color: #38bdf8;
    background: rgba(14, 165, 233, 0.15);
    border: 1px solid rgba(14, 165, 233, 0.3);
    padding: 3px 10px;
    border-radius: 9999px;
    margin-left: 14px;
    letter-spacing: 0.5px;
  }

  .swagger-ui .topbar-wrapper img {
    display: none !important;
  }

  /* Info Section Container */
  .swagger-ui .info {
    margin: 40px auto 30px !important;
    max-width: 1300px !important;
    padding: 32px !important;
    background: linear-gradient(135deg, rgba(15, 23, 42, 0.9) 0%, rgba(30, 41, 59, 0.6) 100%) !important;
    border: 1px solid rgba(56, 189, 248, 0.2) !important;
    border-radius: 16px !important;
    box-shadow: 0 10px 30px -10px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.05) !important;
    backdrop-filter: blur(12px) !important;
  }

  .swagger-ui .info .title {
    font-size: 32px !important;
    font-weight: 800 !important;
    color: #ffffff !important;
    letter-spacing: -1px !important;
  }

  .swagger-ui .info .title small.version-stamp {
    background: var(--brand-gradient) !important;
    color: #ffffff !important;
    padding: 4px 12px !important;
    border-radius: 8px !important;
    font-size: 12px !important;
    font-weight: 700 !important;
    margin-left: 12px !important;
  }

  .swagger-ui .info p, .swagger-ui .info li, .swagger-ui .info table {
    color: var(--text-secondary) !important;
    font-size: 14px !important;
    line-height: 1.7 !important;
  }

  .swagger-ui .info a {
    color: #38bdf8 !important;
    font-weight: 600 !important;
    text-decoration: none !important;
    border-bottom: 1px dashed #38bdf8 !important;
    transition: all 0.2s ease !important;
  }
  .swagger-ui .info a:hover {
    color: #7dd3fc !important;
    border-bottom-style: solid !important;
  }

  /* Scheme Container & Authorize Button */
  .swagger-ui .scheme-container {
    background: transparent !important;
    box-shadow: none !important;
    border: none !important;
    padding: 20px 0 !important;
    max-width: 1300px !important;
    margin: 0 auto !important;
  }

  .swagger-ui .btn.authorize {
    background: linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%) !important;
    color: #ffffff !important;
    border: 1px solid #38bdf8 !important;
    border-radius: 10px !important;
    font-weight: 700 !important;
    font-size: 14px !important;
    padding: 10px 22px !important;
    box-shadow: 0 4px 14px rgba(14, 165, 233, 0.4) !important;
    transition: all 0.2s ease !important;
    display: inline-flex !important;
    align-items: center !important;
    gap: 8px !important;
  }

  .swagger-ui .btn.authorize:hover {
    background: linear-gradient(135deg, #38bdf8 0%, #0ea5e9 100%) !important;
    transform: translateY(-1px) !important;
    box-shadow: 0 6px 20px rgba(14, 165, 233, 0.6) !important;
  }

  .swagger-ui .btn.authorize svg {
    fill: #ffffff !important;
  }

  /* Filter input */
  .swagger-ui .filter .operation-filter-input {
    background: #0f172a !important;
    border: 1px solid #1e293b !important;
    color: #f8fafc !important;
    border-radius: 10px !important;
    padding: 10px 16px !important;
    font-size: 14px !important;
    outline: none !important;
    box-shadow: 0 2px 8px rgba(0,0,0,0.2) !important;
  }

  .swagger-ui .filter .operation-filter-input:focus {
    border-color: #0ea5e9 !important;
    box-shadow: 0 0 0 3px rgba(14, 165, 233, 0.2) !important;
  }

  /* Tag Sections (Categories) */
  .swagger-ui .wrapper {
    max-width: 1300px !important;
    margin: 0 auto !important;
    padding: 0 24px !important;
  }

  .swagger-ui .opblock-tag-section {
    margin-bottom: 24px !important;
  }

  .swagger-ui .opblock-tag {
    font-size: 20px !important;
    font-weight: 700 !important;
    color: #f8fafc !important;
    border-bottom: 1px solid #1e293b !important;
    padding: 18px 0 !important;
    letter-spacing: -0.3px !important;
  }

  .swagger-ui .opblock-tag small {
    color: #94a3b8 !important;
    font-size: 13px !important;
    font-weight: 500 !important;
    margin-left: 12px !important;
  }

  /* Operations Blocks */
  .swagger-ui .opblock {
    margin: 12px 0 !important;
    border-radius: 12px !important;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.25) !important;
    border: 1px solid #1e293b !important;
    background: #0f172a !important;
    transition: all 0.2s ease !important;
    overflow: hidden !important;
  }

  .swagger-ui .opblock:hover {
    border-color: #334155 !important;
    transform: translateY(-1px) !important;
  }

  .swagger-ui .opblock .opblock-summary {
    padding: 12px 18px !important;
    background: transparent !important;
  }

  .swagger-ui .opblock .opblock-summary-method {
    font-family: 'JetBrains Mono', monospace !important;
    font-weight: 700 !important;
    font-size: 12px !important;
    border-radius: 6px !important;
    padding: 6px 14px !important;
    text-shadow: none !important;
    min-width: 80px !important;
    text-align: center !important;
  }

  .swagger-ui .opblock.opblock-get {
    border-color: rgba(14, 165, 233, 0.3) !important;
    background: rgba(14, 165, 233, 0.04) !important;
  }
  .swagger-ui .opblock.opblock-get .opblock-summary-method {
    background: #0284c7 !important;
    color: #ffffff !important;
  }

  .swagger-ui .opblock.opblock-post {
    border-color: rgba(16, 185, 129, 0.3) !important;
    background: rgba(16, 185, 129, 0.04) !important;
  }
  .swagger-ui .opblock.opblock-post .opblock-summary-method {
    background: #059669 !important;
    color: #ffffff !important;
  }

  .swagger-ui .opblock.opblock-put, .swagger-ui .opblock.opblock-patch {
    border-color: rgba(245, 158, 11, 0.3) !important;
    background: rgba(245, 158, 11, 0.04) !important;
  }
  .swagger-ui .opblock.opblock-put .opblock-summary-method,
  .swagger-ui .opblock.opblock-patch .opblock-summary-method {
    background: #d97706 !important;
    color: #ffffff !important;
  }

  .swagger-ui .opblock.opblock-delete {
    border-color: rgba(244, 63, 94, 0.3) !important;
    background: rgba(244, 63, 94, 0.04) !important;
  }
  .swagger-ui .opblock.opblock-delete .opblock-summary-method {
    background: #e11d48 !important;
    color: #ffffff !important;
  }

  .swagger-ui .opblock .opblock-summary-path,
  .swagger-ui .opblock .opblock-summary-path__deprecated {
    font-family: 'JetBrains Mono', monospace !important;
    font-size: 14px !important;
    font-weight: 600 !important;
    color: #f8fafc !important;
  }

  .swagger-ui .opblock .opblock-summary-description {
    color: #94a3b8 !important;
    font-size: 13px !important;
  }

  .swagger-ui .opblock-body {
    background: #0b0f19 !important;
    border-top: 1px solid #1e293b !important;
    padding: 20px !important;
  }

  /* Tables & Parameters */
  .swagger-ui table {
    color: #f8fafc !important;
  }

  .swagger-ui table thead tr td, .swagger-ui table thead tr th {
    color: #94a3b8 !important;
    font-weight: 700 !important;
    border-bottom: 1px solid #1e293b !important;
    font-size: 12px !important;
    text-transform: uppercase !important;
  }

  .swagger-ui .parameter__name {
    font-family: 'JetBrains Mono', monospace !important;
    font-size: 13px !important;
    font-weight: 700 !important;
    color: #38bdf8 !important;
  }

  .swagger-ui .parameter__type {
    font-family: 'JetBrains Mono', monospace !important;
    color: #94a3b8 !important;
    font-size: 12px !important;
  }

  .swagger-ui input[type="text"], .swagger-ui textarea, .swagger-ui select {
    background: #0f172a !important;
    border: 1px solid #1e293b !important;
    color: #f8fafc !important;
    border-radius: 8px !important;
    padding: 8px 12px !important;
    font-family: 'JetBrains Mono', monospace !important;
    font-size: 13px !important;
  }

  .swagger-ui input[type="text"]:focus, .swagger-ui textarea:focus, .swagger-ui select:focus {
    border-color: #0ea5e9 !important;
    box-shadow: 0 0 0 2px rgba(14, 165, 233, 0.2) !important;
  }

  /* Code Blocks & Response */
  .swagger-ui .highlight-code, .swagger-ui .microlight, .swagger-ui pre {
    background: #020617 !important;
    border: 1px solid #1e293b !important;
    border-radius: 8px !important;
    color: #e2e8f0 !important;
    font-family: 'JetBrains Mono', monospace !important;
    font-size: 12px !important;
  }

  .swagger-ui .btn.execute {
    background: linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%) !important;
    color: #ffffff !important;
    border: none !important;
    border-radius: 8px !important;
    font-weight: 700 !important;
    padding: 10px 24px !important;
    box-shadow: 0 4px 12px rgba(14, 165, 233, 0.4) !important;
  }

  .swagger-ui .btn.btn-clear {
    background: #1e293b !important;
    color: #f8fafc !important;
    border: 1px solid #334155 !important;
    border-radius: 8px !important;
  }

  /* Models Section */
  .swagger-ui section.models {
    border: 1px solid #1e293b !important;
    border-radius: 16px !important;
    background: #0f172a !important;
    margin-top: 40px !important;
    padding: 16px 24px !important;
  }

  .swagger-ui section.models h4 {
    color: #f8fafc !important;
    font-weight: 800 !important;
    font-size: 18px !important;
  }

  .swagger-ui .model-box {
    background: #090d16 !important;
    border: 1px solid #1e293b !important;
    border-radius: 8px !important;
    padding: 12px !important;
  }

  /* Dialog / Auth Modal */
  .swagger-ui .dialog-ux .backdrop-ux {
    background: rgba(2, 6, 23, 0.8) !important;
    backdrop-filter: blur(8px) !important;
  }

  .swagger-ui .dialog-ux .modal-ux {
    background: #0f172a !important;
    border: 1px solid #38bdf8 !important;
    border-radius: 16px !important;
    box-shadow: 0 20px 50px rgba(0, 0, 0, 0.8), 0 0 30px rgba(14, 165, 233, 0.2) !important;
  }

  .swagger-ui .dialog-ux .modal-ux-header {
    border-bottom: 1px solid #1e293b !important;
    padding: 18px 24px !important;
  }

  .swagger-ui .dialog-ux .modal-ux-header h3 {
    color: #f8fafc !important;
    font-weight: 800 !important;
  }

  .swagger-ui .dialog-ux .modal-ux-content {
    padding: 24px !important;
    color: #94a3b8 !important;
  }
`;

export function setupSwagger(app: INestApplication) {
  const swaggerConfig = new DocumentBuilder()
    .setTitle('📡 OmniCast Broadcast Intelligence Network API')
    .setDescription(`
### Enterprise Media & Live Broadcasting Platform

Welcome to the **OmniCast API Reference**. This documentation covers endpoints for managing creator live channels, electronic program guides (EPG), search index, AI content valuations, and security audit logs.

---

### 🚀 Core Modules:
- 🔐 **Authentication & RBAC**: JWT token issuance, refresh rotation, and multi-tier role guards (\`VIEWER\`, \`STAFF\`, \`ADMIN\`).
- 📺 **Live Channels Management**: Complete CRUD for 12 creator broadcast channels (Sport, Show, Cine, Drama, News, Music, Kids, Tech, Food, Discovery).
- 📅 **Broadcast Programs & EPG**: Program scheduling, live stream ingestion, and 24-hour EPG timelines.
- 🔍 **Search & Discovery Engine**: Full-text fuzzy search across channels, categories, and scheduled programs.
- 🤖 **AI Content Curator**: Multi-agent LLM pipeline (Sentiment Analysis, Compliance Assessment, Editorial Recommendation).
- 🛡️ **Audit Logger**: Real-time security event tracking and compliance history.
- 🩺 **Health Check**: Database ping and cluster availability status.

---

### 🔑 Authentication Guide:
1. Obtain an access token via **\`POST /api/v1/auth/login\`** or **\`POST /api/v1/auth/register\`**.
2. Click the **Authorize 🔓** button in the upper right.
3. Enter your bearer token in the format: \`Bearer <your_token>\`.
    `)
    .setVersion('1.0.0')
    .setContact('OmniCast Engineering Team', 'https://omnicast-fe.vercel.app', 'support@omnicast.tv')
    .setLicense('MIT License', 'https://opensource.org/licenses/MIT')
    .addServer('https://omnicast-api.vercel.app', 'Production Cloud Server (Vercel)')
    .addServer('http://localhost:3000', 'Local Development Environment')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'JWT Authorization',
        description: 'Enter your JWT access token to authenticate API calls',
        in: 'header',
      },
      'JWT-auth',
    )
    .addTag('auth', 'Authentication, registration, JWT tokens and session rotation')
    .addTag('channels', 'Creator live channels, channel formats, logos and follower counts')
    .addTag('programs', 'Live events, recorded broadcasts, VOD and EPG timeline schedules')
    .addTag('search', 'Intelligent multi-criteria search for channels, categories and live events')
    .addTag('ai-curator', 'AI-powered content valuation, suitability grading and schedule advisory')
    .addTag('audit-logger', 'Security audit trails, administrative actions and system events')
    .addTag('health', 'System health checks, database status and cluster readiness')
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);

  const customOptions: SwaggerCustomOptions = {
    customSiteTitle: 'OmniCast API • Broadcast Intelligence Network',
    customCss: customSwaggerCss,
    customCssUrl: 'https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/5.11.0/swagger-ui.min.css',
    customJs: [
      'https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/5.11.0/swagger-ui-bundle.js',
      'https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/5.11.0/swagger-ui-standalone-preset.js',
    ],
    swaggerOptions: {
      persistAuthorization: true,
      displayRequestDuration: true,
      filter: true,
      docExpansion: 'list',
      defaultModelsExpandDepth: 1,
      syntaxHighlight: {
        activate: true,
        theme: 'monokai',
      },
    },
  };

  SwaggerModule.setup('swagger', app, document, customOptions);
  return document;
}
