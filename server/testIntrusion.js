const http = require('http');

const MAX_REQUESTS = 150; // Number of requests to send
const INTERVAL = 10; // Interval between requests in milliseconds

let requestCount = 0;

const sendRequest = () => {
    const options = {
        hostname: 'localhost',
        port: 8080,
        path: '/',
        method: 'GET',
    };

    const req = http.request(options, (res) => {
        console.log(`Request ${++requestCount}: Status Code: ${res.statusCode}`);
        res.on('data', (chunk) => {
            console.log(`Response: ${chunk.toString()}`);
        });

        if (requestCount >= MAX_REQUESTS) {
            console.log('Test complete.');
            return;
        } else {
            setTimeout(sendRequest, INTERVAL);
        }
    });

    req.on('error', (e) => {
        console.error(`Problem with request: ${e.message}`);
    });

    req.end();
};

sendRequest();

