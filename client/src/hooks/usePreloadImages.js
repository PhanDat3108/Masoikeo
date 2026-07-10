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

        // Timeout: nếu sau 30 giây ảnh chưa load xong, bỏ qua để không kẹt loading
        const timeout = setTimeout(() => {
            if (!cancelled) {
                setImagesLoaded(true);
            }
        }, 30000);

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

    return imagesLoaded;
};
