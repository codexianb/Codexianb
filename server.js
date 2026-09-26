// server.js
// Signaling + random-pairing server for a stranger video chat app.
// Run: npm install && npm start

const express = require('express');
const http = require('http');
const path = require('path');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

app.use(express.static(path.join(__dirname, 'public')));

// Users waiting to be matched
let waitingQueue = [];

// Map of socket.id -> partner socket.id (active pairs)
const partners = new Map();

function tryMatch() {
  while (waitingQueue.length >= 2) {
    const a = waitingQueue.shift();
    const b = waitingQueue.shift();

    // Guard against stale/disconnected sockets sitting in the queue
    if (!io.sockets.sockets.has(a) || !io.sockets.sockets.has(b)) {
      if (io.sockets.sockets.has(a)) waitingQueue.unshift(a);
      if (io.sockets.sockets.has(b)) waitingQueue.unshift(b);
      continue;
    }

    partners.set(a, b);
    partners.set(b, a);

    // Tell 'a' to be the initiator (creates the offer)
    io.to(a).emit('matched', { peerId: b, initiator: true });
    io.to(b).emit('matched', { peerId: a, initiator: false });
  }
}

function disconnectPartner(socketId, reason) {
  const partnerId = partners.get(socketId);
  if (partnerId) {
    io.to(partnerId).emit('partner-left', { reason });
    partners.delete(partnerId);
  }
  partners.delete(socketId);
}

io.on('connection', (socket) => {
  console.log('connected:', socket.id);

  socket.on('find-peer', () => {
    // Clean up any previous pairing first
    disconnectPartner(socket.id, 'requeued');

    if (!waitingQueue.includes(socket.id)) {
      waitingQueue.push(socket.id);
    }
    tryMatch();
  });

  socket.on('leave', () => {
    disconnectPartner(socket.id, 'left');
    waitingQueue = waitingQueue.filter((id) => id !== socket.id);
  });

  // --- WebRTC signaling relay ---
  socket.on('offer', ({ target, offer }) => {
    io.to(target).emit('offer', { from: socket.id, offer });
  });

  socket.on('answer', ({ target, answer }) => {
    io.to(target).emit('answer', { from: socket.id, answer });
  });

  socket.on('ice-candidate', ({ target, candidate }) => {
    io.to(target).emit('ice-candidate', { from: socket.id, candidate });
  });

  // --- Text chat relay ---
  socket.on('chat-message', ({ target, text }) => {
    io.to(target).emit('chat-message', { from: socket.id, text });
  });

  socket.on('disconnect', () => {
    console.log('disconnected:', socket.id);
    disconnectPartner(socket.id, 'disconnected');
    waitingQueue = waitingQueue.filter((id) => id !== socket.id);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
