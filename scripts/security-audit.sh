#!/bin/bash

# ============================================================================
# Security Audit Script
# ============================================================================
# Performs comprehensive security auditing:
# - Dependency vulnerability scanning (Python Safety, npm audit)
# - Docker image security scanning (Trivy)
# - SSL/TLS configuration checking
# - OWASP Top 10 compliance verification
# - Security header validation
# - Secrets detection
# ============================================================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
BACKEND_DIR="$PROJECT_ROOT/backend"
FRONTEND_DIR="$PROJECT_ROOT/frontend"
REPORT_DIR="$PROJECT_ROOT/security-reports"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
OVERALL_REPORT="$REPORT_DIR/security-audit-$TIMESTAMP.txt"

# Severity counters
CRITICAL_COUNT=0
HIGH_COUNT=0
MEDIUM_COUNT=0
LOW_COUNT=0

# ============================================================================
# Helper Functions
# ============================================================================

print_header() {
    echo -e "\n${BLUE}========================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}========================================${NC}\n"
}

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

check_command() {
    if ! command -v "$1" &> /dev/null; then
        print_warning "$1 not found. Installing..."
        return 1
    fi
    return 0
}

# ============================================================================
# Setup
# ============================================================================

setup() {
    print_header "Security Audit Setup"

    # Create report directory
    mkdir -p "$REPORT_DIR"

    # Initialize overall report
    echo "Doctify Security Audit Report" > "$OVERALL_REPORT"
    echo "Generated: $(date)" >> "$OVERALL_REPORT"
    echo "========================================" >> "$OVERALL_REPORT"
    echo "" >> "$OVERALL_REPORT"

    print_success "Report directory created: $REPORT_DIR"
}

# ============================================================================
# 1. Python Dependency Scanning
# ============================================================================

scan_python_dependencies() {
    print_header "1. Python Dependency Vulnerability Scan"

    local report_file="$REPORT_DIR/python-safety-$TIMESTAMP.json"

    # Check if Safety is installed
    if ! check_command safety; then
        pip install safety
    fi

    cd "$BACKEND_DIR"

    echo "Scanning Python dependencies for known vulnerabilities..."

    # Run Safety check
    if safety check --json --output "$report_file"; then
        print_success "No Python vulnerabilities found"
        echo "Python Dependencies: ✓ PASS" >> "$OVERALL_REPORT"
    else
        local vuln_count=$(jq '. | length' "$report_file" 2>/dev/null || echo "unknown")
        print_error "Found $vuln_count Python vulnerabilities"
        echo "Python Dependencies: ✗ FAIL ($vuln_count vulnerabilities)" >> "$OVERALL_REPORT"

        # Update severity counters
        CRITICAL_COUNT=$((CRITICAL_COUNT + $(jq '[.[] | select(.severity == "critical")] | length' "$report_file" 2>/dev/null || echo 0)))
        HIGH_COUNT=$((HIGH_COUNT + $(jq '[.[] | select(.severity == "high")] | length' "$report_file" 2>/dev/null || echo 0)))
    fi

    # Also run pip-audit if available
    if check_command pip-audit; then
        echo "Running pip-audit..."
        pip-audit --format json --output "$REPORT_DIR/pip-audit-$TIMESTAMP.json" || true
    fi

    cd "$PROJECT_ROOT"
    print_success "Python dependency scan complete"
}

# ============================================================================
# 2. Node.js Dependency Scanning
# ============================================================================

scan_npm_dependencies() {
    print_header "2. Node.js Dependency Vulnerability Scan"

    local report_file="$REPORT_DIR/npm-audit-$TIMESTAMP.json"

    cd "$FRONTEND_DIR"

    echo "Scanning npm dependencies for known vulnerabilities..."

    # Run npm audit
    if npm audit --json > "$report_file" 2>&1; then
        print_success "No npm vulnerabilities found"
        echo "npm Dependencies: ✓ PASS" >> "$OVERALL_REPORT"
    else
        local vuln_info=$(jq -r '.metadata | "Critical: \(.vulnerabilities.critical), High: \(.vulnerabilities.high), Moderate: \(.vulnerabilities.moderate), Low: \(.vulnerabilities.low)"' "$report_file" 2>/dev/null || echo "unknown")
        print_error "Found npm vulnerabilities: $vuln_info"
        echo "npm Dependencies: ✗ FAIL ($vuln_info)" >> "$OVERALL_REPORT"

        # Update severity counters
        CRITICAL_COUNT=$((CRITICAL_COUNT + $(jq '.metadata.vulnerabilities.critical' "$report_file" 2>/dev/null || echo 0)))
        HIGH_COUNT=$((HIGH_COUNT + $(jq '.metadata.vulnerabilities.high' "$report_file" 2>/dev/null || echo 0)))
        MEDIUM_COUNT=$((MEDIUM_COUNT + $(jq '.metadata.vulnerabilities.moderate' "$report_file" 2>/dev/null || echo 0)))
    fi

    cd "$PROJECT_ROOT"
    print_success "npm dependency scan complete"
}

