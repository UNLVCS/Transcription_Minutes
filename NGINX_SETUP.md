# Nginx Reverse Proxy Setup Guide

This guide shows you how to set up nginx to proxy your transcription web application running on a custom port.

## Scenario

You have:
- A server already running other websites
- nginx already installed and configured
- Need to run the transcription app on a custom port (e.g., 3000, 8080, etc.)
- Want to access it via a subdomain or path (e.g., `transcribe.yourdomain.com` or `yourdomain.com/transcribe`)

## Option 1: Subdomain Setup (Recommended)

### Step 1: Run the App on a Custom Port

```bash
cd /home/user/Transcription_Minutes/webapp

# For development (with hot reload)
PORT=3000 npm run dev

# For production (recommended)
npm run build
PORT=3000 npm start

# Or specify in package.json (already set to port 3000)
npm run dev   # uses port 3000
npm start     # uses port 3000
```

**To use a different port**, edit `webapp/package.json`:
```json
"scripts": {
  "dev": "next dev -p 8080",
  "start": "next start -p 8080"
}
```

### Step 2: Create nginx Configuration

Create a new nginx site configuration:

```bash
sudo nano /etc/nginx/sites-available/transcribe
```

Add this configuration:

```nginx
# Transcription App - Subdomain Configuration
server {
    listen 80;
    server_name transcribe.yourdomain.com;

    # Increase max upload size for large audio files
    client_max_body_size 500M;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;

        # Increase timeout for long-running transcription requests
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
    }

    # Static files (Next.js assets)
    location /_next/static {
        proxy_pass http://localhost:3000;
        proxy_cache_valid 60m;
        add_header Cache-Control "public, immutable";
    }

    # Handle API routes with longer timeout
    location /api/ {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;

        # Longer timeout for file uploads and processing
        proxy_read_timeout 600s;
        proxy_connect_timeout 600s;
        proxy_send_timeout 600s;
    }
}
```

### Step 3: Enable the Site

```bash
# Create symbolic link to enable the site
sudo ln -s /etc/nginx/sites-available/transcribe /etc/nginx/sites-enabled/

# Test nginx configuration
sudo nginx -t

# Reload nginx
sudo systemctl reload nginx
```

### Step 4: Update DNS

Add an A record for your subdomain:
```
Type: A
Host: transcribe
Value: <your-server-ip>
TTL: 3600
```

### Step 5: Add SSL (Recommended)

```bash
# Install certbot if not already installed
sudo apt-get update
sudo apt-get install certbot python3-certbot-nginx

# Get SSL certificate
sudo certbot --nginx -d transcribe.yourdomain.com

# Certbot will automatically update your nginx config
```

After SSL, your nginx config will look like:

```nginx
server {
    listen 443 ssl http2;
    server_name transcribe.yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/transcribe.yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/transcribe.yourdomain.com/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;

    client_max_body_size 500M;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
    }

    location /api/ {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 600s;
        proxy_connect_timeout 600s;
        proxy_send_timeout 600s;
    }

    location /_next/static {
        proxy_pass http://localhost:3000;
        proxy_cache_valid 60m;
        add_header Cache-Control "public, immutable";
    }
}

server {
    listen 80;
    server_name transcribe.yourdomain.com;
    return 301 https://$server_name$request_uri;
}
```

---

## Option 2: Path-Based Setup (e.g., yourdomain.com/transcribe)

If you want to run it under a path on your existing domain:

### Step 1: Update Next.js Configuration

Edit `webapp/next.config.js`:

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  basePath: '/transcribe',
  assetPrefix: '/transcribe',
  api: {
    bodyParser: false,
  },
}

module.exports = nextConfig
```

### Step 2: Update Environment Variables

Edit `webapp/.env.local`:

```env
NEXTAUTH_URL=https://yourdomain.com/transcribe
```

### Step 3: Add to Existing nginx Configuration

Edit your existing site config:

```bash
sudo nano /etc/nginx/sites-available/yourdomain
```

Add this location block:

```nginx
server {
    listen 443 ssl http2;
    server_name yourdomain.com;

    # ... your existing configuration ...

    # Transcription app
    location /transcribe {
        rewrite ^/transcribe/(.*)$ /$1 break;
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
        client_max_body_size 500M;
    }

    location /transcribe/api/ {
        rewrite ^/transcribe/(.*)$ /$1 break;
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 600s;
        proxy_connect_timeout 600s;
        client_max_body_size 500M;
    }

    location /transcribe/_next/static {
        proxy_pass http://localhost:3000;
        proxy_cache_valid 60m;
        add_header Cache-Control "public, immutable";
    }
}
```

Test and reload:
```bash
sudo nginx -t
sudo systemctl reload nginx
```

---

## Running the App as a Service (PM2)

To keep the app running in the background and auto-restart on crashes/reboots:

### Install PM2

```bash
sudo npm install -g pm2
```

### Start the App with PM2

```bash
cd /home/user/Transcription_Minutes/webapp

