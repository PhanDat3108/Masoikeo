import React, { useState, useEffect } from 'react';
import { playSfx, stopSfx } from '../utils/audio.js';

// =============================================
// POPUPS TỔNG KẾT
// =============================================

export const DayAnnouncePopup = ({ deathMessages }) => {
    const [countdown, setCountdown] = useState(5);

    useEffect(() => {
        const interval = setInterval(() => {
            setCountdown(c => {
                if (c <= 1) {
                    clearInterval(interval);
                    return 0;
                }
                return c - 1;
            });
        }, 1000);

        return () => {
            clearInterval(interval);
        };
    }, []);

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/85 backdrop-blur-md animate-fadeIn p-4">
            <div className="gothic-card animate-modalPop w-full max-w-sm flex flex-col items-center justify-center text-center max-h-[85vh] shadow-[0_0_50px_rgba(0,0,0,0.9)]">
                <div className="text-white/30 text-[10px] tracking-[0.5em] mb-4">— KẾT QUẢ ĐÊM QUA —</div>

                {countdown > 0 ? (
                    <div className="flex flex-col items-center justify-center space-y-6 my-8">
                        <div className="wolf-loading" style={{ transform: 'scale(1.2)' }}></div>
                        <h2 className="font-display text-5xl text-white/80 animate-mysticPulse drop-shadow-lg" style={{ textShadow: '0 0 20px rgba(255,255,255,0.2)' }}>
                            {countdown}
                        </h2>
                        <p className="text-white/40 text-[10px] font-heading tracking-[0.3em]">
                            ĐANG TỔNG HỢP...
                        </p>
                    </div>
                ) : (
                    <div className="animate-fadeIn w-full flex flex-col items-center">
                        {deathMessages && deathMessages.length > 0 ? (
                            <>
                                <h3 className="font-heading text-lg text-red-400/90 mb-6 drop-shadow-md tracking-wider">NHỮNG NGƯỜI SAU ĐÃ CHẾT</h3>
                                <div className="space-y-3 mb-6 w-full px-4">
                                    {deathMessages.map((d, i) => (
                                        <div key={i} className="bg-red-950/20 border border-red-900/40 p-3 flex justify-center items-center rounded transition-transform duration-300 hover:scale-[1.02]">
                                            <span className="text-white/90 font-heading text-sm tracking-wider drop-shadow">💀 {d.playerName}</span>
                                        </div>
                                    ))}
                                </div>
                            </>
                        ) : (
                            <div className="my-8">
                                <div className="text-amber-200/40 text-4xl mb-4 animate-float">🌅</div>
                                <h3 className="font-heading text-lg text-white/85 mb-2 tracking-wider drop-shadow">ĐÊM QUA BÌNH YÊN</h3>
                                <p className="text-white/40 text-xs" style={{ fontFamily: 'var(--font-body)' }}>
                                    Không có ai phải bỏ mạng.
                                </p>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export const DayExecutePopup = ({ executedPlayer, players }) => {
    const executedName = executedPlayer ? players.find(p => p.id === executedPlayer)?.name : null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/85 backdrop-blur-md animate-fadeIn p-4">
            <div className="gothic-card animate-modalPop w-full max-w-sm flex flex-col items-center justify-center text-center shadow-[0_0_50px_rgba(0,0,0,0.9)]">
                <div className="text-white/30 text-[10px] tracking-[0.5em] mb-4">— KẾT QUẢ BỎ PHIẾU —</div>

                <div className="my-6">
                    {executedPlayer ? (
                        <>
                            <div className="text-red-500/80 text-5xl mb-4 animate-mysticPulse">⚖️</div>
                            <h3 className="font-heading text-lg text-red-400/90 mb-2 tracking-wider drop-shadow-md">QUYẾT ĐỊNH TREO CỔ</h3>
                            <div className="bg-red-950/25 border border-red-900/60 p-4 mt-4 rounded shadow-[0_0_20px_rgba(225,29,72,0.2)]">
                                <span className="text-white/95 font-display text-xl tracking-widest drop-shadow">{executedName}</span>
                            </div>
                        </>
                    ) : (
                        <>
                            <div className="text-white/30 text-5xl mb-4">🕊️</div>
                            <h3 className="font-heading text-lg text-white/85 mb-2 tracking-wider">BẤT ĐỒNG QUAN ĐIỂM</h3>
                            <p className="text-white/40 text-xs px-4" style={{ fontFamily: 'var(--font-body)' }}>
                                Dân làng không thể thống nhất được phiếu bầu. Hôm nay không ai bị treo cổ.
                            </p>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};
