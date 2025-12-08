const Parser = require('rss-parser');
const axios = require('axios');
const pLimit = require('p-limit');
const db = require('./db');
const logger = require('./logger');

const parser = new Parser({
    timeout: 10000,
    headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; RSS Reader/1.0)'
    },
    customFields: {
        item: [
            ['media:group', 'mediaGroup'],
            ['yt:videoId', 'ytVideoId'],
            ['yt:channelId', 'ytChannelId']
        ]
    }
});

// Helper to parse ISO 8601 duration to seconds
function parseDuration(duration) {
    if (!duration) return 0;
    const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
    if (!match) return 0;
    const hours = (parseInt(match[1]) || 0);
    const minutes = (parseInt(match[2]) || 0);
    const seconds = (parseInt(match[3]) || 0);
    return hours * 3600 + minutes * 60 + seconds;
}

async function fetchChannelFeed(channelId) {
    try {
        const feedUrl = `https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`;
        const feed = await parser.parseURL(feedUrl);

        const videos = feed.items.map((item) => {
            // Extract duration from media:group
            let duration = null;
            try {
                const durationSeconds = item.mediaGroup?.['yt:duration']?.[0]?.$.seconds;
                if (durationSeconds) {
                    duration = parseInt(durationSeconds, 10);
                }
            } catch (e) {
                // Ignore duration parsing error
            }

            return {
                id: item.id?.split(':').pop() || item.guid,
                title: item.title,
                channelId: channelId,
                channelTitle: feed.title || item.author || 'Unknown',
                publishedAt: item.pubDate || item.isoDate,
                thumbnail: item.media?.thumbnail?.[0]?.url
                    || item['media:group']?.['media:thumbnail']?.[0]?.$.url
                    || item.enclosure?.url
                    || `https://i.ytimg.com/vi/${item.id?.split(':').pop() || item.guid}/hqdefault.jpg`,
                description: item.contentSnippet || item.content || '',
                duration: duration,
            };
        });

        return { videos, title: feed.title };
    } catch (error) {
        logger.error(`Failed to fetch feed for ${channelId}:`, error.message);
        return { videos: [], title: null };
    }
}

async function aggregateFeeds() {
    logger.info('🔄 Starting feed aggregation (SQLite Mode)...');

    try {
        const subscriptions = db.getAllSubscriptions();
        const settings = db.getSettings();
        const apiKey = settings.apiKey;
        const useApi = settings.useApiForVideos && apiKey;

        // Concurrency limit
        const limit = pLimit(useApi ? 5 : 10); // Lower concurrency if using API to avoid hitting rate limits too fast

        // API Quota tracking
        let quotaCost = 0;
        let quotaExceeded = settings.apiExhausted || false;

        const tasks = subscriptions.map(sub => limit(async () => {
            // Check for redirects
            const redirects = db.getRedirects();
            if (redirects[sub.id]) {
                logger.info(`🔀 Skipping redirected channel: ${sub.id} (-> ${redirects[sub.id]})`);
                return;
            }

            let videos = [];

            // Try API first if enabled
            if (useApi && !quotaExceeded && sub.id.startsWith('UC')) {
                try {
                    // 1. Get Uploads Playlist ID (cost: 1)
                    // Optimization: Derive UU id from UC id to save 1 quota unit
                    const uploadsId = 'UU' + sub.id.substring(2);

                    // 2. Fetch Playlist Items (cost: 1)
                    const playlistUrl = `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet,contentDetails&playlistId=${uploadsId}&maxResults=10&key=${apiKey}`;
                    const res = await axios.get(playlistUrl);
                    quotaCost += 1; // Only counting playlist items call since we derived the ID

                    videos = res.data.items.map(item => ({
                        id: item.contentDetails.videoId,
                        title: item.snippet.title,
                        channelId: item.snippet.channelId,
                        // channelTitle: item.snippet.channelTitle, // Redundant
                        publishedAt: item.snippet.publishedAt,
                        thumbnail: item.snippet.thumbnails.maxres?.url ||
                            item.snippet.thumbnails.high?.url ||
                            item.snippet.thumbnails.medium?.url ||
                            `https://i.ytimg.com/vi/${item.contentDetails.videoId}/hqdefault.jpg`,
                        description: item.snippet.description,
                        duration: null // Will need separate fetch or leave null
                    }));

                    // Optional: Fetch durations in batch later, or skip for now to save quota
                    // For now, we accept null duration to save quota (1 unit vs 1+1 per channel)

                    // Update channel title/thumb if changed
                    // (We can't easily get channel metadata from playlistItems without another call, 
                    // unless we believe snippet.channelTitle)
                    if (sub.title !== res.data.items[0]?.snippet?.channelTitle) {
                        db.upsertSubscription({ ...sub, title: res.data.items[0]?.snippet?.channelTitle });
                    }

                } catch (err) {
                    if (err.response?.status === 403) {
                        logger.warn('⚠️ API Quota limit reached (403)! Switching to RSS.');
                        quotaExceeded = true;
                    } else {
                        logger.warn(`API failed for ${sub.id}, falling back to RSS: ${err.message}`);
                    }
                    // Fallback to RSS below
                }
            }

            // Fallback to RSS if API failed or disabled
            if (videos.length === 0) {
                const res = await fetchChannelFeed(sub.id);
                videos = res.videos;

                // Update metadata from RSS
                if (res.title && res.title !== sub.title) {
                    db.upsertSubscription({ ...sub, title: res.title });
                }
            }

            // Save videos to DB
            if (videos.length > 0) {
                db.transaction(() => {
                    for (const video of videos) {
                        db.upsertVideo(video);
                    }
                });
            }
        }));

        await Promise.all(tasks);

        // Update quota usage
        if (useApi) {
            const currentUsed = settings.quotaUsed || 0;
            db.updateSetting('quotaUsed', currentUsed + quotaCost);
            db.updateSetting('apiExhausted', quotaExceeded);
            logger.info(`📊 Quota used this run: ${quotaCost}. Total: ${currentUsed + quotaCost}`);
        }

        logger.info('✅ Aggregation complete.');

    } catch (error) {
        logger.error('❌ Aggregation failed:', error);
    }
}

// Run immediately on start
aggregateFeeds();

// Run every 15 minutes
setInterval(aggregateFeeds, 15 * 60 * 1000);

module.exports = { aggregateFeeds };
