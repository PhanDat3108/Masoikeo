// ================================================
// Auto Game Master — Game State
// Trạng thái riêng cho chế độ Quản trò tự động
// Tách biệt khỏi gameState.js để không ảnh hưởng chế độ thủ công
// ================================================

// Danh sách tất cả các Phase của state machine
export const PHASES = {
    LOBBY: 'LOBBY',
    CARDS_DEALT: 'CARDS_DEALT',

    // Ban đêm
    NIGHT: 'NIGHT',
    NIGHT_CUPID: 'NIGHT_CUPID',
    NIGHT_COUPLE: 'NIGHT_COUPLE',
    NIGHT_WOLF: 'NIGHT_WOLF',
    NIGHT_SEER: 'NIGHT_SEER',
    NIGHT_GUARD: 'NIGHT_GUARD',
    NIGHT_RESOLVE_WOLF: 'NIGHT_RESOLVE_WOLF',
    NIGHT_WITCH: 'NIGHT_WITCH',
    NIGHT_FINALIZE_DEATHS: 'NIGHT_FINALIZE_DEATHS',
    NIGHT_HUNTER: 'NIGHT_HUNTER',
    NIGHT_HUNTER_CHECK: 'NIGHT_HUNTER_CHECK',
    NIGHT_COUPLE_CHECK: 'NIGHT_COUPLE_CHECK',
    NIGHT_CHAIN_EFFECTS: 'NIGHT_CHAIN_EFFECTS',
    WIN_CHECK_NIGHT: 'WIN_CHECK_NIGHT',

    // Ban ngày
    DAY_ANNOUNCE: 'DAY_ANNOUNCE',
    DAY_DISCUSS: 'DAY_DISCUSS',
    DAY_VOTE: 'DAY_VOTE',
    DAY_EXECUTE: 'DAY_EXECUTE',
    DAY_HUNTER_CHECK: 'DAY_HUNTER_CHECK',
    DAY_COUPLE_CHECK: 'DAY_COUPLE_CHECK',
    DAY_CHAIN_EFFECTS: 'DAY_CHAIN_EFFECTS',
    WIN_CHECK_DAY: 'WIN_CHECK_DAY',

    // Kết thúc
    GAME_OVER: 'GAME_OVER',
};

// Phe
export const TEAMS = {
    VILLAGER: 'VILLAGER',
    WOLF: 'WOLF',
    COUPLE: 'COUPLE',   // Cặp đôi khác phe → trở thành phe riêng
    SIDA: 'SIDA',
};

// Mapping role → phe mặc định
export const ROLE_TEAM_MAP = {
    'Dân Ngu': TEAMS.VILLAGER,
    'Sói': TEAMS.WOLF,
    'Tiên tri': TEAMS.VILLAGER,
    'Bảo vệ': TEAMS.VILLAGER,
    'Thợ săn': TEAMS.VILLAGER,
    'Phù Thuỷ': TEAMS.VILLAGER,
    'Kẻ Bị Nguyền': TEAMS.VILLAGER,
    'Sida': TEAMS.VILLAGER,       // Sida thuộc "phe dân" nhưng có điều kiện thắng riêng
    'Cupid': TEAMS.VILLAGER,
};

// Mapping role → có kỹ năng chủ động ban đêm không
export const ROLE_HAS_NIGHT_SKILL = {
    'Dân Ngu': false,
    'Sói': true,
    'Tiên tri': true,
    'Bảo vệ': true,
    'Thợ săn': true,
    'Phù Thuỷ': true,
    'Kẻ Bị Nguyền': false,
    'Sida': false,
    'Cupid': true,  // Chỉ đêm đầu
};

// Mô tả kỹ năng ngắn gọn cho UI
export const ROLE_SKILL_DESC = {
    'Dân Ngu': 'Không có kỹ năng đặc biệt. Hãy dùng trí thông minh để tìm ra Sói!',
    'Sói': 'Chọn một người để cắn mỗi đêm.',
    'Tiên tri': 'Soi một người để biết phe của họ (Sói hay Dân).',
    'Bảo vệ': 'Bảo vệ một người khỏi bị Sói cắn. Không được bảo vệ cùng một người 2 đêm liên tiếp.',
    'Thợ săn': 'Chọn một mục tiêu mỗi đêm. Khi chết, người đó cũng chết theo.',
    'Phù Thuỷ': 'Có 1 bình thuốc cứu và 1 bình thuốc độc, mỗi bình chỉ dùng được 1 lần.',
    'Kẻ Bị Nguyền': 'Nếu bị Sói cắn mà không được cứu, sẽ chuyển thành Sói!',
    'Sida': 'Nếu bị dân làng vote treo cổ, Sida thắng ngay lập tức!',
    'Cupid': 'Đêm đầu tiên, chọn 2 người ghép thành cặp đôi. Một người chết, người kia cũng chết theo.',
};

