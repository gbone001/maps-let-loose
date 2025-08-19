# ANZR Maps Socket.io Server

This is the backend server for the collaborative rooms feature in ANZR Maps Let Loose.

## Features

- Real-time collaboration between multiple users
- Room-based sessions with password protection
- Support for editors and viewers with different permissions
- Automatic room cleanup after 24 hours of inactivity
- Element and drawing synchronization
- Slide management
- Health monitoring endpoints

## Quick Start

### Local Development

1. **Install dependencies:**
   ```bash
   cd server
   npm install
   ```

2. **Start the server:**
   ```bash
   npm start
   # or for development with auto-restart:
   npm run dev
   ```

3. **The server will run on http://localhost:3001**

### Environment Variables

You can set these environment variables:

- `PORT` - Server port (default: 3001)
- `ALLOWED_ORIGINS` - Comma-separated list of allowed origins for CORS

Example:
```bash
PORT=3001 ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com npm start
```

## API Endpoints

- `GET /` - Server status and info
- `GET /health` - Health check endpoint
- `GET /stats` - Server statistics (active rooms, connections)

## Deployment Options

### 1. Railway.app (Recommended - Easy)

1. Create account at [railway.app](https://railway.app)
2. Connect your GitHub repository
3. Railway will auto-deploy from the `/server` directory
4. Set environment variables in Railway dashboard
5. Your server will get a URL like `https://your-app.up.railway.app`

### 2. Heroku

1. Install Heroku CLI
2. Create a new app: `heroku create your-app-name`
3. Add a `Procfile` in the server directory:
   ```
   web: node server.js
   ```
4. Deploy: `git subtree push --prefix server heroku main`

### 3. DigitalOcean App Platform

1. Connect your GitHub repository
2. Configure the build/run commands:
   - Build Command: `cd server && npm install`
   - Run Command: `cd server && npm start`
3. Deploy automatically on push

### 4. Render

1. Connect GitHub repository
2. Set:
   - Root Directory: `server`
   - Build Command: `npm install`
   - Start Command: `npm start`

## Connecting the Client

Once your server is deployed, update the client code in `script.js`:

1. Find the roomsMode section (around line 1928)
2. Replace the error message with a socket connection:

```javascript
if (elements.joinPanel[0]) {
    roomsMode = true;

    // Replace with your server URL
    socket = io('https://your-server-url.com');
    
    socket.on('connect', function() {
        console.log('Connected to rooms server');
        elements.joinError.hide();
        controls.btnCreateJoin.prop('disabled', false);
    });

    socket.on('connect_error', function(error) {
        console.error('Connection failed:', error);
        elements.joinError.html('<div class="alert alert-danger" role="alert">' +
            '<strong>Connection Failed</strong><br>' +
            'Could not connect to the rooms server. Please try again later.' +
            '</div>');
        controls.btnCreateJoin.prop('disabled', true);
    });
    
    // ... rest of the socket event handlers
}
```

## Security Notes

- The server includes basic input sanitization
- Passwords are stored in memory only (not persistent)
- CORS is configured to allow specific origins
- Room data is automatically cleaned up
- Maximum limits on elements and drawings to prevent abuse

## Monitoring

- Check `/health` endpoint for uptime monitoring
- Check `/stats` endpoint for usage statistics
- Server logs connections, disconnections, and errors

## Troubleshooting

### Common Issues:

1. **CORS Errors**: Make sure your domain is in the ALLOWED_ORIGINS
2. **Connection Failed**: Check if the server is running and accessible
3. **Room Not Found**: Rooms are cleaned up after 24 hours of inactivity

### Debugging:

1. Check server logs for errors
2. Use browser developer tools to see WebSocket connection status
3. Test the health endpoint to ensure server is running

## Development

To modify the server:

1. Edit `server.js`
2. Restart with `npm run dev` for auto-restart
3. Test locally before deploying

## License

MIT License - Same as the main project
