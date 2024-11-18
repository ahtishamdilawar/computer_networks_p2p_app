const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http,{
    cors:{
        origin:'*',
        methods:['GET','POST'],
    }
});

// Store connected peers
const connectedPeers = new Map();

io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);

    // Handle peer registration
    socket.on('register-peer', (peerId) => {
        console.log('Peer registered:', peerId);
        
        // Store the peer ID with its socket ID
        connectedPeers.set(socket.id, {
            peerId: peerId,
            timestamp: Date.now()
        });

        // Broadcast updated peer list to all clients
        broadcastPeerList();
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

// Function to broadcast the current peer list to all connected clients
function broadcastPeerList() {
    const peerList = Array.from(connectedPeers.values())
        .map(peer => ({
            peerId: peer.peerId,
            status: peer.status || 'available'
        }));
    
    io.emit('peer-list-updated', peerList);
}


// Start server
const PORT = process.env.PORT || 3000;
http.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});