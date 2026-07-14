import React, { useEffect, useState, useRef } from 'react';
import { socket } from './socket.js';
import { useGameStore } from './store/useGameStore.js';
import { AdminPanel } from './pages/AdminPanel.jsx';
import { PlayerView } from './pages/PlayerView.jsx';
import { AutoAdminPanel } from './pages/AutoAdminPanel.jsx';
import { AutoPlayerView } from './pages/AutoPlayerView.jsx';
import { ROLES_CONFIG, GAME_ASSETS, CUSTOM_ROLE_IMAGES } from './constants/roles.js';
import { VOICE_FILES } from './constants/voiceLines.js';
import { usePreloadImages } from './hooks/usePreloadImages.js';
import { v4 as uuidv4 } from 'uuid';

export const audioRefs = {
    flip: new Audio('/card-flip.mp3')
};

// Khởi tạo các audio objects từ VOICE_FILES
Object.entries(VOICE_FILES).forEach(([key, filename]) => {
    audioRefs[key] = new Audio(`/${filename}`);
    if (key === 'sfx_ticking') {
        audioRefs[key].loop = true;
    }
});

const unlockAudio = () => {
    Object.values(audioRefs).forEach(audio => {
        audio.volume = 0;
        const playPromise = audio.play();
        if (playPromise !== undefined) {
            playPromise.then(() => {
                audio.pause();
                audio.currentTime = 0;
                audio.volume = 1;
            }).catch(() => {});
        }
    });
};

