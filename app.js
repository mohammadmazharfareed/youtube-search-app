const express = require('express');
const axios = require('axios');
require('dotenv').config();
const app = express();
const path = require('path');
const YTDlpWrap = require('yt-dlp-wrap').default;
const ffmpeg = require('fluent-ffmpeg');
const ffmpegInstaller = require('@ffmpeg-installer/ffmpeg');

// Set ffmpeg path
ffmpeg.setFfmpegPath(ffmpegInstaller.path);

// Initialize yt-dlp
const ytDlp = new YTDlpWrap();

const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;
const YOUTUBE_API_URL = 'https://www.googleapis.com/youtube/v3';


// Set EJS as the template engine
app.set('view engine', 'ejs');
// Set the views directory explicitly
app.set('views', path.join(__dirname, 'Views'));

// Serve static files
app.use(express.static(path.join(__dirname, 'Public')));

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
        // First, search for the channel
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

        // If we found channels, get the latest videos from the first channel
        if (channels.length > 0) {
            const channelId = channels[0].id;

            // First, get the channel's uploads playlist ID
            const channelDetailsResponse = await axios.get(`${YOUTUBE_API_URL}/channels`, {
                params: {
                    part: 'contentDetails',
                    id: channelId,
                    key: YOUTUBE_API_KEY
                }
            });

            if (channelDetailsResponse.data.items && channelDetailsResponse.data.items[0]) {
                const uploadsPlaylistId = channelDetailsResponse.data.items[0].contentDetails.relatedPlaylists.uploads;

                // Now get the latest videos from the uploads playlist
                const videosResponse = await axios.get(`${YOUTUBE_API_URL}/playlistItems`, {
                    params: {
                        part: 'snippet',
                        playlistId: uploadsPlaylistId,
                        maxResults: 50, // Get more videos to ensure we have enough recent ones
                        order: 'date',
                        key: YOUTUBE_API_KEY
                    }
                });

                // Get all videos and sort them by date
                let videos = (videosResponse.data.items || []).map(video => ({
                    id: video.snippet.resourceId.videoId,
                    title: video.snippet.title,
                    description: video.snippet.description,
                    url: `https://www.youtube.com/watch?v=${video.snippet.resourceId.videoId}`,
                    thumbnail: video.snippet.thumbnails.default.url,
                    publishedAt: new Date(video.snippet.publishedAt)
                }));

                // Sort videos by date in descending order (newest first)
                videos.sort((a, b) => b.publishedAt - a.publishedAt);

                // Take only the 10 most recent videos
                videos = videos.slice(0, 10);

                // Format the date for display
                videos = videos.map(video => ({
                    ...video,
                    publishedAt: video.publishedAt.toISOString(),
                    formattedDate: video.publishedAt.toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                    })
                }));

                return res.render('index', {
                    videos,
                    channels,
                    nextPageToken: videosResponse.data.nextPageToken || null,
                    query: '',
                    selectedChannelId: channelId,
                    channelTitle: channels[0].title,
                    searchType: 'channel'
                });
            }
        }

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
        if (error.response) {
            console.error('API error status:', error.response.status);
            console.error('API error data:', JSON.stringify(error.response.data));
        }
        res.render('index', { videos: [], nextPageToken: null, query: searchQuery, error: error.message });
    }
});

// Download Route
app.get('/download', async (req, res) => {
    const videoId = req.query.videoId;
    const format = req.query.format;
    const quality = req.query.quality;

    if (!videoId || !format) {
        return res.status(400).json({ error: 'Missing required parameters' });
    }

    try {
        const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;

        // Get video info first
        const info = await ytDlp.getVideoInfo(videoUrl);
        const videoTitle = info.title.replace(/[^\x00-\x7F]/g, "");

        if (format === 'mp3') {
            res.header('Content-Disposition', `attachment; filename="${videoTitle}.mp3"`);

            const stream = await ytDlp.exec(videoUrl, {
                extractAudio: true,
                audioFormat: 'mp3',
                audioQuality: 0, // Best quality
                noCheckCertificate: true,
                noWarnings: true,
                preferFreeFormats: true
            });

            stream.stdout.pipe(res);

            stream.on('error', (err) => {
                console.error('MP3 download error:', err);
                if (!res.headersSent) {
                    res.status(500).json({ error: 'Error downloading MP3' });
                }
            });

        } else if (format === 'mp4') {
            res.header('Content-Disposition', `attachment; filename="${videoTitle}.mp4"`);

            const stream = await ytDlp.exec(videoUrl, {
                format: 'bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best',
                noCheckCertificate: true,
                noWarnings: true,
                preferFreeFormats: true
            });

            stream.stdout.pipe(res);

            stream.on('error', (err) => {
                console.error('MP4 download error:', err);
                if (!res.headersSent) {
                    res.status(500).json({ error: 'Error downloading MP4' });
                }
            });
        } else {
            res.status(400).json({ error: 'Invalid format specified' });
        }
    } catch (error) {
        console.error('Download error:', error);
        if (!res.headersSent) {
            res.status(500).json({
                error: 'Error downloading video',
                details: error.message
            });
        }
    }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
