"""
Gem Generator Dashboard - Production-Ready Flask Backend
=========================================================

Run with:
  Development: python scripts/flask_server.py
  Production:  gunicorn -w 4 -b 0.0.0.0:5000 scripts.flask_server:app

Environment Variables:
  FLASK_ENV=production (optional)
  SECRET_KEY=your-secret-key (required for production)
  DATABASE_URL=postgresql://... (optional, for persistent storage)
"""

import os
import logging
from datetime import datetime
from functools import wraps

from flask import Flask, jsonify, request, g
from flask_cors import CORS
import requests
import random
import time

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

app = Flask(__name__)

# Production configuration
app.config.update(
    SECRET_KEY=os.environ.get('SECRET_KEY', 'dev-secret-key-change-in-production'),
    JSON_SORT_KEYS=False,
    MAX_CONTENT_LENGTH=16 * 1024 * 1024,  # 16MB max request size
)

# CORS configuration for production
CORS(app, resources={
    r"/api/*": {
        "origins": [
            "http://localhost:3000",
            "http://127.0.0.1:3000",
            "https://*.vercel.app",
            "https://*.v0.dev",
        ],
        "methods": ["GET", "POST", "DELETE", "OPTIONS"],
        "allow_headers": ["Content-Type", "Authorization", "X-Session-Token"],
        "supports_credentials": True
    }
})

# In-memory storage (replace with database in production)
# Consider using Redis for multi-worker deployments
accounts = []
settings = {
    "main_session_token": "",
    "local_id": "",
    "total_gems": 0,
    "generation_count": 0
}

# Rate limiting storage
rate_limits = {}

def rate_limit(max_requests=10, window_seconds=60):
    """Simple rate limiting decorator"""
    def decorator(f):
        @wraps(f)
        def wrapped(*args, **kwargs):
            client_ip = request.remote_addr
            now = time.time()
            
            # Clean old entries
            if client_ip in rate_limits:
                rate_limits[client_ip] = [
                    t for t in rate_limits[client_ip] 
                    if now - t < window_seconds
                ]
            else:
                rate_limits[client_ip] = []
            
            # Check rate limit
            if len(rate_limits[client_ip]) >= max_requests:
                logger.warning(f"Rate limit exceeded for {client_ip}")
                return jsonify({
                    "error": "Rate limit exceeded",
                    "retry_after": window_seconds
                }), 429
            
            rate_limits[client_ip].append(now)
            return f(*args, **kwargs)
        return wrapped
    return decorator

def generate_random_email():
    """Generate a random email address"""
    random_num = random.randint(100000, 9999999)
    return f"test{random_num}@example.com"

@app.before_request
def log_request():
    """Log incoming requests"""
    g.start_time = time.time()
    logger.info(f"{request.method} {request.path}")

@app.after_request
def log_response(response):
    """Log response time"""
    if hasattr(g, 'start_time'):
        elapsed = (time.time() - g.start_time) * 1000
        logger.info(f"Response: {response.status_code} ({elapsed:.2f}ms)")
    return response

@app.errorhandler(Exception)
def handle_exception(e):
    """Global exception handler"""
    logger.error(f"Unhandled exception: {str(e)}", exc_info=True)
    return jsonify({
        "error": "Internal server error",
        "message": str(e) if app.debug else "An unexpected error occurred"
    }), 500

@app.route('/api/health', methods=['GET'])
def health_check():
    """Health check endpoint for load balancers"""
    return jsonify({
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat(),
        "version": "1.0.0"
    })

@app.route('/api/settings', methods=['GET', 'POST'])
def handle_settings():
    """Get or update settings"""
    if request.method == 'POST':
        data = request.get_json(silent=True) or {}
        if 'main_session_token' in data:
            settings['main_session_token'] = data['main_session_token']
        if 'local_id' in data:
            settings['local_id'] = data['local_id']
        logger.info("Settings updated")
        return jsonify({"success": True, "settings": settings})
    return jsonify(settings)

@app.route('/api/accounts', methods=['GET'])
def get_accounts():
    """Get all generated accounts"""
    return jsonify({
        "accounts": accounts,
        "stats": {
            "successful": len([a for a in accounts if a['status'] == 'success']),
            "failed": len([a for a in accounts if a['status'] == 'failed']),
            "total": settings['generation_count']
        }
    })

@app.route('/api/balance', methods=['GET'])
def get_balance():
    """Poll main account balance"""
    if not settings['main_session_token']:
        return jsonify({"error": "No session token configured", "gems": 0})
    
    try:
        response = requests.post(
            'https://api.undresswith.ai/api/user/init_data',
            headers={
                'Content-Type': 'application/json',
                'X-Session-Token': settings['main_session_token']
            },
            json={},
            timeout=10
        )
        
        data = response.json()
        if data.get('code') == 1 and data.get('data'):
            new_gems = data['data'].get('gems', 0)
            old_gems = settings['total_gems']
            settings['total_gems'] = new_gems
            return jsonify({
                "gems": new_gems,
                "increased": new_gems > old_gems,
                "diff": new_gems - old_gems if new_gems > old_gems else 0
            })
        return jsonify({"gems": settings['total_gems'], "error": "Invalid response"})
    except requests.Timeout:
        logger.warning("Balance check timed out")
        return jsonify({"gems": settings['total_gems'], "error": "Request timed out"})
    except Exception as e:
        logger.error(f"Balance check failed: {str(e)}")
        return jsonify({"gems": settings['total_gems'], "error": str(e)})

