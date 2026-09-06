import { fetchWithProxy } from './cors-proxies';

/**
 * Scrape the channel page to find the channel ID
 */
export async function scrapeChannelId(searchTerm: string, tempChannelId: string): Promise<{ id: string; title: string; thumbnail?: string } | null> {
    console.log(`🕷️ Attempting to scrape channel ID for ${searchTerm}`);

    try {
        // Construct URL based on type
        const url = tempChannelId.startsWith('handle_')
            ? `https://www.youtube.com/@${searchTerm}`
            : `https://www.youtube.com/${searchTerm}`;

        const html = await fetchWithProxy(url);

        // Extract Channel ID using regex
        // Patterns found in actual YouTube page source:
        // 1. RSS link: href=".../feeds/videos.xml?channel_id=UC..."
        // 2. Canonical URL: href=".../channel/UC..."
        // 3. JSON data: "browseId":"UC..."
        const rssMatch = html.match(/channel_id=(UC[a-zA-Z0-9_-]{22})/);
        const canonicalMatch = html.match(/\/channel\/(UC[a-zA-Z0-9_-]{22})/);
        const browseIdMatch = html.match(/"browseId":"(UC[a-zA-Z0-9_-]{22})"/);

        const channelId = rssMatch?.[1] || canonicalMatch?.[1] || browseIdMatch?.[1];

        if (channelId) {
            console.log(`✅ Scraped Channel ID: ${channelId}`);

            // Try to extract title and thumbnail
            const titleMatch = html.match(/<meta property="og:title" content="([^"]+)"/);
            const title = titleMatch?.[1] || searchTerm;

            const imageMatch = html.match(/<meta property="og:image" content="([^"]+)"/);
            const thumbnail = imageMatch?.[1] || `https://ui-avatars.com/api/?name=${encodeURIComponent(title)}&background=random&color=fff`;

            return {
                id: channelId,
                title: title,
                thumbnail: thumbnail
            };
        }

        return null;
    } catch (error) {
        console.warn('Scraping failed:', error);
        return null;
    }
}
