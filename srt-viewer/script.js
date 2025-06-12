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

    srtFileInput.addEventListener('change', async (event) => {
        const file = event.target.files[0];
        if (!file) {
            return;
        }

        const formData = new FormData();
        formData.append('srtFile', file);

        // Reset previous state
        resetPlayback();
        subtitleDisplay.innerHTML = 'Loading subtitles...';

        try {
            const response = await fetch('parse_srt.php', {
                method: 'POST',
                body: formData
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.json();

            if (result.success) {
                subtitles = result.subtitles;
                if (subtitles.length > 0) {
                    renderSubtitles();
                    playBtn.disabled = false;
                    pauseBtn.disabled = true;
                } else {
                    subtitleDisplay.innerHTML = 'No subtitles found in the file or file is invalid.';
                    playBtn.disabled = true;
                    pauseBtn.disabled = true;
                }
            } else {
                subtitleDisplay.innerHTML = `Error parsing SRT file: ${result.errors.join(', ')}`;
                playBtn.disabled = true;
                pauseBtn.disabled = true;
            }
        } catch (error) {
            console.error('Error fetching or parsing SRT file:', error);
            subtitleDisplay.innerHTML = `Error: ${error.message}. Make sure parse_srt.php is accessible and working.`;
            playBtn.disabled = true;
            pauseBtn.disabled = true;
        }
    });

    function renderSubtitles() {
        subtitleDisplay.innerHTML = ''; // Clear previous
        // Optional: Display all subtitles initially or just the first one
        // For now, we'll just prepare them and let playback handle display
        if (subtitles.length > 0) {
            // Create divs for each subtitle to allow individual styling/highlighting
            subtitles.forEach((sub, index) => {
                const subElement = document.createElement('div');
                subElement.classList.add('subtitle-line');
                subElement.dataset.index = index;
                subElement.textContent = sub.text;
                subtitleDisplay.appendChild(subElement);
            });
        }
         updateSubtitleDisplay(); // Initial display based on currentTime (0)
    }

    function updateSubtitleDisplay() {
        let activeSub = null;
        currentSubtitleIndex = -1;

        for (let i = 0; i < subtitles.length; i++) {
            const sub = subtitles[i];
            if (currentTime >= sub.startTime && currentTime <= sub.endTime) {
                activeSub = sub;
                currentSubtitleIndex = i;
                break;
            }
        }

        const subElements = subtitleDisplay.querySelectorAll('.subtitle-line');
        subElements.forEach((el, index) => {
            if (index === currentSubtitleIndex) {
                el.classList.add('highlight');
                // Scroll into view if needed
                el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            } else {
                el.classList.remove('highlight');
            }
        });

        // If no subtitle is active, clear display or show placeholder
        // This version keeps all subs visible and highlights the active one.
    }


    function startPlayback() {
        if (isPlaying || subtitles.length === 0) return;
        isPlaying = true;
        playBtn.disabled = true;
        pauseBtn.disabled = false;

        // If playback was paused, currentSubtitleIndex might be set.
        // If starting from the beginning, find the first subtitle.
        if (currentTime === 0) {
            currentSubtitleIndex = 0;
        } else {
            // Resume: find where we left off
            let resumeIndex = -1;
            for(let i = 0; i < subtitles.length; i++) {
                if (currentTime < subtitles[i].endTime) {
                    resumeIndex = i;
                    break;
                }
            }
            currentSubtitleIndex = resumeIndex !== -1 ? resumeIndex : subtitles.length; // if past all, index is length
        }


        const startTime = Date.now() - currentTime;

        playbackInterval = setInterval(() => {
            currentTime = Date.now() - startTime;
            updateSubtitleDisplay();

            // Stop if past the last subtitle's end time
            if (currentSubtitleIndex >= subtitles.length || (subtitles.length > 0 && currentTime > subtitles[subtitles.length -1].endTime + 500 ) ) { // add a little buffer
                 // If we've played past all known subtitles
                if (currentSubtitleIndex === -1 && subtitles.length > 0 && currentTime > subtitles[subtitles.length - 1].endTime) {
                     resetPlaybackOnEnd();
                } else if (currentSubtitleIndex !== -1 && currentSubtitleIndex < subtitles.length && currentTime > subtitles[currentSubtitleIndex].endTime) {
                    // It means we are between subtitles
                } else if (currentSubtitleIndex === -1 && subtitles.length === 0) {
                    // No subtitles loaded
                     resetPlaybackOnEnd();
                } else if (currentSubtitleIndex !== -1 && currentSubtitleIndex >= subtitles.length-1 && currentTime > subtitles[currentSubtitleIndex].endTime){
                    // End of subtitles
                     resetPlaybackOnEnd();
                }
            }
        }, 100); // Update roughly 10 times a second
    }

    function resetPlaybackOnEnd() {
        pausePlayback();
        currentTime = 0;
        currentSubtitleIndex = -1;
        playBtn.disabled = false;
        pauseBtn.disabled = true;
        updateSubtitleDisplay(); // Clear highlight
        // Optionally, reset scroll position
        subtitleDisplay.scrollTop = 0;
    }


    function pausePlayback() {
        if (!isPlaying) return;
        isPlaying = false;
        clearInterval(playbackInterval);
        playbackInterval = null;
        playBtn.disabled = false;
        pauseBtn.disabled = true;
    }

    function resetPlayback() {
        pausePlayback();
        subtitles = [];
        currentSubtitleIndex = -1;
        currentTime = 0;
        subtitleDisplay.innerHTML = '';
        playBtn.disabled = true;
        pauseBtn.disabled = true;
        if (srtFileInput) {
            srtFileInput.value = ''; // Clear the file input
        }
    }

    playBtn.addEventListener('click', startPlayback);
    pauseBtn.addEventListener('click', pausePlayback);

    // Initial button states
    playBtn.disabled = true;
    pauseBtn.disabled = true;
});
