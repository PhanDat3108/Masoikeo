import React, { useState } from 'react';
import { socket } from '../socket.js';
import { useGameStore } from '../store/useGameStore.js';
import { PlayerCard } from '../components/PlayerCard.jsx';
import { LogOut } from 'lucide-react';
import { audioRefs } from '../utils/audio.js';

export const PlayerView = () => {
    const playerName = useGameStore(state => state.playerName);
    const gameState = useGameStore(state => state.gameState);
    const clearSession = useGameStore(state => state.clearSession);
    const countdown = useGameStore(state => state.countdown);
    const [isFlipped, setIsFlipped] = useState(false);

    const [localVoteId, setLocalVoteId] = useState(null);
    const [hasConfirmedVote, setHasConfirmedVote] = useState(false);

    const currentPlayer = gameState.players.find(p => p.id === socket.id);
    const hasRole = currentPlayer && currentPlayer.role !== '...';

    // Reset lật bài khi ván mới bắt đầu (đếm ngược) hoặc khi quay lại phòng chờ
    React.useEffect(() => {
        if (countdown !== null || !hasRole) {
            setIsFlipped(false);
        }
    }, [countdown, hasRole]);

    React.useEffect(() => {
        if (!gameState.vote?.isActive) {
            setLocalVoteId(null);
            setHasConfirmedVote(false);
        }
    }, [gameState.vote?.isActive]);

    const handleReady = (status) => {
        socket.emit('setStatus', status);
    };

    const [confirmAction, setConfirmAction] = useState(null);

    const handleLogout = () => {
        setConfirmAction({
            message: "Bạn có chắc chắn muốn rời phòng?",
            onConfirm: () => {
                socket.emit('leaveRoom');
                clearSession();
            }
        });
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
                            onClick={() => {
                                setIsFlipped(!isFlipped);
                                if (!isFlipped && audioRefs.flip) {
                                    audioRefs.flip.volume = 1;
                                    audioRefs.flip.play().catch(e => console.log('Audio error:', e));
                                }
                            }}
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

            {/* Confirm Modal */}
            {confirmAction && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/85 backdrop-blur-md animate-fadeIn p-4">
                    <div className="gothic-card text-center flex flex-col items-center justify-center p-6 max-w-xs w-full animate-modalPop border border-white/15 shadow-[0_20px_50px_rgba(0,0,0,0.9)]">
                        <div className="text-white/30 text-[10px] tracking-[0.5em] mb-3 font-heading">— XÁC NHẬN —</div>
                        <h3 className="font-heading text-sm text-white/90 mb-6 leading-relaxed px-2">{confirmAction.message}</h3>
                        <div className="flex gap-3 w-full">
                            <button onClick={() => setConfirmAction(null)} className="gothic-btn flex-1 py-2 text-xs text-white/60 hover:text-white border-white/20">HUỶ</button>
                            <button onClick={() => { confirmAction.onConfirm(); setConfirmAction(null); }} className="gothic-btn gothic-btn-danger flex-1 py-2 text-xs">XÁC NHẬN</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Vote Modal */}
            {gameState.vote?.isActive && currentPlayer.isAlive && !hasConfirmedVote && (
                <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/85 backdrop-blur-md animate-fadeIn p-4">
                    <div className="gothic-card w-full max-w-sm flex flex-col max-h-[85vh] animate-modalPop border border-red-500/20 shadow-[0_20px_50px_rgba(0,0,0,0.85)] p-5">
                        <div className="text-white/30 text-[10px] tracking-[0.4em] mb-2 text-center uppercase font-heading">— BỎ PHIẾU KÍN —</div>
                        <h3 className="font-heading text-base sm:text-lg text-red-400 mb-4 text-center tracking-wider drop-shadow-[0_2px_8px_rgba(239,68,68,0.2)]">CHỌN NGƯỜI BỊ TREO CỔ</h3>
                        
                        <div className="overflow-y-auto pr-1 flex-1 space-y-2 mb-4 custom-scrollbar">
                            {gameState.players.filter(p => p.isAlive && !p.isAdmin).map(p => {
                                const isMyVote = localVoteId === p.id;
                                return (
                                    <button 
                                        key={p.id} 
                                        onClick={() => setLocalVoteId(p.id)}
                                        className={`w-full text-left p-3 rounded flex justify-between items-center transition-all duration-200 ${
                                            isMyVote 
                                                ? 'bg-red-950/40 border border-red-500/60 text-white shadow-[0_0_15px_rgba(225,29,72,0.2)] scale-[1.01]' 
                                                : 'bg-white/[0.03] border border-white/5 text-white/70 hover:bg-white/[0.06] hover:text-white'
                                        }`}
                                    >
                                        <span className="font-heading text-sm">{p.name}</span>
                                        {isMyVote && <span className="text-[10px] text-red-400 font-heading tracking-wider px-2 py-0.5 rounded bg-red-950/60 border border-red-500/30">ĐANG CHỌN</span>}
                                    </button>
                                );
                            })}
                        </div>

                        <button 
                            onClick={() => {
                                socket.emit('submitVote', localVoteId);
                                setHasConfirmedVote(true);
                            }}
                            className="gothic-btn gothic-btn-primary w-full py-3 mb-3 text-xs tracking-wider"
                        >
                            XÁC NHẬN VOTE
                        </button>

                        <div className="text-center mt-1">
                            <p className="text-white/40 text-[10px] italic">Bạn có thể xác nhận ngay mà không chọn ai.</p>
                            <p className="text-white/30 text-[10px] mt-2 font-heading animate-mysticPulse">ĐANG CHỜ QUẢN TRÒ ĐÓNG HÒM PHIẾU...</p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
