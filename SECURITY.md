# Security Policy

## Supported Versions

We release patches for security issues in the following versions:

| Version | Supported          |
| ------- | ------------------ |
| 1.x.x   | :white_check_mark: |
| < 1.0   | :x:                |

## Reporting a Security Issue

We take the security of Doctify seriously. If you believe you have found a
security issue in our project, please report it to us as described below.

**Please do not report security issues through public GitHub issues.**

Instead, please report them via email to **security@doctify.dev**.

You should receive a response within 48 hours. If for some reason you do not,
please follow up via email to ensure we received your original message.

Please include the following information in your report:

- Type of issue (e.g., buffer overflow, SQL injection, cross-site scripting)
- Full paths of source file(s) related to the issue
- Location of the affected source code (tag/branch/commit or direct URL)
- Step-by-step instructions to reproduce the issue
- Proof-of-concept or exploit code (if possible)
- Impact of the issue, including how an attacker might exploit it

## Disclosure Policy

When we receive a security bug report, we will:

1. Confirm the problem and determine affected versions
2. Audit code to find any similar problems
3. Prepare fixes for all supported versions
4. Release new versions and announce the fix

## Security Best Practices for Deployment

### Environment Variables

- Never commit `.env` files to version control
- Use strong, unique values for `SECRET_KEY` and `JWT_SECRET_KEY`
- Rotate secrets regularly in production
- Use a secrets manager (e.g., AWS Secrets Manager, HashiCorp Vault) in production

### Database Security

- Use SSL/TLS connections to PostgreSQL in production
- Apply principle of least privilege for database users
- Enable connection pooling limits to prevent resource exhaustion
- Regularly backup database with encryption

### Network Security

- Deploy behind a reverse proxy (nginx, Traefik)
- Enable HTTPS with valid SSL certificates
- Configure appropriate CORS origins for production
- Use firewall rules to restrict database access

### Authentication

- JWT tokens expire after 30 minutes by default
- Implement account lockout after failed login attempts
- Use secure password hashing (bcrypt)
- Consider implementing MFA for sensitive operations

### Monitoring

- Enable audit logging for security events
- Monitor for unusual API access patterns
- Set up alerts for authentication failures
- Regularly review access logs

## Security Headers

The application implements the following security headers:

- `Content-Security-Policy` - Prevents XSS and injection attacks
- `X-Content-Type-Options: nosniff` - Prevents MIME type sniffing
- `X-Frame-Options: DENY` - Prevents clickjacking
- `Strict-Transport-Security` - Enforces HTTPS (production only)
- `X-XSS-Protection` - Legacy XSS protection

## Acknowledgments

We appreciate responsible disclosure from security researchers.
Contributors who report valid security issues will be acknowledged
in our release notes (unless they prefer to remain anonymous).
