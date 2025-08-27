# Railway Deployment Guide

This guide will help you deploy your ANZR Maps socket server to Railway with automatic GitHub Actions deployment.

## Prerequisites

1. **GitHub repository** with your code
2. **Railway account** (sign up at [railway.app](https://railway.app))
3. **GitHub repository secrets** configured

## Step 1: Manual Railway Setup (One-time)

### 1.1 Create Railway Project

1. Go to [railway.app](https://railway.app) and sign in
2. Click "New Project"
3. Select "Deploy from GitHub repo"
4. Connect your GitHub account if needed
5. Select your `maps-let-loose` repository
6. Railway will detect the Node.js project in the `/server` directory

### 1.2 Configure Environment Variables

In your Railway project dashboard:

1. Go to **Variables** tab
2. Add these environment variables:
   ```
   NODE_ENV=production
   PORT=3001
   ALLOWED_ORIGINS=https://yourdomain.com,https://your-client-domain.com
   ```
   
   Replace `yourdomain.com` with your actual client domain(s).

### 1.3 Configure Railway Service

1. Go to **Settings** tab
2. Set **Root Directory** to `server`
3. Verify **Build Command**: `npm ci --only=production`
4. Verify **Start Command**: `npm start`
5. Enable **Health Check** at `/health`

### 1.4 Get Your Railway URL

After deployment, Railway will provide a URL like:
`https://your-project-name.up.railway.app`

Save this URL - you'll need it for your client configuration.

## Step 2: Configure GitHub Secrets

In your GitHub repository, go to **Settings > Secrets and variables > Actions** and add:

### Required Secrets:

1. **`RAILWAY_TOKEN`**
   - Go to Railway Account Settings > Tokens
   - Create a new token
   - Copy and add as GitHub secret

2. **`RAILWAY_SERVICE_ID`**
   - In your Railway project, go to Settings
   - Copy the Service ID (long alphanumeric string)
   - Add as GitHub secret

### Optional Secrets:

3. **`RAILWAY_URL`** (for health checks)
   - Your Railway app URL
   - Example: `https://your-project.up.railway.app`

4. **`ALLOWED_ORIGINS`**
   - Comma-separated list of client URLs
   - Example: `https://yourdomain.com,https://www.yourdomain.com`

5. **`PORT`**
   - Usually `3001` (default)

## Step 3: Test Automatic Deployment

1. **Push changes** to your `main` branch:
   ```bash
   git add .
   git commit -m "Setup Railway deployment"
   git push origin main
   ```

2. **Check GitHub Actions**:
   - Go to your repository > Actions tab
   - Watch the "Deploy to Railway" workflow run
   - Verify it completes successfully

3. **Verify deployment**:
   - Visit your Railway URL: `https://your-project.up.railway.app`
   - Should see: `{"status":"ANZR Maps Socket.io Server Running",...}`
   - Check health: `https://your-project.up.railway.app/health`

## Step 4: Update Client Configuration

Once your server is deployed, update your client code:

In `script.js`, find the roomsMode section (around line 1928) and replace:

```javascript
// Replace this:
console.log("Rooms Mode - Server unavailable");

// With this:
socket = io('https://your-project.up.railway.app'); // Your actual Railway URL

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
```

## Workflow Features

The GitHub Actions workflow will:

✅ **Automatically trigger** on pushes to `main` branch that modify `server/` files
✅ **Run tests** and health checks before deployment
✅ **Deploy to Railway** using official Railway action
✅ **Verify deployment** with health check
✅ **Notify on success/failure**

## Monitoring

### Railway Dashboard
- **Logs**: View real-time server logs
- **Metrics**: CPU, Memory, Network usage
- **Deployments**: History of all deployments

### Health Endpoints
- `GET /health` - Basic health check
- `GET /stats` - Server statistics
- `GET /` - Server info

## Troubleshooting

### Common Issues:

1. **Deployment fails**:
   - Check GitHub Actions logs
   - Verify Railway token and service ID
   - Check Railway build logs

2. **Health check fails**:
   - Verify server starts correctly
   - Check Railway logs for errors
   - Ensure `/health` endpoint is accessible

3. **CORS errors**:
   - Update `ALLOWED_ORIGINS` environment variable
   - Include all client domain variations (www, non-www, http, https)

### Debug Commands:

```bash
# Test locally first
cd server
npm install
npm start

# Check health locally
curl http://localhost:3001/health

# View Railway logs
railway logs
```

## Security Notes

- Railway tokens have full account access - keep them secure
- Use environment variables for sensitive configuration
- Regularly rotate Railway tokens
- Monitor deployment logs for security issues

## Cost Considerations

Railway offers:
- **Free tier**: $5/month in usage credits
- **Pro plan**: $20/month + usage
- Server typically uses minimal resources ($1-5/month)

Your socket server is lightweight and should stay within free tier limits for moderate usage.