# Build for production first
npm run build

# Start with PM2
pm2 start npm --name "transcription-app" -- start

# Or with environment variables
pm2 start npm --name "transcription-app" -- start --env PORT=3000

# Save PM2 process list
pm2 save

# Setup PM2 to start on system boot
pm2 startup
# Follow the command it outputs
```

### PM2 Useful Commands

```bash
# View logs
pm2 logs transcription-app

# Restart app
pm2 restart transcription-app

# Stop app
pm2 stop transcription-app

# Monitor
pm2 monit

# List all apps
pm2 list

# Delete app
pm2 delete transcription-app
```

---

## Running with systemd (Alternative to PM2)

Create a systemd service file:

```bash
sudo nano /etc/systemd/system/transcription-app.service
```

Add this content:

```ini
[Unit]
Description=Audio Transcription Web Application
After=network.target

[Service]
Type=simple
User=your-username
WorkingDirectory=/home/user/Transcription_Minutes/webapp
Environment="NODE_ENV=production"
Environment="PORT=3000"
ExecStart=/usr/bin/npm start
Restart=on-failure
RestartSec=10
StandardOutput=syslog
StandardError=syslog
SyslogIdentifier=transcription-app

[Install]
WantedBy=multi-user.target
```

Enable and start the service:

```bash
# Reload systemd
sudo systemctl daemon-reload

# Enable service to start on boot
sudo systemctl enable transcription-app

# Start the service
sudo systemctl start transcription-app

# Check status
sudo systemctl status transcription-app

# View logs
sudo journalctl -u transcription-app -f
```

---

## Security Considerations

### 1. Firewall Configuration

Make sure only nginx can access the app port:

```bash
# Allow nginx through firewall
sudo ufw allow 'Nginx Full'

# Block direct access to app port from outside
sudo ufw deny 3000

# Or be more specific - only allow localhost
# (this is usually default behavior)
```

### 2. Rate Limiting (Optional)

Add to nginx config to prevent abuse:

```nginx
# Add this in http block of /etc/nginx/nginx.conf
limit_req_zone $binary_remote_addr zone=transcribe_limit:10m rate=10r/m;

# Then in your server block
location /api/transcribe/upload {
    limit_req zone=transcribe_limit burst=3;
    # ... rest of proxy config
}
```

### 3. IP Whitelist (Optional)

If you want to restrict access to specific IPs:

```nginx
location / {
    allow 192.168.1.0/24;  # Your office network
    allow 1.2.3.4;          # Specific IP
    deny all;

    # ... rest of proxy config
}
```

---

## Troubleshooting

### nginx won't start
```bash
# Check configuration
sudo nginx -t

# Check nginx error log
sudo tail -f /var/log/nginx/error.log
```

### Can't connect to app
```bash
# Check if app is running
pm2 list
# or
sudo systemctl status transcription-app

# Check if port is listening
sudo netstat -tulpn | grep :3000
# or
sudo ss -tulpn | grep :3000

# Check app logs
pm2 logs transcription-app
# or
sudo journalctl -u transcription-app -f
```

### 502 Bad Gateway
- App is not running on the specified port
- Check app logs for errors
- Verify proxy_pass URL matches app port

### Upload fails / 413 Request Entity Too Large
- Increase `client_max_body_size` in nginx config
- Restart nginx: `sudo systemctl reload nginx`

### Timeout on large files
- Increase timeout values in nginx config
- Restart nginx: `sudo systemctl reload nginx`

---

## Complete Example: Production Setup Checklist

```bash
# 1. Build the app
cd /home/user/Transcription_Minutes/webapp
npm run build

# 2. Start with PM2
pm2 start npm --name "transcription-app" -- start
pm2 save
pm2 startup  # Follow the command it outputs

# 3. Configure nginx
sudo nano /etc/nginx/sites-available/transcribe
# (paste subdomain config from above)

# 4. Enable site
sudo ln -s /etc/nginx/sites-available/transcribe /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx

# 5. Add SSL
sudo certbot --nginx -d transcribe.yourdomain.com

# 6. Test
curl -I https://transcribe.yourdomain.com

# 7. Monitor
pm2 monit
sudo tail -f /var/log/nginx/access.log
```

---

## Summary

**Recommended Setup:**
- Run app on port 3000 (or any custom port)
- Use subdomain (transcribe.yourdomain.com)
- Use PM2 for process management
- Use nginx as reverse proxy with SSL

This gives you:
- ✅ Clean URLs
- ✅ SSL/HTTPS
- ✅ Auto-restart on crashes
- ✅ Isolated from other sites
- ✅ Easy to monitor and maintain

**Access your app at:** `https://transcribe.yourdomain.com`
