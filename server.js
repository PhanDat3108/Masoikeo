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
    // 1. Tham gia phòng (Dùng data object chứa name và secretId)
    socket.on('join', (data) => {
        const { name, secretId } = data;
        let isAdmin = name.toLowerCase() === 'admin';
        
        // Kiểm tra xem ID này đã tồn tại trong phòng chưa
        let existingPlayer = gameState.players.find(p => p.secretId === secretId);

        if (existingPlayer) {
            // Nếu là người cũ quay lại: Cập nhật ID socket mới
            existingPlayer.id = socket.id;
            existingPlayer.name = isAdmin ? "QUẢN TRÒ" : name.toUpperCase();
            // Không thay đổi role hay trạng thái sống chết
        } else {
            // Nếu là người mới
            const hasAdmin = gameState.players.some(p => p.isAdmin);
            if (isAdmin && hasAdmin) {
                socket.emit('errorMsg', 'Đã có Quản trò trong phòng!');
                return;
            }

            gameState.players.push({ 
                id: socket.id, 
                secretId: secretId, // Lưu mã bí mật để nhận diện khi reload
                name: isAdmin ? "QUẢN TRÒ" : name.toUpperCase(), 
                role: isAdmin ? "Quản trò" : "...", 
                isAlive: true, 
                isAdmin, 
                isReady: isAdmin 
            });
        }
        io.emit('updateState', gameState);
    });

    socket.on('setStatus', (status) => {
        const player = gameState.players.find(p => p.id === socket.id);
        if (player && !player.isAdmin) {
            player.isReady = status;
            if (!status) player.role = "..."; 
            io.emit('updateState', gameState);
        }
    });

    socket.on('updateConfig', (newConfig) => {
        gameState.rolesConfig = newConfig;
        io.emit('updateState', gameState);
    });

    socket.on('kickPlayer', (targetId) => {
        const me = gameState.players.find(p => p.id === socket.id);
        if (me && me.isAdmin) {
            io.to(targetId).emit('youAreKicked');
            gameState.players = gameState.players.filter(p => p.id !== targetId);
            io.emit('updateState', gameState);
        }
    });

    socket.on('shuffleCards', () => {
        let deck = [];
        gameState.rolesConfig.forEach(r => {
            for(let i=0; i < r.count; i++) deck.push(r.name);
        });
        
        for (let i = deck.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [deck[i], deck[j]] = [deck[j], deck[i]];
        }
        
        let readyPlayers = gameState.players.filter(p => p.isReady && !p.isAdmin);
        readyPlayers.forEach((p, index) => {
            p.role = deck[index] || 'Dân thường (Thừa)';
            p.isAlive = true; 
        });
        io.emit('updateState', gameState);
    });

    socket.on('toggleLife', (targetId) => {
        const target = gameState.players.find(p => p.id === targetId);
        if (target && !target.isAdmin) {
            target.isAlive = !target.isAlive;
            io.emit('updateState', gameState);
        }
    });

    socket.on('disconnect', () => {
        // Không xóa player ngay lập tức để họ có thể quay lại
        // Chỉ xóa nếu họ thực sự thoát (kick) hoặc admin reset
        console.log('Một người vừa rớt mạng tạm thời');
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));