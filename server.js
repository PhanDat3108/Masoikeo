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
    // 1. Tham gia phòng & Nhận diện người cũ
    socket.on('join', (data) => {
        const { name, secretId } = data;
        if (!name || !secretId) return;

        let isAdmin = name.toLowerCase() === 'admin';
        
        // Kiểm tra xem mã bí mật này đã có trong danh sách chưa
        let existingPlayer = gameState.players.find(p => p.secretId === secretId);

        if (existingPlayer) {
            // Cập nhật socket ID mới để Server biết gửi dữ liệu về đâu
            existingPlayer.id = socket.id;
            // Cho phép đổi tên nếu muốn, nhưng giữ nguyên role và trạng thái
            existingPlayer.name = isAdmin ? "QUẢN TRÒ" : name.toUpperCase();
        } else {
            // Nếu là người mới hoàn toàn
            const hasAdmin = gameState.players.some(p => p.isAdmin);
            if (isAdmin && hasAdmin) {
                socket.emit('errorMsg', 'Đã có Quản trò trong phòng!');
                return;
            }

            gameState.players.push({ 
                id: socket.id, 
                secretId: secretId, 
                name: isAdmin ? "QUẢN TRÒ" : name.toUpperCase(), 
                role: isAdmin ? "Quản trò" : "...", 
                isAlive: true, 
                isAdmin, 
                isReady: isAdmin 
            });
        }
        io.emit('updateState', gameState);
    });

    // 2. Vào ván / Thoát ván
    socket.on('setStatus', (status) => {
        const player = gameState.players.find(p => p.id === socket.id);
        if (player && !player.isAdmin) {
            player.isReady = status;
            // Nếu thoát ván chơi thì reset role về mặc định
            if (!status) player.role = "..."; 
            io.emit('updateState', gameState);
        }
    });

    // 3. Cập nhật cấu hình bộ bài
    socket.on('updateConfig', (newConfig) => {
        const me = gameState.players.find(p => p.id === socket.id);
        if (me && me.isAdmin) {
            gameState.rolesConfig = newConfig;
            io.emit('updateState', gameState);
        }
    });

    // 4. Đuổi người chơi (Xóa vĩnh viễn khỏi danh sách)
    socket.on('kickPlayer', (targetId) => {
        const me = gameState.players.find(p => p.id === socket.id);
        if (me && me.isAdmin) {
            // Gửi lệnh ép trình duyệt đối phương xóa localStorage
            io.to(targetId).emit('youAreKicked');
            gameState.players = gameState.players.filter(p => p.id !== targetId);
            io.emit('updateState', gameState);
        }
    });
// 8. Người chơi chủ động thoát phòng hẳn
    socket.on('leaveRoom', () => {
        // Tìm và xóa người chơi dựa trên socket.id hiện tại
        gameState.players = gameState.players.filter(p => p.id !== socket.id);
        io.emit('updateState', gameState);
        console.log('Một người chơi đã chủ động rời phòng vĩnh viễn.');
    });
    // 5. Xào bài (Chỉ chia cho những người isReady)
    socket.on('shuffleCards', () => {
        const me = gameState.players.find(p => p.id === socket.id);
        if (!me || !me.isAdmin) return;

        let deck = [];
        gameState.rolesConfig.forEach(r => {
            for(let i=0; i < r.count; i++) deck.push(r.name);
        });
        
        // Xào bài ngẫu nhiên
        for (let i = deck.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [deck[i], deck[j]] = [deck[j], deck[i]];
        }
        
        let readyPlayers = gameState.players.filter(p => p.isReady && !p.isAdmin);
        readyPlayers.forEach((p, index) => {
            p.role = deck[index] || 'Dân thường (Thừa)';
            p.isAlive = true; // Reset sống khi xào ván mới
        });
        io.emit('updateState', gameState);
    });

    // 6. Quản lý Sống/Chết
    socket.on('toggleLife', (targetId) => {
        const me = gameState.players.find(p => p.id === socket.id);
        if (me && me.isAdmin) {
            const target = gameState.players.find(p => p.id === targetId);
            if (target && !target.isAdmin) {
                target.isAlive = !target.isAlive;
                io.emit('updateState', gameState);
            }
        }
    });

    // 7. Ngắt kết nối tạm thời
    socket.on('disconnect', () => {
        // KHÔNG xóa người chơi ở đây để tránh việc reload trang bị mất vai.
        // Người chơi chỉ bị xóa khi Admin dùng nút Kick.
        console.log('Một thiết bị vừa tạm ngắt kết nối (reload/đóng tab).');
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Ma Soi Server is running on port ${PORT}`));