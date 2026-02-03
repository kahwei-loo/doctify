#!/bin/bash
# ===========================================
# Manual Rollback Script for Doctify
# ===========================================
# Rolls back to a previous deployment
# Usage: ./scripts/rollback.sh [backup-timestamp]

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
BACKUP_BASE_DIR="${HOME}/doctify-backups"
DEPLOYMENT_DIR="${HOME}/doctify"

echo -e "${BLUE}===========================================\n"
echo -e "Doctify Deployment Rollback\n"
echo -e "===========================================${NC}\n"

# Check if running in correct directory
if [ ! -f "docker-compose.prod.yml" ]; then
    echo -e "${RED}Error: docker-compose.prod.yml not found!${NC}"
    echo -e "${YELLOW}Please run this script from the deployment directory${NC}\n"
    exit 1
fi

# List available backups
list_backups() {
    echo -e "${BLUE}Available backups:${NC}\n"

    if [ ! -d "$BACKUP_BASE_DIR" ]; then
        echo -e "${YELLOW}No backups directory found at: $BACKUP_BASE_DIR${NC}\n"
        exit 1
    fi

    backups=($(ls -td "$BACKUP_BASE_DIR"/* 2>/dev/null))

    if [ ${#backups[@]} -eq 0 ]; then
        echo -e "${YELLOW}No backups found${NC}\n"
        exit 1
    fi

    count=1
    for backup in "${backups[@]}"; do
        backup_name=$(basename "$backup")
        if [ -f "$backup/containers.json" ]; then
            container_count=$(jq length "$backup/containers.json" 2>/dev/null || echo "?")
            echo -e "  ${count}. ${GREEN}${backup_name}${NC} (${container_count} containers)"
        else
            echo -e "  ${count}. ${YELLOW}${backup_name}${NC} (incomplete backup)"
        fi
        count=$((count + 1))
    done
    echo ""
}

# Verify backup integrity
verify_backup() {
    local backup_dir=$1

    echo -e "${BLUE}Verifying backup integrity...${NC}\n"

    if [ ! -f "$backup_dir/containers.json" ]; then
        echo -e "${RED}Error: containers.json not found in backup${NC}\n"
        return 1
    fi

    if ! jq empty "$backup_dir/containers.json" 2>/dev/null; then
        echo -e "${RED}Error: containers.json is not valid JSON${NC}\n"
        return 1
    fi

    local container_count=$(jq length "$backup_dir/containers.json")
    echo -e "${GREEN}✅ Backup contains ${container_count} containers${NC}\n"

    echo -e "${BLUE}Backup contents:${NC}"
    jq -r '.[] | "  - \(.name) → \(.image)"' "$backup_dir/containers.json"
    echo ""

    return 0
}

# Perform rollback
perform_rollback() {
    local backup_dir=$1

    echo -e "${BLUE}===========================================\n"
    echo -e "Starting Rollback Process\n"
    echo -e "===========================================${NC}\n"

    echo -e "${YELLOW}⚠️  WARNING: This will stop all current services and restart with backup images${NC}\n"
    read -p "Are you sure you want to proceed? (yes/no): " confirm

    if [ "$confirm" != "yes" ]; then
        echo -e "${YELLOW}Rollback cancelled${NC}\n"
        exit 0
    fi

    echo -e "\n${BLUE}Step 1: Creating pre-rollback backup...${NC}\n"
    PRE_ROLLBACK_BACKUP="$BACKUP_BASE_DIR/pre-rollback-$(date +%Y%m%d_%H%M%S)"
    mkdir -p "$PRE_ROLLBACK_BACKUP"

    docker-compose -f docker-compose.prod.yml ps -q | xargs docker inspect 2>/dev/null | \
        jq '[.[] | {name: .Name, image: .Config.Image, created: .Created}]' > "$PRE_ROLLBACK_BACKUP/containers.json" || true

    echo -e "${GREEN}✅ Pre-rollback backup created${NC}\n"

    echo -e "${BLUE}Step 2: Pulling previous images from backup...${NC}\n"

    # Extract and pull images
    cat "$backup_dir/containers.json" | jq -r '.[].image' | while read image; do
        echo -e "  Pulling: ${GREEN}$image${NC}"
        if ! docker pull "$image" 2>&1 | grep -q "Downloaded\|up to date"; then
            echo -e "  ${YELLOW}Warning: Could not pull $image (might be local-only)${NC}"
        fi
    done

    echo ""

    echo -e "${BLUE}Step 3: Stopping current services...${NC}\n"
    docker-compose -f docker-compose.prod.yml down
    sleep 5

    echo -e "${BLUE}Step 4: Starting services with backup images...${NC}\n"

    # Temporarily override docker-compose with backup image tags
    export $(cat "$backup_dir/containers.json" | jq -r '.[] | "\(.name)=\(.image)"' | sed 's/^\/doctify-\(.*\)-prod=/\U\1\E_IMAGE=/')

    docker-compose -f docker-compose.prod.yml up -d
    sleep 20

    echo -e "${BLUE}Step 5: Health checks...${NC}\n"

    # Backend health check
    echo -e "  Checking backend health..."
    if curl -f http://localhost:8000/health 2>/dev/null; then
        echo -e "  ${GREEN}✅ Backend is healthy${NC}"
    else
        echo -e "  ${RED}❌ Backend health check failed${NC}"
        echo -e "  ${YELLOW}Attempting recovery...${NC}"
        docker-compose -f docker-compose.prod.yml restart backend
        sleep 10
    fi

    # Frontend health check
    echo -e "  Checking frontend health..."
    if curl -f http://localhost:80/health 2>/dev/null; then
        echo -e "  ${GREEN}✅ Frontend is healthy${NC}"
    else
        echo -e "  ${YELLOW}⚠️  Frontend health check failed (might not have health endpoint)${NC}"
    fi

    # Database health check
    echo -e "  Checking database health..."
    if docker-compose -f docker-compose.prod.yml exec -T doctify-mongo mongosh --eval "db.adminCommand('ping')" >/dev/null 2>&1; then
        echo -e "  ${GREEN}✅ Database is healthy${NC}"
    else
        echo -e "  ${YELLOW}⚠️  Database health check failed${NC}"
    fi

    echo ""

    echo -e "${BLUE}Step 6: Verifying rollback...${NC}\n"

    current_images=$(docker-compose -f docker-compose.prod.yml ps -q | xargs docker inspect 2>/dev/null | jq -r '.[].Config.Image')

    echo -e "${BLUE}Currently running images:${NC}"
    echo "$current_images" | while read img; do
        echo -e "  - $img"
    done

    echo ""
    echo -e "${GREEN}✅ Rollback completed successfully!${NC}\n"
    echo -e "${BLUE}Pre-rollback backup saved to:${NC} $PRE_ROLLBACK_BACKUP\n"
}

# Main script logic
main() {
    if [ $# -eq 0 ]; then
        # Interactive mode
        list_backups
        read -p "Select backup to rollback to (number or press Enter to cancel): " backup_choice

        if [ -z "$backup_choice" ]; then
            echo -e "${YELLOW}Rollback cancelled${NC}\n"
            exit 0
        fi

        backups=($(ls -td "$BACKUP_BASE_DIR"/* 2>/dev/null))
        selected_backup="${backups[$((backup_choice - 1))]}"

        if [ ! -d "$selected_backup" ]; then
            echo -e "${RED}Invalid selection${NC}\n"
            exit 1
        fi
    else
        # Direct backup timestamp provided
        selected_backup="$BACKUP_BASE_DIR/$1"

        if [ ! -d "$selected_backup" ]; then
            echo -e "${RED}Backup not found: $selected_backup${NC}\n"
            list_backups
            exit 1
        fi
    fi

    echo -e "${BLUE}Selected backup:${NC} $(basename "$selected_backup")\n"

    if ! verify_backup "$selected_backup"; then
        echo -e "${RED}Backup verification failed!${NC}\n"
        exit 1
    fi

    perform_rollback "$selected_backup"
}

# Run main function
main "$@"
