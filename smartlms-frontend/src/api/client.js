import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
const GET_CACHE = new Map();
const DEFAULT_CACHE_TTL = 30 * 1000;

const serializeParams = (params) => {
    if (!params) return '';
    const entries = Object.entries(params)
        .filter(([, value]) => value !== undefined && value !== null)
        .sort(([a], [b]) => a.localeCompare(b));
    return entries.map(([k, v]) => `${k}=${Array.isArray(v) ? v.join(',') : String(v)}`).join('&');
};

const cacheKeyForGet = (url, config = {}) => `${url}?${serializeParams(config.params)}`;

const clearGetCache = () => {
    GET_CACHE.clear();
};

const dispatchLoadingStart = () => {
    if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('app:loading:start'));
    }
};

const dispatchLoadingEnd = () => {
    if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('app:loading:end'));
    }
};

const api = axios.create({
    baseURL: API_BASE_URL,
    headers: { 'Content-Type': 'application/json' },
});

const cachedGet = (url, config = {}, ttl = DEFAULT_CACHE_TTL) => {
    const skipCache = config?.meta?.skipCache;
    const key = cacheKeyForGet(url, config);

    if (!skipCache) {
        const cached = GET_CACHE.get(key);
        if (cached && cached.expiresAt > Date.now()) {
            return Promise.resolve(cached.response);
        }
    }

    return api.get(url, config).then((response) => {
        if (!skipCache) {
            GET_CACHE.set(key, {
                expiresAt: Date.now() + ttl,
                response,
            });
        }
        return response;
    });
};

// Attach JWT token to every request
api.interceptors.request.use((config) => {
    dispatchLoadingStart();
    const token = localStorage.getItem('token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    if (config.method && ['post', 'put', 'patch', 'delete'].includes(config.method.toLowerCase())) {
        clearGetCache();
    }
    return config;
});

// Handle 401 responses
api.interceptors.response.use(
    (response) => {
        dispatchLoadingEnd();
        return response;
    },
    (error) => {
        dispatchLoadingEnd();
        if (error.response?.status === 401) {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            if (window.location.pathname !== '/login') {
                window.location.href = '/login';
            }
        }
        return Promise.reject(error);
    }
);

// ─── Auth ───────────────────────────────────────────────
export const authAPI = {
    register: (data) => api.post('/api/auth/register', data),
    login: (data) => api.post('/api/auth/login', data),
    getProfile: () => api.get('/api/auth/me'),
    updateProfile: (data) => api.put('/api/auth/me', data),
    changePassword: (data) => api.post('/api/auth/change-password', data),
};

// ─── Courses ────────────────────────────────────────────
export const coursesAPI = {
    list: (params) => cachedGet('/api/courses', { params }),
    get: (id) => cachedGet(`/api/courses/${id}`),
    create: (data) => api.post('/api/courses', data),
    update: (id, data) => api.put(`/api/courses/${id}`, data),
    delete: (id) => api.delete(`/api/courses/${id}`),
    enroll: (id) => api.post(`/api/courses/${id}/enroll`),
    getStudents: (id) => api.get(`/api/courses/${id}/students`),
    getMyCourses: () => cachedGet('/api/courses/enrolled/my-courses'),
};

// ─── Lectures ───────────────────────────────────────────
export const lecturesAPI = {
    getByCourse: (courseId) => cachedGet(`/api/lectures/course/${courseId}`),
    get: (id) => cachedGet(`/api/lectures/${id}`),
    create: (data) => api.post('/api/lectures', data),
    update: (id, data) => api.put(`/api/lectures/${id}`, data),
    uploadVideo: (lectureId, formData) => api.post(`/api/lectures/${lectureId}/upload-video`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
    }),
    delete: (id) => api.delete(`/api/lectures/${id}`),
    importYouTube: (data) => api.post('/api/lectures/youtube-import', data),
    getMaterials: (id) => cachedGet(`/api/lectures/${id}/materials`),
    getCourseMaterials: (courseId) => cachedGet(`/api/lectures/course/${courseId}/materials`),
    addMaterial: (data) => api.post('/api/lectures/materials', data, {
        headers: { 'Content-Type': 'multipart/form-data' },
    }),
    deleteMaterial: (id) => api.delete(`/api/lectures/materials/${id}`),
};

// ─── Engagement ─────────────────────────────────────────
export const engagementAPI = {
    submit: (data) => api.post('/api/engagement/submit', data),
    getHistory: (lectureId) => api.get(`/api/engagement/history/${lectureId}`),
    getStudentSummary: (studentId) => api.get(`/api/engagement/student-summary/${studentId}`),
    getHeatmap: (lectureId, params) => api.get(`/api/engagement/heatmap/${lectureId}`, { params }),
    getMyHeatmap: (lectureId) => api.get(`/api/engagement/heatmap/${lectureId}/me`),
    getLiveWatchers: (lectureId, params) => api.get(`/api/engagement/live-watchers/${lectureId}`, { params }),
    getModelInfo: () => api.get('/api/engagement/model-info'),
    listModels: () => api.get('/api/engagement/models'),
    // High timeout for free-tier model swapping/loading
    inferModel: (data) => api.post('/api/engagement/models/infer', data, { timeout: 60000 }),
};