function App() {
    const playerName = useGameStore(state => state.playerName);
    const secretId = useGameStore(state => state.secretId);
    const isAdmin = useGameStore(state => state.isAdmin);
    const isKicked = useGameStore(state => state.isKicked);
    const setSession = useGameStore(state => state.setSession);
    const setIsAdmin = useGameStore(state => state.setIsAdmin);
    const clearSession = useGameStore(state => state.clearSession);
    const gameState = useGameStore(state => state.gameState);
    const setGameState = useGameStore(state => state.setGameState);
    const setMatchCount = useGameStore(state => state.setMatchCount);
    const setLeaderboard = useGameStore(state => state.setLeaderboard);
    const setKicked = useGameStore(state => state.setKicked);
    const setCountdown = useGameStore(state => state.setCountdown);
    const setAutoGMState = useGameStore(state => state.setAutoGMState);
    const setSkillResult = useGameStore(state => state.setSkillResult);
    const setSkillError = useGameStore(state => state.setSkillError);
    const setPhaseTransition = useGameStore(state => state.setPhaseTransition);

    const [inputName, setInputName] = useState('');
    const [gameResult, setGameResult] = useState(null);
    const hasJoinedRef = useRef(false);

    const allImages = [
        GAME_ASSETS.cardBackUrl,
        GAME_ASSETS.backgroundUrl,
        "https://i.ibb.co/gkGF615/Chat-GPT-Image-13-46-01-10-thg-7-2026.png",
        ...ROLES_CONFIG.map(r => r.imageUrl),
        ...CUSTOM_ROLE_IMAGES
    ];
    const imagesLoaded = usePreloadImages(allImages);

    // Mở khóa âm thanh ở lần tương tác (click/chạm) đầu tiên của người dùng
    useEffect(() => {
        const handleFirstInteraction = () => {
            if (!window.__audioUnlocked) {
                unlockAudio();
                window.__audioUnlocked = true;
                document.removeEventListener('click', handleFirstInteraction);
                document.removeEventListener('touchstart', handleFirstInteraction);
            }
        };
        document.addEventListener('click', handleFirstInteraction);
        document.addEventListener('touchstart', handleFirstInteraction);
        
        return () => {
            document.removeEventListener('click', handleFirstInteraction);
            document.removeEventListener('touchstart', handleFirstInteraction);
        };
    }, []);

    useEffect(() => {
        const onUpdateState = (state) => {
            setGameState(state);
            if (socket.id) {
                const me = state.players.find(p => p.id === socket.id);
                if (me) {
                    const currentIsAdmin = useGameStore.getState().isAdmin;
                    if (me.isAdmin !== currentIsAdmin) {
                        setIsAdmin(me.isAdmin);
                    }
                }
            }
        };
        const onUpdateMatchCount = (count) => setMatchCount(count);
        const onUpdateLeaderboard = (data) => setLeaderboard(data);

        const onForceLogout = (msg) => {
            alert(msg);
            clearSession();
        };

        const onKicked = () => {
            alert("Bạn đã bị quản trò kick khỏi phòng!");
            setKicked(true);
            clearSession();
        };

        const onGameEnded = ({ team: winningTeam, winners }) => {
            const state = useGameStore.getState();
            const meId = socket.id;
            const me = state.gameState.players.find(p => p.id === meId);
            if (!me) return;

            let isWin = winners.includes(meId);
            let teamName = "HÒA";

            if (winningTeam === 'VILLAGER') teamName = 'PHE DÂN LÀNG';
            else if (winningTeam === 'WEREWOLF') teamName = 'PHE SÓI';
            else if (winningTeam === 'COUPLE') teamName = 'PHE CẶP ĐÔI';
            else if (winningTeam === 'SIDA_SOLO') teamName = 'SIDA';

            if (me.isAdmin) {
                setGameResult({ message: `VÁN ĐẤU KẾT THÚC`, teamName, isWin: true });
            } else {
                setGameResult({ message: isWin ? 'CHIẾN THẮNG' : 'THẤT BẠI', teamName, isWin });
            }
        };

        socket.on('autoGM:countdown', (time) => {
            setCountdown(time);
        });

        socket.on('autoGM:playAudio', (voiceKey) => {
            // Dừng mọi âm thanh voice khác trước khi phát
            Object.keys(VOICE_FILES).forEach(key => {
                // Không dừng sfx nếu đang phát
                if (!key.startsWith('sfx_')) {
                    const audio = audioRefs[key];
                    if (audio) {
                        audio.pause();
                        audio.currentTime = 0;
                    }
                }
            });

            if (audioRefs[voiceKey]) {
                audioRefs[voiceKey].volume = 1;
                audioRefs[voiceKey].play().catch(() => {});
            }
        });

        socket.on('autoGM:stopAudio', (voiceKey) => {
            if (audioRefs[voiceKey]) {
                audioRefs[voiceKey].pause();
                audioRefs[voiceKey].currentTime = 0;
            }
        });

        const onStartCountdown = () => {
            setCountdown(5);
            let timeLeft = 5;

            if (audioRefs['sfx_ticking']) {
                audioRefs['sfx_ticking'].volume = 1;
                audioRefs['sfx_ticking'].play().catch(e => console.log('Audio error:', e));
            }

            const timer = setInterval(() => {
                timeLeft--;
                if (timeLeft <= 0) {
                    clearInterval(timer);
                    setCountdown(null);
                    
                    if (audioRefs['sfx_ticking']) {
                        audioRefs['sfx_ticking'].pause();
                        audioRefs['sfx_ticking'].currentTime = 0;
                    }

                    if (audioRefs['sfx_wolf_howl']) {
                        audioRefs['sfx_wolf_howl'].volume = 1;
                        audioRefs['sfx_wolf_howl'].play().catch(e => console.log('Audio error:', e));
                    }
                } else {
                    setCountdown(timeLeft);
                }
            }, 1000);
        };

        const onPlayWolfHowl = () => {
            if (audioRefs['sfx_wolf_howl']) {
                audioRefs['sfx_wolf_howl'].volume = 1;
                audioRefs['sfx_wolf_howl'].play().catch(e => console.log('Audio error:', e));
            }
        };

        const onConnect = () => {
            const currentName = useGameStore.getState().playerName;
            const currentSecret = useGameStore.getState().secretId;
            const currentKicked = useGameStore.getState().isKicked;

            if (currentName && currentSecret && !currentKicked) {
                socket.emit('join', { name: currentName, secretId: currentSecret });
            }
        };

        // Auto GM events
        const onAutoGMState = (state) => setAutoGMState(state);
        const onAutoGMSkillResult = (result) => setSkillResult(result);
        const onAutoGMSkillError = (error) => setSkillError(error);
        const onAutoGMPhaseTransition = (transition) => {
            setPhaseTransition(transition);
            // Phát âm thanh khi chuyển phase
            if (transition.to === 'NIGHT') {
                audioRefs.howl.volume = 1;
                audioRefs.howl.play().catch(() => {});
            } else if (transition.to === 'DAY') {
                // TODO: Thêm âm thanh gà gáy khi có file
                // Tạm thời dùng sound khác hoặc bỏ qua
            }
        };

        socket.on('connect', onConnect);
        socket.on('updateState', onUpdateState);
        socket.on('updateMatchCount', onUpdateMatchCount);
        socket.on('updateLeaderboard', onUpdateLeaderboard);
        socket.on('forceLogout', onForceLogout);
        socket.on('youAreKicked', onKicked);
        socket.on('gameEnded', onGameEnded);
        socket.on('startCountdown', onStartCountdown);
        socket.on('playWolfHowl', onPlayWolfHowl);
        socket.on('autoGM:stateUpdate', onAutoGMState);
        socket.on('autoGM:skillResult', onAutoGMSkillResult);
        socket.on('autoGM:skillError', onAutoGMSkillError);
        socket.on('autoGM:phaseTransition', onAutoGMPhaseTransition);

        if (!socket.connected) {
            socket.connect();
        } else {
            onConnect();
        }

        return () => {
            socket.off('connect', onConnect);
            socket.off('updateState', onUpdateState);
            socket.off('updateMatchCount', onUpdateMatchCount);
            socket.off('updateLeaderboard', onUpdateLeaderboard);
            socket.off('forceLogout', onForceLogout);
            socket.off('youAreKicked', onKicked);
            socket.off('gameEnded', onGameEnded);
            socket.off('startCountdown', onStartCountdown);
            socket.off('playWolfHowl', onPlayWolfHowl);
            socket.off('autoGM:stateUpdate', onAutoGMState);
            socket.off('autoGM:skillResult', onAutoGMSkillResult);
            socket.off('autoGM:skillError', onAutoGMSkillError);
            socket.off('autoGM:phaseTransition', onAutoGMPhaseTransition);
        };
    }, []);

    useEffect(() => {
        if (playerName && secretId && !isKicked && socket.connected && !hasJoinedRef.current) {
            socket.emit('join', { name: playerName, secretId });
            hasJoinedRef.current = true;
        }
    }, [playerName, secretId, isKicked]);

    const handleJoin = (e) => {
        e.preventDefault();
        if (!inputName.trim()) return;

        const isAdm = inputName.toLowerCase() === 'admin';
        const newSecret = uuidv4();

        hasJoinedRef.current = false;
        unlockAudio(); // Mở khóa âm thanh cho trình duyệt
        setSession(inputName, newSecret, isAdm);

        // Phát tiếng sói hú khi người chơi click tham gia
        if (audioRefs['sfx_wolf_howl']) {
            audioRefs['sfx_wolf_howl'].volume = 1;
            audioRefs['sfx_wolf_howl'].currentTime = 0;
            audioRefs['sfx_wolf_howl'].play().catch(() => {});
        }
    };

    if (!imagesLoaded) {
        return (
            <div className="h-screen w-screen flex flex-col items-center justify-center gap-6 relative" style={{ background: '#0A0A0A' }}>
                {/* Decorative background circle */}
                <div className="absolute w-[300px] h-[300px] rounded-full border border-white/5 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none"></div>
                
                <div className="wolf-loading"></div>
                <div className="font-display text-xs text-white/30 animate-mysticPulse tracking-[0.4em] mt-4">
                    ĐANG THỨC TỈNH...
                </div>
            </div>
        );
    }

    return (
        <div className="h-screen w-screen overflow-hidden flex relative" style={{ background: '#0F0F0F' }}>

            {/* Background Image with subtle overlay */}
            {GAME_ASSETS.backgroundUrl && (
                <div
                    className="absolute inset-0 bg-cover bg-center pointer-events-none opacity-50"
                    style={{ backgroundImage: `url(${GAME_ASSETS.backgroundUrl})`, zIndex: 0 }}
                />
            )}

            {/* Decorative magic circle */}
            <div className="magic-circle" style={{ top: '-150px', right: '-150px', opacity: 0.4, zIndex: 1 }}></div >
            <div className="magic-circle" style={{ bottom: '-200px', left: '-200px', opacity: 0.2, animationDirection: 'reverse', zIndex: 1 }}></div>

            {/* Game Result Modal */}
            {gameResult && (
                <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm animate-fadeIn">
                    <div className="gothic-card text-center flex flex-col items-center justify-center p-8 max-w-sm w-11/12 border border-white/20">
                        <div className="text-white/30 text-xs tracking-[0.5em] mb-4">— ✦ —</div>
                        <h2 className={`font-display text-4xl mb-2 drop-shadow-[0_0_15px_rgba(255,255,255,0.2)] ${gameResult.isWin ? 'text-[#e0e0e0]' : 'text-red-900/80'}`}>
                            {gameResult.message}
                        </h2>
                        {gameResult.teamName && (
                            <p className="font-heading text-white/50 tracking-[0.2em] mb-8 text-xs">
                                {gameResult.teamName} GIÀNH CHIẾN THẮNG
                            </p>
                        )}
                        <button
                            className="gothic-btn gothic-btn-primary px-8 py-3 w-full"
                            onClick={() => setGameResult(null)}
                        >
                            ĐÓNG
                        </button>
                        <div className="text-white/30 text-xs tracking-[0.5em] mt-6">— ✦ —</div>
                    </div>
                </div>
            )}

            <div className="relative z-10 w-full h-full flex">
                {!playerName ? (
                    /* ===== LOGIN SCREEN ===== */
                    <div className="m-auto w-full max-w-sm px-6 animate-fadeIn">
                        <div className="gothic-card text-center" style={{ padding: '2.5rem 2rem' }}>

                            {/* Decorative top ornament */}
                            <div className="text-white/20 text-xs tracking-[0.5em] mb-6">— ✦ —</div>
                            <div className="flex justify-center items-center h-36 mb-4">
                                <img
                                    src="https://i.ibb.co/gkGF615/Chat-GPT-Image-13-46-01-10-thg-7-2026.png"
                                    alt="Logo"
                                    className="h-full object-contain"
                                />
                            </div>
                            {/* Title */}

                            <p className="font-heading text-[0.6rem] text-white/25 tracking-[0.4em] mb-8">
                                NIGHT OF THE WEREWOLF
                            </p>

                            {/* Divider */}
                            <div className="gothic-divider">✧</div>

                            {/* Form */}
                            <form onSubmit={handleJoin} className="flex flex-col gap-4 mt-6">
                                <input
                                    type="text"
                                    placeholder="Nhập tên của bạn..."
                                    value={inputName}
                                    onChange={(e) => setInputName(e.target.value)}
                                    className="gothic-input text-center"
                                    autoFocus
                                />
                                <button
                                    type="submit"
                                    disabled={!inputName.trim()}
                                    className="gothic-btn gothic-btn-primary w-full py-3"
                                >
                                    THAM GIA
                                </button>
                            </form>

                            {/* Hint */}
                            <p className="text-white/20 text-xs mt-6 italic" style={{ fontFamily: 'var(--font-body)' }}>
                                Nhập "admin" để làm Quản trò
                            </p>

                            {/* Decorative bottom ornament */}
                            <div className="text-white/20 text-xs tracking-[0.5em] mt-6">— ✦ —</div>
                        </div>
                    </div>
                ) : (
                    isAdmin
                        ? (gameState.isAutoGM ? <AutoAdminPanel /> : <AdminPanel />)
                        : (gameState.isAutoGM ? <AutoPlayerView /> : <PlayerView />)
                )}
            </div>
        </div>
    );
}

export default App;
