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

function getContextualSentence(clickedIndex, subtitlesArray) {
    if (!subtitlesArray || subtitlesArray.length === 0 || clickedIndex < 0 || clickedIndex >= subtitlesArray.length) {
        return "";
    }
    let textParts = [];
    const maxLinesToScan = 3;
    const maxLengthChars = 250;
    textParts.push(subtitlesArray[clickedIndex].text);
    let currentLength = subtitlesArray[clickedIndex].text.length;
    let needsMoreForward = !/[.?!"]$/.test(textParts.join(" ").trim());
    if (needsMoreForward) {
        for (let i = 1; i < maxLinesToScan; i++) {
            const nextIndex = clickedIndex + i;
            if (nextIndex < subtitlesArray.length && currentLength < maxLengthChars) {
                const nextText = subtitlesArray[nextIndex].text;
                textParts.push(nextText);
                currentLength += nextText.length + 1;
                if (/[.?!"]$/.test(nextText.trim())) {
                    needsMoreForward = false;
                    break;
                }
            } else { break; }
        }
    }
    let currentFullTextForPrependCheck = textParts.join(" ").trim();
    let needsMoreBackward = !/^[A-Z0-9“"']/.test(currentFullTextForPrependCheck.charAt(0));
    if (!needsMoreBackward && clickedIndex > 0) {
        const prevLineText = subtitlesArray[clickedIndex - 1].text.trim();
        if (!/[.?!"]$/.test(prevLineText)) {
            needsMoreBackward = true;
        }
    }
    if (needsMoreBackward) {
        for (let i = 1; i < maxLinesToScan; i++) {
            const prevIndex = clickedIndex - i;
            if (prevIndex >= 0 && currentLength < maxLengthChars) {
                const prevText = subtitlesArray[prevIndex].text;
                textParts.unshift(prevText);
                currentLength += prevText.length + 1;
            } else { break; }
        }
    }
    let finalSentence = textParts.join(" ").trim();
    if (finalSentence.length > maxLengthChars) {
        let lastSpace = finalSentence.lastIndexOf(" ", maxLengthChars);
        if (lastSpace > -1 && lastSpace < finalSentence.length -1 ) {
            finalSentence = finalSentence.substring(0, lastSpace) + "...";
        } else {
            finalSentence = finalSentence.substring(0, maxLengthChars - 3) + "...";
        }
    }
    finalSentence = finalSentence.replace(/\s\s+/g, ' ');
    return finalSentence;
}

function fakeOpenRouteAPI(question, context) {
    console.log(`Fake API called with question: "${question}", context: "${context}"`);
    return new Promise((resolve) => {
        setTimeout(() => {
            let response = `[Mock AI Response to: "${question}" (context: "${context.substring(0, 30)}...")]`;
            if (question.toLowerCase().includes("hello") || question.toLowerCase().includes("hi")) {
                response = "Hello there! How can I help you with this sentence?";
            } else if (question.toLowerCase().includes("meaning of life")) {
                response = "The meaning of life is 42, of course! But regarding the subtitle, what specifically interests you?";
            } else if (context.length > 0 && question.length > 5) {
                 response = `Interesting question about "${context.substring(0,30)}...". I'll need to think about that. For now, this is a placeholder.`;
            }
            resolve(response);
        }, 700); // Simulate network delay
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

    const aiChatSidebar = document.getElementById('aiChatSidebar');
    const sidebarCloseBtn = document.getElementById('sidebarCloseBtn');
    const sidebarSentenceContext = document.getElementById('sidebarSentenceContext');
    const sidebarChatHistory = document.getElementById('sidebarChatHistory');
    const sidebarQuestionInput = document.getElementById('sidebarQuestionInput');
    const sidebarSendQuestionBtn = document.getElementById('sidebarSendQuestionBtn');

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
            if(aiChatSidebar) aiChatSidebar.classList.remove('open');
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
        if (sidebarChatHistory) sidebarChatHistory.innerHTML = ''; // Clear chat on new file
        if (sidebarSentenceContext) sidebarSentenceContext.textContent = ''; // Clear context on new file


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

    if (sidebarCloseBtn) {
        sidebarCloseBtn.addEventListener('click', () => {
            if (aiChatSidebar) aiChatSidebar.classList.remove('open');
        });
    }

    if (sidebarSendQuestionBtn && sidebarQuestionInput && sidebarChatHistory && sidebarSentenceContext) {
        sidebarSendQuestionBtn.addEventListener('click', handleSendQuestion);
        sidebarQuestionInput.addEventListener('keypress', (event) => {
            if (event.key === 'Enter') {
                handleSendQuestion();
            }
        });

        function handleSendQuestion() {
            const question = sidebarQuestionInput.value.trim();
            if (question === "") {
                return;
            }

            const userMessageDiv = document.createElement('div');
            userMessageDiv.classList.add('user-message');
            const userMessageP = document.createElement('p');
            userMessageP.textContent = question;
            userMessageDiv.appendChild(userMessageP);
            sidebarChatHistory.appendChild(userMessageDiv);
            sidebarChatHistory.scrollTop = sidebarChatHistory.scrollHeight;

            sidebarQuestionInput.value = '';
            const context = sidebarSentenceContext.textContent;

            fakeOpenRouteAPI(question, context)
                .then(response => {
                    const aiMessageDiv = document.createElement('div');
                    aiMessageDiv.classList.add('ai-message');
                    const aiMessageP = document.createElement('p');
                    aiMessageP.textContent = response;
                    aiMessageDiv.appendChild(aiMessageP);
                    sidebarChatHistory.appendChild(aiMessageDiv);
                    sidebarChatHistory.scrollTop = sidebarChatHistory.scrollHeight;
                })
                .catch(error => {
                    console.error("Fake API Error:", error);
                    const errorMessageDiv = document.createElement('div');
                    errorMessageDiv.classList.add('ai-message');
                    const errorMessageP = document.createElement('p');
                    errorMessageP.textContent = "[Error getting AI response. Please try again.]";
                    errorMessageP.style.color = 'red'; // Simple error styling
                    errorMessageDiv.appendChild(errorMessageP);
                    sidebarChatHistory.appendChild(errorMessageDiv);
                    sidebarChatHistory.scrollTop = sidebarChatHistory.scrollHeight;
                });
        }
    }


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

                subElement.addEventListener('click', () => {
                    const contextSentence = getContextualSentence(index, subtitles);
                    if (sidebarSentenceContext) sidebarSentenceContext.textContent = contextSentence;
                    if (sidebarChatHistory) sidebarChatHistory.innerHTML = '';
                    if (aiChatSidebar) aiChatSidebar.classList.add('open');
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
