const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');

const app = express();
const server = http.createServer(app);

// Environment variables
const PORT = process.env.PORT || 3000;
const ALLOWED_ORIGINS = [
  'https://gbone001.github.io/maps-let-loose/',
  'https://gbone001.github.io',
  'https://maps-let-loose-socket-production.up.railway.app'
];

// Socket.io setup with CORS
const io = socketIo(server, {
  cors: {
    origin: ALLOWED_ORIGINS,
    methods: ["GET", "POST"],
    credentials: true
  }
});

// Express middleware
app.use(cors({
  origin: ALLOWED_ORIGINS,
  credentials: true
}));

app.use(express.json());

// Store active rooms and their data
const rooms = new Map();
const roomPasswords = new Map();
const roomTimeouts = new Map();

// Constants
const ROOM_EXPIRY_TIME = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
const MAX_ELEMENTS = 1000;
const MAX_DRAWINGS = 1000;

// Utility functions
function sanitizeInput(input) {
  return String(input).trim().substring(0, 50).replace(/[^\w+ !@#$&%=,/\-\[\]]/gi, '');
}

function validateRoomData(data) {
  if (!data || !data.roomId) return false;
  if (data.roomId.length > 50) return false;
  return true;
}

function updateRoomCounts(roomId) {
  if (!rooms.has(roomId)) return;
  
  const room = rooms.get(roomId);
  const counts = {
    viewers: room.viewers.size,
    editors: room.editors.size,
    total: room.viewers.size + room.editors.size
  };
  
  io.to(roomId).emit('room-counts', counts);
  console.log(`Room ${roomId} counts updated:`, counts);
}

function cleanupRoom(roomId) {
  console.log(`Cleaning up room: ${roomId}`);
  rooms.delete(roomId);
  roomPasswords.delete(roomId);
  
  if (roomTimeouts.has(roomId)) {
    clearTimeout(roomTimeouts.get(roomId));
    roomTimeouts.delete(roomId);
  }
}

function scheduleRoomCleanup(roomId) {
  // Clear existing timeout
  if (roomTimeouts.has(roomId)) {
    clearTimeout(roomTimeouts.get(roomId));
  }
  
  // Set new timeout
  const timeout = setTimeout(() => {
    if (rooms.has(roomId)) {
      const room = rooms.get(roomId);
      if (room.viewers.size === 0 && room.editors.size === 0) {
        io.to(roomId).emit('room-expired');
        cleanupRoom(roomId);
      }
    }
  }, ROOM_EXPIRY_TIME);
  
  roomTimeouts.set(roomId, timeout);
}

// Basic routes
app.get('/', (req, res) => {
  res.json({ 
    status: 'ANZR Maps Socket.io Server Running',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    activeRooms: rooms.size,
    uptime: process.uptime()
  });
});

app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy',
    activeRooms: rooms.size,
    timestamp: new Date().toISOString()
  });
});

app.get('/stats', (req, res) => {
  const stats = {
    activeRooms: rooms.size,
    totalConnections: io.engine.clientsCount,
    rooms: []
  };
  
  rooms.forEach((room, roomId) => {
    stats.rooms.push({
      id: roomId,
      viewers: room.viewers.size,
      editors: room.editors.size,
      slides: room.slides.length
    });
  });
  
  res.json(stats);
});