# ============================================================================
# 3. Docker Image Security Scanning
# ============================================================================

scan_docker_images() {
    print_header "3. Docker Image Security Scan"

    # Check if Trivy is installed
    if ! check_command trivy; then
        print_error "Trivy not installed. Please install: https://aquasecurity.github.io/trivy/"
        echo "Docker Image Scan: ⚠ SKIPPED (Trivy not installed)" >> "$OVERALL_REPORT"
        return
    fi

    local images=(
        "doctify-backend:latest"
        "doctify-frontend:latest"
    )

    for image in "${images[@]}"; do
        echo "Scanning $image..."
        local report_file="$REPORT_DIR/trivy-$(echo $image | tr ':' '-')-$TIMESTAMP.json"

        if trivy image --severity CRITICAL,HIGH --format json --output "$report_file" "$image" 2>/dev/null; then
            local vuln_count=$(jq '[.Results[]?.Vulnerabilities[]?] | length' "$report_file" 2>/dev/null || echo 0)

            if [ "$vuln_count" -eq 0 ]; then
                print_success "$image: No critical/high vulnerabilities"
            else
                print_error "$image: Found $vuln_count vulnerabilities"
                CRITICAL_COUNT=$((CRITICAL_COUNT + $(jq '[.Results[]?.Vulnerabilities[]? | select(.Severity == "CRITICAL")] | length' "$report_file" 2>/dev/null || echo 0)))
                HIGH_COUNT=$((HIGH_COUNT + $(jq '[.Results[]?.Vulnerabilities[]? | select(.Severity == "HIGH")] | length' "$report_file" 2>/dev/null || echo 0)))
            fi
        else
            print_warning "$image: Image not found or scan failed"
        fi
    done

    echo "Docker Image Scan: Complete (see individual reports)" >> "$OVERALL_REPORT"
    print_success "Docker image scan complete"
}

# ============================================================================
# 4. Secrets Detection
# ============================================================================

detect_secrets() {
    print_header "4. Secrets Detection Scan"

    # Check if gitleaks is installed
    if ! check_command gitleaks; then
        print_warning "gitleaks not installed. Install: https://github.com/gitleaks/gitleaks"
        echo "Secrets Detection: ⚠ SKIPPED (gitleaks not installed)" >> "$OVERALL_REPORT"

        # Fall back to simple grep patterns
        echo "Running basic secrets detection..."
        local secrets_found=0

        # Common patterns to check
        if grep -r -E "(password|passwd|pwd|secret|token|api[_-]?key)" --include="*.py" --include="*.js" --include="*.env*" "$PROJECT_ROOT" | grep -v "node_modules" | grep -v ".git" | grep -v "security-audit.sh"; then
            print_warning "Potential secrets found in code (manual review required)"
            secrets_found=1
        fi

        if [ $secrets_found -eq 0 ]; then
            print_success "No obvious secrets detected (basic scan)"
            echo "Secrets Detection: ✓ PASS (basic scan)" >> "$OVERALL_REPORT"
        else
            echo "Secrets Detection: ⚠ REVIEW REQUIRED" >> "$OVERALL_REPORT"
        fi

        return
    fi

    local report_file="$REPORT_DIR/gitleaks-$TIMESTAMP.json"

    echo "Scanning for secrets in repository..."

    if gitleaks detect --source "$PROJECT_ROOT" --report-format json --report-path "$report_file" --no-git; then
        print_success "No secrets detected"
        echo "Secrets Detection: ✓ PASS" >> "$OVERALL_REPORT"
    else
        local secrets_count=$(jq '. | length' "$report_file" 2>/dev/null || echo "unknown")
        print_error "Found $secrets_count potential secrets"
        echo "Secrets Detection: ✗ FAIL ($secrets_count secrets found)" >> "$OVERALL_REPORT"
        HIGH_COUNT=$((HIGH_COUNT + secrets_count))
    fi

    print_success "Secrets detection complete"
}

# ============================================================================
# 5. Security Headers Check
# ============================================================================

