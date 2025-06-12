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
    const playBtn = document.getElementById('playBtn');
    const pauseBtn = document.getElementById('pauseBtn');
    const initialLoadArea = document.getElementById('initialLoadArea');
    const controls = document.getElementById('controls');
    const seekBar = document.getElementById('seekBar');

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
            seekBar.disabled = false; // Enable seek bar
        } else {
            initialLoadArea.style.display = 'flex';
            subtitleDisplay.style.display = 'none';
            controls.style.display = 'none';
            document.body.classList.remove('player-active');

            // Reset and disable seek bar when no file is loaded
            seekBar.value = 0;
            seekBar.max = 100; // Default max
            totalDuration = 0;
            seekBar.disabled = true; // Disable seek bar

            // Ensure buttons are also in a sensible state for no file
            playBtn.disabled = true;
            pauseBtn.disabled = true;
        }
    }

    function handleFile(file) {
        if (!file) {
            updateUIVisibility(false); // This will also reset/disable seekbar and buttons
            return;
        }
        // Reset state before loading new file. Call pausePlayback without isSeeking.
        pausePlayback();
        currentTime = 0;
        currentSubtitleIndex = -1;
        subtitles = []; // Clear previous subtitles data
        srtFileInput.value = ''; // Clear the actual file input selection

        subtitleDisplay.innerHTML = 'Loading subtitles...';

        const reader = new FileReader();
        reader.onload = (e) => {
            const srtContent = e.target.result;
            try {
                const parsedSubs = parseSrtContent(srtContent);
                if (parsedSubs && parsedSubs.length > 0) {
                    subtitles = parsedSubs; // Assign new subtitles
                    renderSubtitles();
                    totalDuration = subtitles[subtitles.length - 1].endTime;
                    seekBar.max = totalDuration;
                    seekBar.value = 0;
                    updateUIVisibility(true); // Show player, enable seekbar
                    playBtn.disabled = false; // Ready to play
                    pauseBtn.disabled = true;
                } else {
                    subtitleDisplay.innerHTML = 'No subtitles found or file is invalid.';
                    // updateUIVisibility(false) handles resetting seekBar and buttons
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

    // Initial UI setup
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
            // Display error message. Since subtitleDisplay is hidden when no file is loaded,
            // we might need a dedicated error message area in initialLoadArea or use an alert.
            // For now, this message might not be visible if initialLoadArea is shown.
            // A simple alert could be: alert('Invalid file type. Please drop an .srt file.');
            console.warn('Invalid file type dropped.');
        }
    });

    srtFileInput.addEventListener('change', (event) => {
        const file = event.target.files[0];
        // handleFile will be called, which calls updateUIVisibility
        if (file) handleFile(file);
        else updateUIVisibility(false); // If user cancels file dialog
    });

    seekBar.addEventListener('mousedown', () => {
        if (isPlaying) {
            wasPlayingBeforeSeek = true;
            pausePlayback(true); // Pass true for isSeeking
        } else {
            wasPlayingBeforeSeek = false;
        }
    });
    seekBar.addEventListener('input', () => {
        currentTime = parseFloat(seekBar.value);
        updateSubtitleDisplay();
    });
    seekBar.addEventListener('change', () => {
        currentTime = parseFloat(seekBar.value); // Final value
        if (wasPlayingBeforeSeek) {
            startPlayback(); // This will set button states correctly
        }
        // If !wasPlayingBeforeSeek, playback remains paused, buttons should be: play enabled, pause disabled.
        // pausePlayback() called by mousedown would have set pauseBtn disabled.
        // playBtn state is handled by pausePlayback(true) not touching it, then startPlayback enabling it.
        // If it was paused and user seeks, playBtn should remain enabled.
        if (!isPlaying && subtitles.length > 0) { // Ensure play button is enabled if paused and seeked
            playBtn.disabled = false;
            pauseBtn.disabled = true;
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
                    if (isPlaying) pausePlayback(); // Not a seek, so playBtn will be enabled
                    currentTime = subtitles[index].startTime;
                    seekBar.value = currentTime;
                    currentSubtitleIndex = index;
                    updateSubtitleDisplay();
                    startPlayback();
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
        playBtn.disabled = true;
        pauseBtn.disabled = false;
        seekBar.disabled = false; // Ensure seekbar is enabled during playback
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
        pausePlayback(); // Not a seek, playBtn will be enabled if subs exist
        currentTime = totalDuration;
        seekBar.value = currentTime;
        currentSubtitleIndex = subtitles.length > 0 ? subtitles.length - 1 : -1;
        updateSubtitleDisplay();
        // playBtn.disabled = false; // This is handled by pausePlayback
        // pauseBtn.disabled = true; // This is handled by pausePlayback
    }

    // Modify pausePlayback function definition
    function pausePlayback(isSeeking = false) { // Add isSeeking parameter
        if (!isPlaying && !isSeeking) return; // if already paused and not a seek operation, do nothing

        isPlaying = false; // Set regardless of isSeeking, as playback is stopping
        clearInterval(playbackInterval);
        playbackInterval = null;

        if (!isSeeking) {
            playBtn.disabled = (subtitles.length === 0);
        }
        // Pause button should always be disabled when playback is paused/stopped
        pauseBtn.disabled = true;
    }

    function resetPlayback() { // Full reset to initial state (e.g. for an "unload file" button)
        pausePlayback(); // Pause any ongoing playback.

        subtitles = []; // Clear subtitles data
        currentSubtitleIndex = -1;
        currentTime = 0;

        if (srtFileInput) srtFileInput.value = ''; // Clear the actual file input element

        renderSubtitles(); // Clear subtitle text from display

        // updateUIVisibility will hide player, show load area, reset/disable seekbar and buttons
        updateUIVisibility(false);
    }

    playBtn.addEventListener('click', startPlayback);
    pauseBtn.addEventListener('click', () => pausePlayback(false)); // Explicitly pass false

    // Initial UI setup, ensures seekbar disabled, buttons disabled etc.
    updateUIVisibility(false);
});
