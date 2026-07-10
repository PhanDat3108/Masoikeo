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

    let readyPlayers = gameState.players.filter(p => p.isReady && !p.isAdmin);
    
    readyPlayers.forEach((p, index) => {
        p.role = deck[index] || 'Dân Ngu';
        p.isAlive = true; 
    });

    return deck;
};

export const checkAdmin = (socketId) => {
    const p = gameState.players.find(p => p.id === socketId);
    return p && p.isAdmin;
};
