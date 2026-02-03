#!/bin/bash
# ===========================================
# Docker Build and Size Measurement Script
# ===========================================
# Builds Docker images and measures their sizes
# Usage: ./scripts/docker-build-and-measure.sh

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
BACKEND_TARGET_SIZE=500  # MB
FRONTEND_TARGET_SIZE=100 # MB

echo -e "${BLUE}===========================================\n"
echo -e "Doctify Docker Build and Size Measurement\n"
echo -e "===========================================${NC}\n"

# Create reports directory
REPORT_DIR="./reports/docker"
mkdir -p "$REPORT_DIR"

# Function to convert bytes to MB
bytes_to_mb() {
    echo "scale=2; $1 / 1024 / 1024" | bc
}

# Function to build and measure image
build_and_measure() {
    local SERVICE=$1
    local DOCKERFILE=$2
    local CONTEXT=$3
    local IMAGE_NAME=$4
    local TARGET_SIZE=$5

    echo -e "${BLUE}===========================================\n"
    echo -e "Building: $SERVICE\n"
    echo -e "===========================================${NC}\n"

    # Build start time
    BUILD_START=$(date +%s)

    # Build the image
    echo -e "${BLUE}Building image from $DOCKERFILE...${NC}\n"
    docker build \
        -t "$IMAGE_NAME" \
        -f "$DOCKERFILE" \
        "$CONTEXT" \
        --no-cache \
        --progress=plain 2>&1 | tee "$REPORT_DIR/${SERVICE}_build.log"

    # Build end time
    BUILD_END=$(date +%s)
    BUILD_TIME=$((BUILD_END - BUILD_START))

    # Get image size
    IMAGE_SIZE_BYTES=$(docker image inspect "$IMAGE_NAME" --format='{{.Size}}')
    IMAGE_SIZE_MB=$(bytes_to_mb "$IMAGE_SIZE_BYTES")

    # Get image layers count
    LAYER_COUNT=$(docker history "$IMAGE_NAME" --no-trunc --format='{{.ID}}' | wc -l)

    # Display results
    echo -e "\n${BLUE}===========================================\n"
    echo -e "Results for $SERVICE\n"
    echo -e "===========================================${NC}\n"

    echo -e "Image: ${GREEN}$IMAGE_NAME${NC}"
    echo -e "Size: ${GREEN}${IMAGE_SIZE_MB} MB${NC}"
    echo -e "Target: ${YELLOW}${TARGET_SIZE} MB${NC}"
    echo -e "Layers: ${GREEN}$LAYER_COUNT${NC}"
    echo -e "Build Time: ${GREEN}${BUILD_TIME}s${NC}\n"

    # Check if size is within target
    SIZE_PASS=0
    if (( $(echo "$IMAGE_SIZE_MB < $TARGET_SIZE" | bc -l) )); then
        echo -e "${GREEN}✅ PASS: Image size is within target${NC}\n"
        SIZE_PASS=1
    else
        DIFF=$(echo "$IMAGE_SIZE_MB - $TARGET_SIZE" | bc)
        echo -e "${RED}❌ FAIL: Image size exceeds target by ${DIFF} MB${NC}\n"
    fi

    # Show layer breakdown
    echo -e "${BLUE}Layer Breakdown (Top 10 largest):${NC}"
    docker history "$IMAGE_NAME" --no-trunc --format='table {{.Size}}\t{{.CreatedBy}}' | head -11

    echo ""

    # Save to report file
    REPORT_FILE="$REPORT_DIR/${SERVICE}_size_report.txt"
    {
        echo "Doctify Docker Image Size Report"
        echo "Service: $SERVICE"
        echo "Generated: $(date)"
        echo "========================================"
        echo ""
        echo "Image: $IMAGE_NAME"
        echo "Size: ${IMAGE_SIZE_MB} MB"
        echo "Target: ${TARGET_SIZE} MB"
        echo "Status: $([ $SIZE_PASS -eq 1 ] && echo 'PASS' || echo 'FAIL')"
        echo "Layers: $LAYER_COUNT"
        echo "Build Time: ${BUILD_TIME}s"
        echo ""
        echo "Layer Breakdown:"
        docker history "$IMAGE_NAME" --no-trunc --format='{{.Size}}\t{{.CreatedBy}}'
    } > "$REPORT_FILE"

    echo -e "${GREEN}Report saved to: $REPORT_FILE${NC}\n"

    # Return pass/fail status
    return $SIZE_PASS
}

