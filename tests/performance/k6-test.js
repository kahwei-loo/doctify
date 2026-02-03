/**
 * Doctify Performance Testing with k6
 *
 * k6 is a modern load testing tool with better performance than Locust
 * for high-concurrency scenarios.
 *
 * Installation:
 *   Windows: choco install k6
 *   macOS: brew install k6
 *   Linux: https://k6.io/docs/getting-started/installation/
 *
 * Usage:
 *   # Basic load test
 *   k6 run tests/performance/k6-test.js
 *
 *   # With custom VUs and duration
 *   k6 run --vus 100 --duration 5m tests/performance/k6-test.js
 *
 *   # Smoke test
 *   k6 run --vus 1 --duration 1m tests/performance/k6-test.js
 *
 *   # Load test
 *   k6 run --vus 100 --duration 10m tests/performance/k6-test.js
 *
 *   # Stress test
 *   k6 run --stage 2m:10 --stage 5m:100 --stage 2m:200 --stage 5m:0 tests/performance/k6-test.js
 *
 *   # Spike test
 *   k6 run --stage 1m:10 --stage 1m:100 --stage 1m:10 tests/performance/k6-test.js
 *
 *   # With InfluxDB output for Grafana visualization
 *   k6 run --out influxdb=http://localhost:8086/k6 tests/performance/k6-test.js
 */

import http from 'k6/http';
import { check, group, sleep } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';
import { randomItem, randomIntBetween, randomString } from 'https://jslib.k6.io/k6-utils/1.2.0/index.js';

// ============================================================================
// Configuration
// ============================================================================

const BASE_URL = __ENV.BASE_URL || 'http://localhost:8000';

// Custom metrics
const documentUploadDuration = new Trend('document_upload_duration');
const documentProcessingDuration = new Trend('document_processing_duration');
const searchDuration = new Trend('search_duration');
const errorRate = new Rate('errors');
const successRate = new Rate('success');
const apiErrors = new Counter('api_errors');

// ============================================================================
// Test Configuration
// ============================================================================

export const options = {
    // Test scenarios
    scenarios: {
        // Smoke test - verify basic functionality
        smoke_test: {
            executor: 'constant-vus',
            vus: 1,
            duration: '1m',
            tags: { test_type: 'smoke' },
            exec: 'smokeTest',
        },

        // Load test - normal load conditions
        load_test: {
            executor: 'ramping-vus',
            startVUs: 0,
            stages: [
                { duration: '2m', target: 50 },  // Ramp up to 50 users
                { duration: '5m', target: 50 },  // Stay at 50 users
                { duration: '2m', target: 100 }, // Ramp up to 100 users
                { duration: '5m', target: 100 }, // Stay at 100 users
                { duration: '2m', target: 0 },   // Ramp down
            ],
            tags: { test_type: 'load' },
            exec: 'loadTest',
            startTime: '1m', // Start after smoke test
        },

        // Stress test - push beyond normal load
        stress_test: {
            executor: 'ramping-arrival-rate',
            startRate: 10,
            timeUnit: '1s',
            preAllocatedVUs: 50,
            maxVUs: 200,
            stages: [
                { duration: '2m', target: 50 },   // Ramp to 50 req/s
                { duration: '5m', target: 100 },  // Ramp to 100 req/s
                { duration: '2m', target: 150 },  // Ramp to 150 req/s
                { duration: '5m', target: 150 },  // Stay at 150 req/s
                { duration: '2m', target: 0 },    // Ramp down
            ],
            tags: { test_type: 'stress' },
            exec: 'stressTest',
            startTime: '17m', // Start after load test
        },

        // Spike test - sudden traffic increase
        spike_test: {
            executor: 'ramping-vus',
            startVUs: 0,
            stages: [
                { duration: '30s', target: 10 },   // Baseline
                { duration: '1m', target: 200 },   // Spike!
                { duration: '30s', target: 10 },   // Back to baseline
                { duration: '1m', target: 300 },   // Bigger spike!
                { duration: '30s', target: 10 },   // Back to baseline
            ],
            tags: { test_type: 'spike' },
            exec: 'spikeTest',
            startTime: '34m', // Start after stress test
        },
    },

    // Thresholds - performance targets
    thresholds: {
        // HTTP errors should be less than 1%
        'http_req_failed': ['rate<0.01'],

        // 95% of requests should be below 500ms
        'http_req_duration': ['p(95)<500'],

        // 99% of requests should be below 2000ms
        'http_req_duration{test_type:load}': ['p(99)<2000'],

        // Error rate should be less than 1%
        'errors': ['rate<0.01'],

        // Success rate should be above 99%
        'success': ['rate>0.99'],

        // Document upload should complete within 5 seconds
        'document_upload_duration': ['p(95)<5000'],

        // Search should be fast
        'search_duration': ['p(95)<300'],
    },

    // Test summary export
    summaryTrendStats: ['avg', 'min', 'med', 'max', 'p(90)', 'p(95)', 'p(99)'],
};

