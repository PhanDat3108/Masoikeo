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
    socket.on('join', (name) => {
        let isAdmin = name.toLowerCase() === 'admin';
        
        // Kiểm tra xem đã có admin chưa
        const hasAdmin = gameState.players.some(p => p.isAdmin);
        if (isAdmin && hasAdmin) {
            socket.emit('errorMsg', 'Đã có Quản trò trong phòng!');
            return;
        }

        gameState.players.push({ 
            id: socket.id, 
            name: isAdmin ? "QUẢN TRÒ" : name, 
            role: isAdmin ? "Quản trò" : "...", 
            isAlive: true, 
            isAdmin, 
            isReady: isAdmin // Admin luôn sẵn sàng
        });
        io.emit('updateState', gameState);
    });

    socket.on('setStatus', (status) => {
        const player = gameState.players.find(p => p.id === socket.id);
        if (player && !player.isAdmin) {
            player.isReady = status;
            io.emit('updateState', gameState);
        }
    });

    socket.on('updateConfig', (newConfig) => {
        gameState.rolesConfig = newConfig;
        io.emit('updateState', gameState);
    });

    socket.on('shuffleCards', () => {
        let deck = [];
        gameState.rolesConfig.forEach(r => {
            for(let i=0; i<r.count; i++) deck.push(r.name);
        });
        deck.sort(() => Math.random() - 0.5);
        
        let readyPlayers = gameState.players.filter(p => p.isReady && !p.isAdmin);
        readyPlayers.forEach((p, index) => {
            p.role = deck[index] || 'Dân thường (Thừa)';
            p.isAlive = true;
        });
        io.emit('updateState', gameState);
    });

    socket.on('toggleLife', (targetId) => {
        const target = gameState.players.find(p => p.id === targetId);
        if (target && !target.isAdmin) { // Không được giết admin
            target.isAlive = !target.isAlive;
            io.emit('updateState', gameState);
        }
    });

    socket.on('disconnect', () => {
        gameState.players = gameState.players.filter(p => p.id !== socket.id);
        io.emit('updateState', gameState);
    });
});

server.listen(3000, () => console.log('Sói đang chạy ở port 3000'));