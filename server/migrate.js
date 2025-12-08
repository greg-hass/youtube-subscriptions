const fs = require('fs');
const path = require('path');
const db = require('./db');

const DATA_FILE = path.join(__dirname, 'data', 'db.json');
const VIDEOS_FILE = path.join(__dirname, 'data', 'videos.json');

async function migrate() {
    console.log('🚀 Starting migration to SQLite...');

    // 1. Migrate Subscriptions & Settings & Redirects
    if (fs.existsSync(DATA_FILE)) {
        try {
            const data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));

            // Subscriptions
            if (data.subscriptions && Array.isArray(data.subscriptions)) {
                console.log(`📦 Migrating ${data.subscriptions.length} subscriptions...`);
                db.transaction(() => {
                    for (const sub of data.subscriptions) {
                        db.upsertSubscription(sub);
                    }
                });
            }

            // Settings
            if (data.settings) {
                console.log('⚙️ Migrating settings...');
                db.transaction(() => {
                    for (const [key, value] of Object.entries(data.settings)) {
                        db.updateSetting(key, value);
                    }
                });
            }

            // Redirects
            if (data.redirects) {
                console.log('🔀 Migrating redirects...');
                db.transaction(() => {
                    for (const [key, value] of Object.entries(data.redirects)) {
                        db.addRedirect(key, value);
                    }
                });
            }

            // Rename old file to avoid confusion (but keep as backup)
            fs.renameSync(DATA_FILE, DATA_FILE + '.bak');
            console.log('✅ db.json migrated and renamed to db.json.bak');

        } catch (err) {
            console.error('❌ Error migrating db.json:', err);
        }
    } else {
        console.log('ℹ️ No db.json found, skipping.');
    }

    // 2. Migrate Videos
    if (fs.existsSync(VIDEOS_FILE)) {
        try {
            const data = JSON.parse(fs.readFileSync(VIDEOS_FILE, 'utf8'));

            if (data.videos && Array.isArray(data.videos)) {
                console.log(`📹 Migrating ${data.videos.length} videos...`);

                // Batch insert videos
                db.transaction(() => {
                    for (const video of data.videos) {
                        db.upsertVideo({
                            id: video.id,
                            channelId: video.channelId,
                            title: video.title,
                            thumbnail: video.thumbnail,
                            description: video.description,
                            publishedAt: video.publishedAt,
                            duration: video.duration
                        });
                    }
                });
            }

            fs.renameSync(VIDEOS_FILE, VIDEOS_FILE + '.bak');
            console.log('✅ videos.json migrated and renamed to videos.json.bak');

        } catch (err) {
            console.error('❌ Error migrating videos.json:', err);
        }
    } else {
        console.log('ℹ️ No videos.json found, skipping.');
    }

    console.log('✨ Migration complete!');
}

migrate();
