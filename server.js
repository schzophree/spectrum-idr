const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const os = require('os');
const https = require('https');
const http = require('http');
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

const app = express();
const PORT = 5500;

app.use(cors());
app.use(express.json());

// Store temp audio file in OS temporary directory to prevent local dev server (e.g. VS Code Live Server) from hot-reloading when file changes
const tempPath = path.join(os.tmpdir(), 'spectrum-idr-media.m4a');

// Helper to validate URL - support multiple platforms
function isValidMediaUrl(url) {
  try {
    const urlObj = new URL(url);
    return ['http:', 'https:'].includes(urlObj.protocol);
  } catch {
    return false;
  }
}

// Helper to check if URL is YouTube
function isYoutubeUrl(url) {
  return /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+$/.test(url);
}

// Endpoint to load and download audio from any supported platform (Hybrid: YouTube streams, others download)
app.get('/api/load-media', async (req, res) => {
  try {
    const mediaUrl = req.query.url;
    if (!mediaUrl) {
      return res.status(400).json({ error: 'URL is required' });
    }

    if (!isValidMediaUrl(mediaUrl)) {
      return res.status(400).json({ error: 'URL is not valid. Please use a complete URL (e.g., https://...)' });
    }

    const isYoutube = isYoutubeUrl(mediaUrl);
    const escapedUrl = mediaUrl.replace(/"/g, '\\"');

    if (isYoutube) {
      console.log(`YouTube URL detected. Setting up direct stream for: ${mediaUrl}`);
      
      // Get title, artist, and direct stream URL in one command to minimize response latency
      const cmd = `python -m yt_dlp --no-playlist --print "%(title)s" --print "%(uploader)s" -g -f "bestaudio[ext=m4a]/bestaudio" "${escapedUrl}"`;
      const { stdout } = await execPromise(cmd);
      
      const lines = stdout.split('\n').map(l => l.trim()).filter(Boolean);
      const cleanLines = lines.filter(l => !l.startsWith('WARNING:'));
      
      if (cleanLines.length < 3) {
        throw new Error('Failed to retrieve YouTube stream URL');
      }
      
      const title = cleanLines[0];
      const artist = cleanLines[1];
      const streamUrl = cleanLines[2];
      
      console.log(`YouTube Direct Stream: "${title}" by "${artist}"`);
      return res.json({
        success: true,
        title: title,
        artist: artist,
        streamUrl: `http://localhost:${PORT}/api/proxy-stream?url=${encodeURIComponent(streamUrl)}`
      });
      
    } else {
      console.log(`Other platform (SoundCloud, etc.) detected. Downloading for: ${mediaUrl}`);
      
      // Delete existing temp file if it exists
      if (fs.existsSync(tempPath)) {
        try {
          fs.unlinkSync(tempPath);
        } catch (err) {
          console.warn('Could not delete existing temp file: ', err.message);
        }
      }
      
      // Download and print title/uploader in one command to minimize process spawn overhead
      const cmd = `python -m yt_dlp --no-playlist --print "%(title)s" --print "%(uploader)s" -f "bestaudio[ext=m4a]/bestaudio" -o "${tempPath}" "${escapedUrl}"`;
      const { stdout } = await execPromise(cmd);
      
      const lines = stdout.split('\n').map(l => l.trim()).filter(Boolean);
      const cleanLines = lines.filter(l => !l.startsWith('WARNING:'));
      
      let title = 'Unknown Title';
      let artist = 'Unknown Artist';
      if (cleanLines.length >= 2) {
        title = cleanLines[0];
        artist = cleanLines[1];
      }
      
      console.log(`Downloaded Media: "${title}" by "${artist}"`);
      return res.json({
        success: true,
        title: title,
        artist: artist,
        streamUrl: `http://localhost:${PORT}/api/audio?t=${Date.now()}`
      });
    }

  } catch (error) {
    console.error('Error in load-media:', error);
    res.status(500).json({ error: 'Failed to process media. Error: ' + error.message });
  }
});

// Endpoint to serve the downloaded audio file (specifically for SoundCloud and other non-YouTube platforms)
app.get('/api/audio', (req, res) => {
  if (!fs.existsSync(tempPath)) {
    return res.status(404).send('Audio file not found. Please load a media link first.');
  }

  // Set proper cache control so browser requests fresh copy when we update the file
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  res.sendFile(tempPath);
});

// Endpoint to proxy the actual audio stream to bypass CORS and support Range requests (specifically for YouTube)
app.get('/api/proxy-stream', (req, res) => {
  const streamUrl = req.query.url;
  if (!streamUrl) {
    return res.status(400).send('Stream URL is required');
  }

  const client = streamUrl.startsWith('https') ? https : http;
  
  // Forward range headers from client request
  const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
  };
  if (req.headers.range) {
    headers['Range'] = req.headers.range;
  }

  const urlObj = new URL(streamUrl);
  const options = {
    hostname: urlObj.hostname,
    path: urlObj.pathname + urlObj.search,
    headers: headers,
    method: 'GET'
  };

  const proxyReq = client.request(options, (proxyRes) => {
    // Forward status code
    res.status(proxyRes.statusCode);
    
    // Forward headers
    for (const [key, value] of Object.entries(proxyRes.headers)) {
      if (!['access-control-allow-origin', 'connection'].includes(key.toLowerCase())) {
        res.setHeader(key, value);
      }
    }
    
    // Add CORS headers so the browser's AudioContext can read it
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', 'Range');
    
    // Pipe the audio data directly to client
    proxyRes.pipe(res);
  });

  proxyReq.on('error', (err) => {
    console.error('Proxy request error:', err);
    if (!res.headersSent) {
      res.status(500).send('Error proxying audio stream');
    }
  });

  req.on('close', () => {
    proxyReq.destroy();
  });

  proxyReq.end();
});

// Start server
app.listen(PORT, () => {
  console.log(`Multi-platform audio proxy server running on http://localhost:${PORT}`);
  console.log(`Supported platforms: YouTube, SoundCloud, Vimeo, Spotify, TikTok, Instagram, Twitch, and 1000+ more via yt-dlp`);
});
