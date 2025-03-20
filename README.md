# YouTube Search App

A web application that allows users to search YouTube videos with advanced features including channel-specific searches and title-based searches.

## Features

- Search videos by title
- Search videos from specific channels
- Advanced search options (sorting, results count)
- Video player modal
- Responsive design

## Deployment Instructions

1. Create a free account on [Render.com](https://render.com)
2. Create a new Web Service
3. Connect your GitHub repository
4. Configure the following settings:
   - Name: youtube-search-app (or your preferred name)
   - Environment: Node
   - Build Command: `npm install`
   - Start Command: `npm start`
   - Plan: Free

## Environment Variables

The following environment variables need to be set in your Render dashboard:

- `YOUTUBE_API_KEY`: Your YouTube Data API key

## Local Development

1. Clone the repository
2. Install dependencies: `npm install`
3. Create a `.env` file with your YouTube API key
4. Run the development server: `npm run dev`
5. Visit `http://localhost:5000` in your browser 