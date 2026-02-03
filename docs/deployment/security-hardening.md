# Security Hardening Guide

**Document Status**: ✅ Complete
**Stage**: 5.4 - Security Hardening
**Next Stage**: 5.5 - Performance Testing

## Table of Contents

- [Overview](#overview)
- [Security Headers](#security-headers)
- [HTTPS/SSL Configuration](#httpsssl-configuration)
- [CORS Configuration](#cors-configuration)
- [Dependency Security](#dependency-security)
- [OWASP Top 10 Compliance](#owasp-top-10-compliance)
- [Security Middleware](#security-middleware)
- [Secrets Management](#secrets-management)
- [Security Scanning](#security-scanning)
- [Best Practices](#best-practices)
- [Troubleshooting](#troubleshooting)

---

## Overview

This guide covers comprehensive security hardening measures for the Doctify application, implementing industry best practices and OWASP recommendations to protect against common web vulnerabilities.

### Security Objectives

- **Confidentiality**: Protect sensitive data from unauthorized access
- **Integrity**: Ensure data accuracy and prevent tampering
- **Availability**: Maintain service availability and prevent DoS
- **Authentication**: Verify user identities reliably
- **Authorization**: Enforce proper access controls

### Security Layers

```
┌──────────────────────────────────────┐
│  Network Layer (Firewall, VPN)      │
├──────────────────────────────────────┤
│  Application Layer (WAF, Rate Limit)│
├──────────────────────────────────────┤
│  Transport Layer (HTTPS/TLS)        │
├──────────────────────────────────────┤
│  Authentication (JWT, OAuth)        │
├──────────────────────────────────────┤
│  Authorization (RBAC, Permissions)  │
├──────────────────────────────────────┤
│  Data Layer (Encryption, Hashing)   │
└──────────────────────────────────────┘
```

---

## Security Headers

Security headers are HTTP response headers that instruct browsers to implement various security protections.

### Implemented Headers

#### 1. Content-Security-Policy (CSP)

**Purpose**: Prevents XSS, clickjacking, and code injection attacks

**Production Configuration**:
```
Content-Security-Policy:
  default-src 'self';
  script-src 'self';
  style-src 'self';
  img-src 'self' data: https:;
  font-src 'self';
  connect-src 'self';
  frame-ancestors 'none';
  base-uri 'self';
  form-action 'self';
  upgrade-insecure-requests;
```

**Protection Level**: High
**Prevents**: XSS, data injection, clickjacking

#### 2. X-Frame-Options

**Purpose**: Prevents clickjacking attacks

**Configuration**: `DENY`

**Explanation**:
- `DENY`: Page cannot be displayed in frame/iframe
- `SAMEORIGIN`: Page can be framed by same origin only
- `ALLOW-FROM uri`: Page can be framed by specified origin only

**Protection Level**: High
**Prevents**: Clickjacking

#### 3. X-Content-Type-Options

**Purpose**: Prevents MIME-sniffing attacks

**Configuration**: `nosniff`

**Explanation**: Forces browsers to respect the declared Content-Type, preventing execution of incorrectly typed content.

**Protection Level**: Medium
**Prevents**: MIME confusion attacks

#### 4. Strict-Transport-Security (HSTS)

**Purpose**: Enforces HTTPS connections

**Production Configuration**:
```
Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
```

**Parameters**:
- `max-age=31536000`: Remember for 1 year
- `includeSubDomains`: Apply to all subdomains
- `preload`: Eligible for browser preload lists

**Protection Level**: High
**Prevents**: Man-in-the-middle, SSL stripping

**⚠️ Important**: Only enable HSTS after verifying HTTPS works correctly. Incorrect configuration can make your site inaccessible.

#### 5. Referrer-Policy

**Purpose**: Controls referrer information sent with requests

**Configuration**: `strict-origin-when-cross-origin`

**Explanation**: Sends full URL for same-origin, only origin for cross-origin HTTPS, nothing for HTTP.

**Protection Level**: Low
**Prevents**: Information leakage

#### 6. Permissions-Policy

**Purpose**: Controls browser feature access

**Configuration**:
```
Permissions-Policy:
  geolocation=(),
  microphone=(),
  camera=(),
  payment=(),
  usb=(),
  magnetometer=(),
  gyroscope=(),
  accelerometer=()
```

**Protection Level**: Medium
**Prevents**: Unauthorized feature access

#### 7. X-XSS-Protection

**Purpose**: Legacy XSS protection (modern browsers use CSP)

**Configuration**: `1; mode=block`

**Protection Level**: Low (legacy)
**Prevents**: Reflected XSS (in older browsers)

### Environment-Specific Configurations

#### Development
```python
# Relaxed for development
{
    "csp_directives": {
        "default-src": ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
        "connect-src": ["'self'", "ws:", "wss:"],
    },
    "hsts_max_age": 0,  # HSTS disabled
}
```

#### Staging
```python
# Moderate security with flexibility
{
    "csp_directives": {
        "default-src": ["'self'"],
        "script-src": ["'self'", "'unsafe-inline'"],
    },
    "hsts_max_age": 86400,  # 1 day
}
```

#### Production
```python
# Strict security
{
    "csp_directives": {
        "default-src": ["'self'"],
        "script-src": ["'self'"],  # No inline scripts
    },
    "hsts_max_age": 31536000,  # 1 year
}
```

### Header Validation

Test security headers:

```bash
# Using curl
curl -I https://your-domain.com/health

# Using securityheaders.com
https://securityheaders.com/?q=your-domain.com

# Using observatory.mozilla.org
https://observatory.mozilla.org/analyze/your-domain.com
```

**Expected Grade**: A or A+ on security header scanners

---

## HTTPS/SSL Configuration

### Certificate Management

#### 1. Let's Encrypt (Recommended for Production)

```bash
# Install certbot
sudo apt-get install certbot python3-certbot-nginx

# Obtain certificate
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com

# Auto-renewal (already configured by certbot)
sudo certbot renew --dry-run
```

#### 2. Certificate Configuration

**Nginx SSL Configuration** (`nginx.conf`):

```nginx
server {
    listen 443 ssl http2;
    server_name yourdomain.com;

    # SSL certificates
    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;

    # SSL protocols
    ssl_protocols TLSv1.2 TLSv1.3;

    # SSL ciphers (strong ciphers only)
    ssl_ciphers 'ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384';
    ssl_prefer_server_ciphers on;

    # SSL session cache
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;

    # OCSP stapling
    ssl_stapling on;
    ssl_stapling_verify on;
    ssl_trusted_certificate /etc/letsencrypt/live/yourdomain.com/chain.pem;

    # Security headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;

    # Application configuration
    location / {
        proxy_pass http://backend:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

# Redirect HTTP to HTTPS
server {
    listen 80;
    server_name yourdomain.com;
    return 301 https://$server_name$request_uri;
}
```

### SSL/TLS Best Practices

1. **Use TLS 1.2 or higher**: Disable SSL 3.0, TLS 1.0, TLS 1.1
2. **Strong cipher suites**: Use ECDHE and AES-GCM ciphers
3. **Perfect Forward Secrecy**: Ensure ECDHE key exchange
4. **OCSP Stapling**: Enable for better performance
5. **Certificate Transparency**: Monitor certificate issuance
6. **Auto-renewal**: Automate certificate renewal

### SSL Testing

```bash
# Test SSL configuration
testssl.sh yourdomain.com

# Check SSL Labs rating
https://www.ssllabs.com/ssltest/analyze.html?d=yourdomain.com
```

**Target Grade**: A or A+ on SSL Labs

---

## CORS Configuration

Cross-Origin Resource Sharing (CORS) controls which domains can access your API.

### Production CORS Settings

**FastAPI Configuration**:

```python
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://yourdomain.com",
        "https://www.yourdomain.com",
    ],  # Specific origins only
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE"],
    allow_headers=["*"],
    max_age=3600,  # Cache preflight for 1 hour
)
```

### Environment-Specific CORS

```python
# config.py
class Settings(BaseSettings):
    @property
    def cors_origins(self) -> list[str]:
        if self.is_production:
            return [
                "https://yourdomain.com",
                "https://www.yourdomain.com",
            ]
        elif self.is_staging:
            return [
                "https://staging.yourdomain.com",
                "http://localhost:3000",
            ]
        else:
            return ["*"]  # Development only

    @property
    def cors_credentials(self) -> bool:
        return not self.is_development  # Credentials in staging/prod only
```

### CORS Security Checklist

- [ ] Never use `allow_origins=["*"]` with `allow_credentials=True`
- [ ] Specify exact origins in production (no wildcards)
- [ ] Limit allowed methods to those actually used
- [ ] Set appropriate `max_age` for preflight caching
- [ ] Validate `Origin` header on credential-allowed requests
- [ ] Log suspicious CORS requests

---

## Dependency Security

### Automated Vulnerability Scanning

#### Python Dependencies

**Using Safety**:

```bash
# Install Safety
pip install safety

# Check dependencies
safety check

# Check with JSON output
safety check --json --output safety-report.json

# Fail on vulnerabilities in CI/CD
safety check --exit-code 1
```

**Using pip-audit**:

```bash
# Install pip-audit
pip install pip-audit

# Audit dependencies
pip-audit

# Generate JSON report
pip-audit --format json --output pip-audit-report.json
```

#### Node.js Dependencies

**Using npm audit**:

```bash
# Audit dependencies
npm audit

# Fix automatically (if possible)
npm audit fix

# Force fix (may introduce breaking changes)
npm audit fix --force

# Generate JSON report
npm audit --json > npm-audit-report.json
```

### Dependency Update Strategy

1. **Regular Updates**: Weekly dependency updates
2. **Security Patches**: Immediate security patch application
3. **Testing**: Comprehensive testing after updates
4. **Pinning**: Use exact versions in production (`pip freeze`, `package-lock.json`)
5. **Review**: Manual review of dependency changes

### Dependency Scanning in CI/CD

**GitHub Actions Integration** (`.github/workflows/deploy.yml`):

```yaml
security-scan:
  runs-on: ubuntu-latest
  steps:
    - uses: actions/checkout@v3

    - name: Python Security Scan
      run: |
        pip install safety pip-audit
        safety check --exit-code 1
        pip-audit

    - name: npm Security Scan
      run: |
        cd frontend
        npm audit --audit-level=moderate

    - name: Docker Image Scan
      uses: aquasecurity/trivy-action@master
      with:
        scan-type: 'image'
        image-ref: 'doctify-backend:latest'
        severity: 'CRITICAL,HIGH'
```

---

## OWASP Top 10 Compliance

Comprehensive checklist for OWASP Top 10 2021 compliance.

### A01:2021 - Broken Access Control

**Risks**: Unauthorized access to data and functionality

**Implementation**:

```python
# JWT authentication
from app.core.security import verify_token

@router.get("/documents/{document_id}")
async def get_document(
    document_id: str,
    current_user: User = Depends(get_current_user),
):
    document = await get_document_by_id(document_id)

    # Authorization check
    if document.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")

    return document
```

**Checklist**:
- [x] Authentication required for protected endpoints
- [x] Authorization checks on all sensitive operations
- [x] JWT tokens properly validated and expired
- [x] Role-based access control (RBAC) implemented
- [x] Principle of least privilege enforced

### A02:2021 - Cryptographic Failures

**Risks**: Exposure of sensitive data due to weak encryption

**Implementation**:

```python
from passlib.context import CryptContext

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def hash_password(password: str) -> str:
    return pwd_context.hash(password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)
```

**Checklist**:
- [x] HTTPS/TLS enabled in production
- [x] Passwords hashed with bcrypt (cost factor ≥ 12)
- [x] Sensitive data encrypted at rest
- [x] Strong encryption algorithms (AES-256, RSA-2048+)
- [x] Secure key management (environment variables, secrets manager)
- [x] No hardcoded secrets in code

### A03:2021 - Injection

**Risks**: SQL, NoSQL, command injection attacks

**Implementation**:

```python
# MongoDB safe queries (using Motor/ODM)
from motor.motor_asyncio import AsyncIOMotorClient

async def find_document(user_id: str):
    # Safe: using parameterized query
    document = await db.documents.find_one({"owner_id": user_id})
    return document

# Input validation
from pydantic import BaseModel, validator

class DocumentCreate(BaseModel):
    title: str
    content: str

    @validator('title')
    def validate_title(cls, v):
        if not v or len(v) > 200:
            raise ValueError('Title must be 1-200 characters')
        return v
```

**Checklist**:
- [x] NoSQL injection prevented (parameterized queries)
- [x] Command injection prevented (no shell execution of user input)
- [x] Input validation on all user inputs
- [x] Output encoding for HTML/JavaScript contexts
- [x] Pydantic models for request validation

### A04:2021 - Insecure Design

**Risks**: Fundamental design flaws

**Checklist**:
- [x] Threat modeling performed
- [x] Security requirements defined
- [x] Secure design patterns used (authentication, authorization)
- [x] Defense in depth (multiple security layers)
- [x] Fail securely (deny by default)

### A05:2021 - Security Misconfiguration

**Risks**: Exposed configuration, default credentials

**Implementation**:

```python
# Environment-specific settings
class Settings(BaseSettings):
    debug: bool = False  # Production default
    allowed_hosts: list[str] = []

    @validator('debug')
    def production_no_debug(cls, v, values):
        if values.get('environment') == 'production' and v:
            raise ValueError('Debug mode not allowed in production')
        return v
```

**Checklist**:
- [x] Security headers configured
- [x] Debug mode disabled in production
- [x] Default credentials changed
- [x] Error messages don't leak information
- [x] Unnecessary features disabled
- [x] Security hardening applied to all components

### A06:2021 - Vulnerable and Outdated Components

**Risks**: Known vulnerabilities in dependencies

**Checklist**:
- [x] Dependencies regularly updated (weekly)
- [x] Vulnerability scanning automated (Safety, npm audit)
- [x] No known vulnerable dependencies
- [x] Security patches applied promptly (within 24h)
- [x] Dependency versions pinned in production

### A07:2021 - Identification and Authentication Failures

**Risks**: Account takeover, session hijacking

**Implementation**:

```python
# JWT configuration
JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY")
JWT_ALGORITHM = "HS256"
JWT_ACCESS_TOKEN_EXPIRE_MINUTES = 30
JWT_REFRESH_TOKEN_EXPIRE_DAYS = 7

# Rate limiting on auth endpoints
@router.post("/auth/login")
@limiter.limit("5/minute")
async def login(credentials: LoginRequest):
    # ... login logic
```

**Checklist**:
- [x] Multi-factor authentication available (optional)
- [x] Strong password policy enforced
- [x] Session management secure (JWT with expiration)
- [x] Account lockout after failed attempts
- [x] Secure password recovery process
- [x] Rate limiting on authentication endpoints

### A08:2021 - Software and Data Integrity Failures

**Risks**: Compromised code, insecure updates

**Checklist**:
- [x] CI/CD pipeline secured (GitHub Actions with secrets)
- [x] Dependency integrity verified (package-lock.json, pip freeze)
- [x] Code review required for changes
- [x] Automated tests in deployment pipeline
- [x] Rollback capability for failed deployments

### A09:2021 - Security Logging and Monitoring Failures

**Risks**: Undetected breaches, delayed incident response

**Implementation**:

```python
import logging
import json

# Structured logging
logger = logging.getLogger(__name__)

def log_security_event(event_type: str, user_id: str, details: dict):
    logger.warning(json.dumps({
        "timestamp": datetime.utcnow().isoformat(),
        "event_type": event_type,
        "user_id": user_id,
        "details": details,
    }))

# Log authentication failures
@router.post("/auth/login")
async def login(credentials: LoginRequest):
    user = authenticate_user(credentials)
    if not user:
        log_security_event(
            "authentication_failure",
            credentials.email,
            {"ip_address": request.client.host}
        )
        raise HTTPException(status_code=401)
```

**Checklist**:
- [x] Security events logged (authentication, authorization, errors)
- [x] Logs monitored and alerted (Prometheus + Grafana)
- [x] Audit trail maintained (who, what, when)
- [x] Log integrity protected (centralized logging)
- [x] Incident response plan defined

### A10:2021 - Server-Side Request Forgery (SSRF)

**Risks**: Unauthorized access to internal resources

**Implementation**:

```python
from urllib.parse import urlparse
import ipaddress

ALLOWED_DOMAINS = ["api.example.com", "cdn.example.com"]

def is_safe_url(url: str) -> bool:
    """Validate URL to prevent SSRF attacks."""
    parsed = urlparse(url)

    # Check protocol
    if parsed.scheme not in ["http", "https"]:
        return False

    # Check domain whitelist
    if parsed.hostname not in ALLOWED_DOMAINS:
        return False

    # Prevent access to private IPs
    try:
        ip = ipaddress.ip_address(parsed.hostname)
        if ip.is_private or ip.is_loopback:
            return False
    except ValueError:
        pass  # Not an IP address

    return True

@router.post("/fetch-external")
async def fetch_external(url: str):
    if not is_safe_url(url):
        raise HTTPException(status_code=400, detail="Invalid URL")

    # Proceed with request
```

**Checklist**:
- [x] URL validation implemented
- [x] Whitelist approach for external requests
- [x] Private IP ranges blocked
- [x] Network segmentation in place
- [x] SSRF protections active

---

## Security Middleware

### Implementation

Security middleware is automatically added to all FastAPI applications.

**Integration** (`backend/app/main.py`):

```python
from app.middleware.security import (
    SecurityHeadersMiddleware,
    get_security_middleware_config,
)

# Add security middleware
config = get_security_middleware_config()
app.add_middleware(SecurityHeadersMiddleware, **config)
```

### Middleware Features

1. **Security Headers**: Automatic security header injection
2. **Environment-Aware**: Different configurations for dev/staging/prod
3. **CSP Builder**: Flexible Content Security Policy construction
4. **HSTS Management**: Production-only HSTS enforcement
5. **Header Removal**: Removes information disclosure headers (Server, X-Powered-By)

### Testing Middleware

```python
# Test security headers
def test_security_headers():
    response = client.get("/health")

    assert "Content-Security-Policy" in response.headers
    assert "X-Frame-Options" in response.headers
    assert "X-Content-Type-Options" in response.headers
    assert response.headers["X-Content-Type-Options"] == "nosniff"
```

---

## Secrets Management

### Environment Variables

**Never commit secrets to version control.**

#### Development
```bash
# .env.development (not committed)
DATABASE_URL=mongodb://localhost:27017/doctify
JWT_SECRET_KEY=dev-secret-change-in-production
REDIS_URL=redis://localhost:6379
```

#### Production
```bash
# Use environment variables or secrets manager
export DATABASE_URL="mongodb://user:password@host:27017/doctify"
export JWT_SECRET_KEY="$(openssl rand -hex 32)"
export REDIS_URL="redis://user:password@host:6379"
```

### Secrets Manager Integration

**AWS Secrets Manager**:

```python
import boto3
from functools import lru_cache

@lru_cache()
def get_secret(secret_name: str) -> dict:
    """Retrieve secret from AWS Secrets Manager."""
    session = boto3.session.Session()
    client = session.client(service_name='secretsmanager')

    response = client.get_secret_value(SecretId=secret_name)
    return json.loads(response['SecretString'])

# Usage
secrets = get_secret("doctify/production")
DATABASE_URL = secrets["DATABASE_URL"]
```

### Secret Rotation

1. **Frequency**: Rotate secrets every 90 days
2. **Procedure**:
   - Generate new secret
   - Update in secrets manager
   - Deploy updated configuration
   - Verify functionality
   - Remove old secret
3. **Emergency**: Rotate immediately if compromised

### Secrets Detection

```bash
# Run gitleaks to detect committed secrets
gitleaks detect --source . --verbose

# Pre-commit hook to prevent secret commits
#!/bin/sh
gitleaks protect --staged --verbose --redact
```

---

## Security Scanning

### Automated Security Audits

Run comprehensive security audit:

```bash
# Make script executable
chmod +x scripts/security-audit.sh

# Run audit
./scripts/security-audit.sh
```

### Scan Components

1. **Python Dependencies**: Safety + pip-audit
2. **npm Dependencies**: npm audit
3. **Docker Images**: Trivy vulnerability scanner
4. **Secrets Detection**: gitleaks
5. **Security Headers**: curl header inspection
6. **OWASP Compliance**: Checklist validation
7. **SSL/TLS**: testssl.sh configuration check

### CI/CD Integration

Security scans automatically run on:
- Pull requests
- Main branch commits
- Nightly scheduled scans
- Pre-deployment verification

**Failure Conditions**:
- Critical vulnerabilities found
- High severity issues (> 5)
- Secrets detected in code
- Missing required security headers

---

## Best Practices

### Code Security

1. **Input Validation**: Validate all user inputs with Pydantic
2. **Output Encoding**: Encode outputs for HTML/JavaScript contexts
3. **Parameterized Queries**: Always use parameterized database queries
4. **Error Handling**: Don't expose stack traces in production
5. **Logging**: Log security events without sensitive data

### Infrastructure Security

1. **Principle of Least Privilege**: Minimal required permissions
2. **Network Segmentation**: Separate public/private networks
3. **Firewall Rules**: Whitelist-only ingress/egress
4. **Container Security**: Non-root users, minimal images
5. **Secrets Management**: Never hardcode, use secrets manager

### Deployment Security

1. **HTTPS Only**: Enforce HTTPS in production
2. **Security Headers**: All protective headers enabled
3. **Rate Limiting**: Protect against abuse
4. **Monitoring**: Active security monitoring and alerting
5. **Incident Response**: Documented procedures

### Development Security

1. **Code Review**: Security-focused code reviews
2. **Security Testing**: Automated security tests
3. **Dependency Updates**: Regular vulnerability patching
4. **Security Training**: Team security awareness
5. **Threat Modeling**: Regular threat assessments

---

## Troubleshooting

### Issue: CSP Blocking Resources

**Symptom**: Browser console shows CSP violations

**Solution**:
1. Check browser console for blocked resources
2. Add specific domains to CSP directives
3. Avoid using `'unsafe-inline'` in production
4. Use nonces or hashes for inline scripts

```python
# Add specific domain
csp_directives = {
    "script-src": ["'self'", "https://cdn.trusted-domain.com"],
}
```

### Issue: HSTS Preload Not Working

**Symptom**: Domain not accepted for HSTS preload list

**Solution**:
1. Verify HSTS header includes `preload` directive
2. Ensure `max-age` ≥ 31536000 (1 year)
3. Include `includeSubDomains` directive
4. Submit to https://hstspreload.org/
5. Wait for browser preload list updates

### Issue: CORS Errors

**Symptom**: Browser blocks cross-origin requests

**Solution**:
1. Verify `allow_origins` includes requesting domain
2. Check `allow_credentials` matches request
3. Ensure preflight OPTIONS requests succeed
4. Verify `Access-Control-Allow-*` headers present

```bash
# Debug CORS
curl -H "Origin: https://yourdomain.com" \
     -H "Access-Control-Request-Method: POST" \
     -H "Access-Control-Request-Headers: Content-Type" \
     -X OPTIONS \
     https://api.yourdomain.com/endpoint -v
```

### Issue: Vulnerability Scanner False Positives

**Symptom**: Scanner reports non-applicable vulnerabilities

**Solution**:
1. Review vulnerability details carefully
2. Check if affected code path is actually used
3. Verify version specificity
4. Document exceptions with justification
5. Consider patching or migrating if risk exists

### Issue: Performance Impact from Security Features

**Symptom**: Increased latency after security hardening

**Solution**:
1. Profile to identify bottleneck
2. Optimize CSP header construction (cache)
3. Use efficient encryption algorithms
4. Implement caching where appropriate
5. Consider CDN for static content delivery

**Performance Optimization**:
```python
# Cache CSP header
@lru_cache(maxsize=1)
def get_csp_header() -> str:
    return build_csp_header()
```

---

## Security Checklist

Use this checklist before deploying to production:

### Pre-Deployment

- [ ] All security headers configured and tested
- [ ] HTTPS/TLS enabled with valid certificate
- [ ] CORS configured for specific origins only
- [ ] Security middleware integrated and active
- [ ] Dependency vulnerabilities resolved (Critical/High)
- [ ] Secrets moved to environment variables/secrets manager
- [ ] Debug mode disabled in production
- [ ] Error messages sanitized (no stack traces)
- [ ] Rate limiting implemented on auth endpoints
- [ ] Security audit passed with no critical issues

### Post-Deployment

- [ ] Security headers verified (securityheaders.com)
- [ ] SSL/TLS configuration tested (ssllabs.com)
- [ ] OWASP Top 10 compliance validated
- [ ] Monitoring and alerting active
- [ ] Incident response plan documented
- [ ] Security logging enabled and monitored
- [ ] Penetration testing completed (if required)
- [ ] Security documentation up to date

---

## Additional Resources

### Tools

- **Security Headers**: https://securityheaders.com/
- **SSL Labs**: https://www.ssllabs.com/ssltest/
- **Observatory**: https://observatory.mozilla.org/
- **Safety**: https://github.com/pyupio/safety
- **Trivy**: https://github.com/aquasecurity/trivy
- **gitleaks**: https://github.com/gitleaks/gitleaks
- **OWASP ZAP**: https://www.zaproxy.org/

### References

- **OWASP Top 10**: https://owasp.org/www-project-top-ten/
- **OWASP Cheat Sheets**: https://cheatsheetseries.owasp.org/
- **MDN Web Security**: https://developer.mozilla.org/en-US/docs/Web/Security
- **CSP Evaluator**: https://csp-evaluator.withgoogle.com/

---

**Last Updated**: 2026-01-14
**Review Schedule**: Quarterly
**Owner**: DevOps Team
