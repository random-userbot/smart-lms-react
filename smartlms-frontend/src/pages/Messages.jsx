import { useState, useEffect, useRef } from 'react';
import { messagesAPI } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useActivity } from '../context/ActivityTracker';
import {
    MessageSquare, Send, ChevronLeft, Search, AlertTriangle,
    BookOpen, Award, TrendingDown, User, Clock, CheckCheck, Check, Sparkles
} from 'lucide-react';

const CATEGORY_COLORS = {
    advice: { bg: 'bg-info-light', text: 'text-info', border: 'border-info/20', icon: BookOpen },
    encouragement: { bg: 'bg-success-light', text: 'text-success', border: 'border-success/20', icon: Award },
    warning: { bg: 'bg-warning-light', text: 'text-warning', border: 'border-warning/20', icon: AlertTriangle },
    engagement_alert: { bg: 'bg-danger-light', text: 'text-danger', border: 'border-danger/20', icon: TrendingDown },
    general: { bg: 'bg-surface-elevated', text: 'text-text-secondary', border: 'border-border', icon: MessageSquare },
};

export default function Messages() {
    const { user } = useAuth();
    const { trackEvent } = useActivity();
    const [conversations, setConversations] = useState([]);
    const [selectedUser, setSelectedUser] = useState(null);
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const messagesEndRef = useRef(null);

    useEffect(() => {
        loadConversations();
        trackEvent?.('messages_viewed');
    }, []);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const loadConversations = async () => {
        try {
            const res = await messagesAPI.getConversations();
            setConversations(res.data);
        } catch { }
        setLoading(false);
    };

    const selectConversation = async (otherUserId) => {
        try {
            const res = await messagesAPI.getWith(otherUserId);
            setMessages(res.data.messages);
            setSelectedUser(res.data.other_user);
            // Refresh conversation list to update unread counts
            loadConversations();
        } catch { }
    };

    const handleSend = async () => {
        if (!newMessage.trim() || !selectedUser || sending) return;
        setSending(true);
        try {
            await messagesAPI.send({
                receiver_id: selectedUser.id,
                content: newMessage.trim(),
            });
            setNewMessage('');
            // Reload messages
            selectConversation(selectedUser.id);
            trackEvent?.('message_sent', { to: selectedUser.id });
        } catch (err) { 
            console.error("Failed to send message:", err);
            // Optionally, add a toast error here
        } finally {
            setSending(false);
        }
    };

    const filteredConversations = conversations.filter(c =>
        c.other_user_name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (loading) return (
        <div className="min-h-[50vh] flex items-center justify-center">
            <div className="w-12 h-12 border-4 border-accent-light border-t-accent rounded-full animate-spin" />
        </div>
    );

    return (
        <div className="w-full mx-auto px-6 lg:px-10 py-12 animate-in fade-in">
            <h1 className="text-4xl md:text-5xl font-black text-text tracking-tight mb-8 border-l-8 border-accent pl-6 flex items-center gap-4 py-2">
                <MessageSquare className="text-accent" size={40} />
                Messages
            </h1>

            <div className="bg-surface rounded-3xl shadow-sm border border-border overflow-hidden h-[calc(100vh-220px)] flex">
                {/* Conversation List */}
                <div className={`${selectedUser ? 'hidden md:flex' : 'flex'} flex-col w-full md:w-96 lg:w-[450px] border-r border-border bg-surface-alt`}>
                    <div className="p-6 border-b border-border bg-surface">
                        <div className="relative group">
                            <Search size={20} className="absolute left-5 top-1/2 -translate-y-1/2 text-text-muted group-focus-within:text-accent transition-colors" />
                            <input
                                type="text"
                                placeholder="Search conversations..."
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                className="w-full pl-14 pr-5 py-4 text-base font-medium border border-border rounded-2xl focus:ring-4 focus:ring-accent/20 focus:border-accent bg-surface-elevated shadow-sm outline-none transition-all placeholder-text-muted text-text"
                            />
                        </div>
                    </div>
                    <div className="flex-1 overflow-y-auto scrollbar-hide">
                        {filteredConversations.length === 0 ? (
                            <div className="p-12 text-center text-text-muted">
                                <MessageSquare size={64} className="mx-auto mb-4 opacity-30" strokeWidth={1} />
                                <p className="text-xl font-black text-text tracking-tight">No conversations yet</p>
                                <p className="text-base font-medium mt-1">Messages will appear here</p>
                            </div>
                        ) : filteredConversations.map(conv => (
                            <div
                                key={conv.other_user_id}
                                onClick={() => selectConversation(conv.other_user_id)}
                                className={`p-6 cursor-pointer transition-all border-b border-border hover:bg-surface ${selectedUser?.id === conv.other_user_id ? 'bg-surface border-l-[6px] border-l-accent' : 'border-l-[6px] border-l-transparent'}`}
                            >
                                <div className="flex items-start justify-between gap-4">
                                    <div className="flex-1 min-w-0 pr-3">
                                        <div className="flex items-center gap-2 mb-1 w-full">
                                            <span className="font-bold text-lg text-text truncate">{conv.other_user_name}</span>
                                            <span className={`flex-shrink-0 text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-md ${conv.other_user_role === 'teacher' ? 'bg-accent-light text-accent' : 'bg-success-light text-success'}`}>
                                                {conv.other_user_role}
                                            </span>
                                        </div>
                                        {conv.course_title && (
                                            <div className="text-xs text-accent font-bold mt-1 mb-2 flex items-center gap-1.5 bg-accent-light/50 w-fit px-2 py-0.5 rounded-md">
                                                <BookOpen size={12} />
                                                {conv.course_title}
                                            </div>
                                        )}
                                        <p className={`text-base truncate mt-1 ${conv.unread_count > 0 ? 'text-text font-bold' : 'text-text-secondary font-medium'}`}>{conv.last_message}</p>
                                    </div>
                                    <div className="flex flex-col items-end gap-2 shrink-0 pl-2">
                                        <span className="text-xs font-bold text-text-muted uppercase tracking-widest whitespace-nowrap">
                                            {new Date(conv.last_message_at).toLocaleDateString()}
                                        </span>
                                        {conv.unread_count > 0 && (
                                            <span className="bg-danger text-white text-xs font-black px-2.5 py-1 rounded-full min-w-[24px] text-center shadow-sm">
                                                {conv.unread_count}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Message Thread */}
                <div className={`${selectedUser ? 'flex' : 'hidden md:flex'} flex-1 flex-col bg-surface`}>
                    {!selectedUser ? (
                        <div className="flex-1 flex flex-col items-center justify-center text-text-muted bg-surface-alt/50">
                            <div className="p-8 bg-surface rounded-full shadow-sm border border-border mb-6"><MessageSquare size={80} strokeWidth={1} /></div>
                            <p className="font-black text-2xl text-text tracking-tight shadow-none border-0">Select a conversation</p>
                            <p className="text-lg font-medium mt-2">Choose a conversation from the list to view messages</p>
                        </div>
                    ) : (
                        <>
                            {/* Header */}
                            <div className="p-6 md:px-8 border-b border-border flex items-center gap-4 bg-surface shadow-sm z-10">
                                <button
                                    onClick={() => setSelectedUser(null)}
                                    className="md:hidden p-3 hover:bg-surface-elevated rounded-xl transition-colors border border-border"
                                >
                                    <ChevronLeft size={24} className="text-text-secondary"/>
                                </button>
                                <div className="w-14 h-14 rounded-2xl bg-accent-light border border-accent/20 flex items-center justify-center shadow-inner">
                                    <User size={24} className="text-accent" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="font-black text-xl text-text truncate">{selectedUser.name}</div>
                                    <span className={`text-xs font-black uppercase tracking-widest mt-0.5 inline-block ${selectedUser.role === 'teacher' ? 'text-accent' : 'text-success'}`}>
                                        {selectedUser.role}
                                    </span>
                                </div>
                            </div>

                            {/* Messages */}
                            <div className="flex-1 overflow-y-auto px-6 py-8 md:px-10 space-y-6 bg-surface-alt/50">
                                {messages.map((msg, index) => {
                                    const isMine = msg.sender_id === user?.id;
                                    const catStyle = CATEGORY_COLORS[msg.category] || CATEGORY_COLORS.general;
                                    const CatIcon = catStyle.icon;

                                    const prevMsg = messages[index - 1];
                                    const showTimeList = !prevMsg || new Date(msg.created_at) - new Date(prevMsg.created_at) > 15 * 60 * 1000;

                                    return (
                                        <div key={msg.id} className={`flex flex-col ${isMine ? 'items-end' : 'items-start'}`}>
                                            {showTimeList && (
                                                <div className="w-full flex justify-center mb-6 mt-4">
                                                    <span className="text-[10px] font-black uppercase tracking-widest text-text-muted bg-surface border border-border px-3 py-1 rounded-full">
                                                        {new Date(msg.created_at).toLocaleDateString(undefined, { weekday: 'long', hour: '2-digit', minute: '2-digit' })}
                                                    </span>
                                                </div>
                                            )}
                                            <div className={`max-w-[90%] md:max-w-[75%] lg:max-w-[65%] flex flex-col ${isMine ? 'items-end' : 'items-start'}`}>
                                                {/* Category badge for non-general messages */}
                                                {msg.category !== 'general' && !isMine && (
                                                    <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-black uppercase tracking-wider mb-2 border shadow-sm ${catStyle.bg} ${catStyle.text} ${catStyle.border}`}>
                                                        <CatIcon size={14} />
                                                        {msg.category.replace('_', ' ')}
                                                    </div>
                                                )}
                                                {msg.subject && !isMine && (
                                                    <div className="text-sm font-black text-text-secondary mb-2 flex items-center gap-2 max-w-full">
                                                        <Sparkles size={14} className="text-warning shrink-0" />
                                                        <span className="truncate">{msg.subject}</span>
                                                    </div>
                                                )}
                                                <div className={`px-5 py-4 rounded-2xl shadow-sm border w-full ${isMine
                                                    ? 'bg-accent text-white rounded-br-sm border-accent shadow-accent/20'
                                                    : 'bg-surface text-text rounded-bl-sm border-border'
                                                    }`}>
                                                    <p className="text-base font-medium whitespace-pre-wrap break-words leading-relaxed">{msg.content}</p>
                                                    
                                                    {/* Analytics context card */}
                                                    {msg.analytics_context && !isMine && (
                                                        <div className="mt-4 p-3 bg-surface-alt rounded-xl text-xs text-text-secondary font-black border border-border uppercase tracking-widest flex flex-wrap gap-4 w-full">
                                                            {msg.analytics_context.engagement_score != null && (
                                                                <span className="flex items-center gap-1.5"><TrendingDown size={14} className="opacity-50"/> Engagement: <span className="text-text">{msg.analytics_context.engagement_score}%</span></span>
                                                            )}
                                                            {msg.analytics_context.icap_level && (
                                                                <span className="flex items-center gap-1.5"><BookOpen size={14} className="opacity-50"/> ICAP: <span className="text-text">{msg.analytics_context.icap_level}</span></span>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>

                                                <div className={`flex items-center gap-1.5 mt-2 text-xs font-black uppercase tracking-widest text-text-muted`}>
                                                    <Clock size={12} className="opacity-70"/>
                                                    {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                    {isMine && (msg.is_read ? <CheckCheck size={14} className="text-success ml-1" /> : <Check size={14} className="ml-1" />)}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                                <div ref={messagesEndRef} />
                            </div>

                            {/* Input */}
                            <div className="p-6 md:p-8 border-t border-border bg-surface relative z-10 shadow-[0_-4px_10px_-5px_rgba(0,0,0,0.05)]">
                                <div className="flex items-end gap-4 max-w-4xl mx-auto">
                                    <textarea
                                        value={newMessage}
                                        onChange={e => setNewMessage(e.target.value)}
                                        onKeyDown={e => {
                                            if (e.key === 'Enter' && !e.shiftKey) {
                                                e.preventDefault();
                                                handleSend();
                                            }
                                        }}
                                        placeholder="Type a message..."
                                        rows={1}
                                        className="flex-1 resize-none border-2 border-border rounded-2xl px-6 py-4 text-lg font-medium focus:ring-4 focus:ring-accent/20 focus:border-accent outline-none bg-surface-alt focus:bg-surface transition-all shadow-inner placeholder-text-muted text-text"
                                        style={{ maxHeight: '160px' }}
                                    />
                                    <button
                                        onClick={handleSend}
                                        disabled={!newMessage.trim() || sending}
                                        className="p-5 bg-accent text-white rounded-2xl hover:bg-accent-light shadow-accent disabled:opacity-40 disabled:cursor-not-allowed transition-all border border-accent hover:scale-105 active:scale-95 flex-shrink-0"
                                    >
                                        <Send size={24} className={newMessage.trim() && !sending ? 'animate-pulse' : ''} />
                                    </button>
                                </div>
                                <div className="text-center mt-3 text-[10px] font-black uppercase tracking-widest text-text-muted">
                                    Press Enter to send, Shift + Enter for new line
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
