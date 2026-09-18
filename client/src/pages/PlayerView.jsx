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
    const [hideDeathOverlay, setHideDeathOverlay] = useState(false);

    const [localVoteId, setLocalVoteId] = useState(null);
    const [hasConfirmedVote, setHasConfirmedVote] = useState(false);

    const serverPlayer = gameState.players.find(p => p.id === socket.id);
    const currentPlayer = serverPlayer || (playerName ? {
        id: socket.id || 'syncing',
        name: playerName,
        role: '...',
        isAlive: true,
        isReady: false,
        isAdmin: false
    } : null);
    const isSynced = Boolean(serverPlayer && socket.connected);
    const hasRole = currentPlayer && currentPlayer.role !== '...';

    // Reset lật bài khi ván mới bắt đầu (đếm ngược) hoặc khi quay lại phòng chờ
    React.useEffect(() => {
        if (countdown !== null || !hasRole) {
            setIsFlipped(false);
            setHideDeathOverlay(false);
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

    return (
        <div className="flex flex-col items-center justify-between safe-dvh p-3 sm:p-4 relative w-full max-w-md mx-auto animate-fadeIn overflow-x-hidden">
            {/* Header Bar - Mobile Optimized */}
            <header className="w-full flex justify-between items-center z-20 py-2 px-3 rounded-full bg-black/60 backdrop-blur-md border border-white/10 shadow-lg">
                <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${!isSynced ? 'bg-amber-400 animate-pulse' : (currentPlayer?.isAlive ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]' : 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.8)] animate-pulse')}`}></span>
                    <span className="font-heading text-white/90 text-xs sm:text-sm tracking-wider font-semibold truncate max-w-[130px] sm:max-w-[180px]">
                        {currentPlayer?.name || playerName}
                    </span>
                    {!isSynced && (
                        <span className="text-[9px] font-heading px-1.5 py-0.5 rounded bg-amber-950/80 border border-amber-500/30 text-amber-300 animate-pulse">
                            ĐANG KẾT NỐI...
                        </span>
                    )}
                    {isSynced && currentPlayer && !currentPlayer.isAlive && (
                        <span className="text-[10px] font-heading px-1.5 py-0.5 rounded bg-red-950/80 border border-red-500/30 text-red-300">
                            VONG HỒN
                        </span>
                    )}
                </div>
                <div className="flex items-center gap-2">
                    {!currentPlayer.isAlive && hideDeathOverlay && (
                        <button 
                            onClick={() => setHideDeathOverlay(false)} 
                            className="text-[10px] font-heading px-2 py-1 rounded bg-white/5 border border-white/10 text-white/60 hover:text-white"
                        >
                            ☠ TỬ SĨ
                        </button>
                    )}
                    <button
                        onClick={handleLogout}
                        className="p-1.5 text-white/40 hover:text-rose-400 hover:bg-white/5 rounded-full transition-colors"
                        title="Đăng xuất"
                    >
                        <LogOut size={16} />
                    </button>
                </div>
            </header>

            {/* Death overlay */}
            {!currentPlayer.isAlive && !hideDeathOverlay && (
                <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center p-6 soul-mist-overlay animate-fadeIn">
                    <div className="relative mb-3 flex items-center justify-center">
                        <div className="absolute w-24 h-24 rounded-full bg-red-600/20 filter blur-xl animate-pulse"></div>
                        <div className="text-red-500/80 text-6xl sm:text-7xl animate-soulFlame">☠</div>
                    </div>
                    <h1 className="font-display text-3xl sm:text-4xl text-white tracking-[0.25em] mb-1 drop-shadow-[0_4px_20px_rgba(225,29,72,0.4)] text-center">
                        BẠN ĐÃ CHẾT
                    </h1>
                    <div className="text-red-400/70 text-xs tracking-[0.4em] font-heading mt-1 mb-3 uppercase">— LINH HỒN LÌA KHỎI XÁC —</div>
                    <p className="text-white/60 text-xs sm:text-sm text-center max-w-xs leading-relaxed mb-6" style={{ fontFamily: 'var(--font-body)' }}>
                        Bạn đã bị loại khỏi ván đấu.<br/>Bạn có thể tiếp tục quan sát diễn biến hoặc rời phòng.
                    </p>
                    <div className="w-full max-w-xs space-y-3 z-10">
                        <button 
                            onClick={() => setHideDeathOverlay(true)}
                            className="gothic-btn gothic-btn-primary w-full py-3 text-xs tracking-widest uppercase !border-white/40 shadow-[0_0_20px_rgba(255,255,255,0.15)]"
                        >
                            👁️ THEO DÕI DIỄN BIẾN (KHÁN GIẢ)
                        </button>
                        <button 
                            onClick={handleLogout}
                            className="gothic-btn w-full py-2.5 text-xs tracking-widest uppercase text-white/40 hover:text-white/80 !border-white/10"
                        >
                            RỜI KHỎI PHÒNG
                        </button>
                    </div>
                </div>
            )}

            <div className="my-auto flex-1 flex flex-col items-center justify-center w-full">
                {hasRole ? (
                    <div className="w-full flex flex-col items-center space-y-4">
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
                    /* Bệ Thờ Cổ Tự (Arcane Altar) */
                    <div className="w-full flex flex-col items-center space-y-6 my-auto">
                        <div 
                            className={`card-responsive arcane-altar-slot flex flex-col items-center justify-center relative p-6 cursor-pointer transition-all duration-500 ${
                                currentPlayer?.isReady 
                                    ? 'shadow-[0_0_35px_rgba(52,211,153,0.25)] border-emerald-500/40' 
                                    : 'border-white/15'
                            }`}
                            onClick={() => handleReady(!currentPlayer.isReady)}
                        >
                            <div className={`absolute w-36 h-36 rounded-full border border-dashed transition-all duration-700 pointer-events-none ${
                                currentPlayer?.isReady 
                                    ? 'border-emerald-500/40 animate-runeRotate scale-110' 
                                    : 'border-white/10 animate-runeRotate'
                            }`}></div>

                            <span className="absolute top-3 left-4 text-white/20 text-xs pointer-events-none">✦</span>
                            <span className="absolute top-3 right-4 text-white/20 text-xs pointer-events-none">✦</span>
                            <span className="absolute bottom-3 left-4 text-white/20 text-xs pointer-events-none">✦</span>
                            <span className="absolute bottom-3 right-4 text-white/20 text-xs pointer-events-none">✦</span>

                            <div className={`text-5xl mb-3 transition-all duration-500 ${
                                currentPlayer?.isReady 
                                    ? 'text-emerald-300 drop-shadow-[0_0_20px_rgba(52,211,153,0.6)] animate-pulse' 
                                    : 'text-white/20 animate-float'
                            }`}>
                                ☽
                            </div>

                            <span className="font-heading text-sm text-white/80 tracking-[0.25em] text-center uppercase font-medium">
                                {currentPlayer?.isReady ? 'ĐÃ SẴN SÀNG' : 'CHỜ PHÁT BÀI'}
                            </span>

                            <div className="text-[11px] font-heading tracking-widest text-center mt-2">
                                {currentPlayer?.isReady ? (
                                    <span className="text-emerald-400 font-semibold flex items-center justify-center gap-1.5 animate-pulse">
                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                                        ĐÃ KẾT NỐI TÂM LINH
                                    </span>
                                ) : (
                                    <span className="text-white/40">
                                        Chạm để báo Sẵn sàng
                                    </span>
                                )}
                            </div>

                            <div className="absolute bottom-4 inset-x-0 text-center">
                                <span className="text-[10px] font-heading tracking-wider px-2.5 py-1 rounded-full bg-black/60 border border-white/10 text-white/50">
                                    {gameState.players.filter(p => !p.isAdmin && p.isReady).length}/{gameState.players.filter(p => !p.isAdmin).length} NGƯỜI SẴN SÀNG
                                </span>
                            </div>
                        </div>

                        <div className="flex gap-3 w-full max-w-xs">
                            <button
                                onClick={() => handleReady(true)}
                                className={`gothic-btn flex-1 py-3 text-xs tracking-wider transition-all duration-300 ${
                                    currentPlayer.isReady
                                        ? 'gothic-btn-primary !border-emerald-500/60 shadow-[0_0_20px_rgba(52,211,153,0.25)] text-emerald-200'
                                        : 'text-white/60 hover:text-white'
                                }`}
                            >
                                SẴN SÀNG
                            </button>
                            <button
                                onClick={() => handleReady(false)}
                                className={`gothic-btn flex-1 py-3 text-xs tracking-wider transition-all duration-300 ${
                                    !currentPlayer.isReady
                                        ? 'gothic-btn-danger !border-red-500/50 shadow-[0_0_15px_rgba(225,29,72,0.2)] text-red-200'
                                        : 'text-white/40 hover:text-white'
                                }`}
                            >
                                CHƯA
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
