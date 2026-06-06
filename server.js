const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

const app = express();
const PORT = 5000;

app.use(cors());
app.use(express.json());

const tempDir = path.join(__dirname, 'temp');
if (!fs.existsSync(tempDir)) {
  fs.mkdirSync(tempDir);
}

// Helper to validate URL
function isYoutubeUrl(url) {
  return /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+$/.test(url);
}

// Endpoint to load and download YouTube audio
app.get('/api/load-youtube', async (req, res) => {
  try {
    const videoUrl = req.query.url;
    if (!videoUrl) {
      return res.status(400).json({ error: 'URL is required' });
    }

    if (!isYoutubeUrl(videoUrl)) {
      return res.status(400).json({ error: 'URL is not a valid YouTube link' });
    }

    console.log(`Getting video info for: ${videoUrl}`);
    
    // Escape URL for command line safety
    const escapedUrl = videoUrl.replace(/"/g, '\\"');
    
    // 1. Get metadata
    let title = 'Unknown Title';
    let artist = 'Unknown Artist';
    try {
      const metaCmd = `python -m yt_dlp --skip-download --print "%(title)s" --print "%(uploader)s" "${escapedUrl}"`;
      const { stdout } = await execPromise(metaCmd);
      const lines = stdout.split('\n').map(l => l.trim()).filter(Boolean);
      const cleanLines = lines.filter(l => !l.startsWith('WARNING:'));
      
      if (cleanLines.length >= 2) {
        title = cleanLines[cleanLines.length - 2];
        artist = cleanLines[cleanLines.length - 1];
      } else if (cleanLines.length === 1) {
        title = cleanLines[0];
      }
      console.log(`Fetched metadata: "${title}" by "${artist}"`);
    } catch (err) {
      console.warn('Failed to fetch metadata, continuing with defaults:', err.message);
    }

    // 2. Download audio
    const tempPath = path.join(tempDir, 'youtube.m4a');
    console.log(`Downloading audio using yt-dlp to: ${tempPath}`);

    // Delete existing temp file if it exists
    if (fs.existsSync(tempPath)) {
      try {
        fs.unlinkSync(tempPath);
      } catch (err) {
        console.warn('Could not delete existing temp file, will try to overwrite: ', err.message);
      }
    }

    const downloadCmd = `python -m yt_dlp -f "bestaudio[ext=m4a]" -o "${tempPath}" "${escapedUrl}"`;
    await execPromise(downloadCmd);
    
    console.log('Download finished successfully via yt-dlp');
    res.json({
      success: true,
      title: title,
      artist: artist,
      streamUrl: `http://localhost:${PORT}/api/audio?t=${Date.now()}` // add timestamp to prevent browser cache
    });

  } catch (error) {
    console.error('Error processing load-youtube:', error);
    res.status(500).json({ error: 'Failed to extract audio. Error: ' + error.message });
  }
});

// Endpoint to serve the downloaded audio file
app.get('/api/audio', (req, res) => {
  const tempPath = path.join(tempDir, 'youtube.m4a');
  if (!fs.existsSync(tempPath)) {
    return res.status(404).send('Audio file not found. Please load a YouTube link first.');
  }

  // Set proper cache control so browser requests fresh copy when we update the file
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  res.sendFile(tempPath);
});

// Start server
app.listen(PORT, () => {
  console.log(`YouTube audio proxy server running on http://localhost:${PORT}`);
});
