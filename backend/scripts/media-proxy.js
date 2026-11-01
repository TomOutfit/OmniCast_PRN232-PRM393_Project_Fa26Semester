// ============================================================
// OmniCast - Media Unified Reverse Proxy (HLS + WHIP)
// ============================================================
// Routes WHIP/WHEP (/whip, /whep) -> MediaMTX port 8889
// Routes HLS playback (index.m3u8, chunks) -> MediaMTX port 8888
// Injects CORS headers for cross-origin browser publishing & playback.
// ============================================================

const http = require('http');
const net = require('net');

const PROXY_PORT = 8885;
const HLS_PORT = 8888;
const WHIP_PORT = 8889;

const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH, HEAD');
  res.setHeader('Access-Control-Allow-Headers', '*');
  res.setHeader('Access-Control-Expose-Headers', 'Location, ETag, Content-Type, Accept-Ranges, *');

  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS, PATCH, HEAD',
      'Access-Control-Allow-Headers': '*',
      'Access-Control-Expose-Headers': 'Location, ETag, Content-Type, Accept-Ranges, *',
    });
    res.end();
    return;
  }

  const url = req.url || '/';
  const isWhipOrWhep = url.includes('/whip') || url.includes('/whep');
  const targetPort = isWhipOrWhep ? WHIP_PORT : HLS_PORT;

  const headers = { ...req.headers };
  headers.host = `127.0.0.1:${targetPort}`;

  const proxyReq = http.request(
    {
      hostname: '127.0.0.1',
      port: targetPort,
      path: req.url,
      method: req.method,
      headers: headers,
    },
    (proxyRes) => {
      const responseHeaders = { ...proxyRes.headers };
      responseHeaders['access-control-allow-origin'] = '*';
      responseHeaders['access-control-allow-methods'] = 'GET, POST, PUT, DELETE, OPTIONS, PATCH, HEAD';
      responseHeaders['access-control-allow-headers'] = '*';
      responseHeaders['access-control-expose-headers'] = 'Location, ETag, Content-Type, Accept-Ranges, *';

      // Rewrite any loopback Location redirect to a relative path
      if (responseHeaders.location) {
        responseHeaders.location = responseHeaders.location.replace(/^https?:\/\/(?:127\.0\.0\.1|localhost)(?::\d+)?/, '');
      }

      res.writeHead(proxyRes.statusCode || 200, responseHeaders);
      proxyRes.pipe(res);
    }
  );

  proxyReq.on('error', (err) => {
    res.writeHead(502, {
      'Content-Type': 'text/plain',
      'Access-Control-Allow-Origin': '*',
    });
    res.end(`MediaProxy error reaching port ${targetPort}: ${err.message}`);
  });

  req.pipe(proxyReq);
});

server.on('upgrade', (req, socket, head) => {
  const proxySocket = net.connect(WHIP_PORT, '127.0.0.1', () => {
    proxySocket.write(head);
    socket.pipe(proxySocket).pipe(socket);
  });
  proxySocket.on('error', () => socket.destroy());
});

server.listen(PROXY_PORT, '0.0.0.0', () => {
  process.stdout.write(`[MediaProxy] Listening on http://0.0.0.0:${PROXY_PORT}\n`);
  process.stdout.write(`  -> */whip & */whep -> 127.0.0.1:${WHIP_PORT}\n`);
  process.stdout.write(`  -> HLS & chunks    -> 127.0.0.1:${HLS_PORT}\n`);
});
