#!/bin/bash
# ===========================================
# Docker Security Scanning Script
# ===========================================
# Scans Docker images for security vulnerabilities using Trivy
# Usage: ./scripts/docker-security-scan.sh

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
TRIVY_VERSION="0.50.0"
SEVERITY_THRESHOLD="HIGH,CRITICAL"
IMAGES=(
    "doctify-backend-prod"
    "doctify-frontend-prod"
)

echo -e "${BLUE}===========================================\n"
echo -e "Doctify Docker Security Scan\n"
echo -e "===========================================${NC}\n"

# Check if Trivy is installed
if ! command -v trivy &> /dev/null; then
    echo -e "${YELLOW}Trivy is not installed. Installing...${NC}\n"

    # Detect OS and install Trivy
    if [[ "$OSTYPE" == "linux-gnu"* ]]; then
        wget -qO - https://aquasecurity.github.io/trivy-repo/deb/public.key | sudo apt-key add -
        echo "deb https://aquasecurity.github.io/trivy-repo/deb $(lsb_release -sc) main" | sudo tee -a /etc/apt/sources.list.d/trivy.list
        sudo apt-get update
        sudo apt-get install trivy
    elif [[ "$OSTYPE" == "darwin"* ]]; then
        brew install aquasecurity/trivy/trivy
    else
        echo -e "${RED}Unsupported OS. Please install Trivy manually: https://aquasecurity.github.io/trivy/${NC}\n"
        exit 1
    fi

    echo -e "${GREEN}Trivy installed successfully!${NC}\n"
fi

# Update Trivy database
echo -e "${BLUE}Updating Trivy vulnerability database...${NC}\n"
trivy image --download-db-only

# Create reports directory
REPORT_DIR="./reports/security"
mkdir -p "$REPORT_DIR"

# Scan each image
for IMAGE in "${IMAGES[@]}"; do
    echo -e "\n${BLUE}===========================================\n"
    echo -e "Scanning: $IMAGE\n"
    echo -e "===========================================${NC}\n"

    # Check if image exists
    if ! docker image inspect "$IMAGE" &> /dev/null; then
        echo -e "${YELLOW}Image $IMAGE not found. Skipping...${NC}\n"
        continue
    fi

    # Run Trivy scan
    TIMESTAMP=$(date +%Y%m%d_%H%M%S)
    REPORT_FILE="$REPORT_DIR/${IMAGE}_${TIMESTAMP}.txt"
    JSON_REPORT="$REPORT_DIR/${IMAGE}_${TIMESTAMP}.json"

    echo -e "${BLUE}Generating reports:${NC}"
    echo -e "  - Text: $REPORT_FILE"
    echo -e "  - JSON: $JSON_REPORT\n"

    # Scan with severity threshold
    trivy image \
        --severity "$SEVERITY_THRESHOLD" \
        --format table \
        --output "$REPORT_FILE" \
        "$IMAGE"

    # Also generate JSON report for CI/CD integration
    trivy image \
        --severity "$SEVERITY_THRESHOLD" \
        --format json \
        --output "$JSON_REPORT" \
        "$IMAGE"

    # Display summary
    CRITICAL=$(grep -c "CRITICAL" "$REPORT_FILE" || true)
    HIGH=$(grep -c "HIGH" "$REPORT_FILE" || true)

    echo -e "\n${BLUE}Summary for $IMAGE:${NC}"
    echo -e "  - Critical: ${RED}$CRITICAL${NC}"
    echo -e "  - High: ${YELLOW}$HIGH${NC}"

    if [ "$CRITICAL" -gt 0 ] || [ "$HIGH" -gt 0 ]; then
        echo -e "\n${RED}⚠️  Security vulnerabilities detected!${NC}"
        echo -e "Review the report: $REPORT_FILE\n"
    else
        echo -e "\n${GREEN}✅ No high or critical vulnerabilities found!${NC}\n"
    fi
done

# Generate combined summary report
echo -e "\n${BLUE}===========================================\n"
echo -e "Security Scan Complete\n"
echo -e "===========================================${NC}\n"

SUMMARY_FILE="$REPORT_DIR/security_summary_$(date +%Y%m%d_%H%M%S).txt"
echo "Doctify Docker Security Scan Summary" > "$SUMMARY_FILE"
echo "Generated: $(date)" >> "$SUMMARY_FILE"
echo "========================================" >> "$SUMMARY_FILE"
echo "" >> "$SUMMARY_FILE"

for IMAGE in "${IMAGES[@]}"; do
    if docker image inspect "$IMAGE" &> /dev/null; then
        LATEST_REPORT=$(ls -t "$REPORT_DIR/${IMAGE}"_*.txt 2>/dev/null | head -1)
        if [ -f "$LATEST_REPORT" ]; then
            CRITICAL=$(grep -c "CRITICAL" "$LATEST_REPORT" || true)
            HIGH=$(grep -c "HIGH" "$LATEST_REPORT" || true)

            echo "Image: $IMAGE" >> "$SUMMARY_FILE"
            echo "  Critical: $CRITICAL" >> "$SUMMARY_FILE"
            echo "  High: $HIGH" >> "$SUMMARY_FILE"
            echo "" >> "$SUMMARY_FILE"
        fi
    fi
done

echo -e "${GREEN}Summary report saved to: $SUMMARY_FILE${NC}\n"

# Check if we should fail based on vulnerabilities
TOTAL_CRITICAL=0
TOTAL_HIGH=0

for IMAGE in "${IMAGES[@]}"; do
    if docker image inspect "$IMAGE" &> /dev/null; then
        LATEST_REPORT=$(ls -t "$REPORT_DIR/${IMAGE}"_*.txt 2>/dev/null | head -1)
        if [ -f "$LATEST_REPORT" ]; then
            CRITICAL=$(grep -c "CRITICAL" "$LATEST_REPORT" || true)
            HIGH=$(grep -c "HIGH" "$LATEST_REPORT" || true)
            TOTAL_CRITICAL=$((TOTAL_CRITICAL + CRITICAL))
            TOTAL_HIGH=$((TOTAL_HIGH + HIGH))
        fi
    fi
done

if [ "$TOTAL_CRITICAL" -gt 0 ]; then
    echo -e "${RED}❌ FAIL: $TOTAL_CRITICAL critical vulnerabilities detected${NC}"
    echo -e "${YELLOW}Action Required: Review and fix critical vulnerabilities before deployment${NC}\n"
    exit 1
elif [ "$TOTAL_HIGH" -gt 5 ]; then
    echo -e "${YELLOW}⚠️  WARNING: $TOTAL_HIGH high vulnerabilities detected${NC}"
    echo -e "${YELLOW}Recommendation: Review and fix high vulnerabilities${NC}\n"
    exit 0
else
    echo -e "${GREEN}✅ PASS: Security scan completed successfully${NC}"
    echo -e "${GREEN}Total Critical: $TOTAL_CRITICAL, Total High: $TOTAL_HIGH${NC}\n"
    exit 0
fi
