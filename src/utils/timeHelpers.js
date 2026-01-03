
// Convert seconds to "MM:ss.sss" (e.g. 85.5 -> "1:25.500")
export const formatTime = (seconds) => {
    if (seconds === null || seconds === undefined || isNaN(seconds)) return '-';

    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    const ms = Math.round((seconds - Math.floor(seconds)) * 1000);

    // Padding
    const sStr = s.toString().padStart(2, '0');
    const msStr = ms.toString().padStart(3, '0');

    if (m === 0) {
        // Optional: decide if 0:25.000 or just 25.000. User asked for MM:ss.sss so let's keep minutes even if 0?
        // Usually sim racing uses 1:24.000. If < 1 min, often just 54.123 
        // User request: "MM:ss.sss"
        return `${m}:${sStr}.${msStr}`;
    }

    return `${m}:${sStr}.${msStr}`;
};

// Convert "MM:ss.sss" or "ss.sss" input string back to seconds (float)
export const parseTimeInput = (inputStr) => {
    if (!inputStr) return 0;

    const parts = inputStr.split(':');
    if (parts.length === 2) {
        // MM:SS.mmm
        const m = parseInt(parts[0], 10);
        const s = parseFloat(parts[1]);
        return (m * 60) + s;
    } else if (parts.length === 1) {
        // Just Seconds?
        return parseFloat(parts[0]);
    }
    return 0;
};