// ============================================================================
// Test Data
// ============================================================================

const TEST_USERS = [
    { email: 'test_user_1@example.com', password: 'TestPassword123!' },
    { email: 'test_user_2@example.com', password: 'TestPassword123!' },
    { email: 'test_user_3@example.com', password: 'TestPassword123!' },
    { email: 'test_user_4@example.com', password: 'TestPassword123!' },
    { email: 'test_user_5@example.com', password: 'TestPassword123!' },
];

const DOCUMENT_CATEGORIES = ['invoice', 'contract', 'receipt', 'proposal', 'notes'];
const SEARCH_QUERIES = ['invoice', 'contract', '2024', 'Q1', 'receipt', 'business'];

// ============================================================================
// Helper Functions
// ============================================================================

function authenticate() {
    const user = randomItem(TEST_USERS);
    const loginRes = http.post(`${BASE_URL}/api/v1/auth/login`, JSON.stringify({
        email: user.email,
        password: user.password,
    }), {
        headers: { 'Content-Type': 'application/json' },
    });

    const loginSuccess = check(loginRes, {
        'login successful': (r) => r.status === 200,
        'access token received': (r) => r.json('access_token') !== undefined,
    });

    if (!loginSuccess) {
        errorRate.add(1);
        apiErrors.add(1);
        return null;
    }

    successRate.add(1);
    return loginRes.json('access_token');
}

function getAuthHeaders(token) {
    return {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
    };
}

// ============================================================================
// Test Scenarios
// ============================================================================

export function smokeTest() {
    group('Smoke Test - Basic Health Checks', () => {
        // Health check
        group('Health Check', () => {
            const res = http.get(`${BASE_URL}/health`);
            check(res, {
                'status is 200': (r) => r.status === 200,
                'status is healthy': (r) => r.json('status') === 'healthy',
            });
        });

        // Root endpoint
        group('Root Endpoint', () => {
            const res = http.get(`${BASE_URL}/`);
            check(res, {
                'status is 200': (r) => r.status === 200,
            });
        });

        // Authentication flow
        group('Authentication', () => {
            const token = authenticate();
            check(token, {
                'authentication successful': (t) => t !== null,
            });
        });
    });

    sleep(1);
}

export function loadTest() {
    const token = authenticate();
    if (!token) return;

    const headers = getAuthHeaders(token);

    group('Load Test - Typical User Behavior', () => {
        // List documents
        group('List Documents', () => {
            const res = http.get(`${BASE_URL}/api/v1/documents?limit=20`, { headers });
            const success = check(res, {
                'status is 200': (r) => r.status === 200,
                'response time < 500ms': (r) => r.timings.duration < 500,
            });
            success ? successRate.add(1) : errorRate.add(1);
        });

        sleep(randomIntBetween(1, 3));

        // Search documents
        group('Search Documents', () => {
            const query = randomItem(SEARCH_QUERIES);
            const startTime = Date.now();
            const res = http.get(`${BASE_URL}/api/v1/documents/search?q=${query}`, { headers });
            const duration = Date.now() - startTime;
            searchDuration.add(duration);

            const success = check(res, {
                'status is 200': (r) => r.status === 200,
                'response time < 300ms': (r) => r.timings.duration < 300,
            });
            success ? successRate.add(1) : errorRate.add(1);
        });

        sleep(randomIntBetween(1, 3));

        // Get specific document (if available)
        group('Get Document', () => {
            // Simulate getting a random document
            const res = http.get(`${BASE_URL}/api/v1/documents?limit=1`, { headers });
            if (res.status === 200 && res.json('documents') && res.json('documents').length > 0) {
                const docId = res.json('documents')[0].id;
                const docRes = http.get(`${BASE_URL}/api/v1/documents/${docId}`, { headers });
                const success = check(docRes, {
                    'status is 200': (r) => r.status === 200,
                });
                success ? successRate.add(1) : errorRate.add(1);
            }
        });

        sleep(randomIntBetween(1, 3));

        // List projects
        group('List Projects', () => {
            const res = http.get(`${BASE_URL}/api/v1/projects`, { headers });
            const success = check(res, {
                'status is 200': (r) => r.status === 200,
            });
            success ? successRate.add(1) : errorRate.add(1);
        });
    });

    sleep(randomIntBetween(1, 5));
}

