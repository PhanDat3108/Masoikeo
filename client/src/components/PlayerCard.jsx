import React, { useMemo } from 'react';
import { ROLES_CONFIG, GAME_ASSETS, CUSTOM_ROLE_IMAGES } from '../constants/roles.js';
import { useGameStore } from '../store/useGameStore.js';

export const PlayerCard = React.memo(({ role, isFlipped, onClick, countdown = null }) => {
    const gameState = useGameStore(state => state.gameState);

    const roleConfig = useMemo(() => {
        const base = ROLES_CONFIG.find(r => r.name === role);
        if (base) return base;

        const customRoles = gameState?.rolesConfig?.filter(r => !ROLES_CONFIG.some(configRole => configRole.name === r.name)) || [];
        const customIndex = customRoles.findIndex(r => r.name === role);
        const imageUrl = customIndex >= 0 ? CUSTOM_ROLE_IMAGES[customIndex % CUSTOM_ROLE_IMAGES.length] : CUSTOM_ROLE_IMAGES[0];
        
        return { imageUrl };
    }, [role, gameState?.rolesConfig]);
    
    const hasBackImage = !!GAME_ASSETS.cardBackUrl;
    const hasFrontImage = !!roleConfig.imageUrl;

    // Xác định hào quang ma mị theo vai trò
    const roleGlowClass = useMemo(() => {
        if (!isFlipped) return 'shadow-[0_0_25px_rgba(255,255,255,0.08)]';
        if (role === 'Sói') return 'shadow-[0_0_35px_rgba(225,29,72,0.45)] border-red-500/40';
        if (role === 'Tiên tri') return 'shadow-[0_0_35px_rgba(129,140,248,0.4)] border-indigo-400/40';
        if (role === 'Bảo vệ') return 'shadow-[0_0_35px_rgba(56,189,248,0.4)] border-sky-400/40';
        if (role === 'Cupid') return 'shadow-[0_0_35px_rgba(244,114,182,0.4)] border-pink-400/40';
        if (role === 'Phù Thuỷ') return 'shadow-[0_0_35px_rgba(168,85,247,0.4)] border-purple-400/40';
        return 'shadow-[0_0_30px_rgba(255,255,255,0.18)] border-amber-300/30';
    }, [isFlipped, role]);

    return (
        <div 
            className={`relative group perspective-1000 w-64 h-[22rem] mx-auto select-none transition-transform duration-300 ease-out hover:scale-[1.03] active:scale-[0.98] ${countdown === null ? 'cursor-pointer' : 'cursor-not-allowed'}`}
            onClick={countdown === null ? onClick : undefined}
            style={{ touchAction: 'manipulation' }}
        >
            <div 
                className={`w-full h-full preserve-3d relative rounded-md transition-all duration-700 ${roleGlowClass} ${isFlipped ? 'rotate-y-180' : ''}`}
                style={{ willChange: 'transform', transition: 'transform 0.75s cubic-bezier(0.2, 0.8, 0.2, 1)' }}
            >
                {/* Specular sheen sweep effect */}
                <div className="card-shine-overlay" />
                
                {/* ===== CARD BACK (Mặt úp) ===== */}
                <div 
                    className="absolute inset-0 backface-hidden flex flex-col items-center justify-center bg-cover bg-center rounded-md overflow-hidden"
                    style={{ 
                        background: hasBackImage ? `url(${GAME_ASSETS.cardBackUrl}) center/cover` : '#0A0A0A',
                        border: '1px solid rgba(255, 255, 255, 0.15)',
                        boxShadow: 'inset 0 0 0 3px #0A0A0A, inset 0 0 0 4px rgba(255, 255, 255, 0.1)',
                    }}
                >
                    {countdown !== null && (
                        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/85 backdrop-blur-md rounded-md animate-fadeIn">
                            <div className="text-7xl text-white font-display drop-shadow-[0_0_25px_rgba(255,255,255,0.6)] animate-mysticPulse"
                                 style={{ letterSpacing: '0', transform: 'translateX(-4px)' }}>
                                {countdown}
                            </div>
                            <div className="mt-4 text-white/60 text-[10px] tracking-[0.4em] font-heading">
                                CHUẨN BỊ...
                            </div>
                        </div>
                    )}

                    {!hasBackImage && countdown === null && (
                        <div className="flex flex-col items-center justify-center h-full px-4 relative">
                            {/* Inner decorative border */}
                            <div className="absolute inset-3 border border-white/10 rounded-sm pointer-events-none"></div>
                            <div className="absolute inset-5 border border-dashed border-white/5 rounded-sm pointer-events-none"></div>
                            
                            {/* Corner ornaments */}
                            <span className="absolute top-4 left-5 text-white/20 text-[10px]">✦</span>
                            <span className="absolute top-4 right-5 text-white/20 text-[10px]">✦</span>
                            <span className="absolute bottom-4 left-5 text-white/20 text-[10px]">✦</span>
                            <span className="absolute bottom-4 right-5 text-white/20 text-[10px]">✦</span>

                            {/* Central symbol */}
                            <div className="text-white/15 text-5xl mb-4 animate-mysticPulse">☽</div>
                            <div className="font-display text-white/30 text-xs tracking-[0.4em]">WEREWOLF</div>
                            <div className="text-white/15 text-[10px] tracking-[0.3em] mt-1 font-heading">NIGHT</div>
                        </div>
                    )}
                </div>

                {/* ===== CARD FRONT (Mặt ngửa — Role) ===== */}
                <div 
                    className="absolute inset-0 backface-hidden rotate-y-180 overflow-hidden flex flex-col rounded-md"
                    style={{ 
                        background: hasFrontImage ? `url(${roleConfig.imageUrl}) center/cover` : '#0E0E0E',
                        border: '1px solid rgba(255, 255, 255, 0.2)',
                        boxShadow: 'inset 0 0 0 3px #0A0A0A, inset 0 0 0 4px rgba(255, 255, 255, 0.1)',
                    }}
                >
                    {/* Inner border decorations */}
                    <div className="absolute inset-3 border border-white/15 rounded-sm pointer-events-none z-10"></div>
                    <span className="absolute top-4 left-5 text-white/30 text-[10px] z-10 drop-shadow">✧</span>
                    <span className="absolute top-4 right-5 text-white/30 text-[10px] z-10 drop-shadow">✧</span>
                    <span className="absolute bottom-4 left-5 text-white/30 text-[10px] z-10 drop-shadow">✧</span>
                    <span className="absolute bottom-4 right-5 text-white/30 text-[10px] z-10 drop-shadow">✧</span>
                </div>
                
            </div>
        </div>
    );
});
