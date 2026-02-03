#!/bin/bash

# ============================================================================
# Performance Testing Runner Script
# ============================================================================
# Automated performance testing orchestration for Doctify application
# Supports both Locust and k6 testing tools
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
PERFORMANCE_DIR="$PROJECT_ROOT/tests/performance"
REPORT_DIR="$PROJECT_ROOT/performance-reports"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

# Default test configuration
TEST_TOOL="${TEST_TOOL:-locust}"  # locust or k6
TEST_TYPE="${TEST_TYPE:-load}"    # smoke, load, stress, spike
BASE_URL="${BASE_URL:-http://localhost:8000}"
DURATION="${DURATION:-5m}"
USERS="${USERS:-100}"
SPAWN_RATE="${SPAWN_RATE:-10}"

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
        return 1
    fi
    return 0
}

# ============================================================================
# Setup
# ============================================================================

setup() {
    print_header "Performance Test Setup"

    # Create report directory
    mkdir -p "$REPORT_DIR"
    print_success "Report directory created: $REPORT_DIR"

    # Check if application is running
    echo "Checking if application is accessible at $BASE_URL..."
    if curl -f -s "$BASE_URL/health" > /dev/null 2>&1; then
        print_success "Application is accessible"
    else
        print_error "Application is not accessible at $BASE_URL"
        echo "Please start the application first: docker-compose up -d"
        exit 1
    fi
}

# ============================================================================
# Locust Testing
# ============================================================================

run_locust_test() {
    print_header "Running Locust Performance Test"

    # Check if Locust is installed
    if ! check_command locust; then
        print_error "Locust not installed. Install with: pip install locust"
        exit 1
    fi

    local locustfile="$PERFORMANCE_DIR/locustfile.py"
    local report_file="$REPORT_DIR/locust-report-$TIMESTAMP.html"
    local stats_file="$REPORT_DIR/locust-stats-$TIMESTAMP.csv"

    case $TEST_TYPE in
        smoke)
            print_warning "Running smoke test (1 user, 1 minute)"
            locust -f "$locustfile" \
                   --host "$BASE_URL" \
                   --users 1 \
                   --spawn-rate 1 \
                   --run-time 1m \
                   --headless \
                   --html "$report_file" \
                   --csv "$REPORT_DIR/locust-stats-$TIMESTAMP"
            ;;

        load)
            print_warning "Running load test ($USERS users, $DURATION)"
            locust -f "$locustfile" \
                   --host "$BASE_URL" \
                   --users "$USERS" \
                   --spawn-rate "$SPAWN_RATE" \
                   --run-time "$DURATION" \
                   --headless \
                   --html "$report_file" \
                   --csv "$REPORT_DIR/locust-stats-$TIMESTAMP"
            ;;

        stress)
            print_warning "Running stress test (progressive load increase)"
            # Use custom shape class for stress testing
            locust -f "$locustfile" \
                   --host "$BASE_URL" \
                   --headless \
                   --html "$report_file" \
                   --csv "$REPORT_DIR/locust-stats-$TIMESTAMP" \
                   StressTestUser
            ;;

        spike)
            print_warning "Running spike test (sudden load increases)"
            # Use SpikeLoadShape class
            locust -f "$locustfile" \
                   --host "$BASE_URL" \
                   --headless \
                   --html "$report_file" \
                   --csv "$REPORT_DIR/locust-stats-$TIMESTAMP"
            ;;

        *)
            print_error "Unknown test type: $TEST_TYPE"
            echo "Valid types: smoke, load, stress, spike"
            exit 1
            ;;
    esac

    print_success "Locust test complete"
    print_success "HTML report: $report_file"
    print_success "Stats CSV: ${stats_file}_stats.csv"
}

# ============================================================================
# k6 Testing
# ============================================================================

