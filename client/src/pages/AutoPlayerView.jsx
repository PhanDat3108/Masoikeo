import React, { useState, useEffect } from 'react';
import { socket } from '../socket.js';
import { useGameStore } from '../store/useGameStore.js';
import { PlayerCard } from '../components/PlayerCard.jsx';
import { SkillPopup, SeerResultPopup } from '../components/SkillPopup.jsx';
import { LogOut, Zap } from 'lucide-react';

// Mô tả kỹ năng ngắn cho hiển thị trên card
const ROLE_SHORT_DESC = {
    'Dân Ngu': 'Dân làng bình thường',
    'Sói': 'Cắn 1 người mỗi đêm',
    'Tiên tri': 'Soi 1 người mỗi đêm',
    'Bảo vệ': 'Bảo vệ 1 người mỗi đêm',
    'Thợ săn': 'Bắn 1 người khi chết',
    'Phù Thuỷ': 'Cứu hoặc giết 1 người',
    'Kẻ Bị Nguyền': 'Bị cắn → thành Sói',
    'Sida': 'Bị treo → thắng ngay',
    'Cupid': 'Ghép đôi đêm đầu',
};

export const AutoPlayerView = () => {
    const playerName = useGameStore(state => state.playerName);
    const gameState = useGameStore(state => state.gameState);
    const autoGMState = useGameStore(state => state.autoGMState);
    const clearSession = useGameStore(state => state.clearSession);
    const countdown = useGameStore(state => state.countdown);
    const skillResult = useGameStore(state => state.skillResult);
    const clearSkillResult = useGameStore(state => state.clearSkillResult);

    const [isFlipped, setIsFlipped] = useState(false);
    const [showSkillPopup, setShowSkillPopup] = useState(false);
    const [showDayMessage, setShowDayMessage] = useState(false);
    const [confirmAction, setConfirmAction] = useState(null);

    const currentPlayer = gameState.players.find(p => p.id === socket.id);
    const hasRole = currentPlayer && currentPlayer.role !== '...';
    const phase = autoGMState?.phase || 'LOBBY';
    const isNight = phase.startsWith('NIGHT') || phase === 'WIN_CHECK_NIGHT';
    const isDay = phase.startsWith('DAY') || phase === 'WIN_CHECK_DAY';
    const isInGame = phase !== 'LOBBY' && phase !== 'CARDS_DEALT' && phase !== 'GAME_OVER';
    const currentTurnRole = autoGMState?.currentTurnRole;
    const role = currentPlayer?.role || '...';

    // Timer hiển thị
    const [timeLeftStr, setTimeLeftStr] = useState('');
    useEffect(() => {
        if (autoGMState?.phaseEndTime) {
            const interval = setInterval(() => {
                const diff = autoGMState.phaseEndTime - Date.now();
                if (diff <= 0) {
                    setTimeLeftStr('00:00');
                    clearInterval(interval);
                } else {
                    const m = Math.floor(diff / 60000);
                    const s = Math.floor((diff % 60000) / 1000);
                    setTimeLeftStr(`${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`);
                }
            }, 200);
            return () => clearInterval(interval);
        } else {
            setTimeLeftStr('');
        }
    }, [autoGMState?.phaseEndTime]);

    // Reset flip khi ván mới
    useEffect(() => {
        if (countdown !== null || !hasRole) {
            setIsFlipped(false);
        }
    }, [countdown, hasRole]);

    const isMyTurn = (() => {
        if (!currentPlayer?.isAlive || !isNight) return false;
        if (currentTurnRole === role) return true;
        // Sói (bao gồm Kẻ bị nguyền đã chuyển)
        if (currentTurnRole === 'Sói' && autoGMState?.myMeta?.team === 'WOLF') return true;
        // Thợ săn luôn được phép dùng kỹ năng bất kỳ lúc nào trong đêm
        if (role === 'Thợ săn') return true;
        return false;
    })();

    const handleLogout = () => {
        setConfirmAction({
            message: "Bạn có chắc chắn muốn rời phòng?",
            onConfirm: () => { socket.emit('leaveRoom'); clearSession(); }
        });
    };

    const handleSkillButton = () => {
        if (!isInGame) return;
        if (isDay && !isMyTurn) {
            setShowDayMessage(true);
            setTimeout(() => setShowDayMessage(false), 2000);
            return;
        }
        setShowSkillPopup(true);
    };

    // Vote ban ngày
    const [localVoteId, setLocalVoteId] = useState(null);
    const [hasConfirmedVote, setHasConfirmedVote] = useState(false);

    useEffect(() => {
        if (phase !== 'DAY_VOTE') {
            setLocalVoteId(null);
            setHasConfirmedVote(false);
        }
    }, [phase]);

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
                <button onClick={handleLogout} className="gothic-btn p-2" title="Đăng xuất"
                    style={{ padding: '0.4rem 0.6rem' }}>
                    <LogOut size={16} />
                </button>
            </div>

            {/* ===== TRẠNG THÁI NGÀY/ĐÊM ===== */}
            {isInGame && (
                <div className="absolute top-16 left-4 right-4 text-center z-10">
                    <div className={`font-display text-2xl tracking-[0.3em] ${isNight ? 'text-blue-200/50' : 'text-yellow-200/50'}`}
                         style={{ textShadow: `0 0 30px ${isNight ? 'rgba(100,100,255,0.2)' : 'rgba(255,255,100,0.2)'}` }}>
                        {isNight ? '🌙 BAN ĐÊM' : '☀ BAN NGÀY'}
                    </div>

                    {/* Phase label + Timer */}
                    <div className="mt-2 flex items-center justify-center gap-3">
                        {currentTurnRole && isNight && (
                            <span className="text-white/30 text-[10px] font-heading tracking-wider animate-mysticPulse">
                                {currentTurnRole === role || isMyTurn ? '✦ ĐẾN LƯỢT BẠN ✦' : `${currentTurnRole} đang hành động...`}
                            </span>
                        )}
                        {phase === 'DAY_DISCUSS' && (
                            <span className="text-white/40 text-[10px] font-heading tracking-wider">THẢO LUẬN</span>
                        )}
                        {phase === 'DAY_VOTE' && (
                            <span className="text-red-400/60 text-[10px] font-heading tracking-wider animate-mysticPulse">BỎ PHIẾU</span>
                        )}
                        {phase === 'DAY_ANNOUNCE' && (
                            <span className="text-white/40 text-[10px] font-heading tracking-wider">CÔNG BỐ</span>
                        )}
                        {timeLeftStr && (
                            <span className="font-heading text-sm text-white/50">{timeLeftStr}</span>
                        )}
                    </div>

                    {/* Công bố người chết */}
                    {phase === 'DAY_ANNOUNCE' && autoGMState?.dayActions?.deathMessages?.length > 0 && (
                        <div className="mt-3 p-3" style={{ background: '#0a0a0a', border: '1px solid #222', borderRadius: '2px' }}>
                            <p className="text-red-400/60 text-xs font-heading mb-2">ĐÊM QUA, NHỮNG NGƯỜI SAU ĐÃ CHẾT:</p>
                            {autoGMState.dayActions.deathMessages.map((d, i) => (
                                <p key={i} className="text-white/60 text-sm font-heading">
                                    💀 {d.playerName}
                                </p>
                            ))}
                        </div>
                    )}
                    {phase === 'DAY_ANNOUNCE' && autoGMState?.dayActions?.deathMessages?.length === 0 && (
                        <div className="mt-3 p-3" style={{ background: '#0a0a0a', border: '1px solid #222', borderRadius: '2px' }}>
                            <p className="text-white/40 text-xs font-heading">Đêm qua không ai chết. 🌅</p>
                        </div>
                    )}
                </div>
            )}

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
                    <p className="text-white/20 text-xs mt-4" style={{ fontFamily: 'var(--font-body)' }}>
                        Bạn chỉ có thể theo dõi diễn biến game.
                    </p>
                </div>
            )}

            {/* ===== NỘI DUNG CHÍNH ===== */}
            <div className="mt-16 flex-1 flex flex-col items-center justify-center w-full">
                {hasRole && isInGame ? (
                    <div className="w-full flex flex-col items-center space-y-4">
                        {/* Lá bài nhân vật — luôn hiển thị ngửa khi đang trong game */}
                        <PlayerCard
                            role={currentPlayer.role}
                            isFlipped={true}
                            onClick={() => {}}
                            countdown={null}
                        />

                        {/* Tên role + mô tả */}
                        <div className="text-center">
                            <h2 className="font-display text-lg text-white/70 tracking-[0.2em]">{currentPlayer.role}</h2>
                            <p className="text-white/30 text-xs mt-1" style={{ fontFamily: 'var(--font-body)' }}>
                                {ROLE_SHORT_DESC[currentPlayer.role] || ''}
                            </p>
                        </div>

                        {/* Thông tin người yêu */}
                        {autoGMState?.loverInfo && (
                            <div className="p-2 px-4 text-center" style={{ background: '#110a0a', border: '1px solid #311', borderRadius: '2px' }}>
                                <p className="text-white/30 text-[10px] font-heading">💕 NGƯỜI YÊU</p>
                                <p className="text-white/60 text-sm font-heading mt-0.5">
                                    {autoGMState.loverInfo.name} · {autoGMState.loverInfo.role}
                                </p>
                            </div>
                        )}

                        {/* Nút SỬ DỤNG KỸ NĂNG */}
                        {currentPlayer.isAlive && (
                            <button
                                onClick={handleSkillButton}
                                className={`gothic-btn w-full max-w-xs py-3 flex items-center justify-center gap-2 ${
                                    isMyTurn ? 'gothic-btn-primary animate-mysticPulse !border-white/60' : ''
                                }`}
                                style={isMyTurn ? { boxShadow: '0 0 20px rgba(255,255,255,0.1)' } : {}}
                            >
                                <Zap size={16} />
                                {isMyTurn ? 'SỬ DỤNG KỸ NĂNG — ĐẾN LƯỢT BẠN!' : 'SỬ DỤNG KỸ NĂNG'}
                            </button>
                        )}

                        {/* Thông báo ban ngày */}
                        {showDayMessage && (
                            <div className="animate-fadeIn text-white/40 text-xs text-center p-2" 
                                 style={{ background: '#111', border: '1px solid #222', borderRadius: '2px' }}>
                                Hãy chờ đến ban đêm để sử dụng kỹ năng.
                            </div>
                        )}
                    </div>
                ) : hasRole && phase === 'CARDS_DEALT' ? (
                    /* Giai đoạn xem bài */
                    <div className="w-full flex flex-col items-center space-y-6">
                        <PlayerCard
                            role={currentPlayer.role}
                            isFlipped={isFlipped}
                            onClick={() => {
                                setIsFlipped(!isFlipped);
                                if (!isFlipped) {
                                    import('../App.jsx').then(({ audioRefs }) => {
                                        audioRefs.flip.volume = 1;
                                        audioRefs.flip.play().catch(() => {});
                                    });
                                }
                            }}
                            countdown={countdown}
                        />
                        <p className="text-white/60 text-xs tracking-[0.3em] font-heading animate-mysticPulse drop-shadow-md">
                            {countdown !== null ? 'ĐANG KẾT NỐI TÂM LINH...' : 'CHẠM ĐỂ LẬT BÀI'}
                        </p>
                    </div>
                ) : (
                    /* Phòng chờ */
                    <div className="w-full flex flex-col items-center space-y-8">
                        <div className="w-64 h-[22rem] flex flex-col items-center justify-center relative"
                            style={{ border: '1px dashed #333', borderRadius: '4px', background: '#0A0A0A' }}>
                            <div className="text-white/8 text-4xl mb-4 animate-float">☽</div>
                            <span className="font-heading text-white/20 tracking-[0.2em] text-xs text-center px-4">
                                CHỜ QUẢN TRÒ<br />PHÁT BÀI
                            </span>
                            <div className="text-white/10 text-xs tracking-[0.4em] mt-4">· · ·</div>
                        </div>
                        <div className="flex gap-3">
                            <button onClick={() => socket.emit('setStatus', true)}
                                className={`gothic-btn ${currentPlayer?.isReady ? 'gothic-btn-primary !border-white/60' : ''}`}
                                style={currentPlayer?.isReady ? { boxShadow: '0 0 15px rgba(255,255,255,0.08)' } : {}}>
                                ĐÃ SẴN SÀNG
                            </button>
                            <button onClick={() => socket.emit('setStatus', false)}
                                className={`gothic-btn ${!currentPlayer?.isReady ? 'gothic-btn-danger !border-white/40' : ''}`}>
                                CHƯA SẴN SÀNG
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* ===== VOTE BAN NGÀY ===== */}
            {phase === 'DAY_VOTE' && currentPlayer.isAlive && !hasConfirmedVote && (
                <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/95 backdrop-blur-sm animate-fadeIn p-4">
                    <div className="gothic-card w-full max-w-sm flex flex-col max-h-[80vh]">
                        <div className="text-white/30 text-[10px] tracking-[0.5em] mb-4 text-center">— BỎ PHIẾU —</div>
                        <h3 className="font-heading text-lg text-red-500/90 mb-4 text-center drop-shadow-md">CHỌN NGƯỜI BỊ TREO CỔ</h3>
                        
                        <div className="overflow-y-auto pr-1 flex-1 space-y-2 mb-4">
                            {gameState.players.filter(p => p.isAlive && !p.isAdmin).map(p => {
                                const isMyVote = localVoteId === p.id;
                                return (
                                    <button 
                                        key={p.id}
                                        onClick={() => setLocalVoteId(p.id)}
                                        className={`w-full text-left p-3 flex justify-between items-center transition-all ${isMyVote ? 'bg-red-900/30 border border-red-500/50 text-white' : 'bg-[#111] border border-[#222] text-white/60 hover:bg-[#1a1a1a] hover:text-white/90'}`}
                                        style={{ borderRadius: '2px' }}
                                    >
                                        <span className="font-heading text-sm">{p.name}</span>
                                        {isMyVote && <span className="text-[10px] text-red-400 font-heading">ĐANG CHỌN</span>}
                                    </button>
                                );
                            })}
                        </div>

                        <button 
                            onClick={() => {
                                socket.emit('autoGM:dayVote', localVoteId);
                                setHasConfirmedVote(true);
                            }}
                            className="gothic-btn gothic-btn-primary w-full py-3 mb-3"
                        >
                            XÁC NHẬN VOTE
                        </button>
                        <p className="text-white/30 text-[10px] text-center italic">Bạn có thể xác nhận mà không chọn ai.</p>
                    </div>
                </div>
            )}

            {/* ===== THỢ SĂN BẮN KHI BỊ TREO ===== */}
            {phase === 'DAY_HUNTER_CHECK' && currentTurnRole === 'Thợ săn' && 
             autoGMState?.myMeta?.originalRole === 'Thợ săn' && !currentPlayer.isAlive && (
                <HunterShotPopup players={gameState.players} myId={socket.id} />
            )}

            {/* Skill Popup */}
            {showSkillPopup && (
                <SkillPopup
                    role={currentPlayer.role}
                    isOpen={showSkillPopup}
                    onClose={() => setShowSkillPopup(false)}
                    phase={phase}
                    currentTurnRole={currentTurnRole}
                    players={gameState.players}
                    myId={socket.id}
                    wolfVotes={autoGMState?.wolfVotes}
                    autoGMState={autoGMState}
                />
            )}

            {/* Seer Result Popup */}
            {skillResult?.type === 'seer_result' && (
                <SeerResultPopup result={skillResult} onClose={clearSkillResult} />
            )}

            {/* Confirm Modal */}
            {confirmAction && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-sm animate-fadeIn">
                    <div className="gothic-card text-center flex flex-col items-center justify-center p-6 max-w-xs w-11/12 border border-white/20 shadow-2xl">
                        <div className="text-white/30 text-[10px] tracking-[0.5em] mb-4">— ✦ —</div>
                        <h3 className="font-heading text-sm text-white/80 mb-6 leading-relaxed px-2">{confirmAction.message}</h3>
                        <div className="flex gap-3 w-full">
                            <button onClick={() => setConfirmAction(null)} className="gothic-btn flex-1 py-2 text-xs text-white/50 border-white/20 hover:border-white/40">HUỶ</button>
                            <button onClick={() => { confirmAction.onConfirm(); setConfirmAction(null); }} className="gothic-btn gothic-btn-danger flex-1 py-2 text-xs">XÁC NHẬN</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

// =============================================
// Thợ Săn bắn khi bị treo ban ngày
// =============================================

const HunterShotPopup = ({ players, myId }) => {
    const [targetId, setTargetId] = useState(null);
    const alivePlayers = players.filter(p => !p.isAdmin && p.isAlive && p.id !== myId);

    return (
        <div className="fixed inset-0 z-[95] flex items-center justify-center bg-black/95 backdrop-blur-sm animate-fadeIn p-4">
            <div className="gothic-card w-full max-w-sm flex flex-col max-h-[85vh]">
                <div className="text-center mb-4">
                    <div className="text-white/30 text-xs tracking-[0.5em] mb-2">— ✦ —</div>
                    <h3 className="font-heading text-lg text-red-400/80 tracking-wider">BẠN ĐÃ BỊ TREO CỔ!</h3>
                    <p className="text-white/40 text-xs mt-2" style={{ fontFamily: 'var(--font-body)' }}>
                        Là Thợ săn, bạn được chọn 1 người để bắn theo.
                    </p>
                </div>
                <div className="overflow-y-auto flex-1 space-y-1.5 mb-4 pr-1">
                    {alivePlayers.map(p => (
                        <button key={p.id} onClick={() => setTargetId(p.id)}
                            className={`w-full text-left p-2.5 px-3 flex justify-between items-center transition-all ${
                                targetId === p.id ? 'bg-red-900/30 border border-red-500/50 text-white' : 'bg-[#111] border border-[#1a1a1a] text-white/60 hover:text-white/90'
                            }`} style={{ borderRadius: '2px' }}>
                            <span className="font-heading text-sm">{p.name}</span>
                            {targetId === p.id && <span className="text-[10px] text-red-400 font-heading">MỤC TIÊU</span>}
                        </button>
                    ))}
                </div>
                <button
                    onClick={() => { if (targetId) socket.emit('autoGM:hunterShot', targetId); }}
                    disabled={!targetId}
                    className="gothic-btn gothic-btn-primary w-full py-3"
                >
                    BẮN
                </button>
            </div>
        </div>
    );
};
