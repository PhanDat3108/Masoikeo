export const gameState = {
    rolesConfig: [
        { name: 'Dân Ngu', count: 4 },
        { name: 'Sói', count: 2 },
        { name: 'Tiên tri', count: 1 },
        { name: 'Bảo vệ', count: 1 },
        { name: 'Thợ săn', count: 1 },
        { name: 'Phù Thuỷ', count: 1 },
        { name: 'Kẻ Bị Nguyền', count: 1 },
        { name: 'Sida', count: 1 },
        { name: 'Cupid', count: 0 }
    ],
    players: [],
    couple: [],
    timerEndTime: null,
    isAutoGM: false,
    vote: {
        isActive: false,
        votes: {} // { voterId: votedPlayerId }
    }
};

export const matchData = {
    count: 0,
    lastDate: new Date().toDateString(),
    leaderboard: {}
};
