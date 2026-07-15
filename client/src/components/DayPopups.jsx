import React, { useState, useEffect } from 'react';

// =============================================
// POPUPS TỔNG KẾT
// =============================================

export const DayAnnouncePopup = ({ deathMessages }) => {
    const [countdown, setCountdown] = useState(5);

    useEffect(() => {
        let isMounted = true;
        import('../App.jsx').then(({ audioRefs }) => {
            if (isMounted && audioRefs.ticking) {
                audioRefs.ticking.volume = 1;
                audioRefs.ticking.play().catch(() => { });
            }
        });

        const interval = setInterval(() => {
            setCountdown(c => {
                if (c <= 1) {
                    clearInterval(interval);
                    import('../App.jsx').then(({ audioRefs }) => {
                        if (audioRefs.ticking) {
                            audioRefs.ticking.pause();
                            audioRefs.ticking.currentTime = 0;
                        }
                    });
                    return 0;
                }
                return c - 1;
            });
        }, 1000);

        return () => {
            isMounted = false;
            clearInterval(interval);
            import('../App.jsx').then(({ audioRefs }) => {
                if (audioRefs.ticking) {
                    audioRefs.ticking.pause();
                    audioRefs.ticking.currentTime = 0;
                }
            });
        };
    }, []);

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 backdrop-blur-sm animate-fadeIn p-4">
            <div className="gothic-card w-full max-w-sm flex flex-col items-center justify-center text-center max-h-[85vh]">
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
                                        <div key={i} className="bg-[#111] border border-red-900/30 p-3 flex justify-center items-center" style={{ borderRadius: '2px' }}>
                                            <span className="text-white/80 font-heading text-sm tracking-wider"> {d.playerName}</span>
                                        </div>
                                    ))}
                                </div>
                            </>
                        ) : (
                            <div className="my-8">
                                <div className="text-white/20 text-4xl mb-4 animate-float"></div>
                                <h3 className="font-heading text-lg text-white/80 mb-2 tracking-wider">ĐÊM QUA BÌNH YÊN</h3>
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
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 backdrop-blur-sm animate-fadeIn p-4">
            <div className="gothic-card w-full max-w-sm flex flex-col items-center justify-center text-center">
                <div className="text-white/30 text-[10px] tracking-[0.5em] mb-4">— KẾT QUẢ BỎ PHIẾU —</div>

                <div className="my-6">
                    {executedPlayer ? (
                        <>
                            <div className="text-red-500/80 text-5xl mb-4 animate-mysticPulse"></div>
                            <h3 className="font-heading text-lg text-red-400/90 mb-2 tracking-wider drop-shadow-md">QUYẾT ĐỊNH TREO CỔ</h3>
                            <div className="bg-[#111] border border-red-900/50 p-4 mt-4" style={{ borderRadius: '2px' }}>
                                <span className="text-white/90 font-display text-xl tracking-widest">{executedName}</span>
                            </div>
                        </>
                    ) : (
                        <>
                            <div className="text-white/20 text-5xl mb-4"></div>
                            <h3 className="font-heading text-lg text-white/80 mb-2 tracking-wider">BẤT ĐỒNG QUAN ĐIỂM</h3>
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
