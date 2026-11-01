CREATE TABLE IF NOT EXISTS "LiveMediaEndpointConfig" (
    "id" VARCHAR(32) NOT NULL DEFAULT 'primary',
    "publicHost" VARCHAR(255) NOT NULL,
    "hlsUrl" VARCHAR(1000) NOT NULL,
    "whipUrl" VARCHAR(1000) NOT NULL,
    "webrtcUrl" VARCHAR(1000) NOT NULL,
    "updatedAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LiveMediaEndpointConfig_pkey" PRIMARY KEY ("id")
);
