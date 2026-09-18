import { VOICE_FILES } from '../constants/voiceLines.js';

// Danh sách các audio objects được khởi tạo
export const audioRefs = {
    flip: typeof Audio !== 'undefined' ? new Audio('/card-flip.mp3') : null,
};

// Khởi tạo tất cả file từ VOICE_FILES
if (typeof Audio !== 'undefined') {
    Object.entries(VOICE_FILES).forEach(([key, filename]) => {
        // Tránh tạo file không tồn tại gây 404 (ví dụ rooster.mp3)
        if (key === 'sfx_rooster') {
            return;
        }

        try {
            const audio = new Audio(`/${filename}`);
            if (key === 'sfx_ticking') {
                audio.loop = true;
            }
            audioRefs[key] = audio;
        } catch (e) {
            console.warn(`Could not load audio: ${key}`, e);
        }
    });

    // Alias để tương thích ngược an toàn
    if (audioRefs['sfx_wolf_howl']) {
        audioRefs.howl = audioRefs['sfx_wolf_howl'];
    }
    if (audioRefs['sfx_ticking']) {
        audioRefs.ticking = audioRefs['sfx_ticking'];
    }
}

/**
 * Mở khóa quyền tự động phát âm thanh của trình duyệt sau tương tác đầu tiên
 */
export const unlockAudio = () => {
    if (typeof window === 'undefined') return;
    Object.values(audioRefs).forEach(audio => {
        if (!audio) return;
        try {
            audio.volume = 0;
            const playPromise = audio.play();
            if (playPromise !== undefined) {
                playPromise.then(() => {
                    audio.pause();
                    audio.currentTime = 0;
                    audio.volume = 1;
                }).catch(() => {});
            }
        } catch (_) {}
    });
};

/**
 * Phát giọng nói GM (dừng các giọng khác trước khi phát)
 */
export const playVoice = (voiceKey) => {
    // Dừng mọi giọng nói khác trước khi phát
    Object.keys(VOICE_FILES).forEach(key => {
        if (!key.startsWith('sfx_')) {
            const audio = audioRefs[key];
            if (audio) {
                try {
                    audio.pause();
                    audio.currentTime = 0;
                } catch (_) {}
            }
        }
    });

    const targetAudio = audioRefs[voiceKey];
    if (targetAudio) {
        try {
            targetAudio.volume = 1;
            targetAudio.currentTime = 0;
            targetAudio.play().catch(() => {});
        } catch (_) {}
    }
};

/**
 * Dừng giọng nói GM
 */
export const stopVoice = (voiceKey) => {
    const audio = audioRefs[voiceKey];
    if (audio) {
        try {
            audio.pause();
            audio.currentTime = 0;
        } catch (_) {}
    }
};

/**
 * Phát hiệu ứng âm thanh (SFX)
 */
export const playSfx = (sfxKey) => {
    const audio = audioRefs[sfxKey];
    if (audio) {
        try {
            audio.volume = 1;
            audio.currentTime = 0;
            audio.play().catch(() => {});
        } catch (_) {}
    }
};

/**
 * Dừng hiệu ứng âm thanh (SFX)
 */
export const stopSfx = (sfxKey) => {
    const audio = audioRefs[sfxKey];
    if (audio) {
        try {
            audio.pause();
            audio.currentTime = 0;
        } catch (_) {}
    }
};