export function stressTest() {
    const token = authenticate();
    if (!token) return;

    const headers = getAuthHeaders(token);

    group('Stress Test - High Load Operations', () => {
        // Rapid list requests
        for (let i = 0; i < 3; i++) {
            const res = http.get(`${BASE_URL}/api/v1/documents?limit=50`, { headers });
            check(res, {
                'status is 200': (r) => r.status === 200,
            }) ? successRate.add(1) : errorRate.add(1);
            sleep(0.5);
        }

        // Rapid search requests
        for (let i = 0; i < 2; i++) {
            const query = randomItem(SEARCH_QUERIES);
            const res = http.get(`${BASE_URL}/api/v1/documents/search?q=${query}`, { headers });
            check(res, {
                'status is 200': (r) => r.status === 200,
            }) ? successRate.add(1) : errorRate.add(1);
            sleep(0.3);
        }
    });

    sleep(randomIntBetween(0.5, 2));
}

export function spikeTest() {
    const token = authenticate();
    if (!token) return;

    const headers = getAuthHeaders(token);

    group('Spike Test - Sudden Load Increase', () => {
        // Simulate sudden burst of requests
        const requests = [
            { method: 'GET', url: `${BASE_URL}/api/v1/documents?limit=20` },
            { method: 'GET', url: `${BASE_URL}/api/v1/projects` },
            { method: 'GET', url: `${BASE_URL}/api/v1/documents/search?q=invoice` },
        ];

        const responses = http.batch(requests.map(req => ({
            method: req.method,
            url: req.url,
            params: { headers },
        })));

        responses.forEach((res, index) => {
            check(res, {
                [`request ${index} successful`]: (r) => r.status === 200,
            }) ? successRate.add(1) : errorRate.add(1);
        });
    });

    sleep(randomIntBetween(0.1, 1));
}

// ============================================================================
// Custom Summary
// ============================================================================

export function handleSummary(data) {
    return {
        'stdout': textSummary(data, { indent: ' ', enableColors: true }),
        'summary.json': JSON.stringify(data, null, 2),
        'summary.html': htmlReport(data),
    };
}

function textSummary(data, options) {
    // k6 will use default text summary
    return '';
}

function htmlReport(data) {
    // Generate simple HTML report
    const html = `
<!DOCTYPE html>
<html>
<head>
    <title>Doctify Performance Test Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 40px; }
        h1 { color: #333; }
        table { border-collapse: collapse; width: 100%; margin-top: 20px; }
        th, td { border: 1px solid #ddd; padding: 12px; text-align: left; }
        th { background-color: #4CAF50; color: white; }
        .pass { color: green; font-weight: bold; }
        .fail { color: red; font-weight: bold; }
        .metric { margin: 20px 0; }
    </style>
</head>
<body>
    <h1>Doctify Performance Test Report</h1>
    <p><strong>Test Date:</strong> ${new Date().toISOString()}</p>

    <div class="metric">
        <h2>Summary</h2>
        <p>Total Requests: ${data.metrics.http_reqs?.values?.count || 'N/A'}</p>
        <p>Failed Requests: ${data.metrics.http_req_failed?.values?.passes || 'N/A'}</p>
        <p>Average Response Time: ${data.metrics.http_req_duration?.values?.avg?.toFixed(2) || 'N/A'}ms</p>
        <p>P95 Response Time: ${data.metrics.http_req_duration?.values?.['p(95)']?.toFixed(2) || 'N/A'}ms</p>
        <p>P99 Response Time: ${data.metrics.http_req_duration?.values?.['p(99)']?.toFixed(2) || 'N/A'}ms</p>
    </div>

    <div class="metric">
        <h2>Thresholds</h2>
        <table>
            <tr>
                <th>Metric</th>
                <th>Threshold</th>
                <th>Actual</th>
                <th>Status</th>
            </tr>
            ${Object.entries(data.metrics)
                .filter(([_, metric]) => metric.thresholds)
                .map(([name, metric]) => {
                    const threshold = Object.keys(metric.thresholds)[0];
                    const passed = metric.thresholds[threshold].ok;
                    return `
                    <tr>
                        <td>${name}</td>
                        <td>${threshold}</td>
                        <td>${JSON.stringify(metric.values)}</td>
                        <td class="${passed ? 'pass' : 'fail'}">${passed ? 'PASS' : 'FAIL'}</td>
                    </tr>
                    `;
                }).join('')}
        </table>
    </div>
</body>
</html>
    `;

    return html;
}
