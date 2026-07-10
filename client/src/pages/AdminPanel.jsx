import React, { useState } from 'react';
import { socket } from '../socket.js';
import { useGameStore } from '../store/useGameStore.js';
import { LogOut, Skull, Heart, UserMinus, ShieldAlert, Plus, Trash2, Pencil, Check, X, HeartHandshake, Swords, Trophy } from 'lucide-react';

export const AdminPanel = () => {
    const gameState = useGameStore(state => state.gameState);
    const clearSession = useGameStore(state => state.clearSession);
    const matchCount = useGameStore(state => state.matchCount);
    const leaderboard = useGameStore(state => state.leaderboard);
    const [configCopy, setConfigCopy] = useState([...gameState.rolesConfig]);
    const [newRoleName, setNewRoleName] = useState('');
    const [editingIdx, setEditingIdx] = useState(null);
    const [editingName, setEditingName] = useState('');
    const [coupleMode, setCoupleMode] = useState(false);
    const [coupleSelection, setCoupleSelection] = useState([]);
    const [showEndGame, setShowEndGame] = useState(false);

    React.useEffect(() => {
        setConfigCopy([...gameState.rolesConfig]);
    }, [gameState.rolesConfig]);

    const handleLogout = () => { socket.emit('leaveRoom'); clearSession(); };
    const handleShuffle = () => { socket.emit('shuffleCards'); };
    const handleKick = (id) => { if (confirm("Đuổi người chơi này?")) socket.emit('kickPlayer', id); };
    const handleToggleLife = (id) => { socket.emit('toggleLife', id); };
    const handleTransformToWolf = (id) => { if (confirm("Biến thành Sói?")) socket.emit('transformToWolf', id); };

    const updateRoleCount = (index, delta) => {
        const nc = [...configCopy];
        nc[index] = { ...nc[index], count: Math.max(0, nc[index].count + delta) };
        setConfigCopy(nc);
    };
    const addCustomRole = () => {
        if (!newRoleName.trim()) return;
        if (configCopy.find(r => r.name.toLowerCase() === newRoleName.trim().toLowerCase())) { alert('Role đã tồn tại!'); return; }
        setConfigCopy([...configCopy, { name: newRoleName.trim(), count: 1 }]);
        setNewRoleName('');
    };
    const removeRole = (index) => { setConfigCopy(configCopy.filter((_, i) => i !== index)); };
    const startEditRole = (index) => { setEditingIdx(index); setEditingName(configCopy[index].name); };
    const confirmEditRole = () => {
        if (!editingName.trim()) return;
        const nc = [...configCopy]; nc[editingIdx] = { ...nc[editingIdx], name: editingName.trim() };
        setConfigCopy(nc); setEditingIdx(null); setEditingName('');
    };
    const cancelEditRole = () => { setEditingIdx(null); setEditingName(''); };
    const saveConfig = () => { socket.emit('updateConfig', configCopy); };

    const toggleCoupleSelect = (id) => {
        if (coupleSelection.includes(id)) setCoupleSelection(coupleSelection.filter(x => x !== id));
        else if (coupleSelection.length < 2) setCoupleSelection([...coupleSelection, id]);
    };
    const confirmCouple = () => { if (coupleSelection.length === 2) { socket.emit('setCouple', coupleSelection); setCoupleMode(false); setCoupleSelection([]); } };
    const clearCouple = () => { socket.emit('clearCouple'); setCoupleMode(false); setCoupleSelection([]); };
    const handleEndGame = (team) => { socket.emit('endGame', team); setShowEndGame(false); };

    const players = gameState.players.filter(p => !p.isAdmin);
    const totalCards = configCopy.reduce((acc, curr) => acc + curr.count, 0);
    const readyCount = players.filter(p => p.isReady).length;
    const couple = gameState.couple || [];
    const hasCouple = couple.length === 2;

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
                        QUẢN TRÒ · VÁN #{matchCount}
                    </p>
                </div>
                <button onClick={handleLogout} className="gothic-btn flex items-center gap-2">
                    <LogOut size={14} /> THOÁT
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 flex-1 min-h-0">
                
                {/* ===== CỘT TRÁI: Cấu hình bộ bài ===== */}
                <div className="lg:col-span-1 flex flex-col gap-4">
                    <div className="gothic-card">
                        <h2 className="font-heading text-xs text-white/50 tracking-[0.2em] mb-4 pb-2"
                            style={{ borderBottom: '1px solid #222' }}>
                            BỘ BÀI · {totalCards} LÁ
                        </h2>
                        
                        <div className="space-y-1.5 mb-4 max-h-[40vh] overflow-y-auto pr-1">
                            {configCopy.map((role, idx) => (
                                <div key={idx} className="flex justify-between items-center px-3 py-2 group transition-colors"
                                     style={{ background: '#111', border: '1px solid #1A1A1A', borderRadius: '2px' }}>
                                    {editingIdx === idx ? (
                                        <div className="flex items-center gap-2 flex-1 mr-2">
                                            <input type="text" value={editingName} 
                                                onChange={(e) => setEditingName(e.target.value)}
                                                onKeyDown={(e) => e.key === 'Enter' && confirmEditRole()}
                                                className="gothic-input text-xs flex-1 py-1 px-2" autoFocus />
                                            <button onClick={confirmEditRole} className="text-white/40 hover:text-white"><Check size={14} /></button>
                                            <button onClick={cancelEditRole} className="text-white/40 hover:text-white"><X size={14} /></button>
                                        </div>
                                    ) : (
                                        <div className="flex items-center gap-2 flex-1 min-w-0">
                                            <span className="text-white/60 text-sm truncate" style={{ fontFamily: 'var(--font-body)' }}>{role.name}</span>
                                            <button onClick={() => startEditRole(idx)} title="Đổi tên"
                                                className="text-white/10 hover:text-white/50 opacity-0 group-hover:opacity-100 transition-all">
                                                <Pencil size={11} />
                                            </button>
                                        </div>
                                    )}
                                    <div className="flex items-center gap-2 shrink-0">
                                        <button onClick={() => updateRoleCount(idx, -1)}
                                            className="w-6 h-6 flex items-center justify-center text-white/30 hover:text-white transition-colors"
                                            style={{ border: '1px solid #333', borderRadius: '2px', background: '#0A0A0A', fontSize: '14px' }}>−</button>
                                        <span className="w-4 text-center font-heading text-white/70 text-xs">{role.count}</span>
                                        <button onClick={() => updateRoleCount(idx, 1)}
                                            className="w-6 h-6 flex items-center justify-center text-white/30 hover:text-white transition-colors"
                                            style={{ border: '1px solid #333', borderRadius: '2px', background: '#0A0A0A', fontSize: '14px' }}>+</button>
                                        <button onClick={() => removeRole(idx)} title="Xóa"
                                            className="text-white/10 hover:text-white/60 opacity-0 group-hover:opacity-100 transition-all ml-1">
                                            <Trash2 size={12} />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Add custom role */}
                        <div className="flex gap-2 mb-4">
                            <input type="text" placeholder="Tên role mới..." value={newRoleName}
                                onChange={(e) => setNewRoleName(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && addCustomRole()}
                                className="gothic-input flex-1 text-xs py-1.5 px-3" />
                            <button onClick={addCustomRole} disabled={!newRoleName.trim()}
                                className="gothic-btn text-[10px] px-3 py-1.5 flex items-center gap-1">
                                <Plus size={12} /> THÊM
                            </button>
                        </div>
                        
                        <button onClick={saveConfig} className="gothic-btn gothic-btn-primary w-full py-2.5">
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
                            <div className="space-y-1 max-h-[20vh] overflow-y-auto pr-1">
                                {Object.entries(leaderboard).sort(([, a], [, b]) => b - a).map(([name, wins], i) => (
                                    <div key={name} className="flex justify-between items-center text-xs py-1.5 px-2"
                                         style={{ background: '#111', borderRadius: '2px' }}>
                                        <span className={`${i === 0 ? 'text-white/80' : 'text-white/40'}`}>
                                            {i === 0 ? '◆' : i === 1 ? '◇' : i === 2 ? '·' : `${i+1}.`} {name}
                                        </span>
                                        <span className="text-white/60 font-heading text-[10px]">{wins}W</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* ===== CỘT PHẢI: Người chơi ===== */}
                <div className="lg:col-span-2 gothic-card flex flex-col min-h-0">
                    {/* Toolbar */}
                    <div className="flex flex-wrap justify-between items-center mb-4 pb-3 gap-3"
                         style={{ borderBottom: '1px solid #222' }}>
                        <h2 className="font-heading text-xs text-white/50 tracking-[0.2em]">
                            NGƯỜI CHƠI · {readyCount}/{players.length}
                        </h2>
                        <div className="flex gap-2 flex-wrap">
                            <button onClick={() => { setCoupleMode(!coupleMode); setCoupleSelection([]); }}
                                className={`gothic-btn text-[10px] ${coupleMode ? 'gothic-btn-primary !border-white/50' : ''}`}>
                                <HeartHandshake size={13} /> CẶP ĐÔI
                            </button>
                            <button onClick={() => setShowEndGame(!showEndGame)}
                                className={`gothic-btn text-[10px] ${showEndGame ? 'gothic-btn-primary !border-white/50' : ''}`}>
                                <Swords size={13} /> KẾT THÚC
                            </button>
                            <button onClick={handleShuffle} disabled={readyCount !== totalCards || readyCount === 0}
                                className="gothic-btn gothic-btn-primary text-[10px]">
                                CHIA BÀI
                            </button>
                        </div>
                    </div>

                    {/* Warnings */}
                    {readyCount > 0 && readyCount !== totalCards && (
                        <div className="mb-3 text-white/30 text-xs flex items-center gap-2 font-heading tracking-wider">
                            <ShieldAlert size={14} className="text-white/20" /> 
                            SỐ NGƯỜI ({readyCount}) ≠ SỐ LÁ BÀI ({totalCards})
                        </div>
                    )}

                    {/* Couple Mode Bar */}
                    {coupleMode && (
                        <div className="mb-3 p-3 flex flex-wrap items-center justify-between gap-2"
                             style={{ background: '#111', border: '1px solid #222', borderRadius: '2px' }}>
                            <span className="text-white/40 text-xs font-heading tracking-wider">
                                ✧ CHỌN 2 NGƯỜI LÀM CẶP ĐÔI ({coupleSelection.length}/2)
                            </span>
                            <div className="flex gap-2">
                                {hasCouple && <button onClick={clearCouple} className="gothic-btn text-[10px] py-1 px-2">HUỶ CẶP</button>}
                                <button onClick={confirmCouple} disabled={coupleSelection.length !== 2} className="gothic-btn gothic-btn-primary text-[10px] py-1 px-2">XÁC NHẬN</button>
                                <button onClick={() => { setCoupleMode(false); setCoupleSelection([]); }} className="gothic-btn text-[10px] py-1 px-2">ĐÓNG</button>
                            </div>
                        </div>
                    )}

                    {/* End Game Panel */}
                    {showEndGame && (
                        <div className="mb-3 p-3" style={{ background: '#111', border: '1px solid #222', borderRadius: '2px' }}>
                            <p className="text-white/40 text-xs font-heading tracking-wider mb-2">✦ PHE THẮNG</p>
                            <div className="flex flex-wrap gap-2">
                                <button onClick={() => handleEndGame('VILLAGER')} className="gothic-btn text-[10px] py-1.5">DÂN LÀNG</button>
                                <button onClick={() => handleEndGame('WEREWOLF')} className="gothic-btn text-[10px] py-1.5">MA SÓI</button>
                                {hasCouple && <button onClick={() => handleEndGame('COUPLE')} className="gothic-btn text-[10px] py-1.5">CẶP ĐÔI</button>}
                                <button onClick={() => handleEndGame('SIDA_SOLO')} className="gothic-btn text-[10px] py-1.5">SIDA</button>
                                <button onClick={() => setShowEndGame(false)} className="gothic-btn text-[10px] py-1.5">HUỶ</button>
                            </div>
                        </div>
                    )}

                    {/* Player List */}
                    <div className="space-y-1.5 overflow-y-auto flex-1 pr-1">
                        {players.map(p => {
                            const isInCouple = couple.includes(p.id);
                            const isSelectedForCouple = coupleSelection.includes(p.id);
                            
                            let borderColor = '#1A1A1A';
                            let bgColor = '#111';
                            if (isSelectedForCouple) { borderColor = '#555'; bgColor = '#151515'; }
                            else if (!p.isAlive) { borderColor = '#1A1A1A'; bgColor = '#080808'; }
                            else if (isInCouple) { borderColor = '#333'; bgColor = '#131313'; }
                            else if (p.isReady) { borderColor = '#2A2A2A'; bgColor = '#111'; }

                            return (
                                <div key={p.id}
                                    onClick={coupleMode ? () => toggleCoupleSelect(p.id) : undefined}
                                    className={`p-2 px-3 flex items-center justify-between transition-all duration-300 ${coupleMode ? 'cursor-pointer' : ''} ${!p.isAlive ? 'opacity-40' : ''}`}
                                    style={{ background: bgColor, border: `1px solid ${borderColor}`, borderRadius: '2px' }}>
                                    
                                    {/* Info Left */}
                                    <div className="flex items-center gap-3 flex-1 min-w-0">
                                        <div className="flex items-center gap-1 w-24 shrink-0">
                                            <span className={`font-heading text-xs tracking-wider truncate ${p.isAlive ? 'text-white/70' : 'text-white/30 line-through'}`}>
                                                {p.name}
                                            </span>
                                            {isInCouple && <span className="text-white/30 text-[10px]" title="Cặp đôi">✧✧</span>}
                                        </div>
                                        
                                        <div className="text-[10px] text-white/25 flex items-center gap-1.5 w-20 shrink-0" style={{ fontFamily: 'var(--font-body)' }}>
                                            <span className={`w-1 h-1 rounded-full inline-block ${p.isReady ? 'bg-white/50' : 'bg-white/10'}`}></span>
                                            {p.isReady ? "Sẵn sàng" : "Đang chờ"}
                                        </div>

                                        <div className="font-heading text-[10px] text-white/40 tracking-wider truncate flex-1">
                                            {p.role}
                                        </div>
                                    </div>
                                    
                                    {/* Actions Right */}
                                    <div className="flex items-center gap-2 shrink-0 ml-2">
                                        {!coupleMode && p.role === 'Kẻ Bị Nguyền' && p.isAlive && (
                                            <button onClick={(e) => { e.stopPropagation(); handleTransformToWolf(p.id); }}
                                                className="text-white/20 hover:text-white/60 p-1 transition-colors" title="Biến thành Sói"
                                                style={{ fontSize: '12px' }}>𖤐</button>
                                        )}
                                        {!coupleMode && (
                                            <button onClick={(e) => { e.stopPropagation(); handleToggleLife(p.id); }}
                                                className="text-white/20 hover:text-white/60 p-1 transition-colors"
                                                title={p.isAlive ? "Giết" : "Hồi sinh"}>
                                                {p.isAlive ? <Skull size={14} /> : <Heart size={14} />}
                                            </button>
                                        )}
                                        {!coupleMode && (
                                            <button onClick={(e) => { e.stopPropagation(); handleKick(p.id); }}
                                                className="text-white/10 hover:text-white/50 p-1 transition-colors" title="Kick">
                                                <UserMinus size={14} />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                        
                        {players.length === 0 && (
                            <div className="col-span-full py-12 text-center">
                                <div className="text-white/10 text-3xl mb-3">☽</div>
                                <div className="text-white/20 text-xs font-heading tracking-[0.2em] italic">
                                    CHƯA CÓ NGƯỜI CHƠI
                                </div>
                            </div>
                        )}
                    </div>
                </div>

            </div>
        </div>
    );
};
