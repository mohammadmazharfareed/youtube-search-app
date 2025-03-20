const express = require('express');
const axios = require('axios');
require('dotenv').config();
const app = express();

const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;
const YOUTUBE_API_URL = 'https://www.googleapis.com/youtube/v3';

// Set EJS as the template engine
app.set('view engine', 'ejs');

// Serve static files
app.use(express.static('public'));

// Home Route
app.get('/', (req, res) => {
    res.render('index', { videos: [], nextPageToken: null, query: '' });
});

// Channel Search Route
app.get('/search-channel', async (req, res) => {
    const channelQuery = req.query.channelQuery;

    if (!channelQuery) {
        return res.render('index', { videos: [], channels: [], nextPageToken: null, query: '' });
    }

    try {
        const channelResponse = await axios.get(`${YOUTUBE_API_URL}/search`, {
            params: {
                part: 'snippet',
                q: channelQuery,
                type: 'channel',
                key: YOUTUBE_API_KEY,
                maxResults: 5
            }
        });

        const channels = (channelResponse.data.items || []).map(channel => ({
            id: channel.id.channelId,
            title: channel.snippet.title,
            description: channel.snippet.description,
            thumbnail: channel.snippet.thumbnails.default.url
        }));

        res.render('index', { videos: [], channels, nextPageToken: null, query: '' });
    } catch (error) {
        console.error('Error fetching YouTube channels:', error.message);
        res.render('index', { videos: [], channels: [], nextPageToken: null, query: '' });
    }
});

// Advanced Search Route (Title-based search)
app.get('/advanced-search', async (req, res) => {
    const titleQuery = req.query.title;
    const order = req.query.order || 'date';
    const maxResults = parseInt(req.query.maxResults || '10');
    const pageToken = req.query.pageToken || '';

    if (!titleQuery) {
        return res.render('index', {
            videos: [],
            nextPageToken: null,
            title: '',
            order,
            maxResults: maxResults.toString(),
            searchType: 'title',
            query: ''
        });
    }

    try {
        // Set up parameters for the title-based video search
        const videoParams = {
            part: 'snippet',
            q: titleQuery,
            order: order,
            type: 'video',
            key: YOUTUBE_API_KEY,
            maxResults: maxResults,
            pageToken
        };

        const videoResponse = await axios.get(`${YOUTUBE_API_URL}/search`, {
            params: videoParams
        });

        const videos = (videoResponse.data.items || []).map(video => ({
            id: video.id.videoId,
            title: video.snippet.title,
            description: video.snippet.description,
            url: `https://www.youtube.com/watch?v=${video.id.videoId}`,
            thumbnail: video.snippet.thumbnails.default.url
        }));

        const nextPageToken = videoResponse.data.nextPageToken || null;

        res.render('index', {
            videos,
            nextPageToken,
            title: titleQuery,
            order,
            maxResults: maxResults.toString(),
            searchType: 'title',
            query: ''
        });
    } catch (error) {
        console.error('Error fetching YouTube data:', error.message);
        res.render('index', {
            videos: [],
            nextPageToken: null,
            title: titleQuery,
            order,
            maxResults: maxResults.toString(),
            searchType: 'title',
            query: ''
        });
    }
});

// Search Route
app.get('/search', async (req, res) => {
    const searchQuery = req.query.q;
    const pageToken = req.query.pageToken || '';
    const explicitChannelId = req.query.channelId;

    if (!searchQuery) {
        return res.render('index', { videos: [], nextPageToken: null, query: '' });
    }

    try {
        let channelId = explicitChannelId || null;
        let channelTitle = '';

        // If no explicit channelId is provided, try to detect from mappings or query
        if (!channelId) {
            // Mapping for specific keywords to channel IDs (e.g., for Hum TV)
            // Replace 'YOUR_HUM_TV_CHANNEL_ID' with the actual channel ID of Hum TV
            const mapping = {
                'dill wali gali': 'YOUR_HUM_TV_CHANNEL_ID',
                'hum tv': 'YOUR_HUM_TV_CHANNEL_ID'
            };

            // Check if the search query contains any mapping keyword
            for (const key in mapping) {
                if (searchQuery.toLowerCase().includes(key)) {
                    channelId = mapping[key];
                    channelTitle = key; // Simple mapping for demo
                    break;
                }
            }

            // If no mapping was found, and if the query appears to be a channel name (e.g. very short query), try to detect it
            if (!channelId && searchQuery.trim().split(' ').length <= 3) {
                const channelResponse = await axios.get(`${YOUTUBE_API_URL}/search`, {
                    params: {
                        part: 'snippet',
                        q: searchQuery,
                        type: 'channel',
                        key: YOUTUBE_API_KEY,
                        maxResults: 1
                    }
                });
                if (channelResponse.data.items.length > 0) {
                    channelId = channelResponse.data.items[0].id.channelId;
                    channelTitle = channelResponse.data.items[0].snippet.title;
                }
            }
        }

        // If an explicit channelId was provided, fetch the channel title
        if (explicitChannelId && !channelTitle) {
            try {
                const channelDetailsResponse = await axios.get(`${YOUTUBE_API_URL}/channels`, {
                    params: {
                        part: 'snippet',
                        id: explicitChannelId,
                        key: YOUTUBE_API_KEY
                    }
                });

                if (channelDetailsResponse.data.items.length > 0) {
                    channelTitle = channelDetailsResponse.data.items[0].snippet.title;
                }
            } catch (error) {
                console.error('Error fetching channel details:', error.message);
            }
        }

        // Set up parameters for the video search
        // We always include the query parameter to search for the specific video topic
        let videoParams = {
            part: 'snippet',
            q: searchQuery,
            order: 'date', // Most recent videos first
            type: 'video',
            key: YOUTUBE_API_KEY,
            maxResults: 10,
            pageToken
        };

        // If a channel ID is determined, restrict the search to that channel
        if (channelId) {
            videoParams.channelId = channelId;
        }

        const videoResponse = await axios.get(`${YOUTUBE_API_URL}/search`, {
            params: videoParams
        });

        const videos = (videoResponse.data.items || []).map(video => ({
            id: video.id.videoId,
            title: video.snippet.title,
            description: video.snippet.description,
            url: `https://www.youtube.com/watch?v=${video.id.videoId}`,
            thumbnail: video.snippet.thumbnails.default.url
        }));

        const nextPageToken = videoResponse.data.nextPageToken || null;

        // If no videos are found when using channel restriction, fall back to a global video search
        if (videos.length === 0 && channelId && !explicitChannelId) {
            // Remove channel restriction and try again
            delete videoParams.channelId;
            const fallbackResponse = await axios.get(`${YOUTUBE_API_URL}/search`, {
                params: videoParams
            });
            const fallbackVideos = (fallbackResponse.data.items || []).map(video => ({
                id: video.id.videoId,
                title: video.snippet.title,
                description: video.snippet.description,
                url: `https://www.youtube.com/watch?v=${video.id.videoId}`,
                thumbnail: video.snippet.thumbnails.default.url
            }));
            return res.render('index', {
                videos: fallbackVideos,
                nextPageToken: fallbackResponse.data.nextPageToken || null,
                query: searchQuery
            });
        }

        // Determine if we're in channel search mode
        const searchType = channelId ? 'channel' : null;

        res.render('index', {
            videos,
            nextPageToken,
            query: searchQuery,
            selectedChannelId: channelId,
            channelTitle: channelTitle,
            searchType
        });
    } catch (error) {
        console.error('Error fetching YouTube data:', error.message);
        res.render('index', { videos: [], nextPageToken: null, query: searchQuery });
    }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
