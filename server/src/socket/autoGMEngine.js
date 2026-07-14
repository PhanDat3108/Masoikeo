// ================================================
// Auto Game Master — State Machine Engine
// Bộ não điều khiển luồng game tự động
// ================================================

import { gameState, matchData } from '../state/gameState.js';
import { VOICE_DURATIONS } from '../constants/voiceLines.js';
import {
    autoGM, resetAutoGM, resetNightActions, resetDayActions,
    addGameLog, PHASES, TEAMS, ROLE_TEAM_MAP, ROLE_HAS_NIGHT_SKILL,
    ROLE_SKILL_DESC,
} from '../state/autoGameState.js';
import { shuffleAndDistributeCards } from './gameLogic.js';

// ================================================
// HELPER: Lấy dữ liệu gửi cho Client
// (Lọc bỏ những thông tin nhạy cảm)
// ================================================

/**
 * Tạo object autoGM state an toàn để gửi cho client.
 * Admin thấy nhiều hơn Player.
 * Player KHÔNG được thấy: wolfVotes, nightActions chi tiết, playerMeta
 */
export const getAutoGMStateForClient = (socketId) => {
    const player = gameState.players.find(p => p.id === socketId);
    const isAdmin = player?.isAdmin;

    const base = {
        phase: autoGM.phase,
        dayCount: autoGM.dayCount,
        nightCount: autoGM.nightCount,
        currentTurnRole: autoGM.currentTurnRole,
        settings: autoGM.settings,
        phaseEndTime: autoGM.phaseEndTime,
        isPaused: autoGM.isPaused,
        couple: autoGM.couple,
    };

    if (isAdmin) {
        // Admin thấy thêm thông tin điều khiển nhưng KHÔNG thấy role người chơi
        return {
            ...base,
            dayActions: {
                deaths: autoGM.dayActions.deaths,
                deathMessages: autoGM.dayActions.deathMessages,
                votes: autoGM.dayActions.votes,
                executedPlayer: autoGM.dayActions.executedPlayer,
            },
            gameLog: autoGM.gameLog.slice(-20), // 20 log gần nhất
        };
    }

    // Player — chỉ thấy thông tin cơ bản
    const myMeta = autoGM.playerMeta[socketId] || {};
    const playerBase = {
        ...base,
        myMeta: {
            team: myMeta.team,
            isConverted: myMeta.isConverted || false,
            originalRole: myMeta.originalRole,
        },
        dayActions: {
            deaths: autoGM.dayActions.deaths,
            deathMessages: autoGM.dayActions.deathMessages,
            votes: autoGM.phase === PHASES.DAY_VOTE ? autoGM.dayActions.votes : {},
            isRevote: autoGM.dayActions.isRevote,
            revoteTargets: autoGM.dayActions.revoteTargets,
        },
    };

    // Nếu người chơi là Sói và đang trong phase NIGHT_WOLF → thấy wolfVotes và đồng đội
    if (player && isWolf(socketId)) {
        playerBase.wolfTeammates = gameState.players.filter(p => isWolf(p.id)).map(p => p.id);
        if (autoGM.phase === PHASES.NIGHT_WOLF) {
            playerBase.wolfVotes = autoGM.nightActions.wolfVotes;
        }
    }

    // Nếu người chơi là Phù Thủy và đang trong phase NIGHT_WITCH
    if (player && player.role === 'Phù Thuỷ' && autoGM.phase === PHASES.NIGHT_WITCH) {
        playerBase.nightActions = {
            wolfTarget: autoGM.nightActions.wolfTarget,
            witchHealUsed: autoGM.nightActions.witchHealUsed,
            witchKillUsed: autoGM.nightActions.witchKillUsed,
        };
    }

    // Nếu người chơi có couple → thấy thông tin người yêu
    if (autoGM.couple.includes(socketId)) {
        const partnerId = autoGM.couple.find(id => id !== socketId);
        const partner = gameState.players.find(p => p.id === partnerId);
        if (partner) {
            playerBase.loverInfo = {
                name: partner.name,
                role: partner.role,
            };
        }
    }

    return playerBase;
};

// ================================================
// HELPER FUNCTIONS
// ================================================

/** Kiểm tra một player có phải Sói không (bao gồm Kẻ Bị Nguyền đã chuyển phe) */
const isWolf = (playerId) => {
    const meta = autoGM.playerMeta[playerId];
    if (!meta) return false;
    return meta.team === TEAMS.WOLF;
};

/** Lấy danh sách người chơi còn sống (không bao gồm admin) */
const getAlivePlayers = () => {
    return gameState.players.filter(p => !p.isAdmin && p.isAlive);
};

/** Lấy danh sách Sói còn sống */
const getAliveWolves = () => {
    return getAlivePlayers().filter(p => isWolf(p.id));
};

/** Lấy danh sách người chơi có role cụ thể và còn sống */
const getAlivePlayersByRole = (roleName) => {
    return getAlivePlayers().filter(p => {
        // Nếu là Kẻ bị nguyền đã chuyển phe thành Sói, role đã được đổi thành 'Sói'
        return p.role === roleName;
    });
};

/** Kiểm tra có role nào thuộc loại này trong game không (kể cả đã chết) */
const hasRoleInGame = (roleName) => {
    return Object.values(autoGM.playerMeta).some(meta => meta.originalRole === roleName);
};

/** Kiểm tra role có tồn tại VÀ còn sống không */
const hasAliveRole = (roleName) => {
    return getAlivePlayersByRole(roleName).length > 0;
};

// ================================================
// PHASE TIMER
// ================================================

/** Đặt timer cho phase hiện tại, tự chuyển phase khi hết giờ */
const setPhaseTimer = (io, durationSeconds, onTimeout) => {
    // Xóa timer cũ nếu có
    clearPhaseTimer();

    autoGM.phaseEndTime = Date.now() + (durationSeconds * 1000);
    autoGM.phaseTimeoutCallback = onTimeout;

    // Lên lịch nhắc 10s nếu thời gian đủ dài
    if (durationSeconds >= 15) {
        autoGM.warningTimer = setTimeout(() => {
            if (!autoGM.isPaused && autoGM.phaseTimer) {
                io.emit('autoGM:playAudio', '10s_warning');
            }
        }, (durationSeconds - 10) * 1000);
    }

    autoGM.phaseTimer = setTimeout(() => {
        autoGM.phaseTimer = null;
        autoGM.phaseEndTime = null;
        
        if (autoGM.isPaused) return; // Không xử lý nếu đang pause

        addGameLog('TIMEOUT', { phase: autoGM.phase, role: autoGM.currentTurnRole });
        if (autoGM.phaseTimeoutCallback) {
            autoGM.phaseTimeoutCallback();
        }
    }, durationSeconds * 1000);

    // Cập nhật timer mới cho client
    broadcastState(io);
};

