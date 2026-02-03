# SSL/TLS Setup Guide

Configure HTTPS with Let's Encrypt and Traefik for Doctify.

## Overview

Doctify uses Traefik as a reverse proxy with automatic Let's Encrypt certificate provisioning. This provides:

- Automatic SSL certificate generation
- Automatic certificate renewal
- TLS 1.2 and 1.3 support
- Strong cipher suites
- HTTP to HTTPS redirect

## Architecture

```
Internet → Traefik (443) → Backend/Frontend
              │
              ├── Let's Encrypt ACME
              ├── Certificate storage
              └── TLS termination
```

## Prerequisites

- [ ] Domain name pointing to your server
- [ ] Ports 80 and 443 open
- [ ] DNS propagation complete (verify with `dig your-domain.com`)

## Automatic SSL (Recommended)

The default `docker-compose.prod.yml` includes automatic SSL configuration.

### 1. Configure Domain

Edit `.env.prod`:

```bash
# Your domain
DOMAIN=your-domain.com

# Email for Let's Encrypt notifications
ACME_EMAIL=admin@your-domain.com
```

### 2. Verify DNS

```bash
# Check A record
dig api.your-domain.com +short
# Should return your server IP

# Check from multiple locations
curl https://dns.google/resolve?name=api.your-domain.com&type=A
```

### 3. Deploy Services

```bash
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d
```

### 4. Monitor Certificate Generation

```bash
# Watch Traefik logs for certificate generation
docker compose -f docker-compose.prod.yml logs -f traefik

# Look for:
# "Adding certificate for domain..."
# "certificateObtained..."
```

### 5. Verify SSL

```bash
# Test HTTPS
curl -vI https://api.your-domain.com 2>&1 | grep -A5 "Server certificate"

# Check certificate details
openssl s_client -connect api.your-domain.com:443 -servername api.your-domain.com </dev/null 2>/dev/null | openssl x509 -noout -dates

# Test SSL configuration
# Visit: https://www.ssllabs.com/ssltest/analyze.html?d=api.your-domain.com
```

## TLS Configuration

The Traefik configuration includes strong TLS settings:

### TLS Options (infrastructure/docker/traefik/dynamic/tls.yml)

```yaml
tls:
  options:
    default:
      minVersion: VersionTLS12
      maxVersion: VersionTLS13
      cipherSuites:
        # TLS 1.3 ciphers
        - TLS_AES_128_GCM_SHA256
        - TLS_AES_256_GCM_SHA384
        - TLS_CHACHA20_POLY1305_SHA256
        # TLS 1.2 ciphers (strong only)
        - TLS_ECDHE_ECDSA_WITH_AES_128_GCM_SHA256
        - TLS_ECDHE_RSA_WITH_AES_128_GCM_SHA256
        - TLS_ECDHE_ECDSA_WITH_AES_256_GCM_SHA384
        - TLS_ECDHE_RSA_WITH_AES_256_GCM_SHA384
      curvePreferences:
        - CurveP521
        - CurveP384
      sniStrict: true
```

### Security Headers

HTTP security headers are automatically applied:

- HSTS (Strict-Transport-Security)
- X-Content-Type-Options
- X-Frame-Options
- Content-Security-Policy
- Referrer-Policy

## Staging vs Production

### Testing with Staging

Let's Encrypt has rate limits. Use staging for testing:

Edit `infrastructure/docker/traefik/traefik.yml`:

```yaml
certificatesResolvers:
  letsencrypt:
    acme:
      # Use staging server for testing
      caServer: https://acme-staging-v02.api.letsencrypt.org/directory
```

**Note**: Staging certificates are not trusted by browsers but don't count against rate limits.

### Switch to Production

Once verified working, comment out the staging server:

```yaml
certificatesResolvers:
  letsencrypt:
    acme:
      # caServer: https://acme-staging-v02.api.letsencrypt.org/directory
```

Then restart Traefik:

```bash
docker compose -f docker-compose.prod.yml restart traefik
```

## Certificate Management

### View Current Certificates

