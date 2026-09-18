import { useEffect, useState, useRef } from 'react';

export const usePreloadImages = (imageUrls) => {
    const [imagesLoaded, setImagesLoaded] = useState(false);
    // Dùng ref để tránh tạo mảng mới mỗi render gây re-run useEffect
    const urlsRef = useRef(imageUrls);

    useEffect(() => {
        const urls = urlsRef.current;
        if (!urls || urls.length === 0) {
            setImagesLoaded(true);
            return;
        }

        const validUrls = urls.filter(url => url && url.trim());

        if (validUrls.length === 0) {
            setImagesLoaded(true);
            return;
        }

        let loadedCount = 0;
        let cancelled = false;
        const total = validUrls.length;

        // Timeout: tối đa 2.5s, nếu mạng chậm/ảnh lỗi thì bỏ qua luôn để vào app
        const timeout = setTimeout(() => {
            if (!cancelled) {
                setImagesLoaded(true);
            }
        }, 2500);

        validUrls.forEach((url) => {
            const img = new Image();
            img.src = url;
            const onDone = () => {
                loadedCount++;
                if (loadedCount === total && !cancelled) {
                    clearTimeout(timeout);
                    setImagesLoaded(true);
                }
            };
            img.onload = onDone;
            img.onerror = onDone; // Lỗi cũng coi như xong
        });

        return () => {
            cancelled = true;
            clearTimeout(timeout);
        };
    }, []); // Chạy 1 lần duy nhất

    const skipPreload = () => setImagesLoaded(true);

    return [imagesLoaded, skipPreload];
};
