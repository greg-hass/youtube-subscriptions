const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

class DB {
    constructor() {
        const dataDir = path.join(__dirname, 'data');
        if (!fs.existsSync(dataDir)) {
            fs.mkdirSync(dataDir, { recursive: true });
        }

        this.db = new Database(path.join(dataDir, 'database.sqlite'));
        this.init();
    }

    init() {
        // Enable WAL mode for better concurrency
        this.db.pragma('journal_mode = WAL');

        // Subscriptions table
        this.db.exec(`
            CREATE TABLE IF NOT EXISTS subscriptions (
                id TEXT PRIMARY KEY,
                title TEXT,
                thumbnail TEXT,
                description TEXT,
                is_muted INTEGER DEFAULT 0,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Videos table
        this.db.exec(`
            CREATE TABLE IF NOT EXISTS videos (
                id TEXT PRIMARY KEY,
                channel_id TEXT,
                title TEXT,
                thumbnail TEXT,
                description TEXT,
                published_at DATETIME,
                duration INTEGER,
                is_watched INTEGER DEFAULT 0,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY(channel_id) REFERENCES subscriptions(id)
            )
        `);

        // Settings table (key-value store)
        this.db.exec(`
            CREATE TABLE IF NOT EXISTS settings (
                key TEXT PRIMARY KEY,
                value TEXT
            )
        `);

        // Redirects table
        this.db.exec(`
            CREATE TABLE IF NOT EXISTS redirects (
                from_id TEXT PRIMARY KEY,
                to_id TEXT
            )
        `);

        // Indices for performance
        this.db.exec(`CREATE INDEX IF NOT EXISTS idx_videos_channel_id ON videos(channel_id)`);
        this.db.exec(`CREATE INDEX IF NOT EXISTS idx_videos_published_at ON videos(published_at DESC)`);
    }

    // -- Subscriptions --

    getAllSubscriptions() {
        return this.db.prepare('SELECT * FROM subscriptions ORDER BY title COLLATE NOCASE').all()
            .map(sub => ({ ...sub, isMuted: !!sub.is_muted }));
    }

    upsertSubscription(sub) {
        const stmt = this.db.prepare(`
            INSERT INTO subscriptions (id, title, thumbnail, description, is_muted)
            VALUES (@id, @title, @thumbnail, @description, @isMuted)
            ON CONFLICT(id) DO UPDATE SET
                title = COALESCE(@title, title),
                thumbnail = COALESCE(@thumbnail, thumbnail),
                description = COALESCE(@description, description),
                is_muted = COALESCE(@isMuted, is_muted)
        `);
        return stmt.run({
            id: sub.id,
            title: sub.title,
            thumbnail: sub.thumbnail,
            description: sub.description || '',
            isMuted: sub.isMuted ? 1 : 0
        });
    }

    deleteSubscription(id) {
        // Cascade delete videos (manual since foreign key constraints might not be on by default without config)
        this.db.prepare('DELETE FROM videos WHERE channel_id = ?').run(id);
        return this.db.prepare('DELETE FROM subscriptions WHERE id = ?').run(id);
    }

    toggleMute(id, isMuted) {
        return this.db.prepare('UPDATE subscriptions SET is_muted = ? WHERE id = ?')
            .run(isMuted ? 1 : 0, id);
    }

    // -- Videos --

    getVideos(limit = 100, offset = 0) {
        return this.db.prepare(`
            SELECT v.*, s.title as channel_title 
            FROM videos v
            LEFT JOIN subscriptions s ON v.channel_id = s.id
            WHERE s.is_muted = 0 OR s.is_muted IS NULL
            ORDER BY v.published_at DESC
            LIMIT ? OFFSET ?
        `).all(limit, offset);
    }

    // Get all videos for export/sync logic that expects the old format
    getAllVideosSimple() {
        return this.db.prepare(`
            SELECT v.*, s.title as channel_title 
            FROM videos v
            LEFT JOIN subscriptions s ON v.channel_id = s.id
            ORDER BY v.published_at DESC
            LIMIT 1000
        `).all();
    }

    upsertVideo(video) {
        // We only update if fields are present
        const stmt = this.db.prepare(`
            INSERT INTO videos (id, channel_id, title, thumbnail, description, published_at, duration)
            VALUES (@id, @channelId, @title, @thumbnail, @description, @publishedAt, @duration)
            ON CONFLICT(id) DO UPDATE SET
                title = COALESCE(@title, title),
                thumbnail = COALESCE(@thumbnail, thumbnail),
                duration = COALESCE(@duration, duration)
        `);
        return stmt.run({
            id: video.id,
            channelId: video.channelId,
            title: video.title,
            thumbnail: video.thumbnail,
            description: video.description || '',
            publishedAt: video.publishedAt,
            duration: video.duration
        });
    }

    // -- Settings & Redirects --

    getSettings() {
        const rows = this.db.prepare('SELECT * FROM settings').all();
        const settings = {};
        for (const row of rows) {
            try {
                settings[row.key] = JSON.parse(row.value);
            } catch {
                settings[row.key] = row.value;
            }
        }
        return settings;
    }

    updateSetting(key, value) {
        const strValue = typeof value === 'object' ? JSON.stringify(value) : String(value);
        return this.db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').run(key, strValue);
    }

    getRedirects() {
        const rows = this.db.prepare('SELECT * FROM redirects').all();
        const redirects = {};
        for (const row of rows) {
            redirects[row.from_id] = row.to_id;
        }
        return redirects;
    }

    addRedirect(fromId, toId) {
        return this.db.prepare('INSERT OR REPLACE INTO redirects (from_id, to_id) VALUES (?, ?)').run(fromId, toId);
    }

    // -- Transaction Support for Batching --

    transaction(fn) {
        return this.db.transaction(fn)();
    }
}

module.exports = new DB();
