const http = require('http');
const { createProxyServer } = require('http-proxy');

const servers = [
    { url: 'http://localhost:3000', status: 'up' },
    { url: 'http://localhost:3001', status: 'up' },
    { url: 'http://localhost:3002', status: 'up' },
];
let currentServerIndex = 0;

const failoverServer = { url: 'http://localhost:4000', status: 'up' };

const proxy = createProxyServer({
    ws: true, // Enable WebSocket proxying
});

// Simple intrusion detection mechanism
const intrusionLog = new Map(); // Map to store request counts by IP
const MAX_REQUESTS = 100; // Max requests allowed per IP in the time window
const TIME_WINDOW = 60000; // Time window in milliseconds

function logRequest(ip) {
    const currentTime = Date.now();
    if (!intrusionLog.has(ip)) {
        intrusionLog.set(ip, []);
    }
    const timestamps = intrusionLog.get(ip);
    timestamps.push(currentTime);

    // Remove timestamps outside the time window
    while (timestamps.length && timestamps[0] < currentTime - TIME_WINDOW) {
        timestamps.shift();
    }

    return timestamps.length;
}

const loadBalancer = http.createServer((req, res) => {
    const clientIp = req.socket.remoteAddress;
    const requestCount = logRequest(clientIp);

    if (requestCount > MAX_REQUESTS) {
        console.log(`Intrusion detected: ${clientIp} exceeded request limit.`);
        res.writeHead(429, { 'Content-Type': 'text/plain' });
        res.end('Too Many Requests');
        return;
    }

    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, DELETE');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
    }

    let targetServer;
    for (let i = 0; i < servers.length; i++) {
        currentServerIndex = (currentServerIndex + 1) % servers.length;
        if (servers[currentServerIndex].status === 'up') {
            targetServer = servers[currentServerIndex];
            break;
        }
    }

    if (!targetServer) {
        console.log('All servers down, redirecting to failover server.');
        targetServer = failoverServer;
    }

    console.log(`Routing to: ${targetServer.url}`);
    proxy.web(req, res, { target: targetServer.url }, (err) => {
        console.error(`Error routing to server: ${targetServer.url}`, err.message);
        res.writeHead(502);
        res.end('Bad Gateway');
    });
});

// Handle WebSocket connections
loadBalancer.on('upgrade', (req, socket, head) => {
    let targetServer;
    for (let i = 0; i < servers.length; i++) {
        currentServerIndex = (currentServerIndex + 1) % servers.length;
        if (servers[currentServerIndex].status === 'up') {
            targetServer = servers[currentServerIndex];
            break;
        }
    }

    if (!targetServer) {
        console.log('All servers down, redirecting WebSocket to failover server.');
        targetServer = failoverServer;
    }

    console.log(`Upgrading WebSocket to: ${targetServer.url}`);
    proxy.ws(req, socket, head, { target: targetServer.url });
});

function performHealthCheck() {
    servers.forEach((server) => {
        http.get(server.url, (res) => {
            server.status = res.statusCode === 200 ? 'up' : 'down';
        }).on('error', () => {
            server.status = 'down';
        });
    });

    http.get(failoverServer.url, (res) => {
        failoverServer.status = res.statusCode === 200 ? 'up' : 'down';
    }).on('error', () => {
        failoverServer.status = 'down';
    });
}

setInterval(performHealthCheck, 5000);

const LB_PORT = 8080;
loadBalancer.listen(LB_PORT, () => {
    console.log(`Load Balancer running on port ${LB_PORT}`);
});