/** Xóa timer hiện tại */
const clearPhaseTimer = () => {
    if (autoGM.phaseTimer) {
        clearTimeout(autoGM.phaseTimer);
        autoGM.phaseTimer = null;
    }
    if (autoGM.warningTimer) {
        clearTimeout(autoGM.warningTimer);
        autoGM.warningTimer = null;
    }
    autoGM.phaseEndTime = null;
    autoGM.phaseTimeoutCallback = null;
};

/** Phát âm thanh, chờ cho đến khi đọc xong + 0.5s buffer mới gọi callback */
const playVoiceAndWait = (io, voiceKey, callback) => {
    const durationSec = VOICE_DURATIONS[voiceKey] || 0;
    
    // Gửi lệnh phát audio
    io.emit('autoGM:playAudio', voiceKey);
    
    // Set timer chờ âm thanh
    setPhaseTimer(io, durationSec + 0.5, () => {
        callback();
    });
};

// ================================================
// BROADCAST — Gửi state cho tất cả client
// ================================================

const broadcastState = (io) => {
    // Gửi gameState chung (players, rolesConfig, etc.)
    io.emit('updateState', gameState);

    // Gửi autoGM state riêng cho mỗi client (đã lọc)
    for (const [socketId, socket] of io.sockets.sockets) {
        socket.emit('autoGM:stateUpdate', getAutoGMStateForClient(socketId));
    }
};

// ================================================
// START GAME
// ================================================

export const startAutoGame = (io) => {
    // Reset auto GM state (giữ settings)
    resetAutoGM();

    // Chia bài
    shuffleAndDistributeCards();
    matchData.count++;

    // Khởi tạo playerMeta cho mỗi người chơi
    const players = gameState.players.filter(p => !p.isAdmin);
    players.forEach(p => {
        const defaultTeam = ROLE_TEAM_MAP[p.role] || TEAMS.VILLAGER;
        autoGM.playerMeta[p.id] = {
            team: defaultTeam,
            originalRole: p.role,
            isConverted: false,
            skillDesc: ROLE_SKILL_DESC[p.role] || 'Không có mô tả.',
        };
    });

    // Log chia bài
    addGameLog('GAME_START', {
        players: players.map(p => ({ id: p.id, name: p.name, role: p.role })),
    });

    playVoiceAndWait(io, 'deal_cards_prepare', () => {
        autoGM.phase = PHASES.CARDS_DEALT;
        broadcastState(io);
        io.emit('updateMatchCount', matchData.count);
        io.emit('startCountdown');
        
        // Sau khi chia bài xong (khoảng 1.5s), phát giọng "Xem bài đi"
        setTimeout(() => {
            io.emit('autoGM:playAudio', 'check_cards');
        }, 1500);
    });
};

// ================================================
// BẮT ĐẦU GAME SAU KHI XEM BÀI
// ================================================

export const beginGame = (io) => {
    autoGM.phase = PHASES.NIGHT;
    autoGM.nightCount = 1;

    addGameLog('PHASE_CHANGE', { to: PHASES.NIGHT, nightCount: 1 });

    // Bắt đầu đêm đầu tiên
    startNight(io);
};

// ================================================
// NIGHT PHASE LOGIC
// ================================================

const startNight = (io) => {
    resetNightActions();
    autoGM.phase = PHASES.NIGHT;

    io.emit('autoGM:phaseTransition', { from: 'DAY', to: 'NIGHT' });

    playVoiceAndWait(io, 'night_start', () => {
        io.emit('autoGM:playAudio', 'sfx_wolf_howl');
        // Xác định bước tiếp theo
        advanceNightPhase(io);
    });
};

/** Chuyển sang bước tiếp theo trong ban đêm */
const advanceNightPhase = (io) => {
    // Đêm đầu tiên → Cupid đi trước (nếu có trong game)
    if (autoGM.nightCount === 1 && autoGM.phase === PHASES.NIGHT) {
        startCupidPhase(io);
        return;
    }

    // Cupid đã xong hoặc không có (hoặc là các đêm sau) → Cặp đôi thức dậy
    if (autoGM.phase === PHASES.NIGHT || autoGM.phase === PHASES.NIGHT_CUPID) {
        startCouplePhase(io);
        return;
    }

    // Couple xong → Sói
    if (autoGM.phase === PHASES.NIGHT_COUPLE) {
        startWolfPhase(io);
        return;
    }

    if (autoGM.phase === PHASES.NIGHT_WOLF) {
        startSeerPhase(io);
        return;
    }

    if (autoGM.phase === PHASES.NIGHT_SEER) {
        startGuardPhase(io);
        return;
    }

    if (autoGM.phase === PHASES.NIGHT_GUARD) {
        resolveWolfBite(io);
        return;
    }

    if (autoGM.phase === PHASES.NIGHT_RESOLVE_WOLF) {
        startWitchPhase(io);
        return;
    }

    if (autoGM.phase === PHASES.NIGHT_WITCH) {
        finalizeNightDeaths(io);
        return;
    }

    if (autoGM.phase === PHASES.NIGHT_FINALIZE_DEATHS) {
        checkNightHunter(io);
        return;
    }

    if (autoGM.phase === PHASES.NIGHT_HUNTER_CHECK) {
        checkNightCouple(io);
        return;
    }

    if (autoGM.phase === PHASES.NIGHT_COUPLE_CHECK) {
        processChainEffects(io, 'NIGHT');
        return;
    }

    if (autoGM.phase === PHASES.NIGHT_CHAIN_EFFECTS) {
        checkWinConditionAndAdvance(io, 'NIGHT');
        return;
    }
};

// ---- Cupid ----
const startCupidPhase = (io) => {
    if (!hasRoleInGame('Cupid')) {
        autoGM.phase = PHASES.NIGHT_CUPID;
        advanceNightPhase(io);
        return;
    }

    autoGM.phase = PHASES.NIGHT_CUPID;
    autoGM.currentTurnRole = 'Cupid';
    addGameLog('SKILL_TURN', { role: 'Cupid' });

    playVoiceAndWait(io, 'cupid_start', () => {
        if (hasAliveRole('Cupid')) {
            setPhaseTimer(io, autoGM.settings.skillDuration, () => {
                addGameLog('SKILL_SKIP', { role: 'Cupid', reason: 'timeout' });
                afterCupid(io);
            });
        } else {
            // Fake turn
            const fakeDuration = Math.floor(Math.random() * 6) + 10;
            setPhaseTimer(io, fakeDuration, () => {
                afterCupid(io);
            });
        }
    });
    broadcastState(io);
};

const afterCupid = (io) => {
    autoGM.currentTurnRole = null;
    broadcastState(io);
    
    playVoiceAndWait(io, 'cupid_check', () => {
        setPhaseTimer(io, 6, () => { // 6 giây cho cả làng xem điện thoại
            playVoiceAndWait(io, 'night_start', () => {
                advanceNightPhase(io);
            });
        });
    });
};

// ---- Couple ----
const startCouplePhase = (io) => {
    // Chỉ chạy nếu trong game có Cupid (nếu không có Cupid thì không bao giờ có couple)
    if (!hasRoleInGame('Cupid')) {
        autoGM.phase = PHASES.NIGHT_COUPLE;
        advanceNightPhase(io);
        return;
    }

    autoGM.phase = PHASES.NIGHT_COUPLE;
    // Để currentTurnRole là chuỗi rỗng để không trigger popup skill nhưng vẫn broadcast
    autoGM.currentTurnRole = ''; 

    playVoiceAndWait(io, 'couple_wake', () => {
        // Kiểm tra xem couple có còn sống không
        let isCoupleAlive = false;
        if (autoGM.couple.length === 2) {
            const p1 = gameState.players.find(p => p.id === autoGM.couple[0]);
            const p2 = gameState.players.find(p => p.id === autoGM.couple[1]);
            if (p1?.isAlive && p2?.isAlive) {
                isCoupleAlive = true;
            }
        }

        if (isCoupleAlive) {
            // Cặp đôi còn sống -> 15s để trao đổi
            setPhaseTimer(io, 15, () => {
                afterCouple(io);
            });
        } else {
            // Fake turn cho cặp đôi nếu 1 trong 2 đã chết hoặc Cupid không ghép đôi
            const fakeDuration = Math.floor(Math.random() * 6) + 10;
            setPhaseTimer(io, fakeDuration, () => {
                afterCouple(io);
            });
        }
    });
    broadcastState(io);
};

const afterCouple = (io) => {
    autoGM.currentTurnRole = null;
    broadcastState(io);
    playVoiceAndWait(io, 'night_start', () => {
        advanceNightPhase(io);
    });
};

// ---- Sói ----
const startWolfPhase = (io) => {
    if (!hasRoleInGame('Sói')) {
        autoGM.phase = PHASES.NIGHT_WOLF;
        afterWolf(io);
        return;
    }
    
    autoGM.phase = PHASES.NIGHT_WOLF;
    autoGM.currentTurnRole = 'Sói';
    autoGM.nightActions.wolfVotes = {};
    autoGM.nightActions.wolfVoteRound = 1;
    addGameLog('SKILL_TURN', { role: 'Sói' });
    
    playVoiceAndWait(io, 'wolf_wake', () => {
        playVoiceAndWait(io, 'wolf_choose', () => {
            if (getAliveWolves().length > 0 || hasAliveRole('Sói')) {
                setPhaseTimer(io, autoGM.settings.skillDuration, () => {
                    resolveWolfVote(io);
                });
            } else {
                // Fake turn
                const fakeDuration = Math.floor(Math.random() * 6) + 10;
                setPhaseTimer(io, fakeDuration, () => {
                    afterWolf(io);
                });
            }
        });
    });
    broadcastState(io);
};

/** Xử lý vote sói — gọi khi hết giờ hoặc tất cả sói đã vote */
export const resolveWolfVote = (io) => {
    clearPhaseTimer();
    const wolves = getAliveWolves();
    const votes = autoGM.nightActions.wolfVotes;

    // Đếm phiếu
    const voteCounts = {};
    Object.values(votes).forEach(targetId => {
        voteCounts[targetId] = (voteCounts[targetId] || 0) + 1;
    });

    // Tìm người bị vote nhiều nhất
    const maxVotes = Math.max(0, ...Object.values(voteCounts));
    if (maxVotes === 0) {
        // Không ai vote → không cắn ai
        autoGM.nightActions.wolfTarget = null;
        addGameLog('WOLF_RESULT', { target: null, reason: 'no_votes' });
        afterWolf(io);
        return;
    }

    const topTargets = Object.entries(voteCounts)
        .filter(([_, count]) => count === maxVotes)
        .map(([id]) => id);

    if (topTargets.length === 1) {
        // Thống nhất
        autoGM.nightActions.wolfTarget = topTargets[0];
        const target = gameState.players.find(p => p.id === topTargets[0]);
        addGameLog('WOLF_RESULT', { target: target?.name, targetId: topTargets[0] });
        afterWolf(io);
    } else {
        // Hòa phiếu
        if (autoGM.nightActions.wolfVoteRound < 2) {
            // Vote lại
            autoGM.nightActions.wolfVoteRound++;
            autoGM.nightActions.wolfVotes = {};
            addGameLog('WOLF_TIE', { round: autoGM.nightActions.wolfVoteRound, tied: topTargets });
            setPhaseTimer(io, 15, () => {
                resolveWolfVote(io);
            });
            broadcastState(io);
        } else {
            // Vẫn hòa → random
            const randomTarget = topTargets[Math.floor(Math.random() * topTargets.length)];
            autoGM.nightActions.wolfTarget = randomTarget;
            const target = gameState.players.find(p => p.id === randomTarget);
            addGameLog('WOLF_RESULT', { target: target?.name, targetId: randomTarget, random: true });
            afterWolf(io);
        }
    }
};

const afterWolf = (io) => {
    autoGM.currentTurnRole = null;
    autoGM.phase = PHASES.NIGHT_WOLF;
    advanceNightPhase(io);
};

// ---- Tiên tri ----
const startSeerPhase = (io) => {
    if (!hasRoleInGame('Tiên tri')) {
        autoGM.phase = PHASES.NIGHT_SEER;
        advanceNightPhase(io);
        return;
    }
    
    autoGM.phase = PHASES.NIGHT_SEER;
    autoGM.currentTurnRole = 'Tiên tri';
    addGameLog('SKILL_TURN', { role: 'Tiên tri' });
    
    playVoiceAndWait(io, 'seer_wake', () => {
        if (hasAliveRole('Tiên tri')) {
            setPhaseTimer(io, autoGM.settings.skillDuration, () => {
                addGameLog('SKILL_SKIP', { role: 'Tiên tri', reason: 'timeout' });
                afterSeer(io);
            });
        } else {
            // Fake turn
            const fakeDuration = Math.floor(Math.random() * 6) + 10;
            setPhaseTimer(io, fakeDuration, () => {
                afterSeer(io);
            });
        }
    });
    broadcastState(io);
};

const afterSeer = (io) => {
    autoGM.currentTurnRole = null;
    autoGM.phase = PHASES.NIGHT_SEER;
    advanceNightPhase(io);
};

// ---- Bảo vệ ----
const startGuardPhase = (io) => {
    if (!hasRoleInGame('Bảo vệ')) {
        autoGM.phase = PHASES.NIGHT_GUARD;
        advanceNightPhase(io);
        return;
    }
    
    autoGM.phase = PHASES.NIGHT_GUARD;
    autoGM.currentTurnRole = 'Bảo vệ';
    addGameLog('SKILL_TURN', { role: 'Bảo vệ' });
    
    playVoiceAndWait(io, 'guard_wake', () => {
        if (hasAliveRole('Bảo vệ')) {
            setPhaseTimer(io, autoGM.settings.skillDuration, () => {
                addGameLog('SKILL_SKIP', { role: 'Bảo vệ', reason: 'timeout' });
                afterGuard(io);
            });
        } else {
            // Fake turn
            const fakeDuration = Math.floor(Math.random() * 6) + 10;
            setPhaseTimer(io, fakeDuration, () => {
                afterGuard(io);
            });
        }
    });
    broadcastState(io);
};

const afterGuard = (io) => {
    autoGM.currentTurnRole = null;
    autoGM.phase = PHASES.NIGHT_GUARD;
    advanceNightPhase(io);
};

// ---- Xử lý kết quả sói cắn ----
const resolveWolfBite = (io) => {
    autoGM.phase = PHASES.NIGHT_RESOLVE_WOLF;

    const wolfTarget = autoGM.nightActions.wolfTarget;
    if (!wolfTarget) {
        // Không ai bị cắn
        advanceNightPhase(io);
        return;
    }

    const isProtected = autoGM.nightActions.guardTarget === wolfTarget;
    const targetPlayer = gameState.players.find(p => p.id === wolfTarget);
    const targetMeta = autoGM.playerMeta[wolfTarget];

    if (isProtected) {
        addGameLog('WOLF_BITE_BLOCKED', { target: targetPlayer?.name, by: 'guard' });
    }

    // Kẻ bị nguyền bị cắn
    if (targetMeta && targetMeta.originalRole === 'Kẻ Bị Nguyền' && !targetMeta.isConverted) {
        if (!isProtected) {
            // Sẽ kiểm tra phù thủy cứu sau — đánh dấu tạm
            addGameLog('CURSED_BITTEN', { target: targetPlayer?.name });
        }
    }

    advanceNightPhase(io);
};

// ---- Phù thủy ----
const startWitchPhase = (io) => {
    if (!hasRoleInGame('Phù Thuỷ')) {
        autoGM.phase = PHASES.NIGHT_WITCH;
        advanceNightPhase(io);
        return;
    }

    autoGM.phase = PHASES.NIGHT_WITCH;
    autoGM.currentTurnRole = 'Phù Thuỷ';
    addGameLog('SKILL_TURN', { role: 'Phù Thuỷ' });

    playVoiceAndWait(io, 'witch_wake', () => {
        playVoiceAndWait(io, 'witch_skill', () => {
            if (hasAliveRole('Phù Thuỷ')) {
                // Kiểm tra phù thủy còn thuốc không
                if (autoGM.nightActions.witchHealUsed && autoGM.nightActions.witchKillUsed) {
                    const fakeDuration = Math.floor(Math.random() * 6) + 5;
                    setPhaseTimer(io, fakeDuration, () => {
                        addGameLog('SKILL_SKIP', { role: 'Phù Thuỷ', reason: 'no_potions' });
                        afterWitch(io);
                    });
                } else {
                    setPhaseTimer(io, autoGM.settings.skillDuration, () => {
                        addGameLog('SKILL_SKIP', { role: 'Phù Thuỷ', reason: 'timeout' });
                        afterWitch(io);
                    });
                }
            } else {
                // Fake turn
                const fakeDuration = Math.floor(Math.random() * 6) + 10;
                setPhaseTimer(io, fakeDuration, () => {
                    afterWitch(io);
                });
            }
        });
    });
    broadcastState(io);
};

const afterWitch = (io) => {
    autoGM.currentTurnRole = null;
    autoGM.phase = PHASES.NIGHT_WITCH;
    advanceNightPhase(io);
};

// ---- Chốt danh sách người chết ban đêm ----
const finalizeNightDeaths = (io) => {
    autoGM.phase = PHASES.NIGHT_FINALIZE_DEATHS;
    const deaths = [];
    const wolfTarget = autoGM.nightActions.wolfTarget;

    if (wolfTarget) {
        const isProtected = autoGM.nightActions.guardTarget === wolfTarget;
        const isHealed = autoGM.nightActions.witchHealTarget === wolfTarget;
        const targetMeta = autoGM.playerMeta[wolfTarget];
        const targetPlayer = gameState.players.find(p => p.id === wolfTarget);

        if (targetMeta?.originalRole === 'Kẻ Bị Nguyền' && !targetMeta.isConverted) {
            if (!isProtected && !isHealed) {
                // Kẻ bị nguyền bị cắn, không được cứu → chuyển phe
                targetMeta.team = TEAMS.WOLF;
                targetMeta.isConverted = true;
                targetPlayer.role = 'Sói'; // Đổi role hiển thị
                addGameLog('CURSED_CONVERTED', { player: targetPlayer?.name });
                // KHÔNG chết
            }
            // Nếu được cứu/bảo vệ → không chuyển phe, không chết
        } else if (!isProtected && !isHealed) {
            // Người bình thường bị cắn, không được cứu → chết
            deaths.push({ playerId: wolfTarget, cause: 'wolf' });
        }
    }

    // Phù thủy giết
    const witchKillTarget = autoGM.nightActions.witchKillTarget;
    if (witchKillTarget) {
        // Thuốc độc giết chết ngay, Bảo vệ KHÔNG chống được thuốc độc
        if (!deaths.find(d => d.playerId === witchKillTarget)) {
            deaths.push({ playerId: witchKillTarget, cause: 'witch_poison' });
        }
    }

    // Áp dụng deaths
    deaths.forEach(({ playerId, cause }) => {
        const player = gameState.players.find(p => p.id === playerId);
        if (player) {
            player.isAlive = false;
            addGameLog('DEATH', { player: player.name, playerId, cause, time: 'night' });
        }
    });

    autoGM.dayActions.deaths = deaths.map(d => d.playerId);
    autoGM.dayActions.deathMessages = deaths.map(d => ({
        playerId: d.playerId,
        playerName: gameState.players.find(p => p.id === d.playerId)?.name,
        cause: d.cause,
    }));

    advanceNightPhase(io);
};

// ---- Thợ săn chết → bắn ----
const checkNightHunter = (io) => {
    autoGM.phase = PHASES.NIGHT_HUNTER_CHECK;

    // Kiểm tra Thợ săn có chết trong đêm này không
    const deadHunter = autoGM.dayActions.deaths
        .map(id => gameState.players.find(p => p.id === id))
        .find(p => p && autoGM.playerMeta[p.id]?.originalRole === 'Thợ săn');

    if (deadHunter && autoGM.nightActions.hunterTarget) {
        const target = gameState.players.find(p => p.id === autoGM.nightActions.hunterTarget);
        if (target && target.isAlive) {
            target.isAlive = false;
            autoGM.dayActions.deaths.push(target.id);
            autoGM.dayActions.deathMessages.push({
                playerId: target.id,
                playerName: target.name,
                cause: 'hunter_shot',
            });
            addGameLog('HUNTER_SHOT', { hunter: deadHunter.name, target: target.name });
        }
    }

    advanceNightPhase(io);
};

// ---- Kiểm tra couple ----
const checkNightCouple = (io) => {
    autoGM.phase = PHASES.NIGHT_COUPLE_CHECK;
    processCoupleDeaths(io);
    advanceNightPhase(io);
};

/** Xử lý chết theo couple — nếu 1 người trong couple chết, người kia cũng chết */
const processCoupleDeaths = (io) => {
    if (autoGM.couple.length !== 2) return;

    const [lover1, lover2] = autoGM.couple;
    const p1 = gameState.players.find(p => p.id === lover1);
    const p2 = gameState.players.find(p => p.id === lover2);

    if (!p1 || !p2) return;

    // Nếu 1 người đã chết trong đêm này
    if (!p1.isAlive && p2.isAlive) {
        p2.isAlive = false;
        autoGM.dayActions.deaths.push(p2.id);
        autoGM.dayActions.deathMessages.push({
            playerId: p2.id,
            playerName: p2.name,
            cause: 'lover_death',
        });
        addGameLog('LOVER_DEATH', { dead: p1.name, partnerDied: p2.name });
    } else if (!p2.isAlive && p1.isAlive) {
        p1.isAlive = false;
        autoGM.dayActions.deaths.push(p1.id);
        autoGM.dayActions.deathMessages.push({
            playerId: p1.id,
            playerName: p1.name,
            cause: 'lover_death',
        });
        addGameLog('LOVER_DEATH', { dead: p2.name, partnerDied: p1.name });
    }
};

// ---- Xử lý hiệu ứng dây chuyền ----
const processChainEffects = (io, timeOfDay) => {
    autoGM.phase = timeOfDay === 'NIGHT' ? PHASES.NIGHT_CHAIN_EFFECTS : PHASES.DAY_CHAIN_EFFECTS;

    // Lặp cho đến khi không còn người chết phát sinh
    let hasNewDeaths = true;
    let iterations = 0;
    const MAX_ITERATIONS = 10; // An toàn chống vòng lặp vô hạn

    while (hasNewDeaths && iterations < MAX_ITERATIONS) {
        hasNewDeaths = false;
        iterations++;

        // Kiểm tra Thợ săn chết → bắn
        const newDeadHunter = autoGM.dayActions.deaths
            .map(id => gameState.players.find(p => p.id === id))
            .find(p => {
                if (!p) return false;
                const meta = autoGM.playerMeta[p.id];
                return meta?.originalRole === 'Thợ săn' && autoGM.nightActions.hunterTarget;
            });

        if (newDeadHunter) {
            const hunterTarget = autoGM.nightActions.hunterTarget;
            const target = gameState.players.find(p => p.id === hunterTarget);
            if (target && target.isAlive && !autoGM.dayActions.deaths.includes(target.id)) {
                target.isAlive = false;
                autoGM.dayActions.deaths.push(target.id);
                autoGM.dayActions.deathMessages.push({
                    playerId: target.id,
                    playerName: target.name,
                    cause: 'hunter_chain',
                });
                addGameLog('HUNTER_CHAIN_SHOT', { target: target.name });
                hasNewDeaths = true;
            }
        }

        // Kiểm tra couple
        if (autoGM.couple.length === 2) {
            const [l1, l2] = autoGM.couple;
            const p1 = gameState.players.find(p => p.id === l1);
            const p2 = gameState.players.find(p => p.id === l2);

            if (p1 && p2) {
                if (!p1.isAlive && p2.isAlive) {
                    p2.isAlive = false;
                    if (!autoGM.dayActions.deaths.includes(p2.id)) {
                        autoGM.dayActions.deaths.push(p2.id);
                        autoGM.dayActions.deathMessages.push({
                            playerId: p2.id,
                            playerName: p2.name,
                            cause: 'lover_chain',
                        });
                        addGameLog('LOVER_CHAIN', { partnerDied: p2.name });
                        hasNewDeaths = true;
                    }
                } else if (!p2.isAlive && p1.isAlive) {
                    p1.isAlive = false;
                    if (!autoGM.dayActions.deaths.includes(p1.id)) {
                        autoGM.dayActions.deaths.push(p1.id);
                        autoGM.dayActions.deathMessages.push({
                            playerId: p1.id,
                            playerName: p1.name,
                            cause: 'lover_chain',
                        });
                        addGameLog('LOVER_CHAIN', { partnerDied: p1.name });
                        hasNewDeaths = true;
                    }
                }
            }
        }
    }

    if (timeOfDay === 'NIGHT') {
        advanceNightPhase(io);
    } else {
        advanceDayPhase(io);
    }
};

// ================================================
// WIN CONDITION
// ================================================

export const checkWinCondition = () => {
    const alive = getAlivePlayers();
    const aliveWolves = alive.filter(p => isWolf(p.id));
    const aliveVillagers = alive.filter(p => !isWolf(p.id));

    // Sida thắng: Kiểm tra riêng tại lúc vote treo (không kiểm tra ở đây)

    // Phe Sói thắng: Số sói >= số dân
    if (aliveWolves.length >= aliveVillagers.length && aliveWolves.length > 0) {
        return { winner: TEAMS.WOLF, reason: 'Số Sói >= Số Dân còn sống' };
    }

    // Phe Dân thắng: Tất cả Sói chết
    if (aliveWolves.length === 0) {
        return { winner: TEAMS.VILLAGER, reason: 'Tất cả Sói đã chết' };
    }

    // Phe Couple thắng: Chỉ còn 2 người yêu (khác phe)
    if (autoGM.couple.length === 2) {
        const [l1, l2] = autoGM.couple;
        const meta1 = autoGM.playerMeta[l1];
        const meta2 = autoGM.playerMeta[l2];
        const p1 = gameState.players.find(p => p.id === l1);
        const p2 = gameState.players.find(p => p.id === l2);

        if (p1?.isAlive && p2?.isAlive && meta1 && meta2) {
            // Nếu khác phe → phe couple
            if (meta1.team !== meta2.team) {
                if (alive.length === 2) {
                    return { winner: TEAMS.COUPLE, reason: 'Cặp đôi khác phe là 2 người sống sót cuối cùng' };
                }
            }
            // Nếu cùng phe → thắng theo phe (đã kiểm tra ở trên)
        }
    }

    return null; // Chưa có ai thắng
};

const checkWinConditionAndAdvance = (io, timeOfDay) => {
    autoGM.phase = timeOfDay === 'NIGHT' ? PHASES.WIN_CHECK_NIGHT : PHASES.WIN_CHECK_DAY;

    const result = checkWinCondition();
    if (result) {
        endGame(io, result);
        return;
    }

    // Chưa thắng → chuyển phase
    if (timeOfDay === 'NIGHT') {
        startDay(io);
    } else {
        autoGM.nightCount++;
        addGameLog('PHASE_CHANGE', { to: PHASES.NIGHT, nightCount: autoGM.nightCount });
        startNight(io);
    }
};

// ================================================
// DAY PHASE LOGIC
// ================================================

const startDay = (io) => {
    autoGM.dayCount++;
    autoGM.phase = PHASES.DAY_ANNOUNCE;
    autoGM.currentTurnRole = null;

    io.emit('autoGM:phaseTransition', { from: 'NIGHT', to: 'DAY' });
    addGameLog('PHASE_CHANGE', { to: 'DAY', dayCount: autoGM.dayCount });
    
    // Gà gáy
    io.emit('autoGM:playAudio', 'sfx_rooster');

    playVoiceAndWait(io, 'day_start', () => {
        // Bật âm thanh đếm ngược
        io.emit('autoGM:playAudio', 'sfx_ticking');

        // Đợi 5s cho popup đếm ngược ở client
        setPhaseTimer(io, 5, () => {
            // Tắt âm thanh đếm ngược
            io.emit('autoGM:stopAudio', 'sfx_ticking');

            const deathCount = autoGM.dayActions.deathMessages.length;
            let voiceKey = `${deathCount}_dead`;
            if (deathCount > 5) voiceKey = '5_dead'; // Tối đa voice 5 chết
            
            playVoiceAndWait(io, voiceKey, () => {
                // Đợi thêm vài giây cho người chơi đọc tên người chết
                setPhaseTimer(io, 3, () => {
                    startDiscussion(io);
                });
            });
        });
    });
    broadcastState(io);
};

const startDiscussion = (io) => {
    autoGM.phase = PHASES.DAY_DISCUSS;
    addGameLog('PHASE_CHANGE', { to: 'DAY_DISCUSS' });

    playVoiceAndWait(io, 'discussion_start', () => {
        setPhaseTimer(io, autoGM.settings.discussDuration, () => {
            startDayVote(io);
        });
    });
    broadcastState(io);
};

const startDayVote = (io) => {
    autoGM.phase = PHASES.DAY_VOTE;
    autoGM.dayActions.votes = {}; // Reset phiếu mỗi lần mở vote

    if (autoGM.dayActions.isRevote) {
        addGameLog('PHASE_CHANGE', { to: 'DAY_REVOTE' });
        
        playVoiceAndWait(io, 'vote_tie_revote', () => {
            // Re-vote chỉ 15 giây
            setPhaseTimer(io, 15, () => {
                resolveDayVote(io);
            });
        });
    } else {
        addGameLog('PHASE_CHANGE', { to: 'DAY_VOTE' });
        
        playVoiceAndWait(io, 'discussion_end', () => {
            playVoiceAndWait(io, 'vote_start', () => {
                setPhaseTimer(io, autoGM.settings.voteDuration, () => {
                    resolveDayVote(io);
                });
            });
        });
    }
    broadcastState(io);
};

export const resolveDayVote = (io) => {
    clearPhaseTimer();
    autoGM.phase = PHASES.DAY_EXECUTE;

    const votes = autoGM.dayActions.votes;
    const voteCounts = {};
    
    // N: Số người sống, dùng để tính tỷ lệ
    const alivePlayers = gameState.players.filter(p => p.isAlive && !p.isAdmin);
    const aliveCount = alivePlayers.length;

    Object.values(votes).forEach(targetId => {
        if (targetId && targetId !== 'skip') {
            voteCounts[targetId] = (voteCounts[targetId] || 0) + 1;
        }
    });

    const maxVotes = Object.keys(voteCounts).length > 0 ? Math.max(...Object.values(voteCounts)) : 0;
    if (maxVotes === 0) {
        // Không ai vote hoặc toàn vote trắng → không treo ai
        addGameLog('VOTE_RESULT', { result: 'no_votes' });
        autoGM.dayActions.isRevote = false;
        autoGM.dayActions.revoteTargets = [];
        startDayExecute(io);
        return;
    }

    const topTargets = Object.entries(voteCounts)
        .filter(([_, count]) => count === maxVotes)
        .map(([id]) => id);

    if (!autoGM.dayActions.isRevote) {
        // LẦN 1
        if (topTargets.length === 1 && maxVotes >= Math.ceil(aliveCount / 2)) {
            // Treo cổ thành công (đủ 50%)
            if (executePlayer(io, topTargets[0], maxVotes)) return;
        } else if (topTargets.length >= 2 && maxVotes >= Math.ceil(aliveCount * 0.3)) {
            // Hòa phiếu và đủ 30% -> Bỏ phiếu lại
            addGameLog('VOTE_TIE', { tied: topTargets, votes: maxVotes, action: 'revote' });
            autoGM.dayActions.isRevote = true;
            autoGM.dayActions.revoteTargets = topTargets;
            startDayVote(io); // Bắt đầu lại lần 2
            return;
        } else {
            // Không đạt điều kiện treo -> Không ai chết
            addGameLog('VOTE_FAILED', { topTargets, votes: maxVotes, reason: 'not_enough_votes' });
        }
    } else {
        // LẦN 2 (Re-vote)
        if (topTargets.length === 1 && maxVotes >= Math.ceil(aliveCount / 2)) {
            // Ai cao phiếu hơn và đủ 50% thì chết
            if (executePlayer(io, topTargets[0], maxVotes)) return;
        } else {
            // Hòa tiếp hoặc không đủ 50% -> Không ai chết
            addGameLog('VOTE_TIE_FINAL', { tied: topTargets, votes: maxVotes });
        }
        autoGM.dayActions.isRevote = false;
        autoGM.dayActions.revoteTargets = [];
    }

    startDayExecute(io);
};

const startDayExecute = (io) => {
    autoGM.phase = PHASES.DAY_EXECUTE;
    broadcastState(io);
    
    // Hiện popup tổng kết treo cổ trong 6 giây rồi đi tiếp
    setPhaseTimer(io, 6, () => {
        afterDayExecution(io);
    });
};

const executePlayer = (io, targetId, maxVotes) => {
    const target = gameState.players.find(p => p.id === targetId);
    const targetMeta = autoGM.playerMeta[targetId];

    // Kiểm tra Sida
    if (targetMeta?.originalRole === 'Sida') {
        addGameLog('SIDA_HANGED', { player: target?.name });
        endGame(io, { winner: TEAMS.SIDA, reason: 'Sida bị dân làng treo cổ!' });
        return true;
    }

    // Treo cổ
    if (target) {
        target.isAlive = false;
        autoGM.dayActions.executedPlayer = targetId;
        addGameLog('HANGED', { player: target.name, playerId: targetId, votes: maxVotes });
    }
    return false;
};

const afterDayExecution = (io) => {
    // Kiểm tra Thợ săn bị treo → bắn
    const executed = autoGM.dayActions.executedPlayer;
    if (executed) {
        const executedMeta = autoGM.playerMeta[executed];
        if (executedMeta?.originalRole === 'Thợ săn') {
            // Thợ săn bị treo → Phase cho Thợ săn chọn người bắn
            autoGM.phase = PHASES.DAY_HUNTER_CHECK;
            autoGM.currentTurnRole = 'Thợ săn';
            addGameLog('HUNTER_TRIGGER', { trigger: 'hanged' });
            
            playVoiceAndWait(io, 'hunter_wake', () => {
                setPhaseTimer(io, autoGM.settings.skillDuration, () => {
                    // Hết giờ → không bắn
                    addGameLog('SKILL_SKIP', { role: 'Thợ săn', reason: 'timeout' });
                    autoGM.currentTurnRole = null;
                    checkDayCouple(io);
                });
            });
            broadcastState(io);
            return;
        }
    }

    autoGM.phase = PHASES.DAY_HUNTER_CHECK;
    checkDayCouple(io);
};