# Build Backend
echo -e "${BLUE}=========================================="
echo -e "BACKEND BUILD"
echo -e "==========================================${NC}\n"

BACKEND_PASS=0
if build_and_measure \
    "backend" \
    "./backend/Dockerfile" \
    "./backend" \
    "doctify-backend-prod" \
    "$BACKEND_TARGET_SIZE"; then
    BACKEND_PASS=1
fi

echo -e "\n${BLUE}=========================================="
echo -e "FRONTEND BUILD"
echo -e "==========================================${NC}\n"

# Build Frontend
FRONTEND_PASS=0
if build_and_measure \
    "frontend" \
    "./frontend/Dockerfile" \
    "./frontend" \
    "doctify-frontend-prod" \
    "$FRONTEND_TARGET_SIZE"; then
    FRONTEND_PASS=1
fi

# Generate combined summary report
echo -e "\n${BLUE}===========================================\n"
echo -e "Build Summary\n"
echo -e "===========================================${NC}\n"

SUMMARY_FILE="$REPORT_DIR/build_summary_$(date +%Y%m%d_%H%M%S).txt"
{
    echo "Doctify Docker Build Summary"
    echo "Generated: $(date)"
    echo "========================================="
    echo ""

    # Backend summary
    BACKEND_SIZE=$(docker image inspect doctify-backend-prod --format='{{.Size}}' 2>/dev/null || echo "0")
    BACKEND_SIZE_MB=$(bytes_to_mb "$BACKEND_SIZE")
    echo "Backend:"
    echo "  Image: doctify-backend-prod"
    echo "  Size: ${BACKEND_SIZE_MB} MB / ${BACKEND_TARGET_SIZE} MB"
    echo "  Status: $([ $BACKEND_PASS -eq 1 ] && echo 'PASS ✅' || echo 'FAIL ❌')"
    echo ""

    # Frontend summary
    FRONTEND_SIZE=$(docker image inspect doctify-frontend-prod --format='{{.Size}}' 2>/dev/null || echo "0")
    FRONTEND_SIZE_MB=$(bytes_to_mb "$FRONTEND_SIZE")
    echo "Frontend:"
    echo "  Image: doctify-frontend-prod"
    echo "  Size: ${FRONTEND_SIZE_MB} MB / ${FRONTEND_TARGET_SIZE} MB"
    echo "  Status: $([ $FRONTEND_PASS -eq 1 ] && echo 'PASS ✅' || echo 'FAIL ❌')"
    echo ""

    # Total size
    TOTAL_SIZE=$(echo "$BACKEND_SIZE + $FRONTEND_SIZE" | bc)
    TOTAL_SIZE_MB=$(bytes_to_mb "$TOTAL_SIZE")
    echo "Total Combined Size: ${TOTAL_SIZE_MB} MB"
    echo ""

    # Optimization recommendations
    echo "Optimization Recommendations:"
    if [ $BACKEND_PASS -eq 0 ]; then
        echo "  - Backend: Consider removing unnecessary dependencies"
        echo "  - Backend: Review installed system packages"
        echo "  - Backend: Use more aggressive multi-stage build"
    else
        echo "  - Backend: Size is within target ✅"
    fi

    if [ $FRONTEND_PASS -eq 0 ]; then
        echo "  - Frontend: Review bundle size and dependencies"
        echo "  - Frontend: Consider removing unused assets"
        echo "  - Frontend: Enable tree-shaking and minification"
    else
        echo "  - Frontend: Size is within target ✅"
    fi

    echo ""
    echo "All build logs and reports saved in: $REPORT_DIR"
} > "$SUMMARY_FILE"

# Display summary
cat "$SUMMARY_FILE"

echo -e "\n${GREEN}Summary report saved to: $SUMMARY_FILE${NC}\n"

# Exit with appropriate code
if [ $BACKEND_PASS -eq 1 ] && [ $FRONTEND_PASS -eq 1 ]; then
    echo -e "${GREEN}✅ SUCCESS: All images built and within target sizes${NC}\n"
    exit 0
elif [ $BACKEND_PASS -eq 1 ] || [ $FRONTEND_PASS -eq 1 ]; then
    echo -e "${YELLOW}⚠️  PARTIAL: Some images exceed target sizes${NC}\n"
    exit 1
else
    echo -e "${RED}❌ FAIL: All images exceed target sizes${NC}\n"
    exit 1
fi
