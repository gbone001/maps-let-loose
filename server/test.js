// Simple test to verify our server setup
console.log('🧪 ANZR Maps Test Suite');
console.log('========================');

// Test 1: Check dependencies
console.log('\n📦 Testing Dependencies:');
try {
    const express = require('express');
    console.log('✅ Express loaded successfully');
    
    const socketio = require('socket.io');
    console.log('✅ Socket.io loaded successfully');
    
    const cors = require('cors');
    console.log('✅ CORS loaded successfully');
    
} catch (error) {
    console.log('❌ Dependency error:', error.message);
    process.exit(1);
}

// Test 2: Check server can start
console.log('\n🚀 Testing Server Startup:');
try {
    const express = require('express');
    const http = require('http');
    const app = express();
    const server = http.createServer(app);
    
    app.get('/test', (req, res) => {
        res.json({ status: 'Test server running', timestamp: new Date().toISOString() });
    });
    
    const testServer = server.listen(3002, () => {
        console.log('✅ Server can bind to port 3002');
        testServer.close(() => {
            console.log('✅ Server can shutdown gracefully');
            console.log('\n🎉 All tests passed! Your setup is working correctly.');
            process.exit(0);
        });
    });
    
    testServer.on('error', (error) => {
        console.log('❌ Server error:', error.message);
        process.exit(1);
    });
    
} catch (error) {
    console.log('❌ Server startup error:', error.message);
    process.exit(1);
}
