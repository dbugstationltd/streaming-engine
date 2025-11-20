$file = "d:\D-bug Station Project\streamingeninge\public\broadcaster.html"
$content = Get-Content $file -Raw

# Add HLS input field after the "+ Add Screen" button
$hlsInput = @"

            <h3 style="margin-top: 20px;">HLS Stream</h3>
            <div style="margin-bottom: 10px;">
                <label for="hlsUrlInput" style="display: block; margin-bottom: 5px; color: #aaa;">HLS URL:</label>
                <input type="text" id="hlsUrlInput" placeholder="https://example.com/stream.m3u8" style="width: 100%; padding: 8px; background: #333; border: 1px solid #444; color: white; border-radius: 4px; margin-bottom: 8px;">
                <button class="btn-primary" style="width: 100%;" onclick="addHLSStream()">+ Add HLS Stream</button>
            </div>
"@

$content = $content -replace '(\s+<button class="btn-primary" onclick="addScreen\(\)">.*?</button>)', "`$1$hlsInput"

# Add the addHLSStream function after addScreen function
$hlsFunction = @"

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
            sources.unshift(source); // Add as background
            updateSourcesList();
            document.getElementById('hlsUrlInput').value = ''; // Clear input
        }
"@

$content = $content -replace '(async function addScreen\(\) \{[^}]+\})', "`$1$hlsFunction"

Set-Content $file $content -NoNewline
Write-Host "HLS feature added successfully!"
