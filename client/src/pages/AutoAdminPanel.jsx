import React, { useState } from 'react';
import { socket } from '../socket.js';
import { useGameStore } from '../store/useGameStore.js';
import { LogOut, Play, Pause, Square, SkipForward, Settings, Users, Skull, Heart, Trophy, X } from 'lucide-react';
import { DayAnnouncePopup, DayExecutePopup } from './AutoPlayerView.jsx';

// Phase labels cho hiển thị
const PHASE_LABELS = {
    LOBBY: 'PHÒNG CHỜ',
    CARDS_DEALT: 'ĐÃ CHIA BÀI',
    NIGHT: 'BAN ĐÊM',
    NIGHT_CUPID: '🏹 CUPID ĐANG GHÉP ĐÔI',
    NIGHT_COUPLE: '💕 CẶP ĐÔI THỨC DẬY',
    NIGHT_WOLF: '🐺 SÓI ĐANG CẮN',
    NIGHT_SEER: '🔮 TIÊN TRI ĐANG SOI',
    NIGHT_GUARD: '🛡️ BẢO VỆ ĐANG BẢO VỆ',
    NIGHT_RESOLVE_WOLF: '⚙️ XỬ LÝ KẾT QUẢ SÓI',
    NIGHT_WITCH: '🧪 PHÙ THỦY ĐANG HÀNH ĐỘNG',
    NIGHT_FINALIZE_DEATHS: '💀 CHỐT DANH SÁCH CHẾT',
    NIGHT_HUNTER_CHECK: '🎯 KIỂM TRA THỢ SĂN',
    NIGHT_COUPLE_CHECK: '💕 KIỂM TRA CẶP ĐÔI',
    NIGHT_CHAIN_EFFECTS: '🔗 HIỆU ỨNG DÂY CHUYỀN',
    WIN_CHECK_NIGHT: '⚖️ KIỂM TRA THẮNG',
    DAY_ANNOUNCE: '📢 CÔNG BỐ NGƯỜI CHẾT',
    DAY_DISCUSS: '💬 THẢO LUẬN',
    DAY_VOTE: '🗳️ BỎ PHIẾU',
    DAY_EXECUTE: '⚖️ XỬ TREO',
    DAY_HUNTER_CHECK: '🎯 THỢ SĂN BẮN',
    DAY_COUPLE_CHECK: '💕 CẶP ĐÔI',
    DAY_CHAIN_EFFECTS: '🔗 DÂY CHUYỀN',
    WIN_CHECK_DAY: '⚖️ KIỂM TRA THẮNG',
    GAME_OVER: '🏁 KẾT THÚC',
};

