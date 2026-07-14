import React, { useState } from 'react';
import { socket } from '../socket.js';
import { useGameStore } from '../store/useGameStore.js';
import { X, Shield, Skull, Heart, Eye, HeartHandshake, Crosshair, Sparkles } from 'lucide-react';

// Mô tả kỹ năng ngắn gọn cho từng role
const ROLE_SKILL_DESC = {
    'Dân Ngu': 'Bạn là dân làng bình thường. Hãy dùng trí thông minh để tìm ra Sói!',
    'Sói': 'Chọn một người để cắn mỗi đêm.',
    'Tiên tri': 'Soi một người để biết phe của họ.',
    'Bảo vệ': 'Bảo vệ một người khỏi bị Sói cắn. Không được bảo vệ cùng một người 2 đêm liên tiếp.',
    'Thợ săn': 'Chọn mục tiêu nhắm mỗi đêm. Khi bạn chết, người đó cũng chết theo.',
    'Phù Thuỷ': 'Bạn có 1 bình cứu và 1 bình độc, mỗi bình chỉ dùng 1 lần cả game.',
    'Kẻ Bị Nguyền': 'Nếu bị Sói cắn mà không được cứu, bạn sẽ trở thành Sói!',
    'Sida': 'Nếu bạn bị dân làng vote treo cổ, bạn thắng ngay lập tức!',
    'Cupid': 'Chọn 2 người ghép thành cặp đôi. Một người chết, người kia cũng chết theo.',
};

/**
 * SkillPopup — Popup kỹ năng cho từng role
 * Props:
 * - role: tên role của người chơi
 * - isOpen: boolean
 * - onClose: callback đóng popup
 * - phase: phase hiện tại
 * - currentTurnRole: role đang được gọi
 * - players: danh sách người chơi
 * - myId: socket id của mình
 * - wolfVotes: object vote của phe Sói (chỉ Sói thấy)
 * - autoGMState: toàn bộ autoGM state
 */
