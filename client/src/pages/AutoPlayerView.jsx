import React, { useState, useEffect } from 'react';
import { socket } from '../socket.js';
import { useGameStore } from '../store/useGameStore.js';
import { PlayerCard } from '../components/PlayerCard.jsx';
import { SkillPopup, SeerResultPopup } from '../components/SkillPopup.jsx';
import { GameLogPopup } from '../components/GameLogPopup.jsx';
import { DayAnnouncePopup, DayExecutePopup } from '../components/DayPopups.jsx';
import { LogOut } from 'lucide-react';
import { audioRefs } from '../utils/audio.js';

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
    const [showDayMessage, setShowDayMessage] = useState(false);
    const [confirmAction, setConfirmAction] = useState(null);
    const [hasSeenLoverInfo, setHasSeenLoverInfo] = useState(false);
    const [hideDeathOverlay, setHideDeathOverlay] = useState(false);
    const [showGameLog, setShowGameLog] = useState(false);
    const [showSkillPopup, setShowSkillPopup] = useState(false);



    const currentPlayer = gameState.players.find(p => p.id === socket.id);
    const hasRole = currentPlayer && currentPlayer.role !== '...';
    const phase = autoGMState?.phase || 'LOBBY';
    const isNight = phase.startsWith('NIGHT') || phase === 'WIN_CHECK_NIGHT';
    const isDay = phase.startsWith('DAY') || phase === 'WIN_CHECK_DAY';
    const isInGame = phase !== 'LOBBY' && phase !== 'CARDS_DEALT' && phase !== 'GAME_OVER';
    const currentTurnRole = autoGMState?.currentTurnRole;
    const role = currentPlayer?.role || '...';

    // Reset states on new game
    useEffect(() => {
        if (phase === 'CARDS_DEALT' || phase === 'LOBBY') {
            setHideDeathOverlay(false);
            setShowGameLog(false);
        }
    }, [phase]);

    useEffect(() => {
        if (!autoGMState?.loverInfo) {
            setHasSeenLoverInfo(false);
        }
    }, [autoGMState?.loverInfo]);

    // Timer hiển thị
    const [timeLeftStr, setTimeLeftStr] = useState('');
    useEffect(() => {
        if (autoGMState?.phaseEndTime) {
            if (autoGMState?.isPaused) {
                return;
            }
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
    }, [autoGMState?.phaseEndTime, autoGMState?.isPaused]);

    // Reset flip khi ván mới
    useEffect(() => {
        if (countdown !== null || !hasRole) {
            setIsFlipped(false);
        }
    }, [countdown, hasRole]);

    const isDayVote = autoGMState?.phase === 'DAY_VOTE';
    const hasVoted = autoGMState?.dayActions?.votes?.[socket.id] !== undefined;

    const isMyTurn = (() => {
        if (!currentPlayer?.isAlive) return false;
        if (!isNight) return false;
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

    useEffect(() => {
        setLocalVoteId(null);
    }, [phase, autoGMState?.dayActions?.isRevote]);

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
                        {autoGMState?.isPaused && (
                            <span className="text-yellow-400/80 text-[10px] font-heading border border-yellow-500/30 px-1.5 py-0.5 rounded animate-mysticPulse">
                                ⏸ TẠM DỪNG
                            </span>
                        )}
                        {timeLeftStr ? (
                            <span className="font-heading text-sm text-white/50">{timeLeftStr}</span>
                        ) : (
                            <span className="font-heading text-[10px] text-white/30 tracking-widest animate-pulse">ĐANG ĐỢI...</span>
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
            {!currentPlayer.isAlive && !hideDeathOverlay && !(phase === 'DAY_HUNTER_CHECK' && currentTurnRole === 'Thợ săn' && autoGMState?.myMeta?.originalRole === 'Thợ săn') && (
                <div className="absolute inset-0 z-[100] flex flex-col items-center justify-center p-6 bg-black/90 backdrop-blur-md animate-fadeIn">
                    <div className="text-red-500/30 text-6xl mb-4 animate-bloodPulse filter drop-shadow-[0_0_15px_rgba(225,29,72,0.4)]">☠</div>
                    <h1 className="font-display text-2xl sm:text-3xl text-white tracking-[0.2em] mb-2 drop-shadow-[0_2px_10px_rgba(255,255,255,0.1)]">
                        BẠN ĐÃ CHẾT
                    </h1>
                    <div className="text-red-500/40 text-xs tracking-[0.4em] mt-2 font-heading">— LINH HỒN LÌA KHỎI XÁC —</div>
                    <p className="text-white/50 text-xs mt-4 mb-8 text-center max-w-xs leading-relaxed" style={{ fontFamily: 'var(--font-body)' }}>
                        Bạn đã bị loại khỏi ván chơi hiện tại.<br/>Bạn có thể tiếp tục theo dõi diễn biến hoặc chờ ván mới.
                    </p>

                    <button 
                        onClick={() => setHideDeathOverlay(true)}
                        className="gothic-btn w-full max-w-xs py-3 text-xs tracking-widest uppercase hover:border-red-500/40"
                    >
                        TIẾP TỤC THEO DÕI / CHỜ GAME MỚI
                    </button>
                </div>
            )}

            {/* Lover Info Popup */}
            {autoGMState?.loverInfo && !hasSeenLoverInfo && currentPlayer.isAlive && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
                    <div className="gothic-card w-full max-w-sm p-6 flex flex-col items-center animate-modalPop border border-rose-500/30 shadow-[0_0_40px_rgba(244,63,94,0.15)]">
                        <div className="text-4xl mb-3 animate-pulse">💕</div>
                        <h3 className="font-display text-lg sm:text-xl text-rose-300 mb-1 tracking-widest text-center">BẠN ĐÃ ĐƯỢC GHÉP ĐÔI</h3>
                        <p className="text-white/40 text-xs font-heading mb-5 text-center tracking-wider">NGƯỜI YÊU CỦA BẠN LÀ</p>
                        
                        <div className="text-center mb-6 w-full p-4 rounded bg-rose-950/20 border border-rose-500/20">
                            <div className="text-xl font-display text-white tracking-widest mb-1.5 drop-shadow-sm">
                                {autoGMState.loverInfo.name}
                            </div>
                            <div className="text-xs font-heading text-rose-400 font-semibold uppercase tracking-wider">
                                Vai trò: {autoGMState.loverInfo.role}
                            </div>
                        </div>

                        <button 
                            onClick={() => setHasSeenLoverInfo(true)}
                            className="gothic-btn w-full py-3 text-xs tracking-wider"
                        >
                            ĐÃ RÕ VÀ ẨN ĐI
                        </button>
                    </div>
                </div>
            )}

            {/* ===== NỘI DUNG CHÍNH ===== */}
            <div className="mt-16 flex-1 flex flex-col items-center justify-center w-full">
                {hasRole && isInGame ? (
                    <div className="w-full flex flex-col items-center space-y-4">
                        {/* Lá bài nhân vật */}
                        <PlayerCard
                            role={currentPlayer.role}
                            isFlipped={isFlipped}
                            onClick={() => setIsFlipped(!isFlipped)}
                            countdown={null}
                        />


                        {/* Nút SỬ DỤNG KỸ NĂNG */}
                        {currentPlayer.isAlive && (
                            <button
                                onClick={handleSkillButton}
                                className={`gothic-btn w-full max-w-xs py-3 flex items-center justify-center gap-2 ${
                                    isMyTurn ? 'gothic-btn-primary animate-mysticPulse !border-white/60' : ''
                                }`}
                                style={isMyTurn ? { boxShadow: '0 0 20px rgba(255,255,255,0.1)' } : {}}
                            >
                                {isMyTurn ? 'SỬ DỤNG KỸ NĂNG — ĐẾN LƯỢT BẠN!' : 'SỬ DỤNG KỸ NĂNG'}
                            </button>
                        )}

                        {/* Nút BỎ PHIẾU (Chỉ hiện ban ngày) */}
                        {currentPlayer.isAlive && isDayVote && (
                            <button
                                onClick={() => setShowSkillPopup(true)}
                                disabled={hasVoted}
                                className={`gothic-btn w-full max-w-xs py-3 flex items-center justify-center gap-2 mt-2 ${
                                    !hasVoted ? 'gothic-btn-primary animate-mysticPulse !border-red-500/60' : 'opacity-50 cursor-not-allowed'
                                }`}
                                style={!hasVoted ? { boxShadow: '0 0 20px rgba(255,0,0,0.1)' } : {}}
                            >
                                {hasVoted ? 'ĐÃ BỎ PHIẾU' : 'BỎ PHIẾU TÌM SÓI'}
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
                                if (!isFlipped && audioRefs.flip) {
                                    audioRefs.flip.volume = 1;
                                    audioRefs.flip.play().catch(() => {});
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
            {phase === 'DAY_VOTE' && currentPlayer.isAlive && !hasVoted && (
                <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/85 backdrop-blur-md animate-fadeIn p-4">
                    <div className="gothic-card w-full max-w-sm flex flex-col max-h-[85vh] animate-modalPop border border-red-500/20 shadow-[0_20px_50px_rgba(0,0,0,0.85)] p-5">
                        <div className="text-white/30 text-[10px] tracking-[0.4em] mb-2 text-center uppercase font-heading">
                            {autoGMState?.dayActions?.isRevote ? '— BỎ PHIẾU LẠI (HÒA PHIẾU) —' : '— BỎ PHIẾU BAN NGÀY —'}
                        </div>
                        <h3 className="font-heading text-base sm:text-lg text-red-400 mb-4 text-center tracking-wider drop-shadow-[0_2px_8px_rgba(239,68,68,0.2)]">
                            {autoGMState?.dayActions?.isRevote ? 'CHỌN 1 TRONG CÁC ỨNG VIÊN HÒA' : 'CHỌN NGƯỜI BỊ TREO CỔ'}
                        </h3>
                        
                        {autoGMState?.dayActions?.isRevote && autoGMState?.dayActions?.revoteTargets?.includes(socket.id) ? (
                            <div className="p-4 my-4 text-center border border-amber-500/30 bg-amber-950/20 rounded">
                                <p className="text-amber-300 text-xs font-heading mb-2">BẠN ĐANG TRONG DANH SÁCH BỊ HÒA PHIẾU</p>
                                <p className="text-white/50 text-xs leading-relaxed" style={{ fontFamily: 'var(--font-body)' }}>
                                    Bạn không được quyền tham gia bỏ phiếu trong lượt biểu quyết lại này.
                                </p>
                            </div>
                        ) : (
                            <>
                                <div className="overflow-y-auto pr-1 flex-1 space-y-2 mb-4 custom-scrollbar">
                                    {gameState.players
                                        .filter(p => {
                                            if (!p.isAlive || p.isAdmin || p.id === socket.id) return false;
                                            if (autoGMState?.dayActions?.isRevote) {
                                                return autoGMState?.dayActions?.revoteTargets?.includes(p.id);
                                            }
                                            return true;
                                        })
                                        .map(p => {
                                            const isSelected = localVoteId === p.id;
                                            return (
                                                <button 
                                                    key={p.id}
                                                    onClick={() => setLocalVoteId(p.id)}
                                                    className={`w-full text-left p-3 rounded flex justify-between items-center transition-all duration-200 ${
                                                        isSelected 
                                                            ? 'bg-red-950/40 border border-red-500/60 text-white shadow-[0_0_15px_rgba(225,29,72,0.2)] scale-[1.01]' 
                                                            : 'bg-white/[0.03] border border-white/5 text-white/70 hover:bg-white/[0.06] hover:text-white hover:border-white/10'
                                                    }`}
                                                >
                                                    <span className="font-heading text-sm">{p.name}</span>
                                                    {isSelected && <span className="text-[10px] text-red-400 font-heading tracking-wider px-2 py-0.5 rounded bg-red-950/60 border border-red-500/30">MỤC TIÊU</span>}
                                                </button>
                                            );
                                        })}
                                </div>

                                <div className="flex gap-2 mb-1">
                                    <button 
                                        onClick={() => socket.emit('autoGM:dayVote', 'skip')}
                                        className="gothic-btn flex-1 py-2.5 text-xs text-white/50 hover:text-white border border-white/10"
                                    >
                                        BỎ QUA / TRẮNG
                                    </button>
                                    <button 
                                        onClick={() => {
                                            if (localVoteId) {
                                                socket.emit('autoGM:dayVote', localVoteId);
                                            }
                                        }}
                                        disabled={!localVoteId}
                                        className={`gothic-btn flex-1 py-2.5 text-xs ${localVoteId ? 'gothic-btn-primary' : 'opacity-40 cursor-not-allowed'}`}
                                    >
                                        CHỐT PHIẾU
                                    </button>
                                </div>
                            </>
                        )}
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

            {/* Game Log Popup */}
            {showGameLog && phase === 'GAME_OVER' && (
                <GameLogPopup 
                    logs={autoGMState?.gameLog || []} 
                    players={gameState.players}
                    playerMeta={autoGMState?.playerMeta || {}}
                    onClose={() => setShowGameLog(false)} 
                />
            )}

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

            {/* Popups tổng kết ban ngày */}
            {phase === 'DAY_ANNOUNCE' && (
                <DayAnnouncePopup deathMessages={autoGMState?.dayActions?.deathMessages || []} />
            )}
            {phase === 'DAY_EXECUTE' && (
                <DayExecutePopup 
                    executedPlayer={autoGMState?.dayActions?.executedPlayer}
                    players={gameState.players}
                />
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
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/85 backdrop-blur-md animate-fadeIn p-4">
            <div className="gothic-card w-full max-w-sm flex flex-col max-h-[85vh] animate-modalPop border border-red-500/30 shadow-[0_20px_50px_rgba(0,0,0,0.9)] p-5">
                <div className="text-center mb-4">
                    <div className="text-red-500/50 text-xs tracking-[0.5em] mb-1.5 font-heading">— VIÊN ĐẠN CUỐI CÙNG —</div>
                    <h3 className="font-heading text-lg text-white tracking-wider">BẠN ĐÃ BỊ TREO CỔ!</h3>
                    <p className="text-white/50 text-xs mt-1.5 leading-relaxed" style={{ fontFamily: 'var(--font-body)' }}>
                        Là Thợ săn, hãy chọn 1 người để kéo theo xuống mồ.
                    </p>
                </div>
                <div className="overflow-y-auto flex-1 space-y-2 mb-4 pr-1 custom-scrollbar">
                    {alivePlayers.map(p => {
                        const isSelected = targetId === p.id;
                        return (
                            <button 
                                key={p.id} 
                                onClick={() => setTargetId(p.id)}
                                className={`w-full text-left p-3 rounded flex justify-between items-center transition-all duration-200 ${
                                    isSelected 
                                        ? 'bg-red-950/50 border border-red-500/60 text-white shadow-[0_0_15px_rgba(225,29,72,0.2)] scale-[1.01]' 
                                        : 'bg-white/[0.03] border border-white/5 text-white/70 hover:bg-white/[0.06] hover:text-white'
                                }`}
                            >
                                <span className="font-heading text-sm">{p.name}</span>
                                {isSelected && <span className="text-[10px] text-red-400 font-heading px-2 py-0.5 rounded bg-red-950/60 border border-red-500/30">MỤC TIÊU</span>}
                            </button>
                        );
                    })}
                </div>
                <button
                    onClick={() => { if (targetId) socket.emit('autoGM:hunterShot', targetId); }}
                    disabled={!targetId}
                    className={`gothic-btn w-full py-3 text-xs tracking-wider ${targetId ? 'gothic-btn-danger' : 'opacity-40 cursor-not-allowed'}`}
                >
                    BẮN NGAY
                </button>
            </div>
        </div>
    );
};
