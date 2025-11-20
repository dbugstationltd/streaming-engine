$ErrorActionPreference = "Stop"

$file = "d:\D-bug Station Project\streamingeninge\public\broadcaster.html"
$lines = Get-Content $file

# Find the line with "+ Add Screen" button
$insertLineUI = -1
for ($i = 0; $i -lt $lines.Count; $i++) {
    if ($lines[$i] -match 'onclick="addScreen\(\)">') {
        $insertLineUI = $i + 1
        break
    }
}

if ($insertLineUI -eq -1) {
    Write-Error "Could not find Add Screen button"
    exit 1
}

# Insert HLS UI
$hlsUI = @(
    "",
    "            <h3 style=`"margin-top: 20px;`">HLS Stream</h3>",
    "            <div style=`"margin-bottom: 10px;`">",
    "                <label for=`"hlsUrlInput`" style=`"display: block; margin-bottom: 5px; color: #aaa;`">HLS URL:</label>",
    "                <input type=`"text`" id=`"hlsUrlInput`" placeholder=`"https://example.com/stream.m3u8`" ",
    "                    style=`"width: 100%; padding: 8px; background: #333; border: 1px solid #444; color: white; border-radius: 4px; margin-bottom: 8px;`">",
    "                <button class=`"btn-primary`" style=`"width: 100%;`" onclick=`"addHLSStream()`">+ Add HLS Stream</button>",
    "            </div>"
)

$newLines = @()
$newLines += $lines[0..($insertLineUI - 1)]
$newLines += $hlsUI
$newLines += $lines[$insertLineUI..($lines.Count - 1)]

# Find where to insert the function (after addScreen function)
$insertLineFunc = -1
for ($i = 0; $i -lt $newLines.Count; $i++) {
    if ($newLines[$i] -match 'async function addScreen') {
        # Find the closing brace of this function
        $braceCount = 0
        $started = $false
        for ($j = $i; $j -lt $newLines.Count; $j++) {
            if ($newLines[$j] -match '\{') { $braceCount++; $started = $true }
            if ($newLines[$j] -match '\}') { $braceCount-- }
            if ($started -and $braceCount -eq 0) {
                $insertLineFunc = $j + 1
                break
            }
        }
        break
    }
}

if ($insertLineFunc -eq -1) {
    Write-Error "Could not find addScreen function"
    exit 1
}

# Insert HLS function
$hlsFunc = @(
    "",
    "        function addHLSStream() {",
    "            const hlsUrl = document.getElementById('hlsUrlInput').value.trim();",
    "            if (!hlsUrl) {",
    "                alert('Please enter an HLS URL');",
    "                return;",
    "            }",
    "",
    "            const video = document.createElement('video');",
    "            video.crossOrigin = 'anonymous';",
    "            video.src = hlsUrl;",
    "            video.muted = true;",
    "            video.play().catch(err => {",
    "                console.error('Error playing HLS stream:', err);",
    "                alert('Could not load HLS stream. Make sure the URL is correct and CORS is enabled.');",
    "            });",
    "",
    "            const source = {",
    "                id: Date.now(),",
    "                type: 'video',",
    "                name: 'HLS Stream',",
    "                element: video,",
    "                x: 0,",
    "                y: 0,",
    "                width: canvas.width,",
    "                height: canvas.height",
    "            };",
    "            sources.unshift(source);",
    "            updateSourcesList();",
    "            document.getElementById('hlsUrlInput').value = '';",
    "        }"
)

$finalLines = @()
$finalLines += $newLines[0..($insertLineFunc - 1)]
$finalLines += $hlsFunc
$finalLines += $newLines[$insertLineFunc..($newLines.Count - 1)]

# Write back
$finalLines | Set-Content $file -Encoding UTF8
Write-Host "HLS feature added successfully!" -ForegroundColor Green
Write-Host "Refresh your browser to see the changes."
