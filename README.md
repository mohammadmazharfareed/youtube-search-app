# YouTube Search App

A web application that allows users to search YouTube videos with advanced features including channel-specific searches and title-based searches.

## Features

- Search videos by title
- Search videos from specific channels
- Advanced search options (sorting, results count)
- Video player modal
- Responsive design

## Deployment Instructions (Free, No Credit Card Required)

### Option 1: Deploy to Glitch.com
1. Go to [Glitch.com](https://glitch.com/) and sign up for a free account
2. Click "New Project" and select "Import from GitHub"
3. Enter your GitHub repository URL: `https://github.com/mohammadmazharfareed/youtube-search-app.git`
4. Once imported, go to the .env file and add your YouTube API key:
   ```
   YOUTUBE_API_KEY=your_youtube_api_key_here
   ```
5. Your app will be automatically deployed and available at a unique URL (like https://your-project-name.glitch.me)

### Option 2: Deploy to Replit
1. Go to [Replit.com](https://replit.com/) and sign up for a free account
2. Click "Create" and select "Import from GitHub"
3. Enter your GitHub repository URL
4. For the "Language" select "Node.js"
5. Add your YouTube API key in the Secrets (Environment variables) section:
   - Key: `YOUTUBE_API_KEY`
   - Value: Your actual YouTube API key
6. Click "Run" to deploy your application

## Environment Variables

The following environment variables need to be set:

- `YOUTUBE_API_KEY`: Your YouTube Data API key

## Local Development

1. Clone the repository
2. Install dependencies: `npm install`
3. Create a `.env` file with your YouTube API key
4. Run the development server: `npm run dev`
5. Visit `http://localhost:5000` in your browser 