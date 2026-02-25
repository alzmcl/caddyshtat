# Stats Tracker Service Management Guide

## Service Status

The Stats Tracker application is now running as a systemd service and will start automatically on boot.

## Access the Application

**Web Interface:** http://localhost:3000

The application is now serving both the frontend and backend from a single port (3000).

## Service Management Commands

### Check Service Status
```bash
sudo systemctl status stats-tracker.service
```

### Start Service
```bash
sudo systemctl start stats-tracker.service
```

### Stop Service
```bash
sudo systemctl stop stats-tracker.service
```

### Restart Service
```bash
sudo systemctl restart stats-tracker.service
```

### View Logs
```bash
# View recent logs
sudo journalctl -u stats-tracker.service -n 50

# Follow logs in real-time
sudo journalctl -u stats-tracker.service -f

# View logs since boot
sudo journalctl -u stats-tracker.service -b
```

### Disable Auto-start on Boot
```bash
sudo systemctl disable stats-tracker.service
```

### Enable Auto-start on Boot
```bash
sudo systemctl enable stats-tracker.service
```

## Application Details

- **Service Name:** stats-tracker.service
- **Port:** 3000
- **Working Directory:** /home/alan/dev/stats-tracker/server
- **Database:** /home/alan/dev/stats-tracker/server/golf.db
- **Frontend:** Built and served from /home/alan/dev/stats-tracker/client/dist

## Updating the Application

### Update Frontend
```bash
cd /home/alan/dev/stats-tracker/client
npm run build
sudo systemctl restart stats-tracker.service
```

### Update Backend
```bash
# After making changes to server code
sudo systemctl restart stats-tracker.service
```

### Update Service Configuration
```bash
# After editing stats-tracker.service
sudo cp /home/alan/dev/stats-tracker/stats-tracker.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl restart stats-tracker.service
```

## Troubleshooting

### Service Won't Start
Check the logs:
```bash
sudo journalctl -u stats-tracker.service -n 50 --no-pager
```

### Port Already in Use
Kill any process using port 3000:
```bash
sudo lsof -i :3000
sudo kill -9 <PID>
sudo systemctl restart stats-tracker.service
```

### Database Issues
Reset the database:
```bash
sudo systemctl stop stats-tracker.service
cd /home/alan/dev/stats-tracker/server
rm golf.db
sudo systemctl start stats-tracker.service
```

## Health Check

Check if the API is responding:
```bash
curl http://localhost:3000/api/health
```

Expected response:
```json
{"status":"ok","timestamp":"2026-02-17T12:06:38.334Z"}
```

## Performance Monitoring

### Check Service Resource Usage
```bash
systemctl status stats-tracker.service
```

### View Memory Usage
```bash
sudo systemctl show stats-tracker.service -p MemoryCurrent
```

## Backup

### Backup Database
```bash
cp /home/alan/dev/stats-tracker/server/golf.db ~/backups/golf-$(date +%Y%m%d).db
```

### Automated Backup Script
Create a cron job to backup daily:
```bash
# Add to crontab (crontab -e)
0 2 * * * cp /home/alan/dev/stats-tracker/server/golf.db ~/backups/golf-$(date +\%Y\%m\%d).db
```

## Network Access

To access from other devices on your network, you may need to:

1. Allow port 3000 through the firewall:
```bash
sudo ufw allow 3000
```

2. Access via: `http://<your-server-ip>:3000`

## Security Notes

- The application currently runs on localhost only
- For production use, consider adding HTTPS with nginx reverse proxy
- Regular backups of the database are recommended
- Keep Node.js and dependencies updated

---

**Service is configured to:**
- ✅ Start automatically on boot
- ✅ Restart automatically if it crashes
- ✅ Log to systemd journal
- ✅ Run as user 'alan'
