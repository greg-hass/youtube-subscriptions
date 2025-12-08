const express = require('express');
const cors = require('cors');
const db = require('./db');
const logger = require('./logger');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json({ limit: '50mb' }));

// GET /api/sync - Retrieve all data
app.get('/api/sync', (req, res) => {
    try {
        const subscriptions = db.getAllSubscriptions();
        const settings = db.getSettings();
        const redirects = db.getRedirects();

        res.json({
            subscriptions,
            settings,
            redirects,
            // redirects are flattened in valid db.json? existing usage implies data.redirects object
        });
    } catch (err) {
        logger.error('Read error:', err);
        res.status(500).json({ error: 'Failed to read data' });
    }
});

// POST /api/sync - Overwrite all data (Merge logic)
app.post('/api/sync', (req, res) => {
    try {
        const data = req.body;

        if (!data || typeof data !== 'object') {
            return res.status(400).json({ error: 'Invalid data format' });
        }

        db.transaction(() => {
            // Merge subscriptions
            if (data.subscriptions) {
                const redirects = db.getRedirects();
                for (const sub of data.subscriptions) {
                    let finalId = sub.id;
                    if (redirects[sub.id]) {
                        finalId = redirects[sub.id];
                    }
                    // Upsert
                    db.upsertSubscription({ ...sub, id: finalId });
                }
            }

            // Merge settings
            if (data.settings) {
                for (const [key, value] of Object.entries(data.settings)) {
                    db.updateSetting(key, value);
                }
            }

            // Merge redirects (server is authoritative, but we accept new ones?)
            // Usually client doesn't send redirects unless it generated them?
            // Existing logic preserved:
            if (data.redirects) {
                for (const [key, value] of Object.entries(data.redirects)) {
                    db.addRedirect(key, value);
                }
            }
        });

        // Trigger feed aggregation when subscriptions change
        const { aggregateFeeds } = require('./feed-aggregator');
        aggregateFeeds().catch(err => logger.error('Aggregation trigger failed:', err));

        res.json({ success: true, timestamp: new Date().toISOString() });
    } catch (err) {
        logger.error('Write error:', err);
        res.status(500).json({ error: 'Failed to save data' });
    }
});

// GET /api/videos - Retrieve aggregated videos
app.get('/api/videos', (req, res) => {
    try {
        const videos = db.getVideos(); // Gets top 100 by default
        const subscriptions = db.getAllSubscriptions();

        // Return format matching old JSON structure for compatibility
        res.json({
            videos,
            lastUpdated: new Date().toISOString(),
            totalChannels: subscriptions.length,
            totalVideos: videos.length // This is just the page length, but client might expect full count?
            // Client likely uses this to show badge.
        });
    } catch (err) {
        logger.error('Read videos error:', err);
        res.status(500).json({ error: 'Failed to read videos' });
    }
});

// POST /api/videos/refresh - Trigger immediate refresh (async)
app.post('/api/videos/refresh', (req, res) => {
    try {
        const { aggregateFeeds } = require('./feed-aggregator');
        aggregateFeeds().catch(err => logger.error('Background aggregation error:', err));
        res.json({ success: true, message: 'Refresh started in background.' });
    } catch (err) {
        logger.error('Refresh trigger error:', err);
        res.status(500).json({ error: 'Failed to trigger refresh' });
    }
});

// POST /api/resolve-channel - Resolve @handle or custom URL
app.post('/api/resolve-channel', async (req, res) => {
    try {
        const { type, value } = req.body;
        const settings = db.getSettings();
        const apiKey = settings.apiKey;
        const useApi = settings.useApiForVideos && apiKey;

        // Helper to fetch valid channel data from API response items
        const extractChannelData = (items) => {
            if (!items || items.length === 0) return null;
            const item = items[0];
            return {
                channelId: item.id,
                title: item.snippet.title,
                thumbnail: item.snippet.thumbnails?.high?.url || item.snippet.thumbnails?.medium?.url
            };
        };

        // 1. Try API if enabled
        if (useApi) {
            try {
                const axios = require('axios');
                if (type === 'handle') {
                    const handle = value.startsWith('@') ? value : `@${value}`;
                    // Use forHandle endpoint
                    const url = `https://www.googleapis.com/youtube/v3/channels?part=snippet&forHandle=${encodeURIComponent(handle)}&key=${apiKey}`;
                    const response = await axios.get(url);
                    const data = extractChannelData(response.data.items);
                    if (data) return res.json(data);

                } else if (type === 'custom_url') {
                    // Search for custom URL
                    const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(value)}&type=channel&maxResults=1&key=${apiKey}`;
                    const response = await axios.get(url);

                    if (response.data.items?.length > 0) {
                        const channelId = response.data.items[0].snippet.channelId;
                        // Fetch details
                        const detailsUrl = `https://www.googleapis.com/youtube/v3/channels?part=snippet&id=${channelId}&key=${apiKey}`;
                        const detailsRes = await axios.get(detailsUrl);
                        const data = extractChannelData(detailsRes.data.items);
                        if (data) return res.json(data);
                    }
                }
            } catch (err) {
                logger.warn('API resolution failed, falling back to scraping:', err.message);
                // Continue to scraping fallback
            }
        }

        // 2. Fallback to Scraping
        const axios = require('axios');
        let url;
        if (type === 'handle') {
            const handle = value.startsWith('@') ? value : `@${value}`;
            url = `https://www.youtube.com/${handle}`;
        } else if (type === 'custom_url') {
            url = `https://www.youtube.com/${value}`;
        } else {
            return res.status(400).json({ error: 'Invalid type' });
        }

        const response = await axios.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
        const html = response.data;

        const channelMatch = html.match(/channel\/(UC[a-zA-Z0-9_-]{22})/);
        const jsonMatch = html.match(/"channelId":"(UC[a-zA-Z0-9_-]{22})"/);
        const channelId = channelMatch?.[1] || jsonMatch?.[1];

        const titleMatch = html.match(/<meta property="og:title" content="([^"]+)"/);
        const title = titleMatch?.[1] || value;

        if (!channelId) return res.status(404).json({ error: 'Could not resolve channel ID' });

        res.json({ channelId, title, thumbnail: null });

    } catch (err) {
        logger.error('Resolve channel error:', err.message);
        res.status(500).json({ error: 'Failed to resolve channel' });
    }
});

// POST /api/subscriptions/:id/mute
app.post('/api/subscriptions/:id/mute', (req, res) => {
    try {
        const { id } = req.params;
        const { isMuted } = req.body;
        db.toggleMute(id, isMuted);
        res.json({ success: true, isMuted });
    } catch (err) {
        logger.error('Mute channel error:', err);
        res.status(500).json({ error: 'Failed to update channel' });
    }
});

app.listen(PORT, () => {
    logger.info(`Sync server running on port ${PORT}`);
    require('./feed-aggregator');
});