export const SkillPopup = ({ role, isOpen, onClose, phase, currentTurnRole, players, myId, wolfVotes, autoGMState }) => {
    const skillResult = useGameStore(state => state.skillResult);
    const skillError = useGameStore(state => state.skillError);
    const clearSkillResult = useGameStore(state => state.clearSkillResult);
    const clearSkillError = useGameStore(state => state.clearSkillError);

    const [selectedTarget, setSelectedTarget] = useState(null);
    const [cupidTargets, setCupidTargets] = useState([]);
    const [witchHeal, setWitchHeal] = useState(null);
    const [witchKill, setWitchKill] = useState(null);

    if (!isOpen) return null;

    const alivePlayers = players.filter(p => !p.isAdmin && p.isAlive && p.id !== myId);
    const allAlive = players.filter(p => !p.isAdmin && p.isAlive);
    const isMyTurn = currentTurnRole === role || (role === 'Sói' && currentTurnRole === 'Sói');
    const isNight = phase?.startsWith('NIGHT');
    const desc = ROLE_SKILL_DESC[role] || 'Không có mô tả.';

    // Kiểm tra role có phải Sói (bao gồm Kẻ bị nguyền đã chuyển)
    const isWolfRole = role === 'Sói' || (autoGMState?.myMeta?.isConverted && autoGMState?.myMeta?.originalRole === 'Kẻ Bị Nguyền');

    const handleSubmit = (type, data) => {
        socket.emit('autoGM:submitSkill', { type, ...data });
        onClose();
        setSelectedTarget(null);
        setCupidTargets([]);
        setWitchHeal(null);
        setWitchKill(null);
    };

    // ========== RENDER BỎ PHIẾU BAN NGÀY ==========
    if (phase === 'DAY_VOTE') {
        const isRevote = autoGMState?.dayActions?.isRevote;
        const revoteTargets = autoGMState?.dayActions?.revoteTargets || [];
        const votes = autoGMState?.dayActions?.votes || {};

        let renderPlayers = alivePlayers;
        if (isRevote) {
            renderPlayers = players.filter(p => revoteTargets.includes(p.id) && p.id !== myId);
        }

        const handleVote = (targetId) => {
            socket.emit('autoGM:dayVote', targetId);
            onClose();
            setSelectedTarget(null);
        };

        return (
            <PopupWrapper onClose={onClose} title={isRevote ? "BỎ PHIẾU LẠI (HÒA PHIẾU)" : "BỎ PHIẾU BAN NGÀY"}>
                <p className="text-white/40 text-xs mb-3 text-center" style={{ fontFamily: 'var(--font-body)' }}>
                    {isRevote ? 'Chỉ được chọn 1 trong những người sau:' : 'Chọn 1 người chơi để vote treo cổ:'}
                </p>

                {/* Danh sách người để chọn */}
                <PlayerList
                    players={renderPlayers}
                    selectedIds={selectedTarget ? [selectedTarget] : []}
                    onSelect={(id) => setSelectedTarget(id)}
                    myId={myId}
                />
                
                {/* Nút hành động */}
                <div className="flex gap-2 mt-4">
                    <button
                        onClick={() => handleVote('skip')}
                        className="gothic-btn flex-1 py-2.5 text-xs text-white/50 hover:text-white"
                        style={{ border: '1px solid rgba(255,255,255,0.1)' }}
                    >
                        BỎ QUA / TRẮNG
                    </button>
                    <button
                        onClick={() => handleVote(selectedTarget)}
                        disabled={!selectedTarget}
                        className="gothic-btn gothic-btn-primary flex-1 py-2.5 text-xs"
                    >
                        CHỐT PHIẾU
                    </button>
                </div>

                {/* Danh sách phiếu public realtime */}
                {Object.keys(votes).length > 0 && (
                    <div className="mt-6 border-t border-white/5 pt-4">
                        <p className="text-white/30 text-[10px] font-heading mb-2">TÌNH HÌNH PHIẾU BẦU:</p>
                        <div className="flex flex-col gap-1 max-h-32 overflow-y-auto pr-1 custom-scrollbar">
                            {Object.entries(votes).map(([voterId, targetId]) => {
                                const voter = players.find(p => p.id === voterId);
                                const target = players.find(p => p.id === targetId);
                                return (
                                    <div key={voterId} className="flex items-center justify-between text-xs py-1 px-2 bg-white/5 rounded-sm">
                                        <span className="text-white/70 truncate w-1/3">{voter?.name}</span>
                                        <span className="text-white/30 text-[10px]">vote</span>
                                        <span className="text-red-400/80 truncate w-1/3 text-right">
                                            {targetId === 'skip' ? 'Bỏ qua' : target?.name}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}
            </PopupWrapper>
        );
    }

    // ========== RENDER THEO ROLE ==========

    // Dân Ngu, Sida, Kẻ Bị Nguyền (chưa chuyển phe) — chỉ popup giải thích
    if (['Dân Ngu', 'Sida', 'Kẻ Bị Nguyền'].includes(role) && !isWolfRole) {
        return (
            <PopupWrapper onClose={onClose} title={role}>
                <p className="text-white/50 text-sm mb-6 leading-relaxed" style={{ fontFamily: 'var(--font-body)' }}>
                    {desc}
                </p>
                <button onClick={onClose} className="gothic-btn gothic-btn-primary w-full py-2.5">
                    ĐÃ HIỂU
                </button>
            </PopupWrapper>
        );
    }

    // Cupid — Đêm đầu, chọn 2 người
    if (role === 'Cupid') {
        if (!isMyTurn || phase !== 'NIGHT_CUPID') {
            return (
                <PopupWrapper onClose={onClose} title="Cupid">
                    <p className="text-white/50 text-sm mb-4" style={{ fontFamily: 'var(--font-body)' }}>{desc}</p>
                    <p className="text-white/30 text-xs italic text-center">
                        {phase === 'NIGHT_CUPID' ? 'Đang chờ đến lượt...' : 'Kỹ năng Cupid chỉ dùng ở đêm đầu tiên.'}
                    </p>
                </PopupWrapper>
            );
        }

        const toggleCupidTarget = (id) => {
            if (cupidTargets.includes(id)) {
                setCupidTargets(cupidTargets.filter(x => x !== id));
            } else if (cupidTargets.length < 2) {
                setCupidTargets([...cupidTargets, id]);
            }
        };

        return (
            <PopupWrapper onClose={onClose} title="Cupid · Ghép Đôi">
                <p className="text-white/40 text-xs mb-3" style={{ fontFamily: 'var(--font-body)' }}>Chọn 2 người yêu nhau ({cupidTargets.length}/2)</p>
                <PlayerList
                    players={allAlive}
                    selectedIds={cupidTargets}
                    onSelect={toggleCupidTarget}
                    myId={myId}
                />
                <div className="flex gap-2 mt-4">
                    <button onClick={() => handleSubmit('cupid_pair', { targets: 'skip' })} className="gothic-btn flex-1 py-2.5 text-xs text-white/50 hover:text-white" style={{ border: '1px solid rgba(255,255,255,0.1)' }}>BỎ QUA</button>
                    <button
                        onClick={() => handleSubmit('cupid_pair', { targets: cupidTargets })}
                        disabled={cupidTargets.length !== 2}
                        className="gothic-btn gothic-btn-primary flex-1 py-2.5"
                    >
                        XÁC NHẬN GHÉP ĐÔI
                    </button>
                </div>
            </PopupWrapper>
        );
    }

    // Sói — Vote cắn
    if (isWolfRole || role === 'Sói') {
        if (!isMyTurn && currentTurnRole !== 'Sói') {
            return (
                <PopupWrapper onClose={onClose} title="Sói">
                    <p className="text-white/50 text-sm mb-4" style={{ fontFamily: 'var(--font-body)' }}>{ROLE_SKILL_DESC['Sói']}</p>
                    <p className="text-white/30 text-xs italic text-center">Hãy chờ đến lượt Sói...</p>
                </PopupWrapper>
            );
        }

        const wolfTargets = alivePlayers.filter(p => !isPlayerWolf(p.id, autoGMState));

        return (
            <PopupWrapper onClose={onClose} title="Sói · Cắn">
                <p className="text-white/40 text-xs mb-3" style={{ fontFamily: 'var(--font-body)' }}>Chọn người để cắn</p>
                
                {/* Hiển thị vote của sói khác */}
                {wolfVotes && Object.keys(wolfVotes).length > 0 && (
                    <div className="mb-3 p-2" style={{ background: '#0A0A0A', border: '1px solid #222', borderRadius: '2px' }}>
                        <p className="text-white/30 text-[10px] font-heading mb-1">ĐỒNG ĐỘI ĐANG VOTE:</p>
                        {Object.entries(wolfVotes).map(([wolfId, targetId]) => {
                            const wolf = players.find(p => p.id === wolfId);
                            const target = players.find(p => p.id === targetId);
                            return (
                                <div key={wolfId} className="text-xs text-white/50 py-0.5">
                                    {wolf?.name} ➔ <span className="text-red-400/80">{target?.name}</span>
                                </div>
                            );
                        })}
                    </div>
                )}

                <PlayerList
                    players={wolfTargets}
                    selectedIds={selectedTarget ? [selectedTarget] : []}
                    onSelect={(id) => setSelectedTarget(id)}
                    myId={myId}
                />
                <div className="flex gap-2 mt-4">
                    <button onClick={() => handleSubmit('wolf_vote', { targetId: 'skip' })} className="gothic-btn flex-1 py-2.5 text-xs text-white/50 hover:text-white" style={{ border: '1px solid rgba(255,255,255,0.1)' }}>BỎ QUA</button>
                    <button
                        onClick={() => handleSubmit('wolf_vote', { targetId: selectedTarget })}
                        disabled={!selectedTarget}
                        className="gothic-btn gothic-btn-primary flex-1 py-2.5 text-xs"
                    >
                        XÁC NHẬN CẮN
                    </button>
                </div>
            </PopupWrapper>
        );
    }

    // Tiên tri — Soi
    if (role === 'Tiên tri') {
        if (phase !== 'NIGHT_SEER' || currentTurnRole !== 'Tiên tri') {
            return (
                <PopupWrapper onClose={onClose} title="Tiên Tri">
                    <p className="text-white/50 text-sm mb-4" style={{ fontFamily: 'var(--font-body)' }}>{desc}</p>
                    {skillResult?.type === 'seer_result' && (
                        <div className="p-3 mb-4 text-center" style={{ 
                            background: skillResult.result === 'WOLF' ? '#1a0808' : '#081a08',
                            border: `1px solid ${skillResult.result === 'WOLF' ? '#411' : '#141'}`,
                            borderRadius: '2px'
                        }}>
                            <p className="text-white/60 text-xs mb-1">{skillResult.targetName}</p>
                            <p className={`font-heading text-lg tracking-wider ${skillResult.result === 'WOLF' ? 'text-red-400/90' : 'text-green-400/70'}`}>
                                {skillResult.result === 'WOLF' ? '🐺 PHE SÓI' : '🏠 PHE DÂN'}
                            </p>
                        </div>
                    )}
                    <p className="text-white/30 text-xs italic text-center">Hãy chờ đến lượt Tiên tri...</p>
                </PopupWrapper>
            );
        }

        return (
            <PopupWrapper onClose={onClose} title="Tiên Tri · Soi">
                <p className="text-white/40 text-xs mb-3" style={{ fontFamily: 'var(--font-body)' }}>Chọn một người để soi phe</p>
                <PlayerList
                    players={alivePlayers}
                    selectedIds={selectedTarget ? [selectedTarget] : []}
                    onSelect={(id) => setSelectedTarget(id)}
                    myId={myId}
                />
                <div className="flex gap-2 mt-4">
                    <button onClick={() => handleSubmit('seer_check', { targetId: 'skip' })} className="gothic-btn flex-1 py-2.5 text-xs text-white/50 hover:text-white" style={{ border: '1px solid rgba(255,255,255,0.1)' }}>BỎ QUA</button>
                    <button
                        onClick={() => handleSubmit('seer_check', { targetId: selectedTarget })}
                        disabled={!selectedTarget}
                        className="gothic-btn gothic-btn-primary flex-1 py-2.5"
                    >
                        SOI
                    </button>
                </div>
            </PopupWrapper>
        );
    }

    // Bảo vệ
    if (role === 'Bảo vệ') {
        if (phase !== 'NIGHT_GUARD' || currentTurnRole !== 'Bảo vệ') {
            return (
                <PopupWrapper onClose={onClose} title="Bảo Vệ">
                    <p className="text-white/50 text-sm mb-4" style={{ fontFamily: 'var(--font-body)' }}>{desc}</p>
                    <p className="text-white/30 text-xs italic text-center">Hãy chờ đến lượt Bảo vệ...</p>
                </PopupWrapper>
            );
        }

        return (
            <PopupWrapper onClose={onClose} title="Bảo Vệ · Bảo Vệ">
                <p className="text-white/40 text-xs mb-3" style={{ fontFamily: 'var(--font-body)' }}>Chọn một người để bảo vệ (bao gồm bản thân)</p>
                {skillError && (
                    <div className="p-2 mb-3 text-center" style={{ background: '#1a0808', border: '1px solid #411', borderRadius: '2px' }}>
                        <p className="text-red-400/80 text-xs">{skillError.message || skillError}</p>
                    </div>
                )}
                <PlayerList
                    players={allAlive}
                    selectedIds={selectedTarget ? [selectedTarget] : []}
                    onSelect={(id) => { setSelectedTarget(id); clearSkillError(); }}
                    myId={myId}
                />
                <div className="flex gap-2 mt-4">
                    <button onClick={() => handleSubmit('guard_protect', { targetId: 'skip' })} className="gothic-btn flex-1 py-2.5 text-xs text-white/50 hover:text-white" style={{ border: '1px solid rgba(255,255,255,0.1)' }}>BỎ QUA</button>
                    <button
                        onClick={() => handleSubmit('guard_protect', { targetId: selectedTarget })}
                        disabled={!selectedTarget}
                        className="gothic-btn gothic-btn-primary flex-1 py-2.5"
                    >
                        BẢO VỆ
                    </button>
                </div>
            </PopupWrapper>
        );
    }

    // Thợ săn
    if (role === 'Thợ săn') {
        if (phase !== 'NIGHT_HUNTER' || currentTurnRole !== 'Thợ săn') {
            return (
                <PopupWrapper onClose={onClose} title="Thợ Săn">
                    <p className="text-white/50 text-sm mb-4" style={{ fontFamily: 'var(--font-body)' }}>{desc}</p>
                    <p className="text-white/30 text-xs italic text-center">Hãy chờ đến lượt Thợ săn...</p>
                </PopupWrapper>
            );
        }

        // Thợ săn nhắm mục tiêu ban đêm
        return (
            <PopupWrapper onClose={onClose} title="Thợ Săn · Nhắm">
                <p className="text-white/40 text-xs mb-3" style={{ fontFamily: 'var(--font-body)' }}>{desc}</p>
                <PlayerList
                    players={alivePlayers}
                    selectedIds={selectedTarget ? [selectedTarget] : []}
                    onSelect={(id) => setSelectedTarget(id)}
                    myId={myId}
                />
                <div className="flex gap-2 mt-4">
                    <button 
                        onClick={() => {
                            socket.emit('autoGM:hunterAim', 'skip');
                            onClose();
                            setSelectedTarget(null);
                        }} 
                        className="gothic-btn flex-1 py-2.5 text-xs text-white/50 hover:text-white" 
                        style={{ border: '1px solid rgba(255,255,255,0.1)' }}
                    >
                        BỎ QUA
                    </button>
                    <button
                        onClick={() => {
                            socket.emit('autoGM:hunterAim', selectedTarget);
                            onClose();
                            setSelectedTarget(null);
                        }}
                        disabled={!selectedTarget}
                        className="gothic-btn gothic-btn-primary flex-1 py-2.5"
                    >
                        NHẮM MỤC TIÊU
                    </button>
                </div>
            </PopupWrapper>
        );
    }

    // Phù thủy
    if (role === 'Phù Thuỷ') {
        if (phase !== 'NIGHT_WITCH' || currentTurnRole !== 'Phù Thuỷ') {
            return (
                <PopupWrapper onClose={onClose} title="Phù Thuỷ">
                    <p className="text-white/50 text-sm mb-4" style={{ fontFamily: 'var(--font-body)' }}>{desc}</p>
                    <p className="text-white/30 text-xs italic text-center">Hãy chờ đến lượt Phù Thuỷ...</p>
                </PopupWrapper>
            );
        }

        const wolfTarget = autoGMState?.nightActions?.wolfTarget || null;
        const wolfVictim = players.find(p => p.id === wolfTarget);
        const healUsed = autoGMState?.nightActions?.witchHealUsed;
        const killUsed = autoGMState?.nightActions?.witchKillUsed;

        return (
            <PopupWrapper onClose={onClose} title="Phù Thuỷ · Thuốc">
                {/* Hiển thị người bị sói cắn */}
                {wolfVictim && !healUsed && (
                    <div className="p-3 mb-4" style={{ background: '#1a0808', border: '1px solid #411', borderRadius: '2px' }}>
                        <p className="text-red-400/60 text-xs font-heading mb-1">NGƯỜI BỊ SÓI CẮN:</p>
                        <div className="flex justify-between items-center">
                            <span className="text-white/80 text-sm font-heading">{wolfVictim.name}</span>
                            <button
                                onClick={() => setWitchHeal(witchHeal === wolfTarget ? null : wolfTarget)}
                                className={`gothic-btn text-[10px] py-1 px-3 ${witchHeal === wolfTarget ? 'gothic-btn-primary !border-green-500/50' : ''}`}
                            >
                                <Heart size={12} /> {witchHeal === wolfTarget ? 'ĐÃ CHỌN CỨU' : 'CỨU'}
                            </button>
                        </div>
                    </div>
                )}
                {healUsed && (
                    <p className="text-white/30 text-xs italic mb-3">Bình thuốc cứu đã dùng hết.</p>
                )}

                {/* Thuốc độc */}
                {!killUsed && (
                    <>
                        <p className="text-white/40 text-xs mb-2 font-heading">THUỐC ĐỘC — Chọn 1 người để giết:</p>
                        <PlayerList
                            players={alivePlayers}
                            selectedIds={witchKill ? [witchKill] : []}
                            onSelect={(id) => setWitchKill(witchKill === id ? null : id)}
                            myId={myId}
                        />
                    </>
                )}
                {killUsed && (
                    <p className="text-white/30 text-xs italic mb-3">Bình thuốc độc đã dùng hết.</p>
                )}

                <div className="flex gap-2 mt-4">
                    <button
                        onClick={() => handleSubmit('witch_action', { heal: 'skip', kill: 'skip' })}
                        className="gothic-btn flex-1 py-2 text-xs text-white/50 hover:text-white"
                        style={{ border: '1px solid rgba(255,255,255,0.1)' }}
                    >
                        KHÔNG DÙNG THUỐC
                    </button>
                    <button
                        onClick={() => handleSubmit('witch_action', { heal: witchHeal, kill: witchKill })}
                        className="gothic-btn gothic-btn-primary flex-1 py-2.5"
                    >
                        XÁC NHẬN
                    </button>
                </div>
            </PopupWrapper>
        );
    }

    // Fallback
    return (
        <PopupWrapper onClose={onClose} title={role}>
            <p className="text-white/50 text-sm mb-4" style={{ fontFamily: 'var(--font-body)' }}>{desc}</p>
            <button onClick={onClose} className="gothic-btn gothic-btn-primary w-full py-2.5">ĐÓNG</button>
        </PopupWrapper>
    );
};

// =============================================
// SUB-COMPONENTS
// =============================================

/** Popup wrapper */
const PopupWrapper = ({ onClose, title, icon, children }) => (
    <div className="fixed inset-0 z-[95] flex items-center justify-center bg-black/95 backdrop-blur-sm animate-fadeIn p-4">
        <div className="gothic-card w-full max-w-sm flex flex-col max-h-[85vh]">
            {/* Header */}
            <div className="flex justify-between items-center mb-4 pb-2" style={{ borderBottom: '1px solid #222' }}>
                <div className="flex items-center gap-2">
                    {icon && <span className="text-white/40">{icon}</span>}
                    <h3 className="font-heading text-sm text-white/70 tracking-wider">{title}</h3>
                </div>
                <button onClick={onClose} className="text-white/30 hover:text-white/60 transition-colors">
                    <X size={16} />
                </button>
            </div>
            {/* Content */}
            <div className="overflow-y-auto flex-1 pr-1">
                {children}
            </div>
        </div>
    </div>
);

/** Danh sách người chơi có thể chọn */
const PlayerList = ({ players, selectedIds = [], onSelect, myId }) => (
    <div className="space-y-1.5 mb-2">
        {players.map(p => {
            const isSelected = selectedIds.includes(p.id);
            const isMe = p.id === myId;
            return (
                <button
                    key={p.id}
                    onClick={() => onSelect(p.id)}
                    className={`w-full text-left p-2.5 px-3 flex justify-between items-center transition-all ${
                        isSelected
                            ? 'bg-white/10 border border-white/40 text-white'
                            : 'bg-[#111] border border-[#1a1a1a] text-white/60 hover:bg-[#1a1a1a] hover:text-white/90'
                    }`}
                    style={{ borderRadius: '2px' }}
                >
                    <span className="font-heading text-sm tracking-wider">
                        {p.name} {isMe && <span className="text-white/30 text-[10px]">(BẠN)</span>}
                    </span>
                    {isSelected && <span className="text-[10px] font-heading text-white/60">✦ CHỌN</span>}
                </button>
            );
        })}
    </div>
);

/** Helper: Kiểm tra player có phải Sói không */
const isPlayerWolf = (playerId, autoGMState) => {
    if (!autoGMState?.wolfTeammates) return false;
    return autoGMState.wolfTeammates.includes(playerId);
};

/** Component hiển thị kết quả Tiên tri sau khi soi */
export const SeerResultPopup = ({ result, onClose }) => {
    if (!result || result.type !== 'seer_result') return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 backdrop-blur-sm animate-fadeIn">
            <div className="gothic-card text-center p-8 max-w-xs w-11/12">
                <div className="text-white/30 text-xs tracking-[0.5em] mb-4">— ✦ KẾT QUẢ SOI ✦ —</div>
                <p className="text-white/60 text-sm mb-2 font-heading tracking-wider">{result.targetName}</p>
                <div className={`font-display text-3xl mb-6 ${result.result === 'WOLF' ? 'text-red-500/80' : 'text-white/70'}`}
                    style={{ textShadow: `0 0 20px ${result.result === 'WOLF' ? 'rgba(255,0,0,0.3)' : 'rgba(255,255,255,0.1)'}` }}>
                    {result.result === 'WOLF' ? '🐺 SÓI' : '🏠 DÂN'}
                </div>
                <button onClick={onClose} className="gothic-btn gothic-btn-primary w-full py-2.5">
                    ĐÃ HIỂU
                </button>
            </div>
        </div>
    );
};
