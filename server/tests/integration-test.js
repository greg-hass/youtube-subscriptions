const { aggregateFeeds } = require('../feed-aggregator');
const fs = require('fs').promises;
const path = require('path');
const assert = require('assert');

// Mock data paths
const DATA_DIR = path.join(__dirname, '../data');
const DB_FILE = path.join(DATA_DIR, 'db.json');
const VIDEOS_FILE = path.join(DATA_DIR, 'videos.json');

async function runTest() {
    console.log('🧪 Starting Integration Test: Feed Aggregator');

    // 1. Setup Mock Data
    const mockDb = {
        subscriptions: [
            { id: 'UC_test_channel', title: 'Test Channel' }
        ],
        settings: { apiKey: null } // Force RSS mode
    };

    // Ensure data dir exists
    await fs.mkdir(DATA_DIR, { recursive: true });
    await fs.writeFile(DB_FILE, JSON.stringify(mockDb));

    try {
        await aggregateFeeds();
        console.log('✅ aggregateFeeds ran without crashing');

        // Verify videos.json was created
        const videosData = JSON.parse(await fs.readFile(VIDEOS_FILE, 'utf8'));
        assert(Array.isArray(videosData.videos), 'Videos should be an array');
        console.log('✅ Output file structure verified');

    } catch (e) {
        console.error('❌ Test failed:', e);
        process.exit(1);
    }
}

runTest();
