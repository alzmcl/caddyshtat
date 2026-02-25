# External Access Setup Guide - UniFi Dream Machine

## Overview
This guide will help you set up external access to your Golf Stats Tracker through your UniFi Dream Machine, allowing you to access the app from anywhere on the internet.

---

## Prerequisites

- ✅ UniFi Dream Machine with admin access
- ✅ **Domain name** - Either:
  - **Custom Domain** (e.g., gtracker.com, yourdomain.com) - **RECOMMENDED** ⭐
  - Dynamic DNS (e.g., summerhill.ddns.net) - Free but less professional
- ✅ Stats Tracker running on port 3000
- ✅ Server IP: Determine your Ubuntu server's local IP (e.g., 192.168.2.238)

---

## 🎯 Using a Custom Domain (e.g., gtracker.com)

**YES! Absolutely recommended!** Using your own domain is:
- ✅ More professional
- ✅ Easier to remember
- ✅ Better for SSL certificates
- ✅ No dependency on dynamic DNS services

### Setup Steps with Custom Domain:

1. **Purchase Domain** from:
   - Namecheap, GoDaddy, Google Domains, Cloudflare, etc.
   - Cost: ~$10-15/year

2. **Point Domain to Your IP**:
   
   **Option A: Point entire domain**
   - Create an **A record**: `gtracker.com` → Your public IP
   - Create an **A record**: `www.gtracker.com` → Your public IP

   **Option B: Use subdomain (recommended)**
   - Create an **A record**: `stats.gtracker.com` → Your public IP
   - Or: `golf.gtracker.com`, `app.gtracker.com`, etc.

3. **DNS Configuration Example** (at your domain registrar):
   ```
   Type    Name    Value                TTL
   A       @       YOUR.PUBLIC.IP       3600
   A       www     YOUR.PUBLIC.IP       3600
   A       stats   YOUR.PUBLIC.IP       3600
   ```

4. **Find Your Public IP**:
   ```bash
   curl ifconfig.me
   # Or visit: https://whatismyipaddress.com/
   ```

5. **Update all configurations to use your domain**:
   - Replace `summerhill.ddns.net` with `gtracker.com` (or `stats.gtracker.com`)
   - Examples below use `gtracker.com` - substitute your actual domain

6. **Wait for DNS Propagation** (5 minutes to 24 hours)
   - Test with: `ping gtracker.com`
   - Should show your public IP

---

## Option 1: Simple Port Forwarding (HTTP - Quick Setup)

### Step 1: Configure Port Forwarding on UniFi Dream Machine

1. **Log into UniFi Network Controller**
   - Navigate to: `https://your-dream-machine-ip`
   - Or use UniFi mobile app

2. **Go to Port Forwarding Settings**
   - Click **Settings** (gear icon)
   - Navigate to **Internet > Port Forwarding**
   - Click **Create New Port Forward Rule**

3. **Create Port Forward Rule**
   ```
   Name:              Golf Stats Tracker
   Port:              3000
   Forward IP:        192.168.2.238 (your Ubuntu server IP)
   Forward Port:      3000
   Protocol:          TCP
   Enabled:           ✓
   ```

4. **Save and Apply**

### Step 2: Update CORS Settings

Edit `.env` file to allow external domain:
```bash
cd /home/alan/dev/stats-tracker/server
nano .env
```

Add your external domain:
```env
# For custom domain (replace with YOUR domain):
ALLOWED_ORIGIN=http://localhost:5173,http://localhost:3000,http://192.168.2.238:3000,http://gtracker.com:3000

# Or if using subdomain:
# ALLOWED_ORIGIN=http://localhost:5173,http://localhost:3000,http://stats.gtracker.com:3000
```

### Step 3: Restart Service
```bash
sudo systemctl restart stats-tracker.service
```

### Step 4: Test External Access
- External URL: `http://gtracker.com:3000` (or `http://stats.gtracker.com:3000`)
- Login with: `alan` / `changeme123`

⚠️ **WARNING**: This sends data unencrypted over the internet. Use Option 2 for production!

---

## Option 2: Secure Access with HTTPS (Recommended for Production)

### Method A: Using Let's Encrypt on Dream Machine

#### Step 1: Enable Let's Encrypt on Dream Machine

1. **Navigate to SSL Certificate Settings**
   - Settings > Advanced > SSL Certificate
   - Enable **Custom SSL Certificate**

2. **Set up Let's Encrypt**
   - Domain: `summerhill.ddns.net`
   - Email: Your email for renewal notices
   - Enable auto-renewal

#### Step 2: Set up Reverse Proxy

**Option 1: Using Dream Machine SE/Pro (Built-in Nginx)**

1. SSH into Dream Machine:
   ```bash
   ssh root@your-dream-machine-ip
   ```