run_k6_test() {
    print_header "Running k6 Performance Test"

    # Check if k6 is installed
    if ! check_command k6; then
        print_error "k6 not installed"
        echo "Install instructions:"
        echo "  Windows: choco install k6"
        echo "  macOS: brew install k6"
        echo "  Linux: https://k6.io/docs/getting-started/installation/"
        exit 1
    fi

    local k6_script="$PERFORMANCE_DIR/k6-test.js"
    local report_file="$REPORT_DIR/k6-report-$TIMESTAMP"

    case $TEST_TYPE in
        smoke)
            print_warning "Running smoke test (1 VU, 1 minute)"
            k6 run --vus 1 \
                   --duration 1m \
                   --summary-export "$report_file.json" \
                   --out json="$report_file-raw.json" \
                   "$k6_script"
            ;;

        load)
            print_warning "Running load test ($USERS VUs, $DURATION)"
            k6 run --vus "$USERS" \
                   --duration "$DURATION" \
                   --summary-export "$report_file.json" \
                   --out json="$report_file-raw.json" \
                   "$k6_script"
            ;;

        stress)
            print_warning "Running stress test (progressive load)"
            k6 run --stage 2m:10 \
                   --stage 5m:50 \
                   --stage 2m:100 \
                   --stage 5m:150 \
                   --stage 2m:0 \
                   --summary-export "$report_file.json" \
                   --out json="$report_file-raw.json" \
                   "$k6_script"
            ;;

        spike)
            print_warning "Running spike test (sudden load increases)"
            k6 run --stage 1m:10 \
                   --stage 1m:200 \
                   --stage 1m:10 \
                   --stage 1m:300 \
                   --stage 1m:10 \
                   --summary-export "$report_file.json" \
                   --out json="$report_file-raw.json" \
                   "$k6_script"
            ;;

        comprehensive)
            print_warning "Running comprehensive test suite (all scenarios)"
            # This will run all scenarios defined in k6-test.js
            k6 run --summary-export "$report_file.json" \
                   --out json="$report_file-raw.json" \
                   "$k6_script"
            ;;

        *)
            print_error "Unknown test type: $TEST_TYPE"
            echo "Valid types: smoke, load, stress, spike, comprehensive"
            exit 1
            ;;
    esac

    print_success "k6 test complete"
    print_success "Summary: $report_file.json"
    print_success "Raw data: $report_file-raw.json"

    # Generate HTML report if summary exists
    if [ -f "$report_file.json" ]; then
        generate_k6_html_report "$report_file.json" "$report_file.html"
    fi
}

# ============================================================================
# Report Generation
# ============================================================================

