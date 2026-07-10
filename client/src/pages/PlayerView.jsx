import React, { useState } from 'react';
import { socket } from '../socket.js';
import { useGameStore } from '../store/useGameStore.js';
import { PlayerCard } from '../components/PlayerCard.jsx';
import { LogOut } from 'lucide-react';

export const PlayerView = () => {
    const playerName = useGameStore(state => state.playerName);
    const gameState = useGameStore(state => state.gameState);
    const clearSession = useGameStore(state => state.clearSession);
    const countdown = useGameStore(state => state.countdown);
    const [isFlipped, setIsFlipped] = useState(false);

    const currentPlayer = gameState.players.find(p => p.id === socket.id);
    const hasRole = currentPlayer && currentPlayer.role !== '...';

    // Reset lật bài khi ván mới bắt đầu (đếm ngược) hoặc khi quay lại phòng chờ
    React.useEffect(() => {
        if (countdown !== null || !hasRole) {
            setIsFlipped(false);
        }
    }, [countdown, hasRole]);

    const handleReady = (status) => {
        socket.emit('setStatus', status);
    };

    const handleLogout = () => {
        socket.emit('leaveRoom');
        clearSession();
    };

    if (!currentPlayer) {
        return (
            <div className="flex flex-col items-center justify-center h-full w-full gap-8 relative">
                <div className="wolf-loading" style={{ transform: 'scale(0.8)' }}></div>
                <div className="font-heading text-white/20 text-xs tracking-[0.3em] animate-mysticPulse text-center">
                    ĐANG KẾT NỐI VỚI<br/>THẾ GIỚI TÂM LINH...
                </div>
            </div>
        );
    }


    return (
        <div className="flex flex-col items-center justify-center h-full p-4 relative w-full max-w-md mx-auto animate-fadeIn">
            {/* Header */}
            <div className="absolute top-4 left-4 right-4 flex justify-between items-center z-10">
                <div className="font-heading text-white/60 tracking-[0.15em] text-sm">
                    <span className="text-white/30">✦</span>
                    <span className="ml-2">{currentPlayer.name}</span>
                </div>
                <button
                    onClick={handleLogout}
                    className="gothic-btn p-2"
                    title="Đăng xuất"
                    style={{ padding: '0.4rem 0.6rem' }}
                >
                    <LogOut size={16} />
                </button>
            </div>

            {/* Death overlay */}
            {!currentPlayer.isAlive && (
                <div className="absolute inset-0 z-20 flex flex-col items-center justify-center"
                    style={{ background: 'rgba(0,0,0,0.92)' }}>
                    <div className="text-white/10 text-6xl mb-4">☠</div>
                    <h1 className="font-display text-3xl text-white/60 animate-mysticPulse"
                        style={{ textShadow: '0 0 30px rgba(255,255,255,0.1)' }}>
                        BẠN ĐÃ CHẾT
                    </h1>
                    <div className="text-white/15 text-xs tracking-[0.4em] mt-3 font-heading">— ✦ —</div>
                </div>
            )}

            <div className="mt-16 flex-1 flex flex-col items-center justify-center w-full">
                {hasRole ? (
                    <div className="w-full flex flex-col items-center space-y-6">
                        <PlayerCard
                            role={currentPlayer.role}
                            isFlipped={isFlipped}
                            onClick={() => setIsFlipped(!isFlipped)}
                            countdown={countdown}
                        />
                        <p className="text-white/60 text-xs tracking-[0.3em] font-heading animate-mysticPulse drop-shadow-md">
                            {countdown !== null ? 'ĐANG KẾT NỐI TÂM LINH...' : 'CHẠM ĐỂ LẬT BÀI'}
                        </p>
                    </div>
                ) : (
                    <div className="w-full flex flex-col items-center space-y-8">
                        {/* Waiting card placeholder */}
                        <div className="w-64 h-[22rem] flex flex-col items-center justify-center relative"
                            style={{ border: '1px dashed #333', borderRadius: '4px', background: '#0A0A0A' }}>

                            <div className="text-white/8 text-4xl mb-4 animate-float">☽</div>
                            <span className="font-heading text-white/20 tracking-[0.2em] text-xs text-center px-4">
                                CHỜ QUẢN TRÒ<br />PHÁT BÀI
                            </span>
                            <div className="text-white/10 text-xs tracking-[0.4em] mt-4">· · ·</div>
                        </div>

                        {/* Ready buttons */}
                        <div className="flex gap-3">
                            <button
                                onClick={() => handleReady(true)}
                                className={`gothic-btn ${currentPlayer.isReady
                                    ? 'gothic-btn-primary !border-white/60'
                                    : ''
                                    }`}
                                style={currentPlayer.isReady ? { boxShadow: '0 0 15px rgba(255,255,255,0.08)' } : {}}
                            >
                                ĐÃ SẴN SÀNG
                            </button>
                            <button
                                onClick={() => handleReady(false)}
                                className={`gothic-btn ${!currentPlayer.isReady
                                    ? 'gothic-btn-danger !border-white/40'
                                    : ''
                                    }`}
                            >
                                CHƯA SẴN SÀNG
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
