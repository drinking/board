// Helper function to parse HH:MM:SS,mmm into milliseconds
function timecodeToMilliseconds(timecode) {
    const parts = timecode.match(/(\d{2}):(\d{2}):(\d{2}),(\d{3})/);
    if (!parts) throw new Error(`Invalid timecode format: ${timecode}`);
    const hours = parseInt(parts[1], 10);
    const minutes = parseInt(parts[2], 10);
    const seconds = parseInt(parts[3], 10);
    const milliseconds = parseInt(parts[4], 10);
    return hours * 3600000 + minutes * 60000 + seconds * 1000 + milliseconds;
}

function parseSrtContent(srtContent) {
    const subtitles = [];
    // Normalize line endings
    const normalizedContent = srtContent.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    // Split into blocks based on double newlines
    const blocks = normalizedContent.trim().split('\n\n');

    for (const block of blocks) {
        const lines = block.split('\n');
        if (lines.length >= 3) {
            const sequence = lines[0];
            const timecodeLine = lines[1];
            const text = lines.slice(2).join('\n');

            const timecodeMatch = timecodeLine.match(/(\d{2}:\d{2}:\d{2},\d{3}) --> (\d{2}:\d{2}:\d{2},\d{3})/);
            if (timecodeMatch) {
                try {
                    const startTime = timecodeToMilliseconds(timecodeMatch[1]);
                    const endTime = timecodeToMilliseconds(timecodeMatch[2]);
                    subtitles.push({ sequence, startTime, endTime, text });
                } catch (e) {
                    console.warn(`Skipping invalid timecode block: ${timecodeLine}`, e.message);
                }
            } else {
                console.warn(`Skipping block with invalid timecode format: ${block}`);
            }
        } else if (block.trim() !== "") { // Avoid warning for empty blocks if there are trailing newlines
             console.warn(`Skipping invalid SRT block (not enough lines): ${block}`);
        }
    }
    return subtitles;
}


document.addEventListener('DOMContentLoaded', () => {
    const srtFileInput = document.getElementById('srtFile');
    const subtitleDisplay = document.getElementById('subtitleDisplay');
    const playBtn = document.getElementById('playBtn');
    const pauseBtn = document.getElementById('pauseBtn');

    let subtitles = [];
    let currentSubtitleIndex = -1;
    let playbackInterval = null;
    let currentTime = 0; // in milliseconds
    let isPlaying = false;

    srtFileInput.addEventListener('change', (event) => { // Removed async
        const file = event.target.files[0];
        if (!file) {
            return;
        }

        resetPlayback();
        subtitleDisplay.innerHTML = 'Loading subtitles...';

        const reader = new FileReader();
        reader.onload = (e) => {
            const srtContent = e.target.result;
            try {
                const parsedSubs = parseSrtContent(srtContent);
                if (parsedSubs && parsedSubs.length > 0) {
                    subtitles = parsedSubs;
                    renderSubtitles(); // This will now create .subtitle-line elements
                    playBtn.disabled = false;
                    pauseBtn.disabled = true;
                } else {
                    subtitleDisplay.innerHTML = 'No subtitles found in the file or the file is invalid.';
                    playBtn.disabled = true;
                    pauseBtn.disabled = true;
                }
            } catch (error) {
                console.error('Error processing SRT content:', error);
                subtitleDisplay.innerHTML = `Error processing SRT: ${error.message}`;
                playBtn.disabled = true;
                pauseBtn.disabled = true;
            }
        };
        reader.onerror = () => {
            subtitleDisplay.innerHTML = 'Error reading file.';
            playBtn.disabled = true;
            pauseBtn.disabled = true;
        };
        reader.readAsText(file);
    });

    function renderSubtitles() {
        subtitleDisplay.innerHTML = ''; // Clear previous
        if (subtitles.length > 0) {
            subtitles.forEach((sub, index) => {
                const subElement = document.createElement('div');
                subElement.classList.add('subtitle-line');
                subElement.dataset.index = index; // Store index for highlighting
                subElement.textContent = sub.text; // Display text
                subtitleDisplay.appendChild(subElement);
            });
        }
        updateSubtitleDisplay(); // Initial display based on currentTime (0)
    }

    function updateSubtitleDisplay() {
        let activeSubFound = false;
        currentSubtitleIndex = -1; // Reset before checking

        for (let i = 0; i < subtitles.length; i++) {
            const sub = subtitles[i];
            if (currentTime >= sub.startTime && currentTime <= sub.endTime) {
                currentSubtitleIndex = i;
                activeSubFound = true;
                break;
            }
        }

        const subElements = subtitleDisplay.querySelectorAll('.subtitle-line');
        subElements.forEach((el, index) => {
            if (index === currentSubtitleIndex) {
                el.classList.add('highlight');
                // Smart scroll: only scroll if the element is not fully visible
                const displayRect = subtitleDisplay.getBoundingClientRect();
                const elRect = el.getBoundingClientRect();
                if (elRect.top < displayRect.top || elRect.bottom > displayRect.bottom) {
                   el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
            } else {
                el.classList.remove('highlight');
            }
        });
    }


    function startPlayback() {
        if (isPlaying || subtitles.length === 0) return;
        isPlaying = true;
        playBtn.disabled = true;
        pauseBtn.disabled = false;

        const systemStartTime = Date.now() - currentTime;

        playbackInterval = setInterval(() => {
            currentTime = Date.now() - systemStartTime;
            updateSubtitleDisplay();

            if (subtitles.length > 0) {
                const lastSub = subtitles[subtitles.length - 1];
                if (currentTime > lastSub.endTime + 500) {
                    resetPlaybackOnEnd();
                }
            } else {
                 resetPlaybackOnEnd();
            }
        }, 100);
    }

    function resetPlaybackOnEnd() {
        pausePlayback();
        currentTime = 0;
        currentSubtitleIndex = -1;
        playBtn.disabled = (subtitles.length === 0);
        pauseBtn.disabled = true;
        updateSubtitleDisplay();
        subtitleDisplay.scrollTop = 0;
    }


    function pausePlayback() {
        if (!isPlaying) return;
        isPlaying = false;
        clearInterval(playbackInterval);
        playbackInterval = null;
        playBtn.disabled = (subtitles.length === 0);
        pauseBtn.disabled = true;
    }

    function resetPlayback() {
        pausePlayback();
        currentSubtitleIndex = -1;
        currentTime = 0;
        // Only clear the visual display of subtitles, keep `subtitles` array if already loaded
        // unless it's explicitly a new file load scenario (handled by srtFileInput listener)
        if (subtitles.length === 0) {
             subtitleDisplay.innerHTML = ''; // Clear if no subs
        } else {
            // Re-render to clear highlights but keep text if subs are loaded
            renderSubtitles();
        }
        playBtn.disabled = (subtitles.length === 0); // Disable play if no subs
        pauseBtn.disabled = true;
    }

    playBtn.addEventListener('click', startPlayback);
    pauseBtn.addEventListener('click', pausePlayback);

    // Initial button states based on whether subtitles are loaded (they aren't initially)
    playBtn.disabled = true;
    pauseBtn.disabled = true;
});

```