generate_k6_html_report() {
    local json_file="$1"
    local html_file="$2"

    # Simple HTML report generation
    cat > "$html_file" << 'EOF'
<!DOCTYPE html>
<html>
<head>
    <title>k6 Performance Test Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 40px; background: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; background: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        h1 { color: #333; border-bottom: 3px solid #4CAF50; padding-bottom: 10px; }
        h2 { color: #555; margin-top: 30px; }
        .metric { background: #f9f9f9; padding: 15px; margin: 10px 0; border-left: 4px solid #4CAF50; }
        .metric-name { font-weight: bold; color: #333; }
        .metric-value { color: #666; margin-left: 20px; }
        .pass { color: green; font-weight: bold; }
        .fail { color: red; font-weight: bold; }
        table { border-collapse: collapse; width: 100%; margin-top: 20px; }
        th, td { border: 1px solid #ddd; padding: 12px; text-align: left; }
        th { background-color: #4CAF50; color: white; }
        tr:nth-child(even) { background-color: #f2f2f2; }
        .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #ddd; color: #999; text-align: center; }
    </style>
</head>
<body>
    <div class="container">
        <h1>k6 Performance Test Report</h1>
        <p><strong>Generated:</strong> <span id="timestamp"></span></p>
        <p><strong>Base URL:</strong> ENV_BASE_URL</p>

        <div id="content">
            <p>Loading test results...</p>
        </div>

        <div class="footer">
            <p>Doctify Performance Testing - Powered by k6</p>
        </div>
    </div>

    <script>
        // Set timestamp
        document.getElementById('timestamp').textContent = new Date().toLocaleString();

        // Load and display JSON data
        fetch('JSON_FILE_PATH')
            .then(response => response.json())
            .then(data => {
                displayResults(data);
            })
            .catch(error => {
                document.getElementById('content').innerHTML = '<p style="color: red;">Error loading test results: ' + error + '</p>';
            });

        function displayResults(data) {
            const metrics = data.metrics;
            let html = '<h2>Summary</h2>';

            // Key metrics
            if (metrics.http_reqs) {
                html += '<div class="metric">';
                html += '<span class="metric-name">Total Requests:</span>';
                html += '<span class="metric-value">' + (metrics.http_reqs.values.count || 'N/A') + '</span>';
                html += '</div>';
            }

            if (metrics.http_req_duration) {
                html += '<div class="metric">';
                html += '<span class="metric-name">Average Response Time:</span>';
                html += '<span class="metric-value">' + (metrics.http_req_duration.values.avg?.toFixed(2) || 'N/A') + 'ms</span>';
                html += '</div>';

                html += '<div class="metric">';
                html += '<span class="metric-name">P95 Response Time:</span>';
                html += '<span class="metric-value">' + (metrics.http_req_duration.values['p(95)']?.toFixed(2) || 'N/A') + 'ms</span>';
                html += '</div>';

                html += '<div class="metric">';
                html += '<span class="metric-name">P99 Response Time:</span>';
                html += '<span class="metric-value">' + (metrics.http_req_duration.values['p(99)']?.toFixed(2) || 'N/A') + 'ms</span>';
                html += '</div>';
            }

            // Detailed metrics table
            html += '<h2>Detailed Metrics</h2>';
            html += '<table><tr><th>Metric</th><th>Count</th><th>Average</th><th>Min</th><th>Max</th><th>P95</th></tr>';

            for (const [name, metric] of Object.entries(metrics)) {
                if (metric.type === 'trend' && metric.values) {
                    html += '<tr>';
                    html += '<td>' + name + '</td>';
                    html += '<td>' + (metric.values.count || 'N/A') + '</td>';
                    html += '<td>' + (metric.values.avg?.toFixed(2) || 'N/A') + '</td>';
                    html += '<td>' + (metric.values.min?.toFixed(2) || 'N/A') + '</td>';
                    html += '<td>' + (metric.values.max?.toFixed(2) || 'N/A') + '</td>';
                    html += '<td>' + (metric.values['p(95)']?.toFixed(2) || 'N/A') + '</td>';
                    html += '</tr>';
                }
            }

            html += '</table>';

            document.getElementById('content').innerHTML = html;
        }
    </script>
</body>
</html>
EOF

    # Replace placeholders
    sed -i "s|JSON_FILE_PATH|$(basename "$json_file")|g" "$html_file"
    sed -i "s|ENV_BASE_URL|$BASE_URL|g" "$html_file"

    print_success "HTML report generated: $html_file"
}

# ============================================================================
# Benchmark Results
# ============================================================================

analyze_results() {
    print_header "Performance Test Results Analysis"

    echo "Test Configuration:"
    echo "  Tool: $TEST_TOOL"
    echo "  Type: $TEST_TYPE"
    echo "  Base URL: $BASE_URL"
    echo "  Users/VUs: $USERS"
    echo "  Duration: $DURATION"
    echo ""

    echo "Performance Targets:"
    echo "  ✓ P95 Response Time: < 500ms"
    echo "  ✓ P99 Response Time: < 2000ms"
    echo "  ✓ Error Rate: < 1%"
    echo "  ✓ Throughput: > 100 req/s"
    echo ""

    print_success "Results saved to: $REPORT_DIR/"
    echo ""
    echo "Next Steps:"
    echo "  1. Review HTML reports for detailed metrics"
    echo "  2. Compare results against performance targets"
    echo "  3. Identify bottlenecks if targets not met"
    echo "  4. Run profiling if performance issues found"
    echo "  5. Optimize and re-test"
}

# ============================================================================
# Main Execution
# ============================================================================

show_usage() {
    cat << EOF
Usage: $0 [OPTIONS]

Performance testing runner for Doctify application.

OPTIONS:
    -t, --tool TOOL        Testing tool: locust or k6 (default: locust)
    -y, --type TYPE        Test type: smoke, load, stress, spike (default: load)
    -u, --users USERS      Number of users/VUs (default: 100)
    -d, --duration TIME    Test duration, e.g., 5m, 30s (default: 5m)
    -r, --rate RATE        Spawn rate for Locust (default: 10)
    -b, --base-url URL     Base URL of application (default: http://localhost:8000)
    -h, --help             Show this help message

EXAMPLES:
    # Smoke test with Locust
    $0 --tool locust --type smoke

    # Load test with k6 (100 users, 10 minutes)
    $0 --tool k6 --type load --users 100 --duration 10m

    # Stress test with Locust
    $0 --tool locust --type stress

    # Spike test with k6
    $0 --tool k6 --type spike

    # Custom configuration
    $0 --tool locust --type load --users 200 --duration 15m --rate 20

EOF
}

main() {
    # Parse command-line arguments
    while [[ $# -gt 0 ]]; do
        case $1 in
            -t|--tool)
                TEST_TOOL="$2"
                shift 2
                ;;
            -y|--type)
                TEST_TYPE="$2"
                shift 2
                ;;
            -u|--users)
                USERS="$2"
                shift 2
                ;;
            -d|--duration)
                DURATION="$2"
                shift 2
                ;;
            -r|--rate)
                SPAWN_RATE="$2"
                shift 2
                ;;
            -b|--base-url)
                BASE_URL="$2"
                shift 2
                ;;
            -h|--help)
                show_usage
                exit 0
                ;;
            *)
                print_error "Unknown option: $1"
                show_usage
                exit 1
                ;;
        esac
    done

    # Setup
    setup

    # Run tests based on tool selection
    case $TEST_TOOL in
        locust)
            run_locust_test
            ;;
        k6)
            run_k6_test
            ;;
        *)
            print_error "Unknown tool: $TEST_TOOL"
            echo "Valid tools: locust, k6"
            exit 1
            ;;
    esac

    # Analyze results
    analyze_results

    print_success "Performance testing complete!"
}

# Run main function
main "$@"
