/*
 * ActivityTracker - Comprehensive user activity tracking
 * Tracks: session time, page views, time-on-page, interactions, idle detection
 * Batches events and submits every 60s + on logout/tab close
 */
import { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from './AuthContext';
import api from '../api/client';

const ActivityContext = createContext(null);

const IDLE_TIMEOUT = 5 * 60 * 1000; // 5 minutes
const HEARTBEAT_INTERVAL = 60 * 1000; // 60 seconds
const PAGE_NAMES = {
    '/': 'Landing',
    '/login': 'Login',
    '/register': 'Register',
    '/dashboard': 'Dashboard',
    '/my-courses': 'My Courses',
    '/my-analytics': 'My Analytics',
    '/profile': 'Profile',
    '/manage-courses': 'Manage Courses',
    '/teaching-dashboard': 'Teaching Dashboard',
    '/admin/users': 'User Management',
    '/admin/teachers': 'Teacher Overview',
};

function getPageName(pathname) {
    if (PAGE_NAMES[pathname]) return PAGE_NAMES[pathname];
    if (pathname.startsWith('/courses/')) return 'Course Detail';
    if (pathname.startsWith('/lectures/')) return 'Lecture Player';
    if (pathname.startsWith('/manage-courses/')) return 'Edit Course';
    return pathname;
}

export function ActivityProvider({ children }) {
    const { user, token } = useAuth();
    const location = useLocation();
    const [sessionId] = useState(`sess_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`);
    const sessionStart = useRef(Date.now());
    const activeTime = useRef(0);
    const lastActiveTs = useRef(Date.now());
    const isIdle = useRef(false);
    const eventBuffer = useRef([]);
    const currentPage = useRef({ path: '', enterTime: 0 });
    const pageViews = useRef([]);
    const heartbeatTimer = useRef(null);
    const idleTimer = useRef(null);

    // ── Track page views ──────────────────────────────
    useEffect(() => {
        if (!user) return;

        const now = Date.now();
        // Log time on previous page
        if (currentPage.current.path) {
            const timeOnPage = Math.round((now - currentPage.current.enterTime) / 1000);
            const pv = {
                page: currentPage.current.path,
                page_name: getPageName(currentPage.current.path),
                time_on_page: timeOnPage,
                entered_at: new Date(currentPage.current.enterTime).toISOString(),
                left_at: new Date(now).toISOString(),
            };
            pageViews.current.push(pv);
            pushEvent('page_view', pv);
        }

        // Start new page
        currentPage.current = { path: location.pathname, enterTime: now };
    }, [location.pathname, user]);

    // ── Idle detection ────────────────────────────────
    const resetIdleTimer = useCallback(() => {
        if (!user) return;
        const now = Date.now();

        if (isIdle.current) {
            // Was idle, now active again
            pushEvent('idle_end', { idle_duration: Math.round((now - lastActiveTs.current) / 1000) });
            isIdle.current = false;
        }

        lastActiveTs.current = now;
        activeTime.current += 1; // Approximate: add 1s for each activity event

        clearTimeout(idleTimer.current);
        idleTimer.current = setTimeout(() => {
            isIdle.current = true;
            pushEvent('idle_start', { after_seconds: IDLE_TIMEOUT / 1000 });
        }, IDLE_TIMEOUT);
    }, [user]);

    useEffect(() => {
        if (!user) return;

        const events = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'];
        // Throttle to 1 event per second
        let lastReset = 0;
        const handler = () => {
            const now = Date.now();
            if (now - lastReset > 1000) {
                lastReset = now;
                resetIdleTimer();
            }
        };

        events.forEach(e => window.addEventListener(e, handler, { passive: true }));
        return () => events.forEach(e => window.removeEventListener(e, handler));
    }, [user, resetIdleTimer]);

    // ── Tab visibility tracking ───────────────────────
    useEffect(() => {
        if (!user) return;
        const handler = () => {
            pushEvent(document.hidden ? 'tab_hidden' : 'tab_visible', {
                timestamp: new Date().toISOString(),
            });
        };
        document.addEventListener('visibilitychange', handler);
        return () => document.removeEventListener('visibilitychange', handler);
    }, [user]);

    // ── Heartbeat: submit buffered events ─────────────
    useEffect(() => {
        if (!user || !token) return;

        heartbeatTimer.current = setInterval(() => {
            submitEvents();
        }, HEARTBEAT_INTERVAL);

        return () => clearInterval(heartbeatTimer.current);
    }, [user, token]);

    // ── Session end on unmount / tab close ────────────
    useEffect(() => {
        if (!user) return;

        pushEvent('session_start', {
            device: navigator.userAgent,
            screen: `${window.screen.width}x${window.screen.height}`,
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        });

        const handleUnload = () => {
            const sessionDuration = Math.round((Date.now() - sessionStart.current) / 1000);
            const payload = {
                session_id: sessionId,
                duration: sessionDuration,
                page_views: pageViews.current,
                events: eventBuffer.current,
            };
            // Use sendBeacon for reliable delivery on tab close
            navigator.sendBeacon(
                '/api/activity/session-end',
                new Blob([JSON.stringify(payload)], { type: 'application/json' })
            );
        };

        window.addEventListener('beforeunload', handleUnload);
        return () => {
            handleUnload();
            window.removeEventListener('beforeunload', handleUnload);
        };
    }, [user]);

    // ── Push event to buffer ──────────────────────────
    function pushEvent(action, details = {}) {
        eventBuffer.current.push({
            action,
            details,
            timestamp: new Date().toISOString(),
            page: location.pathname,
            session_id: sessionId,
        });
    }

    // ── Submit buffered events ────────────────────────
    async function submitEvents() {
        if (eventBuffer.current.length === 0 || !token) return;

        const events = [...eventBuffer.current];
        eventBuffer.current = [];

        try {
            await api.post('/api/activity/batch', {
                session_id: sessionId,
                events,
                session_duration: Math.round((Date.now() - sessionStart.current) / 1000),
            });
        } catch {
            // Put events back on failure
            eventBuffer.current = [...events, ...eventBuffer.current];
        }
    }

    // ── Public tracking methods ───────────────────────
    const trackClick = useCallback((element, details = {}) => {
        pushEvent('click', { element, ...details });
    }, []);

    const trackSearch = useCallback((query) => {
        pushEvent('search', { query });
    }, []);

    const trackDownload = useCallback((fileName, fileType) => {
        pushEvent('download', { file_name: fileName, file_type: fileType });
    }, []);

    const trackCustom = useCallback((action, details = {}) => {
        pushEvent(action, details);
    }, []);

    // Alias for backward compat — many pages call trackEvent(action, details)
    const trackEvent = useCallback((action, details = {}) => {
        pushEvent(action, details);
    }, []);

    // ── Session info for display ──────────────────────
    const getSessionDuration = useCallback(() => {
        return Math.round((Date.now() - sessionStart.current) / 1000);
    }, []);

    return (
        <ActivityContext.Provider value={{
            sessionId,
            trackClick,
            trackSearch,
            trackDownload,
            trackCustom,
            trackEvent,
            getSessionDuration,
            isIdle: isIdle.current,
        }}>
            {children}
        </ActivityContext.Provider>
    );
}

export function useActivity() {
    const context = useContext(ActivityContext);
    return context || {};
}
