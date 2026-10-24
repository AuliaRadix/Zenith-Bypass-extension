# Zenith Bypass - Serverless Edge Proxy Backend

Lightweight, high-performance HTTP/HTTPS CONNECT proxy built with zero dependencies (native Node.js `http` and `net`). It acts as the secure tunneling relay for the **Zenith Bypass** browser extension.

---

## ⚡ Deployment Options (100% Free Tier Supported)

### Option 1: Deploy to Koyeb (Recommended - Fast & Free)
1. Fork or push this repository to your GitHub account.
2. Sign up / Log in to [Koyeb](https://app.koyeb.com/).
3. Click **Create Service** → Choose **GitHub**.
4. Select this repository and set the **Work directory** to `server`.
5. Set Environment Variables:
   - `PORT`: `8080`
   - `PROXY_USERNAME`: (your chosen username, e.g. `admin`)
   - `PROXY_PASSWORD`: (your chosen strong password)
6. Click **Deploy**. Koyeb will generate a public HTTPS URL (e.g. `https://zenith-proxy-yourname.koyeb.app`).
7. Enter this domain and credentials into the Zenith Bypass extension popup!

---

### Option 2: Deploy to Render (1-Click Blueprint)
1. Sign up / Log in to [Render](https://render.com/).
2. Click **New +** → **Blueprint** → Connect this repository.
3. Render will read `render.yaml` automatically and configure the Node web service.
4. Set `PROXY_USERNAME` and `PROXY_PASSWORD` in the environment settings.
5. Deploy! Your proxy will be available at `https://zenith-bypass-edge.onrender.com:443`.

---

### Option 3: Run with Docker / VPS
```bash
# Build Docker image
docker build -t zenith-proxy server/

# Run container
docker run -d -p 8080:8080 \
  -e PROXY_USERNAME=admin \
  -e PROXY_PASSWORD=secretpassword \
  --name zenith-proxy zenith-proxy
```

---

## 🔒 Security Features
- **TLS Termination**: When deployed behind Koyeb/Render, all traffic between your browser and the proxy is encrypted via HTTPS (port 443).
- **Basic Auth Protection**: Prevents unauthorized third parties from using your proxy relay.
- **Auto Credential Handling**: The browser extension silently provides authentication credentials via `chrome.webRequest.onAuthRequired` so you never see authentication prompts.
- **Zero Log Policy**: The proxy does not log requested domains or URLs to disk.