2. Create reverse proxy config:
   ```bash
   cat > /data/nginx/servers/stats-tracker.conf << 'EOF'
   server {
       listen 443 ssl;
       server_name summerhill.ddns.net;
       
       ssl_certificate /data/unifi-core/config/unifi-core.crt;
       ssl_certificate_key /data/unifi-core/config/unifi-core.key;
       
       location / {
           proxy_pass http://192.168.2.238:3000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
           proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
           proxy_set_header X-Forwarded-Proto $scheme;
           proxy_cache_bypass $http_upgrade;
       }
   }
   
   server {
       listen 80;
       server_name summerhill.ddns.net;
       return 301 https://$server_name$request_uri;
   }
   EOF
   ```

3. Reload Nginx:
   ```bash
   nginx -s reload
   ```

**Option 2: Using Caddy on Ubuntu Server (Easier)**

1. Install Caddy on your Ubuntu server:
   ```bash
   sudo apt update
   sudo apt install -y debian-keyring debian-archive-keyring apt-transport-https curl
   curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
   curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | sudo tee /etc/apt/sources.list.d/caddy-stable.list
   sudo apt update
   sudo apt install caddy
   ```

2. Create Caddyfile:
   ```bash
   sudo nano /etc/caddy/Caddyfile
   ```

   Add (replace with YOUR domain):
   ```
   gtracker.com {
       reverse_proxy localhost:3000
       
       encode gzip
       
       header {
           Strict-Transport-Security "max-age=31536000;"
           X-Content-Type-Options "nosniff"
           X-Frame-Options "SAMEORIGIN"
       }
   }
   
   # If using www subdomain, redirect to main domain:
   www.gtracker.com {
       redir https://gtracker.com{uri}
   }
   
   # Or if using a subdomain:
   # stats.gtracker.com {
   #     reverse_proxy localhost:3000
   #     encode gzip
   #     header {
   #         Strict-Transport-Security "max-age=31536000;"
   #         X-Content-Type-Options "nosniff"
   #         X-Frame-Options "SAMEORIGIN"
   #     }
   # }
   ```

3. Configure Dream Machine Port Forwarding:
   ```
   Port 80 → 192.168.2.238:80 (for Let's Encrypt verification)
   Port 443 → 192.168.2.238:443 (for HTTPS traffic)
   ```

4. Restart Caddy:
   ```bash
   sudo systemctl restart caddy
   sudo systemctl enable caddy
   ```

#### Step 3: Update Application Settings

Update `.env`:
```bash
cd /home/alan/dev/stats-tracker/server
nano .env
```

```env
NODE_ENV=production
# Replace with YOUR domain:
ALLOWED_ORIGIN=https://gtracker.com
# Or if using subdomain: ALLOWED_ORIGIN=https://stats.gtracker.com
```

Restart service:
```bash
sudo systemctl restart stats-tracker.service
```

#### Step 4: Test Secure Access
- External URL: `https://gtracker.com` (or your domain)
- Should automatically redirect HTTP to HTTPS
- SSL certificate should be valid
- Test from your phone (not on home WiFi) to verify external access

---

## Option 3: Cloudflare Tunnel (Zero Port Forwarding)

If you don't want to expose ports, use Cloudflare Tunnel:

### Step 1: Install Cloudflared
```bash
wget https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb
sudo dpkg -i cloudflared-linux-amd64.deb
```

### Step 2: Authenticate
```bash
cloudflared tunnel login
```

### Step 3: Create Tunnel
```bash
cloudflared tunnel create stats-tracker
```

### Step 4: Configure Tunnel
```bash
nano ~/.cloudflared/config.yml
```

```yaml
tunnel: <TUNNEL-ID>
credentials-file: /home/alan/.cloudflared/<TUNNEL-ID>.json

ingress:
  - hostname: stats.yourdomain.com
    service: http://localhost:3000
  - service: http_status:404
```

### Step 5: Route DNS
```bash
cloudflared tunnel route dns stats-tracker stats.yourdomain.com
```

### Step 6: Run Tunnel
```bash
cloudflared tunnel run stats-tracker
```

Or as service:
```bash
sudo cloudflared service install
sudo systemctl start cloudflared
sudo systemctl enable cloudflared
```

---

## Security Checklist

Before exposing to internet:

- [ ] Change default passwords (`admin`/`admin123` and `alan`/`changeme123`)
- [ ] Enable HTTPS (Option 2)
- [ ] Set `NODE_ENV=production` in `.env`
- [ ] Update `ALLOWED_ORIGIN` to your domain only
- [ ] Enable UniFi Threat Management
- [ ] Enable Intrusion Detection/Prevention on Dream Machine
- [ ] Configure firewall rules to limit access to specific countries (optional)
- [ ] Set up regular database backups
- [ ] Monitor access logs regularly

