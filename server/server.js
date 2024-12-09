const express = require('express');
const app = express();
const http = require('http').createServer(app);
const redis = require("redis");
const io = require('socket.io')(http, {
    cors: {
        origin: '*',
        methods: ['GET', 'POST'],
    }
});
// Redis clients for publishing and subscribing
const redisSubscriber = redis.createClient();
const redisPublisher = redis.createClient();
(async () => {
redisPublisher.on('connect', () => {
    console.log('Redis publisher connected');
});
await redisPublisher.connect();

})();
(async () => {
    redisSubscriber.on('connect', () => {
        console.log('Redis subscriber connected');
    });
   await redisSubscriber.connect();
});

redisPublisher.on('error', (err) => {
    console.error('Redis publisher error:', err);
});

redisSubscriber.on('connect', () => {
    console.log('Redis subscriber connected');
});

redisSubscriber.on('error', (err) => {
    console.error('Redis subscriber error:', err);
});
// Integrate Redis with Socket.IO
io.adapter(require('socket.io-redis')({
    host: '127.0.0.1', // Redis server running on wsl
    port: 6379         // Default Redis port
}));


// Store connected peers and groups
const connectedPeers = new Map();
const groups = new Map();

io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);

    // Handle peer registration
    socket.on('register-peer', ({ peerId, nickname }) => {
        console.log('Peer registered:', peerId, 'with nickname:', nickname);
        
        // Store the peer ID with its socket ID
        connectedPeers.set(socket.id, { peerId, nickname });
    publishUpdate('peer-updates', {
        action: 'register',
        peerId,
        nickname,
        socketId: socket.id
    });
        
          // Broadcast nickname update to all clients
          io.emit('nickname-updated', { peerId, nickname });
        // Send existing groups to the new peer
        socket.emit('groups-list', Array.from(groups.values()));
        
        // Broadcast updated peer list to all clients
        broadcastPeerList();
    });

    // Handle group creation
    socket.on('create-group', (groupData) => {
        groups.set(groupData.id, groupData);
        publishUpdate('group-updates', {
            action: 'create',
            groupData
        });
        socket.join(groupData.id);
        groupData.members.forEach(memberId => {
            const memberSocket = findSocketByPeerId(memberId);
            if (memberSocket) {
                memberSocket.join(groupData.id);
            }
        });
        io.to(groupData.id).emit('group-created', groupData);
    });
    // Handle group messages
    socket.on('group-message', ({ groupId, message, sender }) => {
        if (groups.has(groupId)) {
            // Broadcast message to all group members
            io.to(groupId).emit('group-message', {
                groupId,
                message,
                sender,
                timestamp: Date.now()
            });
        }
    });

    // Handle disconnection
    socket.on('disconnect', () => {
        const peer = connectedPeers.get(socket.id);
        if (peer) {
            publishUpdate('peer-updates', {
                action: 'disconnect',
                socketId: socket.id
            });
            connectedPeers.delete(socket.id);
            broadcastPeerList();
        }
    });
    

    // Handle peer status updates
    socket.on('peer-status', (status) => {
        if (connectedPeers.has(socket.id)) {
            connectedPeers.get(socket.id).status = status;
            broadcastPeerList();
        }
    });
});
// Subscribe to Redis channels for syncing state
redisSubscriber.subscribe('peer-updates');
redisSubscriber.subscribe('group-updates');

redisSubscriber.on('message', (channel, message) => {
    const data = JSON.parse(message);

    if (channel === 'peer-updates') {
        const { peerId, nickname, socketId, action } = data;
        if (action === 'register') {
            connectedPeers.set(socketId, { peerId, nickname });
        } else if (action === 'disconnect') {
            connectedPeers.delete(socketId);
        }
        broadcastPeerList();
    } else if (channel === 'group-updates') {
        const { groupData, action } = data;
        if (action === 'create') {
            groups.set(groupData.id, groupData);
        }
    }
});
// Function to publish updates to Redis
function publishUpdate(channel, data) {
   
        // If redisPublisher is already connected, just publish the update
        redisPublisher.publish(channel, JSON.stringify(data), (err, response) => {
            if (err) {
                console.error('Error publishing to Redis:', err);
            } else {
                console.log('Message published to Redis:', response);
            }
        });
    
}



// Helper function to find socket by peer ID
function findSocketByPeerId(peerId) {
    for (const [socketId, data] of connectedPeers.entries()) {
        if (data.peerId === peerId) {
            return io.sockets.sockets.get(socketId);
        }
    }
    return null;
}

// Function to broadcast the current peer list to all connected clients
function broadcastPeerList() {
    const peerList = Array.from(connectedPeers.values())
        .map(peer => ({
            peerId: peer.peerId,
            nickname: peer.nickname,
            status: peer.status || 'available'
        }));
    
    io.emit('peer-list-updated', peerList);
}
app.get('/', (req, res) => {
    res.status(200).send('Server is healthy');
});

// Start server
const PORT = process.env.PORT || 3000;
http.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});