// ─── Quizzes ────────────────────────────────────────────
export const quizzesAPI = {
    getByLecture: (lectureId) => cachedGet(`/api/quizzes/lecture/${lectureId}`),
    getMine: () => cachedGet('/api/quizzes/mine'),
    create: (data) => api.post('/api/quizzes', data),
    update: (id, data) => api.put(`/api/quizzes/${id}`, data),
    delete: (id) => api.delete(`/api/quizzes/${id}`),
    submitAttempt: (data) => api.post('/api/quizzes/attempt', data),
    getAttempts: (quizId) => api.get(`/api/quizzes/attempts/${quizId}`),
    generateAI: (data) => api.post('/api/quizzes/generate-ai', data),
    refineAI: (data) => api.post('/api/quizzes/generate-ai-refine', data),
};

// ─── Feedback ───────────────────────────────────────────
export const feedbackAPI = {
    submit: (data) => api.post('/api/feedback', data),
    getByLecture: (lectureId) => api.get(`/api/feedback/lecture/${lectureId}`),
    getCourseSummary: (courseId) => api.get(`/api/feedback/course/${courseId}`),
};

// ─── Notifications ──────────────────────────────────────
export const notificationsAPI = {
    list: (params) => cachedGet('/api/notifications', { params }, 10 * 1000),
    getUnreadCount: () => cachedGet('/api/notifications/unread-count', {}, 10 * 1000),
    markRead: (id) => api.put(`/api/notifications/${id}/read`),
    markAllRead: () => api.put('/api/notifications/read-all'),
    announce: (data) => api.post('/api/notifications/announce', data),
};

// ─── Analytics ──────────────────────────────────────────
export const analyticsAPI = {
    getTeachingScore: (courseId) => cachedGet(`/api/analytics/teaching-score/${courseId}`),
    getCourseDashboard: (courseId) => cachedGet(`/api/analytics/course-dashboard/${courseId}`),
    getLectureDashboard: (lectureId) => cachedGet(`/api/analytics/lecture-dashboard/${lectureId}`),
    getStudentDashboard: () => cachedGet('/api/analytics/student-dashboard'),
    getStudentEngagementHistory: (limit = 120) => cachedGet('/api/analytics/student-engagement-history', { params: { limit } }),
};

// ─── Admin ──────────────────────────────────────────────
export const adminAPI = {
    listTeachers: () => api.get('/api/admin/teachers'),
    getTeacher: (id) => api.get(`/api/admin/teacher/${id}`),
    listUsers: (params) => api.get('/api/admin/users', { params }),
    toggleUserActive: (id) => api.put(`/api/admin/users/${id}/toggle-active`),
    deleteUser: (id) => api.delete(`/api/admin/users/${id}`),
    deleteCourse: (id) => api.delete(`/api/admin/courses/${id}`),
    getSystemStats: () => api.get('/api/admin/system-stats'),
};

// ─── Users ──────────────────────────────────────────────
export const usersAPI = {
    getActivityHistory: () => cachedGet('/api/users/activity-history'),
    getEngagementHistory: () => cachedGet('/api/users/engagement-history'),
    getFeedbackHistory: () => cachedGet('/api/users/feedback-history'),
    exportData: () => cachedGet('/api/users/export-data'),
};

// ─── Gamification ───────────────────────────────────────
export const gamificationAPI = {
    getProfile: () => cachedGet('/api/gamification/profile', {}, 15 * 1000),
    awardPoints: (activity, amount) => api.post(`/api/gamification/award-points?activity=${activity}&amount=${amount}`),
    getLeaderboard: () => cachedGet('/api/gamification/leaderboard', {}, 15 * 1000),
};

// ─── Assignments ────────────────────────────────────────
export const assignmentsAPI = {
    getByCourse: (courseId) => api.get(`/api/assignments/course/${courseId}`),
    create: (data) => api.post('/api/assignments', data),
    submit: (data) => api.post('/api/assignments/submit', data),
    getSubmissions: (id) => api.get(`/api/assignments/${id}/submissions`),
    grade: (submissionId, data) => api.put(`/api/assignments/submissions/${submissionId}/grade`, data),
};

// ─── Messages ───────────────────────────────────────────
export const messagesAPI = {
    send: (data) => api.post('/api/messages', data),
    getConversations: () => cachedGet('/api/messages/conversations', {}, 10 * 1000),
    getWith: (userId, params) => api.get(`/api/messages/with/${userId}`, { params }),
    getUnreadCount: () => cachedGet('/api/messages/unread-count', {}, 10 * 1000),
    search: (params) => api.get('/api/messages/search', { params }),
    markRead: (id) => api.put(`/api/messages/${id}/read`),
    getStudentAnalytics: (studentId, courseId) => api.get(`/api/messages/student-analytics/${studentId}`, { params: { course_id: courseId } }),
    bulkSend: (data) => api.post('/api/messages/bulk-send', data),
    getAtRiskStudents: (courseId) => api.get(`/api/messages/at-risk-students/${courseId}`),
};

// ─── Tutor ──────────────────────────────────────────────
export const tutorAPI = {
    getSessions: () => api.get('/api/tutor/sessions'),
    createSession: (data) => api.post(`/api/tutor/sessions?title=${encodeURIComponent(data.title)}&mode=${encodeURIComponent(data.mode)}`),
    getSessionMessages: (id) => api.get(`/api/tutor/sessions/${id}/messages`),
    deleteSession: (id) => api.delete(`/api/tutor/sessions/${id}`),
    chat: async (data, onChunk) => {
        const response = await fetch(`${API_BASE_URL}/api/tutor/chat`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify(data)
        });

        if (!response.ok) throw new Error('Chat failed');

        const reader = response.body.getReader();
        const decoder = new TextDecoder('utf-8');
        let fullText = '';

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            const chunk = decoder.decode(value, { stream: true });
            fullText += chunk;
            if (onChunk) onChunk(fullText);
        }
        return fullText;
    }
};

export default api;
