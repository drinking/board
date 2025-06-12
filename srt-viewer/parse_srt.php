<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *'); // For development, allow all origins

if (isset($_FILES['srtFile'])) {
    $file = $_FILES['srtFile'];
    $errors = [];
    $parsedSubtitles = [];

    if ($file['error'] !== UPLOAD_ERR_OK) {
        $errors[] = 'File upload error: ' . $file['error'];
    } else {
        $fileExtension = pathinfo($file['name'], PATHINFO_EXTENSION);
        if (strtolower($fileExtension) !== 'srt') {
            $errors[] = 'Invalid file type. Only .srt files are allowed.';
        } else {
            $content = file_get_contents($file['tmp_name']);
            // Normalize line endings
            $content = str_replace(["\r\n", "\r"], "\n", $content);
            $lines = explode("\n\n", trim($content));

            foreach ($lines as $lineBlock) {
                $parts = explode("\n", $lineBlock);
                if (count($parts) >= 3) {
                    $sequence = trim($parts[0]);
                    $timecodes = trim($parts[1]);
                    $textLines = array_slice($parts, 2);
                    $text = trim(implode("\n", $textLines));

                    if (preg_match('/(\d{2}:\d{2}:\d{2},\d{3}) --> (\d{2}:\d{2}:\d{2},\d{3})/', $timecodes, $matches)) {
                        $startTimeStr = $matches[1];
                        $endTimeStr = $matches[2];

                        // Convert timecodes to milliseconds
                        $startTimeMs = 0;
                        list($h, $m, $s_ms) = explode(':', $startTimeStr);
                        list($s, $ms) = explode(',', $s_ms);
                        $startTimeMs += (int)$h * 3600000;
                        $startTimeMs += (int)$m * 60000;
                        $startTimeMs += (int)$s * 1000;
                        $startTimeMs += (int)$ms;

                        $endTimeMs = 0;
                        list($h, $m, $s_ms) = explode(':', $endTimeStr);
                        list($s, $ms) = explode(',', $s_ms);
                        $endTimeMs += (int)$h * 3600000;
                        $endTimeMs += (int)$m * 60000;
                        $endTimeMs += (int)$s * 1000;
                        $endTimeMs += (int)$ms;

                        $parsedSubtitles[] = [
                            'sequence' => $sequence,
                            'startTime' => $startTimeMs,
                            'endTime' => $endTimeMs,
                            'text' => $text
                        ];
                    }
                }
            }
            if (empty($parsedSubtitles) && empty($errors) && !empty(trim($content))) {
                $errors[] = 'Could not parse subtitles. The file might be empty or in an invalid SRT format.';
            }
        }
    }

    if (!empty($errors)) {
        echo json_encode(['success' => false, 'errors' => $errors, 'subtitles' => []]);
    } else {
        echo json_encode(['success' => true, 'subtitles' => $parsedSubtitles, 'errors' => []]);
    }
} else {
    echo json_encode(['success' => false, 'errors' => ['No file uploaded.'], 'subtitles' => []]);
}
?>