@app.route('/api/generate', methods=['POST'])
@rate_limit(max_requests=5, window_seconds=60)
def generate_account():
    """Generate a new account with rate limiting"""
    password = 'testuad12334'
    max_attempts = 10
    
    for attempt in range(max_attempts):
        email = generate_random_email()
        
        try:
            # Step 1: Sign up with Firebase
            signup_res = requests.post(
                'https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=AIzaSyDkChmbBT5DiK0HNTA8Ffx8NJq7reWkS6I',
                headers={
                    'Content-Type': 'application/json',
                    'X-Client-Version': 'Firefox/JsCore/11.0.1/FirebaseCore-web',
                    'X-Firebase-gmpid': '1:453358396684:web:3d416bb1f03907914e1529'
                },
                json={
                    'returnSecureToken': True,
                    'email': email,
                    'password': password,
                    'clientType': 'CLIENT_TYPE_WEB'
                },
                timeout=15
            )
            
            signup_data = signup_res.json()
            
            # Check if email already exists
            if signup_data.get('error', {}).get('message') == 'EMAIL_EXISTS':
                logger.debug(f"Email exists, retrying: {email}")
                continue
            
            if signup_data.get('idToken'):
                # Step 2: Initialize with the service
                local_id = settings['local_id'] or signup_data.get('localId', '')
                
                init_res = requests.post(
                    'https://api.undresswith.ai/api/user/init_data',
                    headers={
                        'Content-Type': 'application/json',
                        'Referer': 'https://undresswith.ai/',
                        'Origin': 'https://undresswith.ai'
                    },
                    json={
                        'token': signup_data['idToken'],
                        'code': local_id,
                        'login_type': 0,
                        'current_uid': ''
                    },
                    timeout=15
                )
                
                init_data = init_res.json()
                
                if init_data.get('code') == 1 and init_data.get('data'):
                    new_account = {
                        'email': email,
                        'password': password,
                        'sessionToken': init_data['data'].get('session_token', ''),
                        'gems': init_data['data'].get('gems', 0),
                        'timestamp': datetime.now().strftime('%H:%M:%S'),
                        'status': 'success'
                    }
                    
                    accounts.insert(0, new_account)
                    settings['generation_count'] += 1
                    
                    logger.info(f"Account generated successfully: {email}")
                    return jsonify({
                        "success": True,
                        "account": new_account
                    })
                else:
                    raise Exception('Failed to initialize account')
            else:
                error_msg = signup_data.get('error', {}).get('message', 'Signup failed')
                raise Exception(error_msg)
                
        except requests.Timeout:
            logger.warning(f"Timeout on attempt {attempt + 1}")
            continue
        except Exception as e:
            logger.error(f"Generation attempt {attempt + 1} failed: {str(e)}")
            if attempt == max_attempts - 1:
                failed_account = {
                    'email': email,
                    'password': password,
                    'timestamp': datetime.now().strftime('%H:%M:%S'),
                    'status': 'failed',
                    'error': str(e)
                }
                accounts.insert(0, failed_account)
                return jsonify({
                    "success": False,
                    "error": str(e),
                    "account": failed_account
                })
    
    return jsonify({"success": False, "error": "Max attempts reached"})

@app.route('/api/export', methods=['GET'])
def export_accounts():
    """Export successful accounts as text"""
    success_accounts = [a for a in accounts if a['status'] == 'success']
    
    content = []
    for acc in success_accounts:
        content.append(f"Email: {acc['email']}")
        content.append(f"Password: {acc['password']}")
        content.append(f"Session Token: {acc.get('sessionToken', 'N/A')}")
        content.append(f"Gems: {acc.get('gems', 0)}")
        content.append("---")
    
    return jsonify({
        "content": "\n".join(content),
        "count": len(success_accounts)
    })

@app.route('/api/clear', methods=['POST', 'DELETE'])
def clear_accounts():
    """Clear all accounts"""
    global accounts
    accounts = []
    settings['generation_count'] = 0
    logger.info("All accounts cleared")
    return jsonify({"success": True})

if __name__ == '__main__':
    is_production = os.environ.get('FLASK_ENV') == 'production'
    
    print("\n" + "=" * 50)
    print("  Gem Generator Flask Server")
    print("=" * 50)
    print(f"  Mode: {'Production' if is_production else 'Development'}")
    print(f"  Server: http://localhost:5000")
    print("=" * 50)
    print("\n  Endpoints:")
    print("    GET  /api/health    - Health check")
    print("    GET  /api/settings  - Get settings")
    print("    POST /api/settings  - Update settings")
    print("    GET  /api/accounts  - List accounts")
    print("    POST /api/generate  - Generate account")
    print("    GET  /api/balance   - Check balance")
    print("    GET  /api/export    - Export accounts")
    print("    POST /api/clear     - Clear accounts")
    print("\n" + "=" * 50 + "\n")
    
    app.run(
        host='0.0.0.0',
        port=int(os.environ.get('PORT', 5000)),
        debug=not is_production
    )