check_security_headers() {
    print_header "5. Security Headers Validation"

    local backend_url="${BACKEND_URL:-http://localhost:8000}"
    local frontend_url="${FRONTEND_URL:-http://localhost:3000}"

    echo "Checking security headers..."
    echo "" >> "$OVERALL_REPORT"
    echo "Security Headers Check:" >> "$OVERALL_REPORT"

    # Required headers
    local required_headers=(
        "Content-Security-Policy"
        "X-Frame-Options"
        "X-Content-Type-Options"
        "Strict-Transport-Security"
        "Referrer-Policy"
    )

    # Check backend headers
    echo "Backend ($backend_url):"
    local headers_missing=0

    if command -v curl &> /dev/null; then
        for header in "${required_headers[@]}"; do
            if curl -sI "$backend_url/health" 2>/dev/null | grep -i "^$header:" > /dev/null; then
                print_success "  $header: Present"
                echo "  ✓ $header" >> "$OVERALL_REPORT"
            else
                print_warning "  $header: Missing"
                echo "  ✗ $header (missing)" >> "$OVERALL_REPORT"
                headers_missing=$((headers_missing + 1))
            fi
        done
    else
        print_warning "curl not available, skipping header check"
        echo "  ⚠ SKIPPED (curl not available)" >> "$OVERALL_REPORT"
    fi

    if [ $headers_missing -eq 0 ]; then
        echo "Security Headers: ✓ PASS" >> "$OVERALL_REPORT"
    else
        echo "Security Headers: ⚠ $headers_missing headers missing" >> "$OVERALL_REPORT"
        MEDIUM_COUNT=$((MEDIUM_COUNT + headers_missing))
    fi

    print_success "Security headers check complete"
}

# ============================================================================
# 6. OWASP Top 10 Compliance Check
# ============================================================================

check_owasp_compliance() {
    print_header "6. OWASP Top 10 Compliance Check"

    local report_file="$REPORT_DIR/owasp-compliance-$TIMESTAMP.txt"

    echo "Doctify OWASP Top 10 Compliance Checklist" > "$report_file"
    echo "Generated: $(date)" >> "$report_file"
    echo "========================================" >> "$report_file"
    echo "" >> "$report_file"

    # OWASP Top 10 2021 checklist
    cat >> "$report_file" << 'EOF'
A01:2021 - Broken Access Control
  [ ] Authentication required for protected endpoints
  [ ] Authorization checks implemented
  [ ] JWT tokens properly validated
  [ ] Role-based access control (RBAC) implemented

A02:2021 - Cryptographic Failures
  [ ] HTTPS/TLS enabled in production
  [ ] Passwords hashed with bcrypt/argon2
  [ ] Sensitive data encrypted at rest
  [ ] Strong encryption algorithms used

A03:2021 - Injection
  [ ] SQL injection prevented (using ORMs/parameterized queries)
  [ ] NoSQL injection prevented
  [ ] Command injection prevented
  [ ] Input validation implemented

A04:2021 - Insecure Design
  [ ] Threat modeling performed
  [ ] Security requirements defined
  [ ] Secure design patterns used
  [ ] Defense in depth implemented

A05:2021 - Security Misconfiguration
  [ ] Security headers configured
  [ ] Default credentials changed
  [ ] Error messages don't leak information
  [ ] Unnecessary features disabled

A06:2021 - Vulnerable and Outdated Components
  [ ] Dependencies regularly updated
  [ ] Vulnerability scanning automated
  [ ] No known vulnerable dependencies
  [ ] Security patches applied promptly

A07:2021 - Identification and Authentication Failures
  [ ] Multi-factor authentication available
  [ ] Weak password policies prevented
  [ ] Session management secure
  [ ] Account lockout implemented

A08:2021 - Software and Data Integrity Failures
  [ ] Code signing implemented
  [ ] CI/CD pipeline secured
  [ ] Deserialization attacks prevented
  [ ] Dependencies verified

A09:2021 - Security Logging and Monitoring Failures
  [ ] Security events logged
  [ ] Logs monitored and alerted
  [ ] Audit trail maintained
  [ ] Log integrity protected

A10:2021 - Server-Side Request Forgery (SSRF)
  [ ] URL validation implemented
  [ ] Whitelist approach for external requests
  [ ] Network segmentation in place
  [ ] SSRF protections active

EOF

    print_success "OWASP compliance checklist generated: $report_file"
    echo "" >> "$OVERALL_REPORT"
    echo "OWASP Top 10 Compliance: Manual review required" >> "$OVERALL_REPORT"
    echo "See: $report_file" >> "$OVERALL_REPORT"
}

