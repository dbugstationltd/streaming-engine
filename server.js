const NodeMediaServer = require('node-media-server');
const config = require('./config');
const WebSocket = require('ws');
const ffmpeg = require('ffmpeg-static');
const child_process = require('child_process');

// 1. Start Node Media Server
// Enable HLS Transcoding
config.trans = {
    ffmpeg: ffmpeg,
    tasks: [
        {
            app: 'live',
            hls: true,
            hlsFlags: '[hls_time=2:hls_list_size=3:hls_flags=delete_segments]',
            hlsKeep: true, // to prevent file deletion issues
            dash: true,
            dashFlags: '[f=dash:window_size=3:extra_window_size=5]'
        }
    ]
};

const nms = new NodeMediaServer(config);
nms.run();

// 2. Start WebSocket Server for Broadcaster
const wss = new WebSocket.Server({ port: 8001 });

wss.on('connection', (ws) => {
    console.log('Broadcaster connected');

    // Spawn FFmpeg process
    // Inputs: stdin (from WebSocket)
    // Outputs: RTMP stream to local NodeMediaServer
    const ffmpegProcess = child_process.spawn(ffmpeg, [
        '-i', '-',                   // Input from stdin
        '-c:v', 'libx264',           // Video codec
        '-preset', 'ultrafast',      // Low latency
        '-tune', 'zerolatency',      // Low latency
        '-c:a', 'aac',               // Audio codec
        '-ar', '44100',              // Audio sample rate
        '-b:a', '128k',              // Audio bitrate
        '-f', 'flv',                 // Output format
        'rtmp://localhost/live/stream' // Target RTMP URL
    ]);

    ffmpegProcess.stderr.on('data', (data) => {
        console.log(`FFmpeg: ${data}`);
    });

    ffmpegProcess.on('close', (code) => {
        console.log(`FFmpeg process exited with code ${code}`);
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
        ffmpegProcess.kill();
    });
});

console.log('WebSocket Relay Server listening on port 8001');

// NMS Events
nms.on('preConnect', (id, args) => {
    console.log('[NodeEvent onPreConnect]', `id=${id} args=${JSON.stringify(args)}`);
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
