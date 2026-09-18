import { create } from 'zustand';

export const useGameStore = create((set) => ({
    // Session Info - Khôi phục từ sessionStorage (ưu tiên để test đa tab) hoặc localStorage khi F5
    playerName: sessionStorage.getItem('masoi_playerName') || localStorage.getItem('masoi_playerName') || '',
    secretId: sessionStorage.getItem('masoi_secretId') || localStorage.getItem('masoi_secretId') || '',
    isAdmin: (sessionStorage.getItem('masoi_isAdmin') || localStorage.getItem('masoi_isAdmin')) === 'true',

    // Game State from Server
    gameState: { players: [], rolesConfig: [], couple: [] },
    matchCount: 0,
    leaderboard: {},
    isKicked: false,
    countdown: null,

    // Auto GM State from Server
    autoGMState: null,      // Trạng thái Auto GM (phase, settings, etc.)
    skillResult: null,      // Kết quả kỹ năng (VD: Tiên tri soi → phe Sói/Dân)
    skillError: null,       // Lỗi khi dùng kỹ năng (VD: Bảo vệ chọn cùng người)
    phaseTransition: null,  // { from: 'DAY', to: 'NIGHT' } — dùng để phát âm thanh
    
    // Actions
    setSession: (name, secretId, isAdmin = false) => {
        sessionStorage.setItem('masoi_playerName', name);
        sessionStorage.setItem('masoi_secretId', secretId);
        sessionStorage.setItem('masoi_isAdmin', String(isAdmin));
        localStorage.setItem('masoi_playerName', name);
        localStorage.setItem('masoi_secretId', secretId);
        localStorage.setItem('masoi_isAdmin', String(isAdmin));
        set({ playerName: name, secretId, isAdmin, isKicked: false });
    },
    setIsAdmin: (isAdmin) => {
        sessionStorage.setItem('masoi_isAdmin', String(isAdmin));
        localStorage.setItem('masoi_isAdmin', String(isAdmin));
        set({ isAdmin });
    },
    clearSession: () => {
        sessionStorage.removeItem('masoi_playerName');
        sessionStorage.removeItem('masoi_secretId');
        sessionStorage.removeItem('masoi_isAdmin');
        localStorage.removeItem('masoi_playerName');
        localStorage.removeItem('masoi_secretId');
        localStorage.removeItem('masoi_isAdmin');
        set({ playerName: '', secretId: '', isAdmin: false, autoGMState: null });
    },
    setGameState: (newState) => set({ gameState: newState }),
    setMatchCount: (count) => set({ matchCount: count }),
    setLeaderboard: (data) => set({ leaderboard: data }),
    setKicked: (status) => set({ isKicked: status }),
    setCountdown: (val) => set({ countdown: val }),

    // Auto GM Actions
    setAutoGMState: (state) => set({ autoGMState: state }),
    setSkillResult: (result) => set({ skillResult: result }),
    clearSkillResult: () => set({ skillResult: null }),
    setSkillError: (error) => set({ skillError: error }),
    clearSkillError: () => set({ skillError: null }),
    setPhaseTransition: (transition) => set({ phaseTransition: transition }),
    clearPhaseTransition: () => set({ phaseTransition: null }),
}));