// Socket.io connection handling
io.on('connection', (socket) => {
  console.log(`User connected: ${socket.id}`);
  
  // Handle room creation/joining
  socket.on('create-join', (data) => {
    try {
      if (!validateRoomData(data)) {
        socket.emit('create-join-error', { message: 'Invalid room data' });
        return;
      }

      const roomId = sanitizeInput(data.roomId);
      const viewerPassword = data.viewerPassword ? sanitizeInput(data.viewerPassword) : '';
      const editorKey = data.editorKey ? sanitizeInput(data.editorKey) : '';
      const role = data.role === 'editor' ? 'editor' : 'viewer';

      // Create room if it doesn't exist
      if (!rooms.has(roomId)) {
        rooms.set(roomId, {
          viewers: new Set(),
          editors: new Set(),
          slides: [{
            id: 'default',
            name: 'Default',
            state: {
              elements: [],
              drawings: [],
              controls: {}
            }
          }],
          currentSlide: 'default',
          createdAt: new Date()
        });
        roomPasswords.set(roomId, { viewerPassword, editorKey });
        console.log(`Room created: ${roomId}`);
      }

      const room = rooms.get(roomId);
      const passwords = roomPasswords.get(roomId);

      // Validate passwords
      if (role === 'editor' && editorKey !== passwords.editorKey) {
        socket.emit('create-join-error', { message: 'Invalid editor key' });
        return;
      }

      if (role === 'viewer' && passwords.viewerPassword && viewerPassword !== passwords.viewerPassword) {
        socket.emit('create-join-error', { message: 'Invalid viewer password' });
        return;
      }

      // Join the room
      socket.join(roomId);
      socket.roomId = roomId;
      socket.role = role;

      // Add to appropriate set
      if (role === 'editor') {
        room.editors.add(socket.id);
      } else {
        room.viewers.add(socket.id);
      }

      // Cancel room cleanup timer
      if (roomTimeouts.has(roomId)) {
        clearTimeout(roomTimeouts.get(roomId));
        roomTimeouts.delete(roomId);
      }

      // Send success response
      socket.emit('create-join-success', {
        roomId,
        role,
        slides: room.slides || []
      });

      // Send current room state to the new user
      if (room.slides && room.slides.length > 0) {
        socket.emit('viewer-slides', { slides: room.slides });
      }

      updateRoomCounts(roomId);
      console.log(`User ${socket.id} joined room ${roomId} as ${role}`);

    } catch (error) {
      console.error('Error in create-join:', error);
      socket.emit('create-join-error', { message: 'Server error' });
    }
  });

  // Handle editor control updates
  socket.on('editor-controls', (data) => {
    if (socket.role !== 'editor' || !socket.roomId) return;
    
    try {
      socket.to(socket.roomId).emit('viewer-controls', data);
      console.log(`Controls update from ${socket.id} in room ${socket.roomId}`);
    } catch (error) {
      console.error('Error in editor-controls:', error);
    }
  });

  // Handle editor element updates
  socket.on('editor-elements', (data) => {
    if (socket.role !== 'editor' || !socket.roomId) return;
    
    try {
      // Limit number of elements
      if (data.state && data.state.elements && data.state.elements.length > MAX_ELEMENTS) {
        data.state.elements = data.state.elements.slice(0, MAX_ELEMENTS);
      }
      
      socket.to(socket.roomId).emit('viewer-elements', data);
      console.log(`Elements update from ${socket.id} in room ${socket.roomId}`);
    } catch (error) {
      console.error('Error in editor-elements:', error);
    }
  });

  // Handle editor drawing updates
  socket.on('editor-drawings', (data) => {
    if (socket.role !== 'editor' || !socket.roomId) return;
    
    try {
      // Limit number of drawings
      if (data.state && data.state.drawings && data.state.drawings.length > MAX_DRAWINGS) {
        data.state.drawings = data.state.drawings.slice(0, MAX_DRAWINGS);
      }
      
      socket.to(socket.roomId).emit('viewer-drawings', data);
      console.log(`Drawings update from ${socket.id} in room ${socket.roomId}`);
    } catch (error) {
      console.error('Error in editor-drawings:', error);
    }
  });

  // Handle slide management
  socket.on('editor-slides', (data) => {
    if (socket.role !== 'editor' || !socket.roomId) return;
    
    try {
      if (rooms.has(socket.roomId) && data.slides) {
        rooms.get(socket.roomId).slides = data.slides;
        socket.to(socket.roomId).emit('viewer-slides', data);
        console.log(`Slides update from ${socket.id} in room ${socket.roomId}`);
      }
    } catch (error) {
      console.error('Error in editor-slides:', error);
    }
  });

  // Handle password updates
  socket.on('editor-update-pw', (data) => {
    if (socket.role !== 'editor' || !socket.roomId) return;
    
    try {
      if (roomPasswords.has(socket.roomId)) {
        const passwords = roomPasswords.get(socket.roomId);
        passwords.viewerPassword = data.newPassword ? sanitizeInput(data.newPassword) : '';
        
        socket.to(socket.roomId).emit('room-pw-change', {
          blankPw: !data.newPassword
        });
        
        socket.emit('editor-pw-response', {
          password: passwords.viewerPassword
        });
        
        console.log(`Password updated in room ${socket.roomId}`);
      }
    } catch (error) {
      console.error('Error in editor-update-pw:', error);
    }
  });

  // Handle password retrieval
  socket.on('editor-get-pw', (data) => {
    if (socket.role !== 'editor' || !socket.roomId) return;
    
    try {
      if (roomPasswords.has(socket.roomId)) {
        const passwords = roomPasswords.get(socket.roomId);
        socket.emit('editor-pw-response', {
          password: passwords.viewerPassword
        });
      }
    } catch (error) {
      console.error('Error in editor-get-pw:', error);
    }
  });

  // Handle disconnection
  socket.on('disconnect', (reason) => {
    console.log(`User disconnected: ${socket.id}, reason: ${reason}`);
    
    if (socket.roomId && rooms.has(socket.roomId)) {
      const room = rooms.get(socket.roomId);
      
      // Remove from appropriate set
      room.viewers.delete(socket.id);
      room.editors.delete(socket.id);
      
      updateRoomCounts(socket.roomId);
      
      // Schedule cleanup if room is empty
      if (room.viewers.size === 0 && room.editors.size === 0) {
        scheduleRoomCleanup(socket.roomId);
        console.log(`Room ${socket.roomId} is now empty, scheduled for cleanup`);
      }
    }
  });

  // Handle connection errors
  socket.on('error', (error) => {
    console.error(`Socket error from ${socket.id}:`, error);
  });
});

// Error handling
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('Process terminated');
  });
});

// Start the server
server.listen(PORT, () => {
  console.log(`🚀 ANZR Maps Socket.io Server running on port ${PORT}`);
  console.log(`📊 Health check available at: http://localhost:${PORT}/health`);
  console.log(`📈 Stats available at: http://localhost:${PORT}/stats`);
  console.log(`🌍 Allowed origins:`, ALLOWED_ORIGINS);
});