export const AutoAdminPanel = () => {
    const gameState = useGameStore(state => state.gameState);
    const autoGMState = useGameStore(state => state.autoGMState);
    const clearSession = useGameStore(state => state.clearSession);
    const matchCount = useGameStore(state => state.matchCount);
    const leaderboard = useGameStore(state => state.leaderboard);
    const [configCopy, setConfigCopy] = useState([...gameState.rolesConfig]);

    // Settings state
    const [settings, setSettings] = useState(autoGMState?.settings || {
        dayDuration: 180,
        nightDuration: 30,
        discussDuration: 120,
        voteDuration: 30,
        skillDuration: 30,
    });

    const [confirmAction, setConfirmAction] = useState(null);
    const [isLogClosed, setIsLogClosed] = useState(false);

    React.useEffect(() => {
        setConfigCopy([...gameState.rolesConfig]);
    }, [gameState.rolesConfig]);

    React.useEffect(() => {
        if (autoGMState?.settings) {
            setSettings(autoGMState.settings);
        }
    }, [autoGMState?.settings]);

    const requestConfirm = (message, action) => {
        setConfirmAction({ message, onConfirm: action });
    };

    const handleLogout = () => { requestConfirm("Bạn có chắc chắn muốn thoát phòng?", () => { socket.emit('leaveRoom'); clearSession(); }); };
    const handleToggleAutoGM = () => { socket.emit('toggleAutoGM'); };

    // Config management
    const updateRoleCount = (index, delta) => {
        const nc = [...configCopy];
        nc[index] = { ...nc[index], count: Math.max(0, nc[index].count + delta) };
        setConfigCopy(nc);
    };
    const saveConfig = () => { requestConfirm("Lưu cấu hình bộ bài mới?", () => socket.emit('updateConfig', configCopy)); };

    // Auto GM actions
    const handleUpdateSettings = () => {
        socket.emit('autoGM:updateSettings', settings);
    };
    const handleStartGame = () => {
        requestConfirm("Chia bài và bắt đầu?", () => { socket.emit('autoGM:startGame'); setIsLogClosed(false); });
    };
    const handleBeginGame = () => {
        requestConfirm("Bắt đầu chơi? Game sẽ vào Đêm 1.", () => socket.emit('autoGM:beginGame'));
    };
    const handlePause = () => { socket.emit('autoGM:pause'); };
    const handleResume = () => { socket.emit('autoGM:resume'); };
    const handleStop = () => { requestConfirm("Hủy ván hiện tại và đưa mọi người về phòng chờ (Reset)?", () => { socket.emit('autoGM:stop'); setIsLogClosed(false); }); };
    const handleSkip = () => { requestConfirm("Tua qua bước hiện tại?", () => socket.emit('autoGM:skipPhase')); };
    const handleKick = (playerId, playerName) => { requestConfirm(`Đuổi người chơi ${playerName}?`, () => socket.emit('kickPlayer', playerId)); };

    const players = gameState.players.filter(p => !p.isAdmin);
    const totalCards = configCopy.reduce((acc, curr) => acc + curr.count, 0);
    const readyCount = players.filter(p => p.isReady).length;
    const phase = autoGMState?.phase || 'LOBBY';
    const isInGame = phase !== 'LOBBY' && phase !== 'GAME_OVER';
    const isCardsDealt = phase === 'CARDS_DEALT';

    // Timer
    const [timeLeftStr, setTimeLeftStr] = useState('');
    React.useEffect(() => {
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

    return (
        <div className="flex flex-col h-full p-4 md:p-6 max-w-6xl mx-auto w-full overflow-y-auto animate-fadeIn">
            
            {/* ===== HEADER ===== */}
            <div className="flex flex-wrap justify-between items-center mb-6 pb-4 gap-4"
                 style={{ borderBottom: '1px solid #222' }}>
                <div>
                    <h1 className="font-display text-lg md:text-xl text-white/80 tracking-[0.15em]"
                        style={{ textShadow: '0 0 20px rgba(255,255,255,0.05)' }}>
                        BÀN ĐIỀU KHIỂN
                    </h1>
                    <p className="font-heading text-[0.6rem] text-white/20 tracking-[0.3em] mt-1">
                        QUẢN TRÒ TỰ ĐỘNG · VÁN #{matchCount}
                    </p>
                </div>
                <div className="flex gap-2">
                    <button onClick={handleToggleAutoGM} 
                        className="gothic-btn flex items-center gap-2 text-xs gothic-btn-primary !border-white/50">
                        QUẢN TRÒ: TỰ ĐỘNG
                    </button>
                    <button onClick={handleLogout} className="gothic-btn flex items-center gap-2">
                        <LogOut size={14} /> THOÁT
                    </button>
                </div>
            </div>

            {/* ===== PHASE STATUS BAR ===== */}
            {isInGame && (
                <div className="mb-4 p-3 flex flex-wrap items-center justify-between gap-3"
                     style={{ 
                         background: phase.startsWith('NIGHT') ? '#0a0a14' : '#14140a',
                         border: `1px solid ${phase.startsWith('NIGHT') ? '#1a1a33' : '#33331a'}`,
                         borderRadius: '2px'
                     }}>
                    <div>
                        <p className="font-heading text-xs text-white/60 tracking-wider">
                            {PHASE_LABELS[phase] || phase}
                        </p>
                        <p className="text-white/30 text-[10px] font-heading mt-0.5">
                            ĐÊM {autoGMState?.nightCount || 0} · NGÀY {autoGMState?.dayCount || 0}
                        </p>
                    </div>
                    <div className="flex items-center gap-3">
                        {timeLeftStr ? (
                            <span className="font-heading text-lg text-white/70 animate-mysticPulse drop-shadow-md">
                                {timeLeftStr}
                            </span>
                        ) : (
                            <span className="font-heading text-xs text-white/40 tracking-widest animate-pulse mt-1">ĐANG ĐỢI...</span>
                        )}
                        {autoGMState?.isPaused && (
                            <span className="text-yellow-400/70 text-xs font-heading animate-mysticPulse">TẠM DỪNG</span>
                        )}
                    </div>
                    <div className="flex gap-2">
                        {timeLeftStr && !autoGMState?.isPaused && (
                            <button onClick={handleSkip} className="gothic-btn text-[10px] py-1 px-2 text-white/50 hover:text-white" title="Tua bước">
                                <SkipForward size={13} />
                            </button>
                        )}
                        {!autoGMState?.isPaused ? (
                            <button onClick={handlePause} className="gothic-btn text-[10px] py-1 px-2" title="Tạm dừng">
                                <Pause size={13} />
                            </button>
                        ) : (
                            <button onClick={handleResume} className="gothic-btn gothic-btn-primary text-[10px] py-1 px-2" title="Tiếp tục">
                                <Play size={13} />
                            </button>
                        )}
                        <button onClick={handleStop} className="gothic-btn gothic-btn-danger text-[10px] py-1 px-2" title="Hủy ván / Reset">
                            <Square size={13} />
                        </button>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 flex-1 min-h-0">
                
                {/* ===== CỘT TRÁI: Cấu hình & Settings ===== */}
                <div className="lg:col-span-1 flex flex-col gap-4">

                    {/* Settings thời gian */}
                    <div className="gothic-card">
                        <h2 className="font-heading text-xs text-white/50 tracking-[0.2em] mb-4 pb-2 flex items-center gap-2"
                            style={{ borderBottom: '1px solid #222' }}>
                            <Settings size={12} /> CÀI ĐẶT THỜI GIAN
                        </h2>
                        <div className="space-y-3">
                            <SettingRow label="Thảo luận (giây)" value={settings.discussDuration}
                                onChange={v => setSettings({...settings, discussDuration: v})} />
                            <SettingRow label="Bỏ phiếu (giây)" value={settings.voteDuration}
                                onChange={v => setSettings({...settings, voteDuration: v})} />
                            <SettingRow label="Kỹ năng (giây)" value={settings.skillDuration}
                                onChange={v => setSettings({...settings, skillDuration: v})} />
                        </div>
                        <button onClick={handleUpdateSettings} className="gothic-btn w-full py-2 mt-4 text-[10px]"
                            disabled={isInGame}>
                            LƯU CÀI ĐẶT
                        </button>
                    </div>

                    {/* Cấu hình bộ bài */}
                    <div className="gothic-card">
                        <h2 className="font-heading text-xs text-white/50 tracking-[0.2em] mb-4 pb-2"
                            style={{ borderBottom: '1px solid #222' }}>
                            BỘ BÀI · {totalCards} LÁ
                        </h2>
                        <div className="space-y-1.5 mb-4 max-h-[30vh] overflow-y-auto pr-1">
                            {configCopy.map((role, idx) => (
                                <div key={idx} className="flex justify-between items-center px-3 py-2"
                                     style={{ background: '#111', border: '1px solid #1A1A1A', borderRadius: '2px' }}>
                                    <span className="text-white/60 text-sm truncate" style={{ fontFamily: 'var(--font-body)' }}>{role.name}</span>
                                    <div className="flex items-center gap-2 shrink-0">
                                        <button onClick={() => updateRoleCount(idx, -1)} disabled={isInGame}
                                            className="w-6 h-6 flex items-center justify-center text-white/30 hover:text-white transition-colors"
                                            style={{ border: '1px solid #333', borderRadius: '2px', background: '#0A0A0A', fontSize: '14px' }}>−</button>
                                        <span className="w-4 text-center font-heading text-white/70 text-xs">{role.count}</span>
                                        <button onClick={() => updateRoleCount(idx, 1)} disabled={isInGame}
                                            className="w-6 h-6 flex items-center justify-center text-white/30 hover:text-white transition-colors"
                                            style={{ border: '1px solid #333', borderRadius: '2px', background: '#0A0A0A', fontSize: '14px' }}>+</button>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <button onClick={saveConfig} className="gothic-btn gothic-btn-primary w-full py-2.5" disabled={isInGame}>
                            LƯU CẤU HÌNH
                        </button>
                    </div>

                    {/* Leaderboard */}
                    {Object.keys(leaderboard).length > 0 && (
                        <div className="gothic-card">
                            <h2 className="font-heading text-xs text-white/50 tracking-[0.2em] mb-3 pb-2 flex items-center gap-2"
                                style={{ borderBottom: '1px solid #222' }}>
                                <Trophy size={12} /> BẢNG XẾP HẠNG
                            </h2>
                            <div className="space-y-1 max-h-[15vh] overflow-y-auto pr-1">
                                {Object.entries(leaderboard).sort(([, a], [, b]) => b - a).slice(0, 10).map(([name, wins], i) => (
                                    <div key={name} className="flex justify-between items-center text-xs py-1.5 px-2"
                                         style={{ background: '#111', borderRadius: '2px' }}>
                                        <span className={`${i === 0 ? 'text-white/80' : 'text-white/40'}`}>
                                            {i === 0 ? '◆' : i === 1 ? '◇' : '·'} {name}
                                        </span>
                                        <span className="text-white/60 font-heading text-[10px]">{wins}W</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* ===== CỘT PHẢI: Người chơi & Điều khiển ===== */}
                <div className="lg:col-span-2 gothic-card flex flex-col min-h-0">
                    <div className="flex flex-wrap justify-between items-center mb-4 pb-3 gap-3"
                         style={{ borderBottom: '1px solid #222' }}>
                        <h2 className="font-heading text-xs text-white/50 tracking-[0.2em] flex items-center gap-2">
                            <Users size={12} /> NGƯỜI CHƠI · {readyCount}/{players.length}
                        </h2>
                        <div className="flex gap-2">
                            {phase === 'LOBBY' && (
                                <button onClick={handleStartGame}
                                    disabled={readyCount !== totalCards || readyCount === 0}
                                    className="gothic-btn gothic-btn-primary text-[10px]">
                                    CHIA BÀI
                                </button>
                            )}
                            {phase === 'GAME_OVER' && (
                                <button onClick={handleStop}
                                    className="gothic-btn gothic-btn-primary text-[10px] animate-mysticPulse">
                                    TẠO VÁN MỚI
                                </button>
                            )}
                            {isCardsDealt && (
                                <button onClick={handleBeginGame}
                                    className="gothic-btn gothic-btn-primary text-[10px] animate-mysticPulse">
                                    <Play size={13} /> BẮT ĐẦU GAME
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Danh sách người chơi — CHỈ hiện tên + trạng thái */}
                    <div className="space-y-1.5 overflow-y-auto flex-1 pr-1">
                        {players.map(p => (
                            <div key={p.id}
                                className={`p-2 px-3 flex items-center justify-between transition-all ${!p.isAlive ? 'opacity-40' : ''}`}
                                style={{ 
                                    background: '#111', 
                                    border: `1px solid ${p.isAlive ? '#1A1A1A' : '#1A1A1A'}`, 
                                    borderRadius: '2px' 
                                }}>
                                <div className="flex items-center gap-3">
                                    <span className={`font-heading text-xs tracking-wider ${p.isAlive ? 'text-white/70' : 'text-white/30 line-through'}`}>
                                        {p.name}
                                    </span>
                                </div>
                                <div className="flex items-center gap-2">
                                    {/* Trạng thái Ready (trước khi game bắt đầu) */}
                                    {!isInGame && !isCardsDealt && (
                                        <span className="text-[10px] text-white/25 font-heading flex items-center gap-1">
                                            <span className={`w-1.5 h-1.5 rounded-full ${p.isReady ? 'bg-white/50' : 'bg-white/10'}`}></span>
                                            {p.isReady ? 'SẴN SÀNG' : 'CHỜ'}
                                        </span>
                                    )}
                                    {/* Trạng thái sống/chết (trong game) */}
                                    {(isInGame || isCardsDealt) && (
                                        <span className="flex items-center gap-1 text-[10px] font-heading">
                                            {p.isAlive ? (
                                                <><Heart size={10} className="text-white/30" /> <span className="text-white/40">SỐNG</span></>
                                            ) : (
                                                <><Skull size={10} className="text-white/20" /> <span className="text-white/20">CHẾT</span></>
                                            )}
                                        </span>
                                    )}
                                    {/* Nút Kick */}
                                    <button onClick={() => handleKick(p.id, p.name)} className="text-red-500/60 hover:text-red-400 ml-3 text-[9px] font-heading px-1.5 py-0.5 border border-red-500/30 rounded-sm" title="Đuổi người chơi khỏi phòng">
                                        KICK
                                    </button>
                                </div>
                            </div>
                        ))}
                        
                        {players.length === 0 && (
                            <div className="py-12 text-center">
                                <div className="text-white/10 text-3xl mb-3">☽</div>
                                <div className="text-white/20 text-xs font-heading tracking-[0.2em] italic">
                                    CHƯA CÓ NGƯỜI CHƠI
                                </div>
                            </div>
                        )}
                    </div>
                </div>

            </div>

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

            {/* Game Log Popup (Chỉ hiện khi GAME OVER) */}
            {autoGMState?.phase === 'GAME_OVER' && !isLogClosed && (
                <GameLogPopup logs={autoGMState?.gameLog || []} onClose={() => setIsLogClosed(true)} />
            )}

            {/* Popups tổng kết ban ngày */}
            {autoGMState?.phase === 'DAY_ANNOUNCE' && (
                <DayAnnouncePopup deathMessages={autoGMState?.dayActions?.deathMessages || []} />
            )}
            {autoGMState?.phase === 'DAY_EXECUTE' && (
                <DayExecutePopup 
                    executedPlayer={autoGMState?.dayActions?.executedPlayer}
                    players={players}
                />
            )}
        </div>
    );
};

// =============================================
// HELPER COMPONENTS
// =============================================

// Game Log Popup Component
export const GameLogPopup = ({ logs = [], onClose }) => {
    // Nhóm logs theo Ngày/Đêm
    const groupedLogs = [];
    let currentGroup = { title: "Bắt đầu Game", logs: [] };

    logs.forEach(log => {
        if (log.type === 'PHASE_CHANGE') {
            groupedLogs.push(currentGroup);
            const isNight = log.data.to === 'NIGHT';
            currentGroup = {
                title: isNight ? `Đêm ${log.data.nightCount}` : `Ngày ${log.data.dayCount}`,
                logs: []
            };
        } else {
            currentGroup.logs.push(log);
        }
    });
    if (currentGroup.logs.length > 0) groupedLogs.push(currentGroup);

    const formatLog = (log) => {
        const d = log.data;
        switch (log.type) {
            case 'GAME_START': return 'Trò chơi bắt đầu. Các vai trò đã được phân phát.';
            case 'SKILL_TURN': return `Tới lượt ${d.role} hành động.`;
            case 'SKILL_SKIP': return `${d.role} đã bỏ qua lượt (${d.reason === 'timeout' ? 'Hết giờ' : 'Tự nguyện'}).`;
            case 'WOLF_VOTE': return d.target === 'skip' ? `Sói ${d.wolf} không cắn ai.` : `Sói ${d.wolf} muốn cắn ${d.target}.`;
            case 'WOLF_BITE': return d.success ? `Bầy Sói đã cắn ${d.target}.` : `Bầy Sói cắn hụt ${d.target} (do được Bảo vệ).`;
            case 'SEER_CHECK': return `Tiên tri ${d.seer} đã soi ${d.target} và biết người này là ${d.result === 'WOLF' ? 'Sói' : 'Dân'}.`;
            case 'GUARD_PROTECT': return `Bảo vệ ${d.guard} đã canh gác cho ${d.target}.`;
            case 'WITCH_HEAL': return `Phù thủy đã cứu ${d.target}.`;
            case 'WITCH_KILL': return `Phù thủy đã ném bình độc vào ${d.target}.`;
            case 'CUPID_PAIR': return `Cupid đã ghép đôi ${d.player1} và ${d.player2}.`;
            case 'HUNTER_AIM': return d.target === 'skip' ? `Thợ săn ${d.hunter} không ngắm bắn ai.` : `Thợ săn ${d.hunter} đã nhắm súng vào ${d.target}.`;
            case 'HUNTER_DAY_SHOT': return `Thợ săn ${d.hunter} bị chết và nổ súng bắn ${d.target}.`;
            case 'HUNTER_TRIGGER': return `Thợ săn bị giết, chuẩn bị nổ súng!`;
            case 'VOTE_FAILED': return `Dân làng không đủ phiếu treo cổ ai.`;
            case 'VOTE_TIE': return `Hòa phiếu giữa ${d.tied?.join(', ')}. Tiến hành vote lại.`;
            case 'VOTE_TIE_FINAL': return `Vẫn hòa phiếu! Không ai bị treo cổ.`;
            case 'HANGED': return `Dân làng đã treo cổ ${d.player} (${d.votes} phiếu).`;
            case 'DEATH': return `${d.player} đã chết vì ${d.reason === 'WOLF_BITE' ? 'vết cắn của Sói' : d.reason === 'WITCH_KILL' ? 'trúng độc' : d.reason === 'COUPLE' ? 'chết theo người yêu' : 'bị bắn'}. Vai trò: ${d.role}.`;
            case 'TIMEOUT': return `Hết thời gian.`;
            case 'GAME_OVER': return `Ván đấu kết thúc. Phe chiến thắng: ${d.winner === 'WOLF' ? 'SÓI' : d.winner === 'VILLAGER' ? 'DÂN LÀNG' : d.winner === 'COUPLE' ? 'CẶP ĐÔI' : d.winner === 'SIDA' ? 'SIDA' : 'HÒA'}.`;
            case 'PHASE_CHANGE': return `Chuyển sang giai đoạn ${d.to}`;
            default: return `[Sự kiện] ${JSON.stringify(d)}`;
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(5px)' }}>
            <div className="gothic-card w-full max-w-2xl max-h-[85vh] flex flex-col relative animate-fadeIn">
                <button onClick={onClose} className="absolute top-4 right-4 text-white/40 hover:text-white">
                    <LogOut size={16} />
                </button>
                <h2 className="font-display text-xl text-white/80 tracking-[0.2em] mb-4 text-center pb-4 border-b border-white/10">
                    NHẬT KÝ QUẢN TRÒ
                </h2>
                
                <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-6">
                    {groupedLogs.map((group, i) => (
                        <div key={i} className="mb-4">
                            <h3 className="font-heading text-sm text-red-400/80 tracking-widest mb-3 pb-1 border-b border-red-900/30 inline-block">
                                ◆ {group.title.toUpperCase()}
                            </h3>
                            <div className="space-y-2 pl-3 border-l border-white/10 ml-2">
                                {group.logs.length === 0 && (
                                    <p className="text-white/30 text-xs italic">Không có sự kiện nào đáng chú ý.</p>
                                )}
                                {group.logs.map((log, j) => (
                                    <div key={j} className="text-xs text-white/60 leading-relaxed" style={{ fontFamily: 'var(--font-body)' }}>
                                        <span className="text-white/20 text-[10px] mr-2">
                                            {new Date(log.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                                        </span>
                                        {formatLog(log)}
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

// =============================================
// SUB-COMPONENT: Setting Row
// =============================================

const SettingRow = ({ label, value, onChange }) => (
    <div className="flex justify-between items-center">
        <span className="text-white/40 text-xs" style={{ fontFamily: 'var(--font-body)' }}>{label}</span>
        <div className="flex items-center gap-2">
            <button onClick={() => onChange(Math.max(5, value - 5))}
                className="w-6 h-6 flex items-center justify-center text-white/30 hover:text-white"
                style={{ border: '1px solid #333', borderRadius: '2px', background: '#0A0A0A', fontSize: '14px' }}>−</button>
            <span className="w-8 text-center font-heading text-white/70 text-xs">{value}</span>
            <button onClick={() => onChange(value + 5)}
                className="w-6 h-6 flex items-center justify-center text-white/30 hover:text-white"
                style={{ border: '1px solid #333', borderRadius: '2px', background: '#0A0A0A', fontSize: '14px' }}>+</button>
        </div>
    </div>
);
