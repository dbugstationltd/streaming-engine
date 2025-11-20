import re

# Read the file
with open(r'd:\D-bug Station Project\streamingeninge\public\broadcaster.html', 'r', encoding='utf-8') as f:
    content = f.read()

# Define the HLS UI to insert
hls_ui = '''
            <h3 style="margin-top: 20px;">HLS Stream</h3>
            <div style="margin-bottom: 10px;">
                <label for="hlsUrlInput" style="display: block; margin-bottom: 5px; color: #aaa;">HLS URL:</label>
                <input type="text" id="hlsUrlInput" placeholder="https://example.com/stream.m3u8" 
                    style="width: 100%; padding: 8px; background: #333; border: 1px solid #444; color: white; border-radius: 4px; margin-bottom: 8px;">
                <button class="btn-primary" style="width: 100%;" onclick="addHLSStream()">+ Add HLS Stream</button>
            </div>
'''

# Define the HLS function to insert
hls_function = '''
        function addHLSStream() {
            const hlsUrl = document.getElementById('hlsUrlInput').value.trim();
            if (!hlsUrl) {
                alert('Please enter an HLS URL');
                return;
            }

            const video = document.createElement('video');
            video.crossOrigin = 'anonymous';
            video.src = hlsUrl;
            video.muted = true;
            video.play().catch(err => {
                console.error('Error playing HLS stream:', err);
                alert('Could not load HLS stream. Make sure the URL is correct and CORS is enabled.');
            });

            const source = {
                id: Date.now(),
                type: 'video',
                name: 'HLS Stream',
                element: video,
                x: 0,
                y: 0,
                width: canvas.width,
                height: canvas.height
            };
            sources.unshift(source);
            updateSourcesList();
            document.getElementById('hlsUrlInput').value = '';
        }
'''

# Insert HLS UI after the "+ Add Screen" button
content = content.replace(
    '            <button class="btn-primary" onclick="addScreen()">+ Add Screen</button>',
    '            <button class="btn-primary" onclick="addScreen()">+ Add Screen</button>' + hls_ui
)

# Insert HLS function after addScreen function
pattern = r'(async function addScreen\(\) \{[^}]+\}[^}]+\})'
content = re.sub(pattern, r'\1' + hls_function, content)

# Write back
with open(r'd:\D-bug Station Project\streamingeninge\public\broadcaster.html', 'w', encoding='utf-8') as f:
    f.write(content)

print("HLS feature added successfully!")
