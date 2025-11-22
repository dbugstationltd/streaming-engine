const NodeMediaServer = require('node-media-server');
const config = require('./config');
const WebSocket = require('ws');
const ffmpeg = require('ffmpeg-static');
const child_process = require('child_process');

const path = require('path');
const fs = require('fs');

// Ensure media directory exists
const mediaRoot = path.join(__dirname, 'media');
if (!fs.existsSync(mediaRoot)) {
    fs.mkdirSync(mediaRoot, { recursive: true });
}

// Update config with absolute path
config.http.mediaroot = mediaRoot;

// 1. Start Node Media Server
// Enable HLS Transcoding
config.trans = {
    ffmpeg: ffmpeg,
    tasks: [
        {
            app: 'live',
            hls: false, // Disable NMS HLS to prevent conflicts
            dash: true,
            dashFlags: '[f=dash:window_size=3:extra_window_size=5]'
        }
    ]
};

console.log('Media Root:', config.http.mediaroot);
console.log('FFmpeg Path:', config.trans.ffmpeg);

const nms = new NodeMediaServer(config);
nms.run();

// 2. Start WebSocket Server for Broadcaster
const wss = new WebSocket.Server({ port: 8001 });

wss.on('connection', (ws, req) => {
    console.log('Broadcaster connected');

    // Parse stream key from URL (e.g., ws://localhost:8001?key=mystream)
    const params = new URLSearchParams(req.url.replace('/?', ''));
    const streamKey = params.get('key') || 'stream';
    console.log(`Streaming to key: ${streamKey}`);

    // Ensure HLS directory exists for this stream
    const hlsDir = path.join(config.http.mediaroot, 'live', streamKey);

    // CLEANUP: Remove existing directory to prevent cached segments from interfering
    if (fs.existsSync(hlsDir)) {
        fs.rmSync(hlsDir, { recursive: true, force: true });
    }
    fs.mkdirSync(hlsDir, { recursive: true });

    // Spawn FFmpeg process
    // Inputs: stdin (from WebSocket)
    // Outputs: 
    // 1. RTMP stream to local NodeMediaServer (for FLV/RTMP playback)
    // 2. HLS files to media directory (for HLS playback)
    const ffmpegProcess = child_process.spawn(ffmpeg, [
        '-f', 'webm',                // Input format (from MediaRecorder)
        '-i', '-',                   // Input from stdin
        '-c:v', 'libx264',           // Video codec
        '-preset', 'ultrafast',      // Low latency
        '-tune', 'zerolatency',      // Low latency
        '-c:a', 'aac',               // Audio codec
        '-ar', '44100',              // Audio sample rate
        '-b:a', '128k',              // Audio bitrate

        // Output 1: RTMP (FLV)
        '-f', 'flv',
        `rtmp://127.0.0.1/live/${streamKey}`,

        // Output 2: HLS
        '-f', 'hls',
        '-hls_time', '1',            // 1 second segments for lower latency
        '-hls_list_size', '3',       // Keep only 3 segments in playlist
        '-hls_flags', 'delete_segments', // Ensure old segments are deleted
        '-hls_segment_filename', path.join(hlsDir, '%d.ts'),
        path.join(hlsDir, 'index.m3u8')
    ]);

    ffmpegProcess.stderr.on('data', (data) => {
        console.log(`FFmpeg: ${data}`);
    });

    ffmpegProcess.on('close', (code, signal) => {
        console.log(`FFmpeg process exited with code ${code} and signal ${signal}`);
    });

    // Handle stdin errors to prevent server crash
    ffmpegProcess.stdin.on('error', (err) => {
        console.log('FFmpeg stdin error:', err.message);
    });

    ws.on('message', (message) => {
        // Relay video data to FFmpeg
        if (ffmpegProcess.stdin.writable) {
            try {
                ffmpegProcess.stdin.write(message);
            } catch (err) {
                console.log('Error writing to FFmpeg stdin:', err.message);
            }
        }
    });

    ws.on('close', () => {
        console.log('Broadcaster disconnected');
        ffmpegProcess.stdin.end();
        ffmpegProcess.kill('SIGINT');
    });
});

// 3. Start Express Server for HLS (Bypassing NMS HTTP issues)
const express = require('express');
const cors = require('cors');
const app = express();

app.use(cors());

// Serve HLS files with correct headers
app.use('/live', (req, res, next) => {
    const ext = path.extname(req.path);
    if (ext === '.m3u8') {
        res.header('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.header('Pragma', 'no-cache');
        res.header('Expires', '0');
    } else {
        res.header('Cache-Control', 'public, max-age=2'); // Cache segments briefly
    }
    next();
}, express.static(path.join(config.http.mediaroot, 'live')));

// Fallback to broadcaster.html for root if needed (optional, but good for UX)
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'broadcaster.html'));
});

// Serve Static Files (Broadcaster UI)
app.use(express.static(path.join(__dirname, 'public')));

const HLS_PORT = 8080;
app.listen(HLS_PORT, () => {
    console.log(`HLS Server running on port ${HLS_PORT}`);
});

nms.on('postConnect', (id, args) => {
    console.log('[NodeEvent onPostConnect]', `id=${id} args=${JSON.stringify(args)}`);
});

nms.on('doneConnect', (id, args) => {
    console.log('[NodeEvent onDoneConnect]', `id=${id} args=${JSON.stringify(args)}`);
});

nms.on('prePublish', (id, StreamPath, args) => {
    console.log('[NodeEvent onPrePublish]', `id=${id} StreamPath=${StreamPath} args=${JSON.stringify(args)}`);
});

nms.on('postPublish', (id, StreamPath, args) => {
    console.log('[NodeEvent onPostPublish]', `id=${id} StreamPath=${StreamPath} args=${JSON.stringify(args)}`);
});

nms.on('donePublish', (id, StreamPath, args) => {
    console.log('[NodeEvent onDonePublish]', `id=${id} StreamPath=${StreamPath} args=${JSON.stringify(args)}`);
});

nms.on('prePlay', (id, StreamPath, args) => {
    console.log('[NodeEvent onPrePlay]', `id=${id} StreamPath=${StreamPath} args=${JSON.stringify(args)}`);
});

nms.on('postPlay', (id, StreamPath, args) => {
    console.log('[NodeEvent onPostPlay]', `id=${id} StreamPath=${StreamPath} args=${JSON.stringify(args)}`);
});

nms.on('donePlay', (id, StreamPath, args) => {
    console.log('[NodeEvent onDonePlay]', `id=${id} StreamPath=${StreamPath} args=${JSON.stringify(args)}`);
});
