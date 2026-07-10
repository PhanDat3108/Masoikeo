import React, { useMemo } from 'react';
import { ROLES_CONFIG, GAME_ASSETS } from '../constants/roles.js';

export const PlayerCard = React.memo(({ role, isFlipped, onClick, countdown = null }) => {
    const roleConfig = useMemo(() => ROLES_CONFIG.find(r => r.name === role) || { imageUrl: '' }, [role]);
    
    const hasBackImage = !!GAME_ASSETS.cardBackUrl;
    const hasFrontImage = !!roleConfig.imageUrl;

    return (
        <div 
            className={`relative group perspective-1000 w-64 h-[22rem] mx-auto select-none ${countdown === null ? 'cursor-pointer' : 'cursor-not-allowed'}`}
            onClick={countdown === null ? onClick : undefined}
            style={{ touchAction: 'manipulation' }}
        >
            <div 
                className={`w-full h-full preserve-3d relative ${isFlipped ? 'rotate-y-180' : ''}`}
                style={{ willChange: 'transform', transition: 'transform 0.7s cubic-bezier(0.4, 0, 0.2, 1)' }}
            >
                
                {/* ===== CARD BACK (Mặt úp) ===== */}
                <div 
                    className="absolute inset-0 backface-hidden flex flex-col items-center justify-center bg-cover bg-center animate-slowGlow"
                    style={{ 
                        background: hasBackImage ? `url(${GAME_ASSETS.cardBackUrl}) center/cover` : '#0A0A0A',
                        border: '1px solid #444',
                        borderRadius: '4px',
                        boxShadow: 'inset 0 0 0 4px #0A0A0A, inset 0 0 0 5px #333',
                    }}
                >
                    {countdown !== null && (
                        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/80 backdrop-blur-sm rounded-[4px] animate-fadeIn">
                            <div className="text-7xl text-white font-display drop-shadow-[0_0_20px_rgba(255,255,255,0.5)] animate-mysticPulse"
                                 style={{ letterSpacing: '0', transform: 'translateX(-4px)' }}>
                                {countdown}
                            </div>
                            <div className="mt-4 text-white/50 text-[10px] tracking-[0.3em] font-heading">
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
                            <span className="absolute top-4 left-5 text-white/15 text-[10px]">✦</span>
                            <span className="absolute top-4 right-5 text-white/15 text-[10px]">✦</span>
                            <span className="absolute bottom-4 left-5 text-white/15 text-[10px]">✦</span>
                            <span className="absolute bottom-4 right-5 text-white/15 text-[10px]">✦</span>

                            {/* Central symbol */}
                            <div className="text-white/10 text-5xl mb-4 animate-mysticPulse">☽</div>
                            <div className="font-display text-white/20 text-xs tracking-[0.4em]">WEREWOLF</div>
                            <div className="text-white/10 text-[10px] tracking-[0.3em] mt-1 font-heading">NIGHT</div>
                        </div>
                    )}
                </div>

                {/* ===== CARD FRONT (Mặt ngửa — Role) ===== */}
                <div 
                    className="absolute inset-0 backface-hidden rotate-y-180 overflow-hidden flex flex-col"
                    style={{ 
                        background: hasFrontImage ? `url(${roleConfig.imageUrl}) center/cover` : '#0E0E0E',
                        border: '1px solid #555',
                        borderRadius: '4px',
                        boxShadow: 'inset 0 0 0 4px #0A0A0A, inset 0 0 0 5px #333',
                    }}
                >
                    {/* Inner border decorations */}
                    <div className="absolute inset-3 border border-white/10 rounded-sm pointer-events-none z-10"></div>
                    <span className="absolute top-4 left-5 text-white/20 text-[10px] z-10">✧</span>
                    <span className="absolute top-4 right-5 text-white/20 text-[10px] z-10">✧</span>
                    <span className="absolute bottom-4 left-5 text-white/20 text-[10px] z-10">✧</span>
                    <span className="absolute bottom-4 right-5 text-white/20 text-[10px] z-10">✧</span>
                </div>
                
            </div>
        </div>
    );
});