```bash
# Check certificate storage
docker compose -f docker-compose.prod.yml exec traefik cat /letsencrypt/acme.json | jq '.letsencrypt.Certificates[].domain'
```

### Force Certificate Renewal

```bash
# Stop Traefik
docker compose -f docker-compose.prod.yml stop traefik

# Remove certificate storage (careful!)
sudo rm /opt/doctify/data/letsencrypt/acme.json

# Restart Traefik
docker compose -f docker-compose.prod.yml up -d traefik
```

### Certificate Expiry Monitoring

```bash
# Check certificate expiry
echo | openssl s_client -connect api.your-domain.com:443 -servername api.your-domain.com 2>/dev/null | openssl x509 -noout -enddate

# Add to cron for monitoring
# 0 0 * * * /opt/doctify/scripts/check-ssl-expiry.sh
```

## Using Custom Certificates

If you have your own certificates (e.g., from a corporate CA):

### 1. Create Certificate Files

Place certificates in `/opt/doctify/data/certs/`:

```
/opt/doctify/data/certs/
├── domain.crt        # Certificate
├── domain.key        # Private key
└── ca-bundle.crt     # CA bundle (if needed)
```

### 2. Configure Traefik

Create `infrastructure/docker/traefik/dynamic/certs.yml`:

```yaml
tls:
  certificates:
    - certFile: /certs/domain.crt
      keyFile: /certs/domain.key
```

### 3. Update Docker Compose

Add volume mount:

```yaml
traefik:
  volumes:
    - /opt/doctify/data/certs:/certs:ro
```

## Wildcard Certificates

For wildcard certificates (*.your-domain.com), use DNS challenge:

### Configure DNS Challenge

Edit `infrastructure/docker/traefik/traefik.yml`:

```yaml
certificatesResolvers:
  letsencrypt:
    acme:
      email: "${ACME_EMAIL}"
      storage: /letsencrypt/acme.json
      dnsChallenge:
        provider: cloudflare  # or your DNS provider
        resolvers:
          - "1.1.1.1:53"
          - "8.8.8.8:53"
```

Add DNS provider credentials to environment:

```bash
# .env.prod
CF_API_EMAIL=your-cloudflare-email
CF_API_KEY=your-cloudflare-api-key
```

## Troubleshooting

### Certificate Not Generated

1. **Check DNS**: `dig api.your-domain.com`
2. **Check ports**: `curl -I http://api.your-domain.com/.well-known/acme-challenge/test`
3. **Check Traefik logs**: `docker logs doctify-traefik`

### Rate Limit Errors

Let's Encrypt limits:
- 50 certificates per domain per week
- 5 duplicate certificates per week
- 5 failed validations per hour

**Solution**: Use staging server for testing.

### Certificate Renewal Failing

1. **Check Traefik is running**: `docker ps | grep traefik`
2. **Check certificate storage permissions**: `ls -la /opt/doctify/data/letsencrypt/`
3. **Check ACME logs**: `docker logs doctify-traefik 2>&1 | grep -i acme`

### Mixed Content Warnings

Ensure all resources use HTTPS:

- Frontend API URL should use `https://`
- No hardcoded `http://` URLs
- Check WebSocket URLs use `wss://`

## Security Best Practices

### 1. Enable HSTS Preloading

After confirming SSL works:

1. Verify HSTS header is set
2. Submit to HSTS preload list: https://hstspreload.org/

### 2. Disable Old TLS Versions

Already configured in `tls.yml`:
- TLS 1.0: Disabled
- TLS 1.1: Disabled
- TLS 1.2: Enabled (minimum)
- TLS 1.3: Enabled (preferred)

### 3. Monitor SSL Labs Grade

Regularly check your SSL configuration:
- Target: A+ grade
- Test: https://www.ssllabs.com/ssltest/

### 4. Certificate Transparency Monitoring

Monitor for unauthorized certificates:
- https://crt.sh/?q=your-domain.com
- Set up CT log monitoring alerts

## Next Steps

After SSL is configured:
1. [Configure backups](backup-recovery.md)
2. [Set up monitoring](maintenance.md)
3. [Review disaster recovery](disaster-recovery.md)
