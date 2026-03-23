import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';

export default function GlobalProgressBar() {
    const location = useLocation();
    const [activeRequests, setActiveRequests] = useState(0);
    const [routeLoading, setRouteLoading] = useState(false);
    const [visible, setVisible] = useState(false);
    const [progress, setProgress] = useState(0);
    const intervalRef = useRef(null);

    useEffect(() => {
        const onStart = () => setActiveRequests((v) => v + 1);
        const onEnd = () => setActiveRequests((v) => Math.max(0, v - 1));

        window.addEventListener('app:loading:start', onStart);
        window.addEventListener('app:loading:end', onEnd);
        return () => {
            window.removeEventListener('app:loading:start', onStart);
            window.removeEventListener('app:loading:end', onEnd);
        };
    }, []);

    useEffect(() => {
        setRouteLoading(true);
        const t = setTimeout(() => setRouteLoading(false), 350);
        return () => clearTimeout(t);
    }, [location.pathname, location.search]);

    const isLoading = routeLoading || activeRequests > 0;

    useEffect(() => {
        if (isLoading) {
            setVisible(true);
            setProgress((p) => (p < 12 ? 12 : p));
            if (intervalRef.current) clearInterval(intervalRef.current);
            intervalRef.current = setInterval(() => {
                setProgress((p) => {
                    if (p >= 88) return p;
                    const next = p + (p < 40 ? 9 : p < 70 ? 5 : 2);
                    return Math.min(next, 88);
                });
            }, 180);
            return;
        }

        if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
        }

        setProgress(100);
        const hideTimer = setTimeout(() => {
            setVisible(false);
            setProgress(0);
        }, 260);

        return () => clearTimeout(hideTimer);
    }, [isLoading]);

    return (
        <div
            className={`fixed top-0 left-0 right-0 z-70 h-1.5 pointer-events-none transition-opacity duration-200 ${visible ? 'opacity-100' : 'opacity-0'}`}
            aria-hidden="true"
        >
            <div
                className="h-full bg-linear-to-r from-primary via-accent to-primary-light shadow-[0_0_18px_rgba(31,122,140,0.55)] transition-[width] duration-180 ease-out"
                style={{ width: `${progress}%` }}
            />
        </div>
    );
}
