const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static('public'));

let gameState = {
    players: [], 
    couple: [],
    rolesConfig: [
        { name: 'Dân Ngu', count: 4 },
        { name: 'Sói', count: 2 },
        { name: 'Tiên tri', count: 1 },
        { name: 'Bảo vệ', count: 1 },
        { name: 'Thợ săn', count: 1 },
        { name: 'Phù Thuỷ', count: 1 },
        { name: 'Kẻ Bị Nguyền', count: 1 },
        { name: 'Sida', count: 1 }
    ]
};

let matchData = {
    count: 0,
    lastDate: new Date().toDateString(),
    leaderboard: {}
};

function checkAdmin(socket) {
    const p = gameState.players.find(p => p.id === socket.id);
    return p && p.isAdmin;
}

io.on('connection', (socket) => {
    socket.emit('updateRolesConfig', gameState.rolesConfig);
    socket.emit('updateMatchCount', matchData.count);
    socket.emit('updateLeaderboard', matchData.leaderboard);

    socket.on('join', (data) => {
        const { name, secretId } = data;
        if (!name || !secretId) return;

        let isAdmin = name.toLowerCase() === 'admin';
        // Chuẩn hóa tên
        let finalName = isAdmin ? "QUẢN TRÒ" : name.toUpperCase().trim();

        // 1. KIỂM TRA RECONNECT (Trùng mã bí mật)
        let playerBySecret = gameState.players.find(p => p.secretId === secretId);
        if (playerBySecret) {
            playerBySecret.id = socket.id;
            playerBySecret.name = finalName;
            io.emit('updateState', gameState);
            return; 
        }

        // 2. KIỂM TRA TRÙNG TÊN -> ĐÁ NGƯỜI CŨ
        let duplicateIndex = gameState.players.findIndex(p => p.name === finalName);

        if (duplicateIndex !== -1) {
            const oldPlayer = gameState.players[duplicateIndex];
            
            // A. Gửi thông báo
            io.to(oldPlayer.id).emit('forceLogout', 'Tài khoản đã đăng nhập ở nơi khác!');
            
            // B. [ĐOẠN MỚI THÊM VÀO ĐÂY] NGẮT KẾT NỐI MÁY CŨ NGAY LẬP TỨC
            const oldSocket = io.sockets.sockets.get(oldPlayer.id);
            if (oldSocket) {
                oldSocket.disconnect(true); // Cắt đứt kết nối mạng của người cũ
            }
            
            // C. Xóa khỏi danh sách
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

    // --- CÁC LOGIC KHÁC GIỮ NGUYÊN ---
    socket.on('transformToWolf', (id) => {
        if (checkAdmin(socket)) {
            const p = gameState.players.find(player => player.id === id);
            if (p && p.role === 'Kẻ Bị Nguyền') {
                p.role = 'Sói'; 
                io.emit('updateState', gameState);
            }
        }
    });

    socket.on('updateConfig', (newConfig) => {
        if (checkAdmin(socket)) {
            gameState.rolesConfig = newConfig;
            io.emit('updateState', gameState); 
            io.emit('updateRolesConfig', gameState.rolesConfig);
        }
    });

    socket.on('setStatus', (status) => {
        const p = gameState.players.find(p => p.id === socket.id);
        if (p && !p.isAdmin) {
            p.isReady = status;
            if (!status) p.role = "..."; 
            io.emit('updateState', gameState);
        }
    });

    socket.on('shuffleCards', () => {
        if (!checkAdmin(socket)) return;
        matchData.count++;
        gameState.couple = [];
        let deck = [];
        gameState.rolesConfig.forEach(r => { for(let i=0; i < r.count; i++) deck.push(r.name); });
        for (let i = deck.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [deck[i], deck[j]] = [deck[j], deck[i]];
        }
        let readyPlayers = gameState.players.filter(p => p.isReady && !p.isAdmin);
        readyPlayers.forEach((p, index) => {
            p.role = deck[index] || 'Dân Ngu';
            p.isAlive = true; 
        });
        io.emit('updateState', gameState);
        io.emit('updateMatchCount', matchData.count);
        io.emit('startCountdown');
    });

    socket.on('endGame', (team) => {
        if (!checkAdmin(socket)) return;

        gameState.players.forEach(p => {
            if (p.isAdmin) return;
            let isWinner = false;

            if (team === 'VILLAGER') {
                // Dân thắng: Không phải Sói và Không phải Sida
                if (p.role !== 'Sói' && p.role !== 'Sida') isWinner = true;
            } 
            else if (team === 'WEREWOLF') {
                if (p.role === 'Sói') isWinner = true;
            } 
            else if (team === 'COUPLE') {
                if (gameState.couple.includes(p.id)) isWinner = true;
            } 
            else if (team === 'SIDA_SOLO') {
                if (p.role === 'Sida') isWinner = true;
            }

            if (isWinner) {
                matchData.leaderboard[p.name] = (matchData.leaderboard[p.name] || 0) + 1;
            }
        });

        io.emit('updateLeaderboard', matchData.leaderboard);
        io.emit('gameEnded', team);
    });

    socket.on('toggleLife', (id) => {
        if (checkAdmin(socket)) {
            const p = gameState.players.find(p => p.id === id);
            if (p) { p.isAlive = !p.isAlive; io.emit('updateState', gameState); }
        }
    });
socket.on('leaveRoom', () => {
        gameState.players = gameState.players.filter(p => p.id !== socket.id);
        io.emit('updateState', gameState);
    });
    socket.on('kickPlayer', (id) => {
        if (checkAdmin(socket)) {
            io.to(id).emit('youAreKicked');
            
            // ĐÁ NGƯỜI BỊ KICK LUÔN
            const socketToKick = io.sockets.sockets.get(id);
            if (socketToKick) socketToKick.disconnect(true);

            gameState.players = gameState.players.filter(p => p.id !== id);
            io.emit('updateState', gameState);
        }
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));