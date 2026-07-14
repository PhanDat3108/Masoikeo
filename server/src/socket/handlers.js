import { gameState, matchData } from '../state/gameState.js';
import { shuffleAndDistributeCards, checkAdmin } from './gameLogic.js';

let timerTimeout = null;

export const registerHandlers = (io, socket) => {
    // Gửi data ban đầu
    socket.emit('updateRolesConfig', gameState.rolesConfig);
    socket.emit('updateMatchCount', matchData.count);
    socket.emit('updateLeaderboard', matchData.leaderboard);

    // Xử lý Join & Reconnect
    socket.on('join', (data) => {
        const { name, secretId } = data;
        if (!name || !secretId) return;

        let isAdmin = name.toLowerCase() === 'admin';
        let finalName = isAdmin ? "QUẢN TRÒ" : name.toUpperCase().trim();

        // 1. KIỂM TRA RECONNECT
        let playerBySecret = gameState.players.find(p => p.secretId === secretId);
        if (playerBySecret) {
            playerBySecret.id = socket.id;
            playerBySecret.name = finalName; // Cập nhật tên lỡ họ gõ tên khác
            io.emit('updateState', gameState);
            return; 
        }

        // 2. ĐÁ NGƯỜI CŨ NẾU TRÙNG TÊN (Nhưng khác secretId)
        let duplicateIndex = gameState.players.findIndex(p => p.name === finalName);
        if (duplicateIndex !== -1) {
            const oldPlayer = gameState.players[duplicateIndex];
            io.to(oldPlayer.id).emit('forceLogout', 'Tài khoản đã đăng nhập ở nơi khác!');
            
            const oldSocket = io.sockets.sockets.get(oldPlayer.id);
            if (oldSocket) {
                oldSocket.disconnect(true);
            }
            gameState.players.splice(duplicateIndex, 1);
        }

        // 3. THÊM NGƯỜI MỚI
        gameState.players.push({ 
            id: socket.id, 
            secretId: secretId, 
            name: finalName, 
            role: isAdmin ? "Quản trò" : "...", 
            isAlive: true, 
            isAdmin, 
            isReady: isAdmin 
        });

        if (!isAdmin && !matchData.leaderboard[finalName]) {
            matchData.leaderboard[finalName] = 0;
        }
        
        io.emit('updateState', gameState);
        io.emit('updateRolesConfig', gameState.rolesConfig);
    });

    // Các tính năng Admin
    socket.on('updateConfig', (newConfig) => {
        if (checkAdmin(socket.id)) {
            gameState.rolesConfig = newConfig;
            io.emit('updateState', gameState); 
            io.emit('updateRolesConfig', gameState.rolesConfig);
        }
    });

    socket.on('shuffleCards', () => {
        if (!checkAdmin(socket.id)) return;
        shuffleAndDistributeCards();
        io.emit('updateState', gameState);
        io.emit('updateMatchCount', matchData.count);
        io.emit('startCountdown');
    });

    socket.on('toggleAutoGM', () => {
        if (checkAdmin(socket.id)) {
            gameState.isAutoGM = !gameState.isAutoGM;
            io.emit('updateState', gameState);
        }
    });

    socket.on('transformToWolf', (id) => {
        if (checkAdmin(socket.id)) {
            const p = gameState.players.find(player => player.id === id);
            if (p && p.role === 'Kẻ Bị Nguyền') {
                p.role = 'Sói'; 
                io.emit('updateState', gameState);
            }
        }
    });

    socket.on('toggleLife', (id) => {
        if (checkAdmin(socket.id)) {
            const p = gameState.players.find(p => p.id === id);
            if (p) { 
                p.isAlive = !p.isAlive; 
                io.emit('updateState', gameState); 
            }
        }
    });

    socket.on('kickPlayer', (id) => {
        if (checkAdmin(socket.id)) {
            io.to(id).emit('youAreKicked');
            const socketToKick = io.sockets.sockets.get(id);
            if (socketToKick) socketToKick.disconnect(true);

            gameState.players = gameState.players.filter(p => p.id !== id);
            io.emit('updateState', gameState);
        }
    });

    // Chọn cặp đôi
    socket.on('setCouple', (coupleIds) => {
        if (checkAdmin(socket.id)) {
            // coupleIds là mảng gồm 2 id người chơi
            if (Array.isArray(coupleIds) && coupleIds.length === 2) {
                gameState.couple = coupleIds;
                io.emit('updateState', gameState);
            }
        }
    });

    // Xoá cặp đôi
    socket.on('clearCouple', () => {
        if (checkAdmin(socket.id)) {
            gameState.couple = [];
            io.emit('updateState', gameState);
        }
    });

    socket.on('endGame', (team) => {
        if (!checkAdmin(socket.id)) return;

        let winners = [];
        gameState.players.forEach(p => {
            if (p.isAdmin) return;
            let isWinner = false;

            if (team === 'VILLAGER') {
                if (p.role !== 'Sói' && p.role !== 'Sida') isWinner = true;
            } else if (team === 'WEREWOLF') {
                if (p.role === 'Sói') isWinner = true;
            } else if (team === 'COUPLE') {
                if (gameState.couple.includes(p.id)) isWinner = true;
            } else if (team === 'SIDA_SOLO') {
                if (p.role === 'Sida') isWinner = true;
            }

            if (isWinner) {
                winners.push(p.id);
                matchData.leaderboard[p.name] = (matchData.leaderboard[p.name] || 0) + 1;
            }

            // Reset player for the next game
            p.role = "...";
            p.isReady = false;
            p.isAlive = true;
        });

        // Reset game specific states
        gameState.couple = [];

        io.emit('updateLeaderboard', matchData.leaderboard);
        io.emit('updateState', gameState);
        io.emit('gameEnded', { team, winners });
    });

    // Hẹn giờ
    socket.on('startTimer', (minutes) => {
        if (checkAdmin(socket.id)) {
            if (timerTimeout) clearTimeout(timerTimeout);
            const durationMs = minutes * 60 * 1000;
            gameState.timerEndTime = Date.now() + durationMs;
            io.emit('updateState', gameState);
            
            timerTimeout = setTimeout(() => {
                gameState.timerEndTime = null;
                io.emit('updateState', gameState);
                io.emit('playWolfHowl');
            }, durationMs);
        }
    });

    socket.on('stopTimer', () => {
        if (checkAdmin(socket.id)) {
            if (timerTimeout) clearTimeout(timerTimeout);
            gameState.timerEndTime = null;
            io.emit('updateState', gameState);
        }
    });

    // Bỏ phiếu kín
    socket.on('toggleVote', () => {
        if (checkAdmin(socket.id)) {
            gameState.vote.isActive = !gameState.vote.isActive;
            if (gameState.vote.isActive) {
                gameState.vote.votes = {}; // Xoá phiếu cũ khi mở lại
            }
            io.emit('updateState', gameState);
        }
    });

    socket.on('submitVote', (votedId) => {
        if (gameState.vote.isActive) {
            gameState.vote.votes[socket.id] = votedId;
            io.emit('updateState', gameState);
        }
    });

    // Player action
    socket.on('setStatus', (status) => {
        const p = gameState.players.find(p => p.id === socket.id);
        if (p && !p.isAdmin) {
            p.isReady = status;
            if (!status) p.role = "..."; 
            io.emit('updateState', gameState);
        }
    });

    socket.on('leaveRoom', () => {
        gameState.players = gameState.players.filter(p => p.id !== socket.id);
        io.emit('updateState', gameState);
    });

    // Disconnect: We don't remove player on disconnect immediately so they can F5.
    socket.on('disconnect', () => {
        // Có thể đánh dấu offline nếu muốn, hiện tại cứ để kệ để reconnect
    });
};
