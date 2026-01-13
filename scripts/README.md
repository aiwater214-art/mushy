# Gem Generator - Flask Backend

Production-ready Flask server for the Gem Generator Dashboard.

## Quick Start

### Development

```bash
# Navigate to scripts directory
cd scripts

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Run development server
python flask_server.py
```

Server runs at `http://localhost:5000`

### Production Deployment

#### Option 1: Gunicorn (Recommended)

```bash
# Install dependencies
pip install -r requirements.txt

# Set environment variables
export FLASK_ENV=production
export SECRET_KEY=your-secure-secret-key

# Run with Gunicorn (4 workers)
gunicorn -w 4 -b 0.0.0.0:5000 flask_server:app
```

#### Option 2: Docker

```dockerfile
FROM python:3.11-slim

WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY flask_server.py .

ENV FLASK_ENV=production
EXPOSE 5000

CMD ["gunicorn", "-w", "4", "-b", "0.0.0.0:5000", "flask_server:app"]
```

Build and run:
```bash
docker build -t gem-generator .
docker run -p 5000:5000 -e SECRET_KEY=your-secret gem-generator
```

#### Option 3: Railway/Render/Fly.io

1. Push the `scripts` folder to a Git repository
2. Connect to your cloud provider
3. Set environment variables:
   - `FLASK_ENV=production`
   - `SECRET_KEY=<generate-secure-key>`
4. Deploy

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | Health check for load balancers |
| GET | `/api/settings` | Get current settings |
| POST | `/api/settings` | Update settings |
| GET | `/api/accounts` | List all generated accounts |
| POST | `/api/generate` | Generate new account (rate limited) |
| GET | `/api/balance` | Check main account balance |
| GET | `/api/export` | Export accounts as text |
| POST | `/api/clear` | Clear all accounts |

## Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `FLASK_ENV` | `development` | Set to `production` for prod |
| `SECRET_KEY` | `dev-secret-key...` | **Required** for production |
| `PORT` | `5000` | Server port |

## Security Notes

- Always set a strong `SECRET_KEY` in production
- Rate limiting is enabled (5 requests/minute for generate)
- CORS is configured for localhost and Vercel domains
- Add your production domain to CORS origins

## Connecting Frontend

Update your Next.js frontend to point to the Flask backend:

```typescript
const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'

// Example: Generate account
const response = await fetch(\`\${API_BASE}/api/generate\`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' }
})
```
