# Deploy — Ubuntu + systemd (IP:port)

Runbook for an experimental VPS: **Ubuntu (systemd), Node 22, run on `IP:3000`
(no domain/HTTPS), data in `/var/lib/ba-agent`, Agent Manager UI served by the
API**. One Node process serves everything:

| URL | What |
| --- | ---- |
| `http://SERVER_IP:3000/` | Web chat |
| `http://SERVER_IP:3000/manager/` | Agent Manager dashboard |
| `http://SERVER_IP:3000/api/*` | API (and `/chat` for MCP/extension) |

> ⚠️ **No authentication.** On `IP:port` anyone who can reach the port can use it
> (and spend your TokenRouter credits). Restrict with the firewall to your own IP
> (Step 7) or keep the VPS private.

---

## 1. Prerequisites (once)
```bash
node -v                        # expect v22.x
sudo apt-get update
sudo apt-get install -y git sqlite3 build-essential python3   # build-essential/python3: fallback if better-sqlite3 has no prebuilt
```

## 2. Get the code
```bash
sudo mkdir -p /opt/agent-platform && sudo chown $USER /opt/agent-platform
git clone <YOUR_REPO_URL> /opt/agent-platform
cd /opt/agent-platform
```

## 3. Persistent data dir
```bash
sudo mkdir -p /var/lib/ba-agent
sudo chown $USER:$USER /var/lib/ba-agent
```

## 4. Install + build
```bash
cd /opt/agent-platform/ba-agent
npm ci                         # installs deps incl. tsx (used by `npm start`)

cd /opt/agent-platform/agent-manager
npm ci && npm run build        # builds dist/ → API serves it at /manager
```

## 5. Environment
```bash
sudo cp /opt/agent-platform/ba-agent/deploy/ba-agent.env.example /etc/ba-agent.env
sudo nano /etc/ba-agent.env    # set TOKENROUTER_API_KEY, confirm DATA_DIR=/var/lib/ba-agent
sudo chmod 600 /etc/ba-agent.env
```

## 6. systemd service
```bash
sudo cp /opt/agent-platform/ba-agent/deploy/ba-agent.service /etc/systemd/system/
# edit User= and WorkingDirectory= if your user/path differ:
sudo nano /etc/systemd/system/ba-agent.service
sudo systemctl daemon-reload
sudo systemctl enable --now ba-agent
systemctl status ba-agent --no-pager
journalctl -u ba-agent -f      # live logs (Ctrl-C to stop tailing)
```

## 7. Firewall (recommended)
```bash
# allow ONLY your IP to reach the app (replace 1.2.3.4):
sudo ufw allow from 1.2.3.4 to any port 3000 proto tcp
sudo ufw enable
# (or, less safe: sudo ufw allow 3000/tcp  → open to the world)
```

## 8. Verify
```bash
curl -s http://localhost:3000/api/health
```
Then open `http://SERVER_IP:3000/manager/` in a browser.

## 9. Backups (cron)
```bash
chmod +x /opt/agent-platform/ba-agent/deploy/backup.sh
( crontab -l 2>/dev/null; echo "0 2 * * * DATA_DIR=/var/lib/ba-agent /opt/agent-platform/ba-agent/deploy/backup.sh" ) | crontab -
```

## 10. Update / redeploy
```bash
cd /opt/agent-platform && git pull
cd ba-agent && npm ci
cd ../agent-manager && npm ci && npm run build
sudo systemctl restart ba-agent
```
Data in `/var/lib/ba-agent/app.db` is untouched by redeploys. Restore a backup by
stopping the service and copying a `app-*.db` over `app.db`.

---

### Notes
- **MCP server** on the same box: point `claude mcp add` at
  `node /opt/agent-platform/ba-agent/node_modules/tsx/dist/cli.mjs /opt/agent-platform/ba-agent/src/mcp-server.ts`
  and set the same `DATA_DIR` in its environment so it shares the DB.
- If `npm start` isn't found by systemd, set the absolute node path in
  `ExecStart` (find it with `which node`) or keep the `bash -lc` form (handles nvm).
- Want HTTPS/domain later? Put nginx in front proxying `:3000` and run certbot —
  no app change needed.