### Change Passwords
```bash
# Login to app at http://localhost:3000
# Navigate to Profile → Change Password
```

Or via CLI:
```bash
cd /home/alan/dev/stats-tracker/server
node -e "const bcrypt = require('bcryptjs'); const db = require('./src/db/database'); bcrypt.hash('YOUR_NEW_PASSWORD', 10).then(hash => { db.prepare('UPDATE users SET password_hash = ? WHERE username = ?').run(hash, 'alan'); console.log('✅ Password updated'); });"
```

---

## UniFi Dream Machine Security Settings

### Enable Threat Management
1. UniFi Console → Settings → Security
2. Enable **Threat Management**
3. Enable **Intrusion Detection System (IDS)**
4. Enable **Intrusion Prevention System (IPS)**

### Configure Firewall
1. Settings → Security → Firewall & Security
2. Create rule to limit access:
   ```
   Name: Golf Stats External Access
   Rule Applied: Before Predefined Rules
   Action: Accept
   Protocol: TCP
   Port: 3000 (or 443 if using HTTPS)
   Source: Internet
   Destination: 192.168.2.238
   ```

### Geographic Restrictions (Optional)
1. Settings → Security → Traffic Routes
2. Block countries you don't need access from

---

## Monitoring & Maintenance

### Check Service Status
```bash
sudo systemctl status stats-tracker.service
```

### View Access Logs
```bash
sudo journalctl -u stats-tracker.service -f
```

### Monitor for Suspicious Activity
- Watch for repeated failed login attempts
- Monitor unusual API access patterns
- Check for unexpected database changes

### Backup Database
```bash
# Manual backup
cp /home/alan/dev/stats-tracker/server/golf.db ~/backups/golf-$(date +%Y%m%d).db

# Automated daily backup (add to crontab)
0 2 * * * cp /home/alan/dev/stats-tracker/server/golf.db ~/backups/golf-$(date +\%Y\%m\%d).db
```

---

## Troubleshooting

### Can't Connect Externally
1. Check port forwarding is enabled and correct
2. Verify server is listening on 0.0.0.0:3000 (not just localhost)
3. Check firewall on Ubuntu server: `sudo ufw status`
4. Test with: `curl -I http://summerhill.ddns.net:3000/api/health`

### CORS Errors
- Ensure `ALLOWED_ORIGIN` in `.env` includes your external domain
- Restart service after changing `.env`

### SSL Certificate Issues
- Ensure DNS points to your external IP
- Check port 80 is forwarded for Let's Encrypt verification
- Wait a few minutes for certificate generation

---

## Recommended Setup

**For best security and ease of use:**

1. **Use Caddy on Ubuntu server** (Option 2B)
   - Automatic SSL certificate management
   - Simple configuration
   - No Dream Machine config needed

2. **Port Forward 80 and 443** on Dream Machine
   - 80 → 192.168.2.238:80
   - 443 → 192.168.2.238:443

3. **Enable UniFi Security Features**
   - Threat Management
   - IDS/IPS
   - GeoIP blocking

4. **Change all default passwords**

5. **Set up automated backups**

**Access URL**: `https://gtracker.com` (replace with your domain)

### Example with Custom Domain (gtracker.com)

**Complete Caddy Setup:**
```bash
# 1. Install Caddy
sudo apt update && sudo apt install caddy

# 2. Configure Caddyfile
sudo nano /etc/caddy/Caddyfile
```

Add:
```
gtracker.com {
    reverse_proxy localhost:3000
    encode gzip
    header {
        Strict-Transport-Security "max-age=31536000;"
        X-Content-Type-Options "nosniff"
        X-Frame-Options "SAMEORIGIN"
    }
}

www.gtracker.com {
    redir https://gtracker.com{uri}
}
```

```bash
# 3. Update app config
cd /home/alan/dev/stats-tracker/server
sudo nano .env
```

Set:
```env
NODE_ENV=production
ALLOWED_ORIGIN=https://gtracker.com
```

```bash
# 4. Restart services
sudo systemctl restart caddy
sudo systemctl restart stats-tracker.service

# 5. Forward ports on Dream Machine:
# Port 80 → 192.168.2.238:80
# Port 443 → 192.168.2.238:443

# 6. Access your app at: https://gtracker.com
```

Caddy will automatically:
- ✅ Obtain Let's Encrypt SSL certificate
- ✅ Auto-renew certificates
- ✅ Redirect HTTP to HTTPS
- ✅ Handle all HTTPS complexity

---

## Need Help?

Check logs:
```bash
# Application logs
sudo journalctl -u stats-tracker.service -n 50

# Caddy logs (if using)
sudo journalctl -u caddy -n 50
```

Test connectivity:
```bash
# Health check
curl http://localhost:3000/api/health

# External health check
curl http://summerhill.ddns.net:3000/api/health
```
