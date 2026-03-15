import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const api = axios.create({
    baseURL: API_BASE_URL,
    headers: { 'Content-Type': 'application/json' },
});

// Attach JWT token to every request
api.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// Handle 401 responses
api.interceptors.response.use(
    (response) => response,
    (error) => {
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
    list: (params) => api.get('/api/courses', { params }),
    get: (id) => api.get(`/api/courses/${id}`),
    create: (data) => api.post('/api/courses', data),
    update: (id, data) => api.put(`/api/courses/${id}`, data),
    delete: (id) => api.delete(`/api/courses/${id}`),
    enroll: (id) => api.post(`/api/courses/${id}/enroll`),
    getStudents: (id) => api.get(`/api/courses/${id}/students`),
    getMyCourses: () => api.get('/api/courses/enrolled/my-courses'),
};

// ─── Lectures ───────────────────────────────────────────
export const lecturesAPI = {
    getByCourse: (courseId) => api.get(`/api/lectures/course/${courseId}`),
    get: (id) => api.get(`/api/lectures/${id}`),
    create: (data) => api.post('/api/lectures', data),
    update: (id, data) => api.put(`/api/lectures/${id}`, data),
    delete: (id) => api.delete(`/api/lectures/${id}`),
    importYouTube: (data) => api.post('/api/lectures/youtube-import', data),
    getMaterials: (id) => api.get(`/api/lectures/${id}/materials`),
    getCourseMaterials: (courseId) => api.get(`/api/lectures/course/${courseId}/materials`),
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
    getHeatmap: (lectureId) => api.get(`/api/engagement/heatmap/${lectureId}`),
    getModelInfo: () => api.get('/api/engagement/model-info'),
};

// ─── Quizzes ────────────────────────────────────────────
export const quizzesAPI = {
    getByLecture: (lectureId) => api.get(`/api/quizzes/lecture/${lectureId}`),
    create: (data) => api.post('/api/quizzes', data),
    update: (id, data) => api.put(`/api/quizzes/${id}`, data),
    delete: (id) => api.delete(`/api/quizzes/${id}`),
    submitAttempt: (data) => api.post('/api/quizzes/attempt', data),
    getAttempts: (quizId) => api.get(`/api/quizzes/attempts/${quizId}`),
    generateAI: (data) => api.post('/api/quizzes/generate-ai', data),
};

// ─── Feedback ───────────────────────────────────────────
export const feedbackAPI = {
    submit: (data) => api.post('/api/feedback', data),
    getByLecture: (lectureId) => api.get(`/api/feedback/lecture/${lectureId}`),
    getCourseSummary: (courseId) => api.get(`/api/feedback/course/${courseId}`),
};

// ─── Notifications ──────────────────────────────────────
export const notificationsAPI = {
    list: (params) => api.get('/api/notifications', { params }),
    getUnreadCount: () => api.get('/api/notifications/unread-count'),
    markRead: (id) => api.put(`/api/notifications/${id}/read`),
    markAllRead: () => api.put('/api/notifications/read-all'),
    announce: (data) => api.post('/api/notifications/announce', data),
};

// ─── Analytics ──────────────────────────────────────────
export const analyticsAPI = {
    getTeachingScore: (courseId) => api.get(`/api/analytics/teaching-score/${courseId}`),
    getCourseDashboard: (courseId) => api.get(`/api/analytics/course-dashboard/${courseId}`),
    getLectureDashboard: (lectureId) => api.get(`/api/analytics/lecture-dashboard/${lectureId}`),
    getStudentDashboard: () => api.get('/api/analytics/student-dashboard'),
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
    getActivityHistory: () => api.get('/api/users/activity-history'),
    getEngagementHistory: () => api.get('/api/users/engagement-history'),
    getFeedbackHistory: () => api.get('/api/users/feedback-history'),
    exportData: () => api.get('/api/users/export-data'),
};

// ─── Gamification ───────────────────────────────────────
export const gamificationAPI = {
    getProfile: () => api.get('/api/gamification/profile'),
    awardPoints: (activity, amount) => api.post(`/api/gamification/award-points?activity=${activity}&amount=${amount}`),
    getLeaderboard: () => api.get('/api/gamification/leaderboard'),
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
    getConversations: () => api.get('/api/messages/conversations'),
    getWith: (userId, params) => api.get(`/api/messages/with/${userId}`, { params }),
    getUnreadCount: () => api.get('/api/messages/unread-count'),
    markRead: (id) => api.put(`/api/messages/${id}/read`),
    getStudentAnalytics: (studentId, courseId) => api.get(`/api/messages/student-analytics/${studentId}`, { params: { course_id: courseId } }),
    bulkSend: (data) => api.post('/api/messages/bulk-send', data),
    getAtRiskStudents: (courseId) => api.get(`/api/messages/at-risk-students/${courseId}`),
};

// ─── Tutor ──────────────────────────────────────────────
export const tutorAPI = {
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
