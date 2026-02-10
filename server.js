const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static('public'));

let gameState = {
    players: [], 
    rolesConfig: [
        { name: 'Dân làng', count: 4 },
        { name: 'Sói', count: 2 },
        { name: 'Tiên tri', count: 1 }
    ]
};

io.on('connection', (socket) => {
    // 1. Tham gia phòng
    socket.on('join', (name) => {
        let isAdmin = name.toLowerCase() === 'admin';
        const hasAdmin = gameState.players.some(p => p.isAdmin);
        
        if (isAdmin && hasAdmin) {
            socket.emit('errorMsg', 'Đã có Quản trò trong phòng!');
            return;
        }

        gameState.players.push({ 
            id: socket.id, 
            name: isAdmin ? "QUẢN TRÒ" : name.toUpperCase(), 
            role: isAdmin ? "Quản trò" : "...", 
            isAlive: true, 
            isAdmin, 
            isReady: isAdmin 
        });
        io.emit('updateState', gameState);
    });

    // 2. Vào/Thoát phòng chơi
    socket.on('setStatus', (status) => {
        const player = gameState.players.find(p => p.id === socket.id);
        if (player && !player.isAdmin) {
            player.isReady = status;
            // Nếu thoát phòng thì reset role luôn cho sạch
            if (!status) player.role = "..."; 
            io.emit('updateState', gameState);
        }
    });

    // 3. Admin chỉnh sửa danh sách Role
    socket.on('updateConfig', (newConfig) => {
        gameState.rolesConfig = newConfig;
        io.emit('updateState', gameState);
    });

    // 4. Admin Kick người chơi
    socket.on('kickPlayer', (targetId) => {
        const me = gameState.players.find(p => p.id === socket.id);
        if (me && me.isAdmin) {
            io.to(targetId).emit('youAreKicked');
            gameState.players = gameState.players.filter(p => p.id !== targetId);
            io.emit('updateState', gameState);
        }
    });

    // 5. Xào bài (Chỉ chia cho người isReady)
    socket.on('shuffleCards', () => {
        let deck = [];
        gameState.rolesConfig.forEach(r => {
            for(let i=0; i < r.count; i++) deck.push(r.name);
        });
        
        // Thuật toán xào bài Fisher-Yates (đều hơn)
        for (let i = deck.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [deck[i], deck[j]] = [deck[j], deck[i]];
        }
        
        let readyPlayers = gameState.players.filter(p => p.isReady && !p.isAdmin);
        readyPlayers.forEach((p, index) => {
            p.role = deck[index] || 'Dân thường (Thừa)';
            p.isAlive = true; // Reset luôn trạng thái sống khi sang ván mới
        });
        io.emit('updateState', gameState);
    });

    // 6. Quản lý sống/chết
    socket.on('toggleLife', (targetId) => {
        const target = gameState.players.find(p => p.id === targetId);
        if (target && !target.isAdmin) {
            target.isAlive = !target.isAlive;
            io.emit('updateState', gameState);
        }
    });

    socket.on('disconnect', () => {
        gameState.players = gameState.players.filter(p => p.id !== socket.id);
        io.emit('updateState', gameState);
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));