# Use Node LTS image
FROM node:18-bullseye-slim

# Install Python3, pip, and ffmpeg
RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    python-is-python3 \
    ffmpeg \
    && rm -rf /var/lib/apt/lists/*

# Install yt-dlp via pip3
RUN pip3 install --no-cache-dir yt-dlp

# Set working directory
WORKDIR /app

# Copy package.json and install Node dependencies
COPY package.json ./
RUN npm install

# Copy server.js
COPY server.js ./

# Expose port 7860 (Hugging Face default)
ENV PORT=7860
EXPOSE 7860

# Start command
CMD ["node", "server.js"]