// Tạo trạng thái Auto GM mới (factory function để tránh share reference)
export const createAutoGMState = () => ({
    phase: PHASES.LOBBY,
    dayCount: 0,
    nightCount: 0,
    currentTurnRole: null,

    settings: {
        dayDuration: 180,       // 3 phút ban ngày (thảo luận)
        nightDuration: 30,      // 30s mỗi lượt kỹ năng ban đêm
        discussDuration: 120,   // 2 phút thảo luận
        voteDuration: 30,       // 30s bỏ phiếu
        skillDuration: 30,      // 30s sử dụng kỹ năng
    },

    // Dữ liệu đêm hiện tại — reset mỗi đêm mới
    nightActions: {
        wolfTarget: null,
        wolfVotes: {},
        wolfVoteRound: 1,       // Lần vote thứ mấy (hòa → vote lại)
        seerTarget: null,
        seerResult: null,
        guardTarget: null,
        lastGuardTarget: null,  // Người được bảo vệ đêm trước (persist qua đêm)
        witchHealUsed: false,   // Persist cả game
        witchKillUsed: false,   // Persist cả game
        witchHealTarget: null,
        witchKillTarget: null,
        hunterTarget: null,
        cupidTargets: [],
    },

    // Dữ liệu ban ngày hiện tại — reset mỗi ngày mới
    dayActions: {
        deaths: [],             // Danh sách người chết công bố sáng nay
        deathMessages: [],      // Mô tả cách chết: [{ playerId, cause }]
        votes: {},              // { voterId: targetId }
        executedPlayer: null,
        isRevote: false,
        revoteTargets: [],
    },

    // Metadata mở rộng cho mỗi người chơi
    // Key là playerId, value là object
    playerMeta: {},
    // Ví dụ: { 'socket123': { team: 'VILLAGER', originalRole: 'Kẻ Bị Nguyền', isConverted: false } }

    // Cặp đôi
    couple: [],

    // Timer
    phaseTimer: null,
    phaseEndTime: null,
    phaseTimeoutCallback: null,

    // Nhật ký game
    gameLog: [],

    // Tạm dừng
    isPaused: false,
    pausedTimeRemaining: null,  // ms còn lại khi pause
});

// Instance duy nhất — sẽ được reset khi bắt đầu game mới
export let autoGM = createAutoGMState();

// Reset toàn bộ auto GM state
export const resetAutoGM = () => {
    if (autoGM.phaseTimer) {
        clearTimeout(autoGM.phaseTimer);
    }
    // Giữ lại settings từ lần trước
    const savedSettings = { ...autoGM.settings };
    const savedWitchHeal = autoGM.nightActions.witchHealUsed;
    const savedWitchKill = autoGM.nightActions.witchKillUsed;

    Object.assign(autoGM, createAutoGMState());
    autoGM.settings = savedSettings;
};

// Reset chỉ dữ liệu đêm (gọi khi bắt đầu đêm mới)
export const resetNightActions = () => {
    const lastGuard = autoGM.nightActions.guardTarget;
    const witchHealUsed = autoGM.nightActions.witchHealUsed;
    const witchKillUsed = autoGM.nightActions.witchKillUsed;

    autoGM.nightActions = {
        wolfTarget: null,
        wolfVotes: {},
        wolfVoteRound: 1,
        seerTarget: null,
        seerResult: null,
        guardTarget: null,
        lastGuardTarget: lastGuard,  // Nhớ người đêm trước
        witchHealUsed,               // Persist cả game
        witchKillUsed,               // Persist cả game
        witchHealTarget: null,
        witchKillTarget: null,
        hunterTarget: null,
        cupidTargets: [],
    };
};

// Reset chỉ dữ liệu ban ngày (gọi khi bắt đầu ngày mới)
export const resetDayActions = () => {
    autoGM.dayActions = {
        deaths: [],
        deathMessages: [],
        votes: {},
        executedPlayer: null,
        isRevote: false,
        revoteTargets: [],
    };
};

// Thêm log entry
export const addGameLog = (type, data) => {
    autoGM.gameLog.push({
        timestamp: Date.now(),
        day: autoGM.dayCount,
        night: autoGM.nightCount,
        phase: autoGM.phase,
        type,
        data,
    });
};
