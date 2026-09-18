import { gameState, matchData } from '../state/gameState.js';

export const shuffleAndDistributeCards = () => {
    matchData.count++;
    gameState.couple = [];
    
    let deck = [];
    gameState.rolesConfig.forEach(r => { 
        for(let i=0; i < r.count; i++) {
            deck.push(r.name); 
        }
    });

    // Fisher-Yates Shuffle
    for (let i = deck.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [deck[i], deck[j]] = [deck[j], deck[i]];
    }

    // Khi Admin bấm chia bài, tất cả người chơi trong phòng (không phải Admin) đều được chia bài
    let targetPlayers = gameState.players.filter(p => !p.isAdmin);
    
    targetPlayers.forEach((p, index) => {
        p.role = deck[index] || 'Dân Ngu';
        p.isAlive = true; 
        p.isReady = true;
    });

    // === Chống lặp Sói 3 ván liên tiếp ===
    // Tìm người bị gán Sói nhưng đã chơi Sói 2 ván liền trước đó
    const wolfPlayers = targetPlayers.filter(p => p.role === 'Sói' && (matchData.wolfHistory[p.name] || 0) >= 2);
    const nonWolfPlayers = targetPlayers.filter(p => p.role !== 'Sói' && (matchData.wolfHistory[p.name] || 0) < 2);

    for (const wolfPlayer of wolfPlayers) {
        if (nonWolfPlayers.length === 0) break; // Không còn ai để đổi
        // Chọn ngẫu nhiên 1 người không phải Sói để đổi
        const randIdx = Math.floor(Math.random() * nonWolfPlayers.length);
        const swapTarget = nonWolfPlayers[randIdx];
        
        // Đổi vai
        const temp = wolfPlayer.role;
        wolfPlayer.role = swapTarget.role;
        swapTarget.role = temp;
        
        // Xóa swapTarget khỏi danh sách (đã thành Sói rồi, ko đổi nữa)
        nonWolfPlayers.splice(randIdx, 1);
    }

    // Cập nhật lịch sử Sói
    targetPlayers.forEach(p => {
        if (p.role === 'Sói') {
            matchData.wolfHistory[p.name] = (matchData.wolfHistory[p.name] || 0) + 1;
        } else {
            matchData.wolfHistory[p.name] = 0; // Reset khi không phải Sói
        }
    });

    return deck;
};

export const checkAdmin = (socketId) => {
    const p = gameState.players.find(p => p.id === socketId);
    return p && p.isAdmin;
};
