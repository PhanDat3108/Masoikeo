import React from 'react';
import { LogOut } from 'lucide-react';

export const GameLogPopup = ({ logs = [], players = [], playerMeta = {}, onClose }) => {
    // Nhóm logs theo Ngày/Đêm
    const groupedLogs = [];
    let currentGroup = { title: "Bắt đầu Game", logs: [] };

    logs.forEach(log => {
        if (log.type === 'PHASE_CHANGE' && (log.data.to === 'NIGHT' || log.data.to === 'DAY')) {
            // Push group cũ nếu đã có log hoặc không phải group mặc định
            if (currentGroup.logs.length > 0 || currentGroup.title !== "Bắt đầu Game") {
                groupedLogs.push(currentGroup);
            }
            const isNight = log.data.to === 'NIGHT';
            currentGroup = {
                title: isNight ? `Đêm ${log.data.nightCount}` : `Ngày ${log.data.dayCount}`,
                logs: []
            };
        }
        
        // Push tất cả log vào group hiện tại (để hiển thị formatLog)
        currentGroup.logs.push(log);
    });
    if (currentGroup.logs.length > 0 || currentGroup.title !== "Bắt đầu Game") {
        groupedLogs.push(currentGroup);
    }

    const formatLog = (log) => {
        const d = log.data;
        switch (log.type) {
            case 'GAME_START': return 'Đêm đầu tiên buông xuống, các vai trò bí mật đã được trao.';
            case 'SKILL_TURN': return `Lượt của ${d.role} bắt đầu.`;
            case 'SKILL_SKIP': return d.reason === 'timeout' ? `${d.role} không hành động kịp, tự động bỏ qua.` : `${d.role} quyết định không sử dụng kỹ năng đêm nay.`;
            case 'WOLF_VOTE': return d.target === 'skip' ? `Sói ${d.wolf} không muốn sát hại ai.` : `Sói ${d.wolf} chỉ định ${d.target} làm con mồi.`;
            case 'WOLF_BITE': return d.success ? `Bầy Sói đã thống nhất cắn xé ${d.target}.` : `Bầy Sói đã tấn công thất bại, con mồi ${d.target} vẫn sống sót.`;
            case 'WOLF_RESULT': return d.targetId === 'skip' || !d.targetId ? `Sói không thống nhất được mục tiêu, đêm nay bình yên.` : d.random ? `Sói vote hoà nhau, hệ thống chọn ngẫu nhiên ${d.target} làm con mồi.` : `Bầy sói đã quyết định tấn công ${d.target}.`;
            case 'WOLF_TIE': return `Sói hoang mang, đang hoà phiếu cắn giữa: ${d.tied?.join(', ')}.`;
            case 'WOLF_BITE_BLOCKED': return `Cuộc tấn công của Sói nhắm vào ${d.target} đã bị Bảo vệ cản phá!`;
            case 'CURSED_BITTEN': return `Sói đã cắn ${d.target}, nhưng không ngờ đó là Kẻ Bị Nguyền!`;
            case 'CURSED_CONVERTED': return `Lờ nguyền ứng nghiệm! ${d.player} đã hoá thân thành Sói.`;
            case 'SEER_CHECK': return `Tiên tri ${d.seer} soi ${d.target} và phát hiện người này là ${d.result === 'WOLF' ? 'Sói' : 'Dân'}.`;
            case 'GUARD_PROTECT': return `Bảo vệ ${d.guard} đã thức trắng đêm để canh gác cho ${d.target}.`;
            case 'WITCH_HEAL': return `Phù thủy đã dùng thuốc tiên cứu mạng ${d.target}.`;
            case 'WITCH_KILL': return `Phù thủy tàn nhẫn ném bình thuốc độc vào ${d.target}.`;
            case 'CUPID_PAIR': return `Cupid bắn mũi tên tình yêu, se duyên cho ${d.player1} và ${d.player2}.`;
            case 'HUNTER_AIM': return d.target === 'skip' ? `Thợ săn ${d.hunter} cất súng, không nhắm vào ai.` : `Thợ săn ${d.hunter} lạnh lùng nhắm súng vào đầu ${d.target}.`;
            case 'HUNTER_SHOT': return `Trong cơn hấp hối ban đêm, Thợ săn ${d.hunter} đã nổ súng bắn chết ${d.target}.`;
            case 'HUNTER_CHAIN_SHOT': return `Viên đạn định mệnh của Thợ săn nổ ra, ghim thẳng vào ${d.target}.`;
            case 'HUNTER_DAY_SHOT': return `Trước khi bị treo cổ, Thợ săn ${d.hunter} phẫn nộ nổ súng bắn chết ${d.target}.`;
            case 'HUNTER_TRIGGER': return `Thợ săn đang trong cơn thịnh nộ, chuẩn bị nổ súng kéo theo một người xuống mồ!`;
            case 'VOTE_FAILED': return `Dân làng chia rẽ, không có quyết định treo cổ nào được đưa ra.`;
            case 'VOTE_TIE': return `Đám đông hoang mang, số phiếu hoà nhau giữa: ${d.tied?.join(', ')}. Tiến hành vote lại...`;
            case 'VOTE_TIE_FINAL': return `Vẫn không thể thống nhất ý kiến! Không ai bị treo cổ hôm nay.`;
            case 'VOTE_RESULT': return `Kết quả bỏ phiếu: không ai bị treo.`;
            case 'HANGED': return `Dân làng đã biểu quyết đưa ${d.player} lên đoạn đầu đài với ${d.votes} phiếu.`;
            case 'SIDA_HANGED': return `Dân làng đã treo cổ Sida (${d.player}). Thảm hoạ bắt đầu!`;
            case 'LOVER_DEATH': return `Trái tim tan vỡ, ${d.partnerDied} tự vẫn vì người yêu ${d.dead} đã lìa đời.`;
            case 'LOVER_CHAIN': return `${d.partnerDied} chết theo tiếng gọi tình yêu.`;
            case 'DEATH': 
                let reasonStr = 'lý do bí ẩn';
                if (d.cause === 'wolf') reasonStr = 'bị Sói cắn xé tàn bạo';
                else if (d.cause === 'witch_kill') reasonStr = 'trúng kịch độc của Phù thủy';
                else if (d.cause === 'hunter_shot' || d.cause === 'hunter_chain') reasonStr = 'trúng đạn của Thợ săn';
                else if (d.cause === 'lover_death') reasonStr = 'tự vẫn vì tình do người yêu chết';
                return `Xác của ${d.player} được phát hiện (${reasonStr}). Thân phận thật là: ${d.role || 'Không rõ'}.`;
            case 'DAY_VOTE':
                if (d.target === 'skip') return `${d.voter} đã quyết định không bỏ phiếu.`;
                const targetPlayer = players.find(p => p.id === d.target);
                const targetName = targetPlayer ? targetPlayer.name : d.target;
                return `${d.voter} đã biểu quyết treo cổ ${targetName}.`;
            case 'TIMEOUT': return null;
            case 'GAME_OVER': 
                let winStr = 'HÒA, KHÔNG AI SỐNG SÓT';
                if (d.winner === 'WOLF') winStr = 'BẦY SÓI ĐÃ TÀN SÁT DÂN LÀNG';
                else if (d.winner === 'VILLAGER') winStr = 'DÂN LÀNG ĐÃ TIÊU DIỆT HẾT SÓI';
                else if (d.winner === 'COUPLE') winStr = 'CẶP ĐÔI SỐNG SÓT ĐẾN CUỐI CÙNG';
                else if (d.winner === 'SIDA') winStr = 'SIDA ĐÃ LÂY BỆNH CHO CẢ LÀNG';
                return `Ván đấu kết thúc. ${winStr}!`;
            case 'PHASE_CHANGE': 
                if (d.to === 'DAY_ANNOUNCE' || d.to === 'DAY') return `Mặt trời mọc, tiếng gà gáy vang, một ngày mới bắt đầu.`;
                if (d.to === 'DAY_DISCUSS') return `Dân làng thức dậy và bắt đầu thảo luận tìm ra kẻ ác.`;
                if (d.to === 'DAY_VOTE') return `Dân làng bắt đầu bỏ phiếu treo cổ.`;
                if (d.to === 'DAY_REVOTE') return `Dân làng hoang mang và phải biểu quyết lại.`;
                if (d.to === 'NIGHT') return `Mặt trời lặn, bóng tối bao trùm ngôi làng. Sói bắt đầu đi săn.`;
                return `Hệ thống chuyển sang giai đoạn: ${d.to}`;
            default: return `[Sự kiện] ${JSON.stringify(d)}`;
        }
    };

    const playerList = players.filter(p => !p.isAdmin);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md transition-opacity duration-300">
            <div className="gothic-card w-full max-w-2xl max-h-[88vh] flex flex-col relative animate-modalPop border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.85)] p-5 sm:p-6">
                <button 
                    onClick={onClose} 
                    aria-label="Đóng"
                    className="absolute top-4 right-4 p-2 text-white/40 hover:text-rose-400 hover:rotate-90 hover:scale-110 active:scale-95 transition-all duration-300 rounded-full hover:bg-white/5"
                >
                    <LogOut size={18} />
                </button>
                <div className="text-center pb-4 mb-4 border-b border-white/10">
                    <h2 className="font-display text-lg sm:text-xl text-white tracking-[0.25em] drop-shadow-[0_2px_8px_rgba(255,255,255,0.15)] flex items-center justify-center gap-2">
                        <span className="w-6 h-[1px] bg-gradient-to-r from-transparent to-red-500/80"></span>
                        NHẬT KÝ QUẢN TRÒ
                        <span className="w-6 h-[1px] bg-gradient-to-l from-transparent to-red-500/80"></span>
                    </h2>
                    <p className="text-[11px] text-white/40 font-heading tracking-wider mt-1">LỊCH SỬ SỰ KIỆN TOÀN BỘ VÁN ĐẤU</p>
                </div>

                <div className="overflow-y-auto flex-1 pr-1.5 sm:pr-2 space-y-6 custom-scrollbar">
                    {/* Thêm phần hiển thị danh sách người chơi và vai trò */}
                    {playerList.length > 0 && (
                        <div className="space-y-2.5">
                            <h3 className="text-indigo-300 font-heading text-xs tracking-widest uppercase sticky top-0 bg-[#121218]/95 backdrop-blur-sm py-1.5 px-2.5 z-10 border-b border-indigo-500/20 rounded flex items-center gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse"></span>
                                DANH SÁCH VAI TRÒ THẬT
                            </h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-1">
                                {playerList.map(p => {
                                    const meta = playerMeta[p.id];
                                    const roleStr = meta?.originalRole || p.role || 'Không rõ';
                                    const isConverted = meta?.isConverted;
                                    const isWolf = roleStr === 'Sói' || isConverted;
                                    return (
                                        <div 
                                            key={p.id} 
                                            className={`flex justify-between items-center text-xs py-2 px-3 border rounded transition-colors duration-200 ${
                                                isWolf 
                                                    ? 'border-red-500/30 bg-red-950/20 shadow-[0_0_10px_rgba(225,29,72,0.1)]' 
                                                    : 'border-white/5 bg-white/[0.03] hover:border-white/10'
                                            }`}
                                        >
                                            <span className="text-white/90 font-heading truncate">{p.name}</span>
                                            <span className={`font-heading text-[11px] font-semibold px-2 py-0.5 rounded ${
                                                isWolf ? 'text-red-400 bg-red-950/40 border border-red-500/20' : 'text-slate-400 bg-white/5'
                                            }`}>
                                                {roleStr} {isConverted && '(Hoá Sói)'}
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {groupedLogs.map((group, idx) => {
                        const validLogs = group.logs.map(formatLog).filter(Boolean);
                        if (validLogs.length === 0) return null;
                        const isNightGroup = group.title.startsWith('Đêm');
                        
                        return (
                            <div key={idx} className="space-y-2">
                                <h3 className={`font-heading text-xs tracking-widest uppercase sticky top-0 bg-[#121218]/95 backdrop-blur-sm py-1.5 px-2.5 z-10 border-b rounded flex items-center gap-2 ${
                                    isNightGroup 
                                        ? 'text-indigo-400 border-indigo-500/30' 
                                        : 'text-amber-400 border-amber-500/30'
                                }`}>
                                    <span className={`w-1.5 h-1.5 rounded-full ${isNightGroup ? 'bg-indigo-400' : 'bg-amber-400'}`}></span>
                                    {group.title}
                                </h3>
                                <div className="space-y-1.5 pl-2 sm:pl-3 border-l border-white/10 ml-2">
                                    {validLogs.map((logStr, lIdx) => (
                                        <div 
                                            key={lIdx} 
                                            className="text-white/75 text-xs py-1 px-2.5 rounded bg-white/[0.02] hover:bg-white/[0.05] transition-colors leading-relaxed"
                                            style={{ fontFamily: 'var(--font-body)' }}
                                        >
                                            {logStr}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        );
                    })}
                    {logs.length === 0 && (
                        <div className="text-center text-white/30 text-xs italic py-10">
                            Chưa có sự kiện nào được ghi nhận.
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
