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
    const normalizedContent = srtContent.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
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
        } else if (block.trim() !== "") {
             console.warn(`Skipping invalid SRT block (not enough lines): ${block}`);
        }
    }
    return subtitles;
}

document.addEventListener('DOMContentLoaded', () => {
    const srtFileInput = document.getElementById('srtFile');
    const subtitleDisplay = document.getElementById('subtitleDisplay');
    const initialLoadArea = document.getElementById('initialLoadArea');
    const controls = document.getElementById('controls');
    const seekBar = document.getElementById('seekBar');
    const playPauseBtn = document.getElementById('playPauseBtn');
    const playPauseIcon = document.getElementById('playPauseIcon');

    let subtitles = [];
    let currentSubtitleIndex = -1;
    let playbackInterval = null;
    let currentTime = 0;
    let isPlaying = false;
    let totalDuration = 0;
    let wasPlayingBeforeSeek = false;

    function updateUIVisibility(isFileLoaded) {
        if (isFileLoaded) {
            initialLoadArea.style.display = 'none';
            subtitleDisplay.style.display = 'block';
            controls.style.display = 'flex';
            document.body.classList.add('player-active');
            seekBar.disabled = false;
            playPauseIcon.textContent = '▶'; // Initial state is paused
            playPauseBtn.disabled = false;   // Enabled as file is loaded
        } else {
            initialLoadArea.style.display = 'flex';
            subtitleDisplay.style.display = 'none';
            controls.style.display = 'none';
            document.body.classList.remove('player-active');
            seekBar.value = 0;
            seekBar.max = 100;
            totalDuration = 0;
            seekBar.disabled = true;
            playPauseIcon.textContent = '▶';
            playPauseBtn.disabled = true;
        }
    }

    function handleFile(file) {
        if (!file) {
            updateUIVisibility(false);
            return;
        }
        pausePlayback();
        currentTime = 0;
        currentSubtitleIndex = -1;
        subtitles = [];
        srtFileInput.value = '';
        subtitleDisplay.innerHTML = 'Loading subtitles...';

        const reader = new FileReader();
        reader.onload = (e) => {
            const srtContent = e.target.result;
            try {
                const parsedSubs = parseSrtContent(srtContent);
                if (parsedSubs && parsedSubs.length > 0) {
                    subtitles = parsedSubs;
                    renderSubtitles();
                    totalDuration = subtitles[subtitles.length - 1].endTime;
                    seekBar.max = totalDuration;
                    seekBar.value = 0;
                    updateUIVisibility(true); // This will set button to ▶ and enabled
                } else {
                    subtitleDisplay.innerHTML = 'No subtitles found or file is invalid.';
                    updateUIVisibility(false);
                }
            } catch (error) {
                console.error('Error processing SRT content:', error);
                subtitleDisplay.innerHTML = `Error processing SRT: ${error.message}`;
                updateUIVisibility(false);
            }
        };
        reader.onerror = () => {
            subtitleDisplay.innerHTML = 'Error reading file.';
            updateUIVisibility(false);
        };
        reader.readAsText(file);
    }

    updateUIVisibility(false);

    initialLoadArea.addEventListener('click', () => srtFileInput.click());
    initialLoadArea.addEventListener('dragover', (event) => {
        event.preventDefault();
        initialLoadArea.classList.add('dragover');
    });
    initialLoadArea.addEventListener('dragleave', (event) => {
        event.preventDefault();
        initialLoadArea.classList.remove('dragover');
    });
    initialLoadArea.addEventListener('drop', (event) => {
        event.preventDefault();
        initialLoadArea.classList.remove('dragover');
        const file = event.dataTransfer.files[0];
        if (file && file.name.toLowerCase().endsWith('.srt')) {
            handleFile(file);
        } else {
            console.warn('Invalid file type dropped.');
            // Consider an alert or a message in initialLoadArea
        }
    });

    srtFileInput.addEventListener('change', (event) => {
        const file = event.target.files[0];
        if (file) handleFile(file);
        else updateUIVisibility(false);
    });

    playPauseBtn.addEventListener('click', () => {
        if (isPlaying) {
            pausePlayback();
        } else {
            startPlayback();
        }
    });

    seekBar.addEventListener('mousedown', () => {
        if (isPlaying) {
            wasPlayingBeforeSeek = true;
            pausePlayback(true);
        } else {
            wasPlayingBeforeSeek = false;
        }
    });
    seekBar.addEventListener('input', () => {
        currentTime = parseFloat(seekBar.value);
        updateSubtitleDisplay();
    });
    seekBar.addEventListener('change', () => {
        currentTime = parseFloat(seekBar.value);
        if (wasPlayingBeforeSeek) {
            startPlayback();
        } else if (subtitles.length > 0) { // If paused and seeked, ensure button is responsive
            playPauseIcon.textContent = '▶';
            playPauseBtn.disabled = false;
        }
    });

    function renderSubtitles() {
        subtitleDisplay.innerHTML = '';
        if (subtitles.length > 0) {
            subtitles.forEach((sub, index) => {
                const subElement = document.createElement('div');
                subElement.classList.add('subtitle-line');
                subElement.dataset.index = index;
                subElement.textContent = sub.text;
                subElement.addEventListener('click', () => {
                    if (isPlaying) pausePlayback();
                    currentTime = subtitles[index].startTime;
                    seekBar.value = currentTime;
                    currentSubtitleIndex = index;
                    updateSubtitleDisplay();
                    startPlayback(); // This will set icon to Pause
                });
                subtitleDisplay.appendChild(subElement);
            });
        }
        updateSubtitleDisplay();
    }

    function updateSubtitleDisplay() {
        let newSubtitleIndex = -1;
        for (let i = 0; i < subtitles.length; i++) {
            const sub = subtitles[i];
            if (currentTime >= sub.startTime && currentTime <= sub.endTime) {
                newSubtitleIndex = i;
                break;
            }
        }
        currentSubtitleIndex = newSubtitleIndex;
        const subElements = subtitleDisplay.querySelectorAll('.subtitle-line');
        subElements.forEach((el, index) => {
            if (index === currentSubtitleIndex) {
                if (!el.classList.contains('highlight')) el.classList.add('highlight');
                el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            } else {
                if (el.classList.contains('highlight')) el.classList.remove('highlight');
            }
        });
    }

    function startPlayback() {
        if (isPlaying || subtitles.length === 0) return;
        isPlaying = true;
        playPauseIcon.textContent = '❚❚'; // Pause icon
        playPauseBtn.disabled = false;    // Should be enabled to allow pausing
        seekBar.disabled = false;
        const systemStartTime = Date.now() - currentTime;
        playbackInterval = setInterval(() => {
            currentTime = Date.now() - systemStartTime;
            if (totalDuration > 0) seekBar.value = currentTime;
            updateSubtitleDisplay();
            if (currentTime >= totalDuration) {
                 resetPlaybackOnEnd();
            }
        }, 100);
    }

    function resetPlaybackOnEnd() {
        // isPlaying will be false after pausePlayback call
        pausePlayback(); // Sets icon to ▶, enables button if subs exist
        currentTime = totalDuration;
        seekBar.value = currentTime;
        currentSubtitleIndex = subtitles.length > 0 ? subtitles.length - 1 : -1;
        updateSubtitleDisplay();
        // Icon and button state are handled by pausePlayback
    }

    function pausePlayback(isSeeking = false) {
        // if (!isPlaying && !isSeeking) return; // This check might be too restrictive if called to ensure state

        isPlaying = false;
        clearInterval(playbackInterval);
        playbackInterval = null;

        playPauseIcon.textContent = '▶'; // Play icon
        if (!isSeeking) {
            playPauseBtn.disabled = (subtitles.length === 0);
        } else {
            // If seeking, button should remain enabled to reflect it can be interacted with
            // (e.g., clicked to definitively stop/play at seeked position)
            playPauseBtn.disabled = false;
        }
    }

    function resetPlayback() {
        pausePlayback();
        subtitles = [];
        currentSubtitleIndex = -1;
        currentTime = 0;
        if (srtFileInput) srtFileInput.value = '';
        renderSubtitles();
        updateUIVisibility(false);
    }

    // Initial UI setup
    updateUIVisibility(false);
});
```