const checkDayCouple = (io) => {
    autoGM.phase = PHASES.DAY_COUPLE_CHECK;
    processCoupleDeaths(io);
    processChainEffects(io, 'DAY');
};

/** Chuyển phase ban ngày (chain effects xong → check win) */
const advanceDayPhase = (io) => {
    checkWinConditionAndAdvance(io, 'DAY');
};

// ================================================
// CUPID — XỬ LÝ GHÉP ĐÔI
// ================================================

export const handleCupidAction = (io, targets) => {
    if (autoGM.phase !== PHASES.NIGHT_CUPID) return;
    if (targets === 'skip') {
        clearPhaseTimer();
        addGameLog('SKILL_SKIP', { role: 'Cupid', reason: 'player_skipped' });
        afterCupid(io);
        return;
    }
    if (!Array.isArray(targets) || targets.length !== 2) return;

    clearPhaseTimer();

    autoGM.couple = targets;
    gameState.couple = targets; // Sync cho gameState chung

    const p1 = gameState.players.find(p => p.id === targets[0]);
    const p2 = gameState.players.find(p => p.id === targets[1]);

    // Kiểm tra couple khác phe → trở thành phe riêng
    const meta1 = autoGM.playerMeta[targets[0]];
    const meta2 = autoGM.playerMeta[targets[1]];
    // Chưa đổi team ở đây — team chỉ ảnh hưởng win condition, xử lý trong checkWinCondition

    addGameLog('CUPID_PAIR', {
        player1: p1?.name,
        player2: p2?.name,
    });

    afterCupid(io);
};

// ================================================
// SKILL SUBMISSION — Nhận kỹ năng từ người chơi
// ================================================

export const handleSkillSubmit = (io, socketId, action) => {
    const player = gameState.players.find(p => p.id === socketId);
    if (!player || player.isAdmin || !player.isAlive) return;

    const meta = autoGM.playerMeta[socketId];
    if (!meta) return;

    const currentRole = player.role;

    switch (autoGM.phase) {
        case PHASES.NIGHT_CUPID:
            if (currentRole === 'Cupid' && action.type === 'cupid_pair') {
                handleCupidAction(io, action.targets);
            }
            break;

        case PHASES.NIGHT_WOLF:
            if (isWolf(socketId) && action.type === 'wolf_vote') {
                if (action.targetId === 'skip') {
                    autoGM.nightActions.wolfVotes[socketId] = 'skip';
                    addGameLog('WOLF_VOTE', { wolf: player.name, target: 'skip' });
                } else {
                    autoGM.nightActions.wolfVotes[socketId] = action.targetId;
                    addGameLog('WOLF_VOTE', { wolf: player.name, target: action.targetId });
                }
                broadcastState(io);

                // Kiểm tra tất cả sói đã vote chưa
                const wolves = getAliveWolves();
                const allVoted = wolves.every(w => autoGM.nightActions.wolfVotes[w.id]);
                if (allVoted) {
                    resolveWolfVote(io);
                }
            }
            break;

        case PHASES.NIGHT_SEER:
            if (currentRole === 'Tiên tri' && action.type === 'seer_check') {
                clearPhaseTimer();
                const targetId = action.targetId;
                
                if (targetId === 'skip') {
                    addGameLog('SKILL_SKIP', { role: 'Tiên tri', reason: 'player_skipped' });
                    afterSeer(io);
                    break;
                }

                const targetMeta = autoGM.playerMeta[targetId];
                const targetPlayer = gameState.players.find(p => p.id === targetId);

                // Sida luôn hiện là Dân. Kẻ bị nguyền trước khi chuyển phe = Dân.
                let result;
                if (targetMeta?.originalRole === 'Sida') {
                    result = 'VILLAGER'; // Sida luôn hiện là Dân
                } else {
                    result = targetMeta?.team === TEAMS.WOLF ? 'WOLF' : 'VILLAGER';
                }

                autoGM.nightActions.seerTarget = targetId;
                autoGM.nightActions.seerResult = result;

                addGameLog('SEER_CHECK', { seer: player.name, target: targetPlayer?.name, result });

                // Gửi kết quả riêng cho Tiên tri
                const seerSocket = io.sockets.sockets.get(socketId);
                if (seerSocket) {
                    seerSocket.emit('autoGM:skillResult', {
                        type: 'seer_result',
                        targetName: targetPlayer?.name,
                        result: result,
                    });
                }

                afterSeer(io);
            }
            break;

        case PHASES.NIGHT_GUARD:
            if (currentRole === 'Bảo vệ' && action.type === 'guard_protect') {
                clearPhaseTimer();
                const targetId = action.targetId;
                
                if (targetId === 'skip') {
                    addGameLog('SKILL_SKIP', { role: 'Bảo vệ', reason: 'player_skipped' });
                    afterGuard(io);
                    break;
                }

                // Không được bảo vệ cùng 1 người 2 đêm liên tiếp
                if (targetId === autoGM.nightActions.lastGuardTarget) {
                    // Từ chối — gửi lỗi cho client
                    const guardSocket = io.sockets.sockets.get(socketId);
                    if (guardSocket) {
                        guardSocket.emit('autoGM:skillError', {
                            message: 'Không được bảo vệ cùng một người 2 đêm liên tiếp!',
                        });
                    }
                    return; // Không xử lý, đợi chọn lại hoặc hết giờ
                }

                autoGM.nightActions.guardTarget = targetId;
                const targetPlayer = gameState.players.find(p => p.id === targetId);
                addGameLog('GUARD_PROTECT', { guard: player.name, target: targetPlayer?.name });
                afterGuard(io);
            }
            break;

        case PHASES.NIGHT_WITCH:
            if (currentRole === 'Phù Thuỷ' && action.type === 'witch_action') {
                clearPhaseTimer();
                
                if (action.heal === 'skip' && action.kill === 'skip') {
                    addGameLog('SKILL_SKIP', { role: 'Phù Thuỷ', reason: 'player_skipped' });
                    afterWitch(io);
                    break;
                }

                // Cứu
                if (action.heal && action.heal !== 'skip' && !autoGM.nightActions.witchHealUsed) {
                    autoGM.nightActions.witchHealTarget = action.heal;
                    autoGM.nightActions.witchHealUsed = true;
                    const healTarget = gameState.players.find(p => p.id === action.heal);
                    addGameLog('WITCH_HEAL', { target: healTarget?.name });
                }

                // Giết
                if (action.kill && action.kill !== 'skip' && !autoGM.nightActions.witchKillUsed) {
                    autoGM.nightActions.witchKillTarget = action.kill;
                    autoGM.nightActions.witchKillUsed = true;
                    const killTarget = gameState.players.find(p => p.id === action.kill);
                    addGameLog('WITCH_KILL', { target: killTarget?.name });
                }

                afterWitch(io);
            }
            break;

        case PHASES.NIGHT_WOLF: // Thợ săn chọn mục tiêu nhắm sẵn (nếu gửi submit qua skill button ban đêm)
            break;

        default:
            break;
    }
};

