import { create } from 'zustand';

export const useGameStore = create((set) => ({
    // Session Info - Khôi phục từ localStorage khi F5
    playerName: localStorage.getItem('masoi_playerName') || '',
    secretId: localStorage.getItem('masoi_secretId') || '',
    isAdmin: localStorage.getItem('masoi_isAdmin') === 'true',

    // Game State from Server
    gameState: { players: [], rolesConfig: [], couple: [] },
    matchCount: 0,
    leaderboard: {},
    isKicked: false,
    countdown: null,
    
    // Actions
    setSession: (name, secretId, isAdmin = false) => {
        localStorage.setItem('masoi_playerName', name);
        localStorage.setItem('masoi_secretId', secretId);
        localStorage.setItem('masoi_isAdmin', String(isAdmin));
        set({ playerName: name, secretId, isAdmin, isKicked: false });
    },
    setIsAdmin: (isAdmin) => {
        localStorage.setItem('masoi_isAdmin', String(isAdmin));
        set({ isAdmin });
    },
    clearSession: () => {
        localStorage.removeItem('masoi_playerName');
        localStorage.removeItem('masoi_secretId');
        localStorage.removeItem('masoi_isAdmin');
        set({ playerName: '', secretId: '', isAdmin: false });
    },
    setGameState: (newState) => set({ gameState: newState }),
    setMatchCount: (count) => set({ matchCount: count }),
    setLeaderboard: (data) => set({ leaderboard: data }),
    setKicked: (status) => set({ isKicked: status }),
    setCountdown: (val) => set({ countdown: val }),
}));