# ============================================================================
# 7. SSL/TLS Configuration Check
# ============================================================================

check_ssl_config() {
    print_header "7. SSL/TLS Configuration Check"

    local domain="${PRODUCTION_DOMAIN:-example.com}"

    echo "Checking SSL/TLS configuration for: $domain"
    echo "" >> "$OVERALL_REPORT"
    echo "SSL/TLS Check:" >> "$OVERALL_REPORT"

    # Check if testssl.sh is available
    if ! command -v testssl &> /dev/null && [ ! -f "$HOME/testssl.sh/testssl.sh" ]; then
        print_warning "testssl.sh not found. Install: https://testssl.sh/"
        echo "  ⚠ SKIPPED (testssl.sh not installed)" >> "$OVERALL_REPORT"

        # Basic check with OpenSSL
        if command -v openssl &> /dev/null; then
            echo "Running basic OpenSSL check..."
            if echo | openssl s_client -connect "$domain:443" -servername "$domain" 2>/dev/null | grep "Verify return code: 0" > /dev/null; then
                print_success "SSL certificate is valid"
                echo "  ✓ Certificate valid" >> "$OVERALL_REPORT"
            else
                print_warning "SSL certificate validation failed or domain not accessible"
                echo "  ⚠ Certificate check failed" >> "$OVERALL_REPORT"
            fi
        fi

        return
    fi

    local report_file="$REPORT_DIR/ssl-test-$TIMESTAMP.txt"

    # Run testssl.sh if available
    if [ -f "$HOME/testssl.sh/testssl.sh" ]; then
        "$HOME/testssl.sh/testssl.sh" --quiet "$domain" > "$report_file" 2>&1 || true
        print_success "SSL/TLS test complete. See: $report_file"
        echo "  See detailed report: $report_file" >> "$OVERALL_REPORT"
    fi
}

# ============================================================================
# Generate Final Report
# ============================================================================

generate_final_report() {
    print_header "Security Audit Summary"

    echo "" >> "$OVERALL_REPORT"
    echo "========================================" >> "$OVERALL_REPORT"
    echo "VULNERABILITY SUMMARY" >> "$OVERALL_REPORT"
    echo "========================================" >> "$OVERALL_REPORT"
    echo "Critical: $CRITICAL_COUNT" >> "$OVERALL_REPORT"
    echo "High: $HIGH_COUNT" >> "$OVERALL_REPORT"
    echo "Medium: $MEDIUM_COUNT" >> "$OVERALL_REPORT"
    echo "Low: $LOW_COUNT" >> "$OVERALL_REPORT"
    echo "" >> "$OVERALL_REPORT"

    # Determine overall status
    if [ $CRITICAL_COUNT -gt 0 ]; then
        echo "OVERALL STATUS: ✗ CRITICAL ISSUES FOUND" >> "$OVERALL_REPORT"
        print_error "CRITICAL: Found $CRITICAL_COUNT critical vulnerabilities"
        EXIT_CODE=2
    elif [ $HIGH_COUNT -gt 0 ]; then
        echo "OVERALL STATUS: ⚠ HIGH SEVERITY ISSUES FOUND" >> "$OVERALL_REPORT"
        print_warning "WARNING: Found $HIGH_COUNT high severity vulnerabilities"
        EXIT_CODE=1
    else
        echo "OVERALL STATUS: ✓ NO CRITICAL/HIGH ISSUES" >> "$OVERALL_REPORT"
        print_success "No critical or high severity issues found"
        EXIT_CODE=0
    fi

    echo "" >> "$OVERALL_REPORT"
    echo "Full report: $OVERALL_REPORT" >> "$OVERALL_REPORT"
    echo "Individual scan reports: $REPORT_DIR/" >> "$OVERALL_REPORT"

    print_success "Full security audit report: $OVERALL_REPORT"

    # Display summary
    echo ""
    echo "Vulnerability Summary:"
    echo "  Critical: $CRITICAL_COUNT"
    echo "  High: $HIGH_COUNT"
    echo "  Medium: $MEDIUM_COUNT"
    echo "  Low: $LOW_COUNT"
    echo ""
    echo "Detailed reports available in: $REPORT_DIR/"

    return $EXIT_CODE
}

# ============================================================================
# Main Execution
# ============================================================================

main() {
    setup

    # Run all security checks
    scan_python_dependencies
    scan_npm_dependencies
    scan_docker_images
    detect_secrets
    check_security_headers
    check_owasp_compliance
    check_ssl_config

    # Generate final report
    generate_final_report
    exit_code=$?

    exit $exit_code
}

# Run main function
main "$@"
