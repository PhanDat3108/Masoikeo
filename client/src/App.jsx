import React, { useEffect, useState, useRef } from 'react';
import { socket } from './socket.js';
import { useGameStore } from './store/useGameStore.js';
import { AdminPanel } from './pages/AdminPanel.jsx';
import { PlayerView } from './pages/PlayerView.jsx';
import { ROLES_CONFIG, GAME_ASSETS } from './constants/roles.js';
import { usePreloadImages } from './hooks/usePreloadImages.js';
import { v4 as uuidv4 } from 'uuid';

function App() {
    const playerName = useGameStore(state => state.playerName);
    const secretId = useGameStore(state => state.secretId);
    const isAdmin = useGameStore(state => state.isAdmin);
    const isKicked = useGameStore(state => state.isKicked);
    const setSession = useGameStore(state => state.setSession);
    const setIsAdmin = useGameStore(state => state.setIsAdmin);
    const clearSession = useGameStore(state => state.clearSession);
    const setGameState = useGameStore(state => state.setGameState);
    const setMatchCount = useGameStore(state => state.setMatchCount);
    const setLeaderboard = useGameStore(state => state.setLeaderboard);
    const setKicked = useGameStore(state => state.setKicked);
    const setCountdown = useGameStore(state => state.setCountdown);

    const [inputName, setInputName] = useState('');
    const [gameResult, setGameResult] = useState(null);
    const hasJoinedRef = useRef(false);

    const allImages = [
        GAME_ASSETS.cardBackUrl,
        GAME_ASSETS.backgroundUrl,
        "https://i.ibb.co/gkGF615/Chat-GPT-Image-13-46-01-10-thg-7-2026.png",
        ...ROLES_CONFIG.map(r => r.imageUrl)
    ];
    const imagesLoaded = usePreloadImages(allImages);

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

        const onStartCountdown = () => {
            setCountdown(5);
            let timeLeft = 5;
            const timer = setInterval(() => {
                timeLeft--;
                if (timeLeft <= 0) {
                    clearInterval(timer);
                    setCountdown(null);
                } else {
                    setCountdown(timeLeft);
                }
            }, 1000);
        };

        const onConnect = () => {
            const currentName = useGameStore.getState().playerName;
            const currentSecret = useGameStore.getState().secretId;
            const currentKicked = useGameStore.getState().isKicked;

            if (currentName && currentSecret && !currentKicked) {
                socket.emit('join', { name: currentName, secretId: currentSecret });
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
        setSession(inputName, newSecret, isAdm);
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
                    isAdmin ? <AdminPanel /> : <PlayerView />
                )}
            </div>
        </div>
    );
}

export default App;