// Thợ săn chọn mục tiêu nhắm — có thể gửi bất cứ lúc nào trong đêm
export const handleHunterAim = (io, socketId, targetId) => {
    const player = gameState.players.find(p => p.id === socketId);
    if (!player || !player.isAlive) return;
    const meta = autoGM.playerMeta[socketId];
    if (meta?.originalRole !== 'Thợ săn') return;

    if (targetId === 'skip') {
        autoGM.nightActions.hunterTarget = null;
        addGameLog('HUNTER_AIM', { hunter: player.name, target: 'skip' });
        return;
    }

    autoGM.nightActions.hunterTarget = targetId;
    const target = gameState.players.find(p => p.id === targetId);
    addGameLog('HUNTER_AIM', { hunter: player.name, target: target?.name });
};

// Thợ săn bắn khi bị treo ban ngày
export const handleHunterShot = (io, socketId, targetId) => {
    if (autoGM.phase !== PHASES.DAY_HUNTER_CHECK) return;
    const player = gameState.players.find(p => p.id === socketId);
    if (!player) return;
    const meta = autoGM.playerMeta[socketId];
    if (meta?.originalRole !== 'Thợ săn') return;

    clearPhaseTimer();
    
    if (targetId === 'skip') {
        addGameLog('SKILL_SKIP', { role: 'Thợ săn', reason: 'player_skipped' });
        autoGM.currentTurnRole = null;
        checkDayCouple(io);
        return;
    }

    const target = gameState.players.find(p => p.id === targetId);
    if (target && target.isAlive) {
        target.isAlive = false;
        addGameLog('HUNTER_DAY_SHOT', { hunter: player.name, target: target.name });
    }

    autoGM.currentTurnRole = null;
    checkDayCouple(io);
};

// ================================================
// DAY VOTE — Nhận vote ban ngày từ người chơi
// ================================================

export const handleDayVote = (io, socketId, targetId) => {
    if (autoGM.phase !== PHASES.DAY_VOTE) return;

    const player = gameState.players.find(p => p.id === socketId);
    if (!player || player.isAdmin || !player.isAlive) return;

    // Không cho phép đổi vote
    if (autoGM.dayActions.votes[socketId] !== undefined) return;

    // Nếu đang revote, chỉ cho phép vote người trong danh sách hòa
    if (autoGM.dayActions.isRevote && targetId !== 'skip' && !autoGM.dayActions.revoteTargets.includes(targetId)) return;

    autoGM.dayActions.votes[socketId] = targetId;
    
    // Ghi log (ẩn nếu skip)
    if (targetId !== 'skip') {
        addGameLog('DAY_VOTE', { voter: player.name, target: targetId });
    } else {
        addGameLog('DAY_VOTE', { voter: player.name, target: 'skip' });
    }
    
    broadcastState(io);

    // Kiểm tra tất cả người sống đã vote chưa
    const alivePlayers = getAlivePlayers();
    const allVoted = alivePlayers.every(p => autoGM.dayActions.votes[p.id] !== undefined);
    if (allVoted) {
        resolveDayVote(io);
    }
};

// ================================================
// END GAME
// ================================================

const endGame = (io, result) => {
    clearPhaseTimer();
    autoGM.phase = PHASES.GAME_OVER;

    addGameLog('GAME_OVER', result);

    // Xác định danh sách winners
    const winners = [];
    gameState.players.forEach(p => {
        if (p.isAdmin) return;
        const meta = autoGM.playerMeta[p.id];
        if (!meta) return;

        let isWinner = false;
        if (result.winner === TEAMS.VILLAGER) {
            isWinner = meta.team === TEAMS.VILLAGER && meta.originalRole !== 'Sida';
        } else if (result.winner === TEAMS.WOLF) {
            isWinner = meta.team === TEAMS.WOLF;
        } else if (result.winner === TEAMS.COUPLE) {
            isWinner = autoGM.couple.includes(p.id);
        } else if (result.winner === TEAMS.SIDA) {
            isWinner = meta.originalRole === 'Sida';
        }

        if (isWinner) {
            winners.push(p.id);
            matchData.leaderboard[p.name] = (matchData.leaderboard[p.name] || 0) + 1;
        }
    });

    io.emit('updateLeaderboard', matchData.leaderboard);
    
    const finishGame = () => {
        io.emit('gameEnded', { team: result.winner, winners });
        broadcastState(io);
    };

    if (result.winner === TEAMS.SIDA) {
        playVoiceAndWait(io, 'win_sida', finishGame);
    } else {
        playVoiceAndWait(io, 'win_announce', () => {
            let voiceKey = 'win_villager';
            if (result.winner === TEAMS.WOLF) voiceKey = 'win_wolf';
            else if (result.winner === TEAMS.COUPLE) voiceKey = 'win_couple';

            playVoiceAndWait(io, voiceKey, finishGame);
        });
    }
};

// ================================================
// ADMIN CONTROLS
// ================================================

export const pauseGame = (io) => {
    if (autoGM.isPaused) return;
    autoGM.isPaused = true;

    if (autoGM.phaseEndTime && autoGM.phaseTimer) {
        autoGM.pausedTimeRemaining = autoGM.phaseEndTime - Date.now();
        clearPhaseTimer();
    }

    addGameLog('ADMIN_PAUSE', {});
    broadcastState(io);
};

export const resumeGame = (io) => {
    if (!autoGM.isPaused) return;
    autoGM.isPaused = false;

    // Phục hồi timer nếu có
    if (autoGM.pausedTimeRemaining && autoGM.pausedTimeRemaining > 0) {
        autoGM.phaseEndTime = Date.now() + autoGM.pausedTimeRemaining;
        // Không thể phục hồi chính xác callback — nhưng đủ cho MVP
        autoGM.pausedTimeRemaining = null;
    }

    addGameLog('ADMIN_RESUME', {});
    broadcastState(io);
};

export const updateSettings = (io, newSettings) => {
    Object.assign(autoGM.settings, newSettings);
    broadcastState(io);
};

export const stopAutoGame = (io) => {
    clearPhaseTimer();
    resetAutoGM();
    autoGM.phase = PHASES.LOBBY;

    // Reset players
    gameState.players.forEach(p => {
        if (!p.isAdmin) {
            p.role = '...';
            p.isReady = false;
            p.isAlive = true;
        }
    });
    gameState.couple = [];

    broadcastState(io);
};

export const skipPhase = (io) => {
    if (!autoGM.phaseTimer || !autoGM.phaseTimeoutCallback) return;
    
    const callback = autoGM.phaseTimeoutCallback;
    clearPhaseTimer();
    
    addGameLog('ADMIN_SKIP', { phase: autoGM.phase });
    callback();
};
