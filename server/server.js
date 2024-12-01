const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http, {
    cors: {
        origin: '*',
        methods: ['GET', 'POST'],
    }
});

// Store connected peers and groups
const connectedPeers = new Map();
const groups = new Map();

io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);

    // Handle peer registration
    socket.on('register-peer', ({ peerId, nickname }) => {
        console.log('Peer registered:', peerId, 'with nickname:', nickname);
        
        // Store the peer ID with its socket ID
        connectedPeers.set(socket.id, {
            peerId: peerId,
            nickname: nickname,
            timestamp: Date.now()
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
        console.log('New group created:', groupData);
        
        // Store the group
        groups.set(groupData.id, {
            ...groupData,
            timestamp: Date.now()
        });

        // Join the socket to the group's room
        socket.join(groupData.id);

        // Make all group members join the room
        groupData.members.forEach(memberId => {
            const memberSocket = findSocketByPeerId(memberId);
            if (memberSocket) {
                memberSocket.join(groupData.id);
            }
        });

        // Broadcast group creation to all members
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
        console.log('Client disconnected:', socket.id);
        
        // Remove peer from connected peers
        connectedPeers.delete(socket.id);
        
        // Broadcast updated peer list to all clients
        broadcastPeerList();
    });

    // Handle peer status updates
    socket.on('peer-status', (status) => {
        if (connectedPeers.has(socket.id)) {
            connectedPeers.get(socket.id).status = status;
            broadcastPeerList();
        }
    });
});

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

// Start server
const PORT = process.env.PORT || 3000;
http.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});