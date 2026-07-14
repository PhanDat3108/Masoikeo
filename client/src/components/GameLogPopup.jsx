import React from 'react';
import { LogOut } from 'lucide-react';

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
                <div className="overflow-y-auto flex-1 pr-2 space-y-6 custom-scrollbar">
                    {groupedLogs.map((group, idx) => (
                        <div key={idx} className="space-y-2">
                            <h3 className="text-red-400/80 font-heading text-sm tracking-wider sticky top-0 bg-[#0a0a0a] py-1">
                                ✦ {group.title}
                            </h3>
                            <div className="space-y-1">
                                {group.logs.map((log, lIdx) => (
                                    <div key={lIdx} className="text-white/60 text-xs py-1.5 px-3 border-l-2 border-white/10" style={{ fontFamily: 'var(--font-body)' }}>
                                        {formatLog(log)}
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                    {logs.length === 0 && (
                        <div className="text-center text-white/30 text-xs italic py-8">
                            Chưa có sự kiện nào.
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
