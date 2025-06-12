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

// Fake Translation API
function fakeTranslateAPI(text) {
    return new Promise((resolve, reject) => {
        setTimeout(() => {
            // Simulate potential error
            // if (Math.random() < 0.1) { // 10% chance of error
            //     reject(new Error("Fake API Error: Translation failed."));
            //     return;
            // }
            resolve(`[Placeholder Translation for: "${text}"]`);
        }, 500); // Simulate network delay
    });
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
            playPauseIcon.textContent = '▶';
            playPauseBtn.disabled = false;
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
                    updateUIVisibility(true);
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
        } else if (subtitles.length > 0) {
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

                const playOnHoverBtn = document.createElement('span');
                playOnHoverBtn.className = 'play-on-hover-btn';
                playOnHoverBtn.textContent = '▶';
                playOnHoverBtn.setAttribute('role', 'button');
                playOnHoverBtn.setAttribute('aria-label', 'Play from this line');
                playOnHoverBtn.addEventListener('click', (event) => {
                    event.stopPropagation();
                    if (isPlaying) pausePlayback();
                    currentTime = subtitles[index].startTime;
                    currentSubtitleIndex = index;
                    seekBar.value = currentTime;
                    updateSubtitleDisplay();
                    startPlayback();
                });
                subElement.appendChild(playOnHoverBtn);

                const textSpan = document.createElement('span');
                textSpan.className = 'original-subtitle-text';
                textSpan.textContent = sub.text;
                subElement.appendChild(textSpan);

                // Add click listener to the subtitle line itself for translation
                subElement.addEventListener('click', () => {
                    const originalText = subtitles[index].text; // Or from textSpan.textContent
                    const existingTranslationDiv = subElement.querySelector('.translation-text');
                    const existingErrorDiv = subElement.querySelector('.translation-error');

                    if (existingErrorDiv) existingErrorDiv.remove(); // Remove old error first

                    if (existingTranslationDiv) {
                        existingTranslationDiv.remove();
                        subElement.classList.remove('loading-translation'); // Ensure loading class is removed
                    } else {
                        document.querySelectorAll('.translation-text').forEach(t => t.remove());
                        document.querySelectorAll('.subtitle-line').forEach(sl => sl.classList.remove('loading-translation'));


                        subElement.classList.add('loading-translation');

                        fakeTranslateAPI(originalText)
                            .then(translation => {
                                subElement.classList.remove('loading-translation');

                                const translationDiv = document.createElement('div');
                                translationDiv.classList.add('translation-text');
                                translationDiv.textContent = translation;
                                subElement.appendChild(translationDiv);
                            })
                            .catch(error => {
                                subElement.classList.remove('loading-translation');
                                console.error("Fake translation API error:", error.message);
                                const errorDiv = document.createElement('div');
                                errorDiv.classList.add('translation-error');
                                errorDiv.style.fontSize = '0.8em'; // Basic styling
                                errorDiv.style.color = 'red';
                                errorDiv.textContent = "[Translation not available]";
                                subElement.appendChild(errorDiv);
                                setTimeout(() => errorDiv.remove(), 3000);
                            });
                    }
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
        playPauseIcon.textContent = '❚❚';
        playPauseBtn.disabled = false;
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
        pausePlayback();
        currentTime = totalDuration;
        seekBar.value = currentTime;
        currentSubtitleIndex = subtitles.length > 0 ? subtitles.length - 1 : -1;
        updateSubtitleDisplay();
    }

    function pausePlayback(isSeeking = false) {
        isPlaying = false;
        clearInterval(playbackInterval);
        playbackInterval = null;
        playPauseIcon.textContent = '▶';
        if (!isSeeking) {
            playPauseBtn.disabled = (subtitles.length === 0);
        } else {
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

    updateUIVisibility(false);
});
```
