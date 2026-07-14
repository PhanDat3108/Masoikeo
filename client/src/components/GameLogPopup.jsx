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
            case 'TIMEOUT': return `Hết thời gian.`;
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
