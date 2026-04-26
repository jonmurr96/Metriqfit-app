#!/usr/bin/env node
/**
 * Smoke test for Progress tab routes.
 * Verifies all Progress routes return HTTP 200 from the Expo dev server.
 *
 * Usage: node scripts/progress-routes.smoke.mjs
 * Requires: Expo dev server running on port 8081
 */

const BASE = process.env.BASE_URL || 'http://localhost:8081';

const ROUTES = [
    '/',                                   // Home
    '/(tabs)/progress',                    // Progress index
    '/(tabs)/progress/photos',             // Progress photos
    '/(tabs)/progress/trends',             // Trends
    '/(tabs)/progress/personal-records',   // Personal records
    '/(tabs)/progress/photo-compare',      // Photo comparison (new)
    '/(tabs)/progress/daily-summary',      // Daily summary
    '/(tabs)/progress/weekly-review',      // Weekly review
];

async function smokeTest() {
    let passed = 0;
    let failed = 0;

    for (const route of ROUTES) {
        const url = `${BASE}${route}`;
        try {
            const res = await fetch(url, { method: 'GET', redirect: 'follow' });
            if (res.ok) {
                console.log(`  ✅ ${route} → ${res.status}`);
                passed++;
            } else {
                console.log(`  ❌ ${route} → ${res.status} ${res.statusText}`);
                failed++;
            }
        } catch (err) {
            console.log(`  ❌ ${route} → ${err.message}`);
            failed++;
        }
    }

    console.log('');
    console.log(`Results: ${passed} passed, ${failed} failed out of ${ROUTES.length}`);
    process.exit(failed > 0 ? 1 : 0);
}

console.log(`\n🔍 Running Progress tab route smoke tests against ${BASE}\n`);
smokeTest();
