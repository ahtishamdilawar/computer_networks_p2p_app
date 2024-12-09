const http = require('http');
const { createProxyServer } = require('http-proxy');

const servers = [
    { url: 'http://localhost:3000', status: 'up' },
    { url: 'http://localhost:3001', status: 'up' },
    { url: 'http://localhost:3002', status: 'up' },
];
let currentServerIndex = 0;

const failoverServer = { url: 'http://localhost:4000', status: 'up' };

const proxy = createProxyServer();

const loadBalancer = http.createServer((req, res) => {
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
