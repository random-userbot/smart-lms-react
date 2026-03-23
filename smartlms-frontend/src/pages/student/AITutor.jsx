import { useState, useRef, useEffect } from 'react';
import { tutorAPI } from '../../api/client';
import { useActivity } from '../../context/ActivityTracker';
import { 
    Bot, Send, User, Loader2, Trash2, ChevronDown, 
    MessageSquare, Plus, Search, Menu, X, MoreVertical,
    PanelLeftClose, PanelLeftOpen, Mic
} from 'lucide-react';

const SUGGESTED_PROMPTS = {
    general: [
        "Explain the concept of machine learning in simple terms",
        "What are the ICAP framework engagement levels?",
        "Help me understand this topic step by step",
        "Can you quiz me on what I've learned?",
    ],
    language_practice: [
        "Let's have a conversation about my hobbies",
        "Can you describe a picture to me and I'll try to translate?",
        "Tell me about a common cultural practice",
        "Help me practice ordering food at a restaurant",
    ],
    grammar_check: [
        "Please check this paragraph I wrote",
        "What are the most common grammar mistakes?",
        "Explain the difference between these two words",
    ],
};

const MODEL_INFO = {
    general: { name: 'LLaMA 3.3 70B', icon: '🧠', desc: 'Deep reasoning & analysis (Versatile)' },
    language_practice: { name: 'Mixtral 8x7B', icon: '🗣️', desc: 'Fast multilingual responses' },
    grammar_check: { name: 'Gemma 2 9B', icon: '✍️', desc: 'Precise language analysis' },
};

export default function AITutor() {
    const { trackEvent } = useActivity();
    
    // Core states
    const [sessions, setSessions] = useState([]);
    const [filteredSessions, setFilteredSessions] = useState([]);
    const [activeSessionId, setActiveSessionId] = useState(null);
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    
    // UI states
    const [mode, setMode] = useState('general');
    const [showModelInfo, setShowModelInfo] = useState(false);
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    
    const messagesEndRef = useRef(null);

    // Initial load: Fetch sessions
    useEffect(() => {
        loadSessions();
    }, []);

    const loadSessions = async () => {
        try {
            const res = await tutorAPI.getSessions();
            setSessions(res.data || []);
            setFilteredSessions(res.data || []);
        } catch (err) {
            console.error("Failed to load sessions", err);
        }
    };

    // Filter sessions locally
    useEffect(() => {
        if (!searchQuery.trim()) {
            setFilteredSessions(sessions);
        } else {
            const lowerq = searchQuery.toLowerCase();
            setFilteredSessions(sessions.filter(s => s.title?.toLowerCase().includes(lowerq)));
        }
    }, [searchQuery, sessions]);

    // Load messages when selecting a session
    useEffect(() => {
        if (activeSessionId) {
            loadMessages(activeSessionId);
            const s = sessions.find(s => s.id === activeSessionId);
            if (s) setMode(s.mode);
        } else {
            setMessages([{
                role: 'assistant',
                content: "Hello! I'm your AI Tutor. I can help you understand concepts, practice languages visually, or check your grammar.\n\nTry one of the suggested prompts below, or just start typing!"
            }]);
        }
    }, [activeSessionId]);

    const loadMessages = async (id) => {
        try {
            const res = await tutorAPI.getSessionMessages(id);
            setMessages(res.data || []);
        } catch (err) {
            console.error("Failed to load messages", err);
        }
    };

    // Scroll to bottom
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages, isTyping]);

    const handleNewChat = () => {
        setActiveSessionId(null);
        setMobileSidebarOpen(false);
        setMode('general');
    };

    const handleDeleteSession = async (id, e) => {
        e.stopPropagation();
        if (!window.confirm("Delete this chat?")) return;
        try {
            await tutorAPI.deleteSession(id);
            setSessions(prev => prev.filter(s => s.id !== id));
            if (activeSessionId === id) handleNewChat();
        } catch (err) {
            console.error("Failed to delete session", err);
        }
    };

    const handleSend = async (overrideInput = null) => {
        const textToSubmit = typeof overrideInput === 'string' ? overrideInput : input;
        if (!textToSubmit.trim() || isTyping) return;

        let currentSessionId = activeSessionId;

        // If no active session, we generate one on the fly before sending
        if (!currentSessionId) {
            try {
                const title = textToSubmit.length > 40 ? textToSubmit.substring(0, 40) + "..." : textToSubmit;
                const newSession = await tutorAPI.createSession({ title, mode });
                currentSessionId = newSession.data.id;
                setActiveSessionId(currentSessionId);
                setSessions(prev => [newSession.data, ...prev]);
            } catch (err) {
                console.error("Failed to create session on the fly", err);
                return;
            }
        }

        const newUserMsg = { role: 'user', content: textToSubmit };
        const newMessages = [...messages, newUserMsg];
        
        setMessages(newMessages);
        setInput('');
        setIsTyping(true);
        trackEvent('tutor_message_sent', { mode, length: textToSubmit.length });

        try {
            // Append an empty assistant message slot
            setMessages([...newMessages, { role: 'assistant', content: '' }]);

            await tutorAPI.chat(
                { messages: newMessages, mode, session_id: currentSessionId },
                (chunk) => {
                    setMessages(prev => {
                        const updated = [...prev];
                        updated[updated.length - 1].content = chunk;
                        return updated;
                    });
                }
            );

            // Re-fetch sessions in case title was updated by the backend
            loadSessions();
        } catch (error) {
            setMessages([...newMessages, { role: 'assistant', content: 'Sorry, I encountered an error connecting to the backend. Please try again.' }]);
        } finally {
            setIsTyping(false);
        }
    };

    const formatTime = (ts) => {
        const date = new Date(ts);
        return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: date.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined });
    };

    return (
        <div className="flex h-[calc(100vh-64px)] w-full font-sans bg-surface-alt relative overflow-hidden">
            {/* --- Left Sidebar (Chat History) --- */}
            <div className={`
                absolute md:relative z-30 h-full bg-surface border-r border-border shrink-0 transition-all duration-300 ease-in-out flex flex-col
                ${sidebarOpen ? 'w-full md:w-[280px] lg:w-[320px]' : 'w-0 border-r-0'}
                ${mobileSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
            `}>
                <div className={`flex flex-col h-full w-full min-w-[280px] ${!sidebarOpen && 'hidden md:flex md:invisible md:opacity-0'}`}>
                    <div className="p-4 flex items-center justify-between gap-2 border-b border-border">
                        <button 
                            onClick={handleNewChat}
                            className="flex-1 flex items-center justify-center gap-2 bg-accent text-white py-2.5 px-4 rounded-xl font-bold hover:bg-accent-hover transition-colors shadow-sm"
                        >
                            <Plus size={18} /> New Chat
                        </button>
                        <button className="md:hidden p-2.5 bg-surface-alt rounded-xl text-text-muted" onClick={() => setMobileSidebarOpen(false)}>
                            <X size={20} />
                        </button>
                    </div>

                    <div className="px-4 py-3 border-b border-border">
                        <div className="relative">
                            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
                            <input 
                                type="text"
                                placeholder="Search history..."
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                className="w-full bg-surface-elevated text-sm text-text border-transparent focus:border-accent rounded-lg pl-9 pr-4 py-2 outline-none"
                            />
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto p-2 space-y-1">
                        {filteredSessions.length === 0 ? (
                            <div className="p-4 text-center text-sm font-semibold text-text-muted mt-4">
                                No chat history found
                            </div>
                        ) : (
                            filteredSessions.map(session => (
                                <div 
                                    key={session.id}
                                    onClick={() => { setActiveSessionId(session.id); setMobileSidebarOpen(false); }}
                                    className={`group flex items-center justify-between px-3 py-3 rounded-xl cursor-pointer transition-colors ${activeSessionId === session.id ? 'bg-accent-light text-accent border border-accent/20' : 'hover:bg-surface-elevated text-text'}`}
                                >
                                    <div className="flex items-center gap-3 overflow-hidden">
                                        <MessageSquare size={18} className={`shrink-0 ${activeSessionId === session.id ? 'text-accent' : 'text-text-muted group-hover:text-text-secondary'}`} />
                                        <div className="flex flex-col overflow-hidden">
                                            <span className={`text-sm font-bold truncate ${activeSessionId === session.id ? 'text-accent' : 'text-text-secondary group-hover:text-text'}`}>
                                                {session.title || "Untitled Chat"}
                                            </span>
                                            <span className="text-[10px] uppercase tracking-wider font-bold text-text-muted truncate mt-0.5">
                                                {session.mode} • {formatTime(session.updated_at || session.created_at)}
                                            </span>
                                        </div>
                                    </div>
                                    <button 
                                        onClick={(e) => handleDeleteSession(session.id, e)}
                                        className="opacity-0 group-hover:opacity-100 p-1.5 text-text-muted hover:text-danger hover:bg-danger-light rounded-md transition-all shrink-0"
                                        title="Delete chat"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>

            {/* --- Main Chat Area --- */}
            <div className={`flex-1 flex flex-col sm:min-w-0 transition-all duration-300 relative ${mobileSidebarOpen ? 'blur-sm pointer-events-none md:blur-none md:pointer-events-auto' : ''}`}>
                
                {/* Header */}
                <div className="flex items-center justify-between gap-4 py-3 px-4 md:px-6 bg-surface/80 backdrop-blur-md border-b border-border sticky top-0 z-20">
                    <div className="flex items-center gap-2 md:gap-4">
                        <button 
                            onClick={() => {
                                if (window.innerWidth < 768) {
                                    setMobileSidebarOpen(!mobileSidebarOpen);
                                } else {
                                    setSidebarOpen(!sidebarOpen);
                                }
                            }}
                            className="p-2 -ml-2 text-text-muted hover:text-text hover:bg-surface-alt rounded-lg transition-colors"
                            title="Toggle Sidebar"
                        >
                            {sidebarOpen ? <PanelLeftClose size={20} /> : <PanelLeftOpen size={20} />}
                        </button>

                        <div 
                            className="flex items-center gap-2 md:gap-3 cursor-pointer group px-2 md:px-3 py-1.5 rounded-xl hover:bg-surface-alt transition-colors"
                            onClick={() => setShowModelInfo(!showModelInfo)}
                        >
                            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-accent text-surface shadow-sm group-hover:scale-105 transition-transform">
                                <Bot size={18} />
                            </div>
                            <div>
                                <h1 className="text-base md:text-lg font-black text-text tracking-tight flex items-center gap-1.5 drop-shadow-sm">
                                    AI Tutor 
                                    <ChevronDown size={16} className={`text-text-muted transition-transform ${showModelInfo ? 'rotate-180' : ''}`} />
                                </h1>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <span className="hidden md:inline-flex bg-surface-elevated text-text-muted border border-border text-[10px] px-2.5 py-1 rounded-full uppercase font-bold tracking-widest whitespace-nowrap">
                            {MODEL_INFO[mode]?.name}
                        </span>
                    </div>
                </div>

                {/* Model Info Dropdown */}
                {showModelInfo && (
                    <div className="absolute top-[60px] left-0 right-0 bg-surface border-b border-border shadow-lg p-6 z-20 animate-in slide-in-from-top-2">
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-4xl mx-auto">
                            {Object.entries(MODEL_INFO).map(([key, info]) => (
                                <div key={key} onClick={() => { if(!activeSessionId) setMode(key); setShowModelInfo(false); }} className={`p-4 rounded-xl border-2 transition-all ${!activeSessionId ? 'cursor-pointer hover:border-border' : 'opacity-70'} ${mode === key ? 'border-accent bg-accent-light' : 'border-transparent bg-surface-alt'}`}>
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="text-xl">{info.icon}</span>
                                        <span className="font-bold text-text text-sm">{info.name}</span>
                                    </div>
                                    <p className="text-xs font-medium text-text-secondary">{info.desc}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Chat Feed */}
                <div className="flex-1 overflow-y-auto w-full scroll-smooth">
                    {messages.length === 1 && !isTyping && !activeSessionId && (
                        <div className="max-w-3xl mx-auto mt-16 md:mt-24 px-6 md:px-8 text-center animate-in fade-in slide-in-from-bottom-4">
                            <div className="w-16 h-16 md:w-20 md:h-20 bg-surface rounded-[24px] mx-auto flex items-center justify-center shadow-md border border-border mb-8 text-accent">
                                {MODEL_INFO[mode]?.icon}
                            </div>
                            <h2 className="text-3xl md:text-4xl font-black text-text mb-10 tracking-tight">How can I help you today?</h2>
                            
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4 text-left">
                                {(SUGGESTED_PROMPTS[mode] || SUGGESTED_PROMPTS.general).map((prompt, i) => (
                                    <button
                                        key={i}
                                        onClick={() => { setInput(prompt); handleSend(prompt); }}
                                        className="p-4 bg-surface border border-border rounded-2xl hover:bg-surface-elevated hover:border-accent/40 shadow-sm hover:shadow transition-all group flex flex-col items-start gap-1 text-left"
                                    >
                                        <span className="text-sm font-bold text-text group-hover:text-accent transition-colors leading-snug">{prompt}</span>
                                        <span className="text-[11px] font-bold uppercase tracking-wider text-text-muted mt-1 opacity-0 group-hover:opacity-100 transition-opacity">Click to ask</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    <div className={`pb-36 pt-4 w-full ${(!activeSessionId && messages.length === 1) ? 'hidden' : ''}`}>
                        {messages.map((msg, i) => (
                            <div key={i} className={`w-full py-5 md:py-8 ${msg.role === 'assistant' ? 'bg-surface-alt/80 border-y border-border/40' : 'bg-transparent'} transition-colors`}>
                                <div className="max-w-3xl mx-auto px-4 md:px-8 flex gap-4 md:gap-6">
                                    <div className={`flex items-center justify-center w-8 h-8 md:w-10 md:h-10 rounded-xl flex-shrink-0 shadow-sm
                                        ${msg.role === 'user' ? 'bg-text text-surface font-bold' : 'bg-accent text-white'}`}>
                                        {msg.role === 'user' ? <User size={18} /> : <Bot size={22} />}
                                    </div>

                                    <div className="flex-1 overflow-hidden min-w-0 pt-1">
                                        <div className="font-extrabold text-text text-sm mb-1.5">{msg.role === 'user' ? 'You' : 'AI Tutor'}</div>
                                        <div className={`text-text text-[15px] md:text-base leading-[1.7] ${msg.role === 'user' ? 'whitespace-pre-wrap font-medium' : ''}`}>
                                            {msg.role === 'assistant' ? (
                                                <div className="prose prose-sm md:prose-base dark:prose-invert max-w-none prose-p:leading-relaxed prose-pre:bg-surface-elevated prose-pre:border prose-pre:border-border prose-pre:rounded-xl prose-pre:shadow-inner prose-code:bg-surface-elevated prose-code:text-accent prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded-md prose-code:before:content-none prose-code:after:content-none whitespace-pre-wrap">
                                                    {msg.content || '...'}
                                                </div>
                                            ) : (
                                                msg.content
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}

                        {/* Typing Status */}
                        {isTyping && messages[messages.length - 1]?.role !== 'assistant' && (
                            <div className="w-full py-6 bg-surface-alt/80 border-y border-border/40">
                                <div className="max-w-3xl mx-auto px-4 md:px-8 flex gap-4 md:gap-6">
                                    <div className="flex items-center justify-center w-8 h-8 md:w-10 md:h-10 rounded-xl bg-accent text-white shadow-sm shrink-0">
                                        <Bot size={22} />
                                    </div>
                                    <div className="flex flex-col pt-1">
                                        <div className="font-extrabold text-text text-sm mb-2.5">AI Tutor</div>
                                        <div className="flex items-center gap-1.5 h-4">
                                            <div className="w-1.5 h-1.5 bg-accent/60 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                                            <div className="w-1.5 h-1.5 bg-accent/60 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                                            <div className="w-1.5 h-1.5 bg-accent/60 rounded-full animate-bounce"></div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                        <div ref={messagesEndRef} className="h-4" />
                    </div>
                </div>

                {/* Input Area (Sticky at bottom, centered, floating) */}
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-surface-alt via-surface-alt/95 to-transparent pt-16 pb-6 px-4 md:px-8 z-10 pointer-events-none">
                    <div className="max-w-3xl mx-auto relative pointer-events-auto flex flex-col gap-2">
                        {!activeSessionId && (
                            <div className="flex items-center gap-2 px-2 self-start pointer-events-auto">
                                <select
                                    className="input !py-1.5 !pl-3 !pr-8 text-xs font-bold bg-surface border border-border focus:border-accent cursor-pointer hover:bg-surface-elevated transition-colors appearance-none rounded-xl"
                                    value={mode}
                                    onChange={e => {
                                        setMode(e.target.value);
                                        trackEvent('tutor_mode_changed', { mode: e.target.value });
                                    }}
                                >
                                    <option value="general">🧠 General Tutoring</option>
                                    <option value="language_practice">🗣️ Language Practice</option>
                                    <option value="grammar_check">✍️ Grammar Check</option>
                                </select>
                            </div>
                        )}
                        <div className="relative bg-surface rounded-[24px] border border-border shadow-[0_8px_30px_rgb(0,0,0,0.12)] focus-within:ring-2 focus-within:ring-accent/20 focus-within:border-accent transition-all overflow-hidden flex flex-col pointer-events-auto">
                            <textarea
                                className="w-full bg-transparent text-text placeholder-text-muted px-6 pt-5 pb-3 resize-none max-h-[250px] min-h-[64px] text-[15px] focus:outline-none leading-relaxed"
                                placeholder={`Message AI Tutor...`}
                                value={input}
                                onChange={e => setInput(e.target.value)}
                                onKeyDown={e => {
                                    if (e.key === 'Enter' && !e.shiftKey) {
                                        e.preventDefault();
                                        handleSend();
                                    }
                                }}
                                disabled={isTyping}
                                rows={1}
                                style={{ overflowY: 'auto' }}
                            />
                            <div className="flex items-center justify-between px-4 pb-3">
                                <div className="flex items-center gap-1">
                                    <button className="p-2.5 text-text-muted hover:text-text hover:bg-surface-elevated rounded-xl transition-colors shrink-0" title="Voice Input (Coming soon)">
                                        <Mic size={20} />
                                    </button>
                                </div>
                                <button
                                    className={`p-2.5 rounded-[12px] flex items-center justify-center transition-all disabled:opacity-50 shrink-0 ${input.trim() ? 'bg-accent text-white shadow-lg shadow-accent/20 hover:bg-accent-hover' : 'bg-surface-elevated text-text-muted'}`}
                                    onClick={() => handleSend()}
                                    disabled={!input.trim() || isTyping}
                                >
                                    {isTyping ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} className="-ml-0.5" />}
                                </button>
                            </div>
                        </div>
                        <div className="text-center mt-3">
                            <p className="text-[10px] font-bold uppercase tracking-widest text-text-muted">
                                AI Tutor can make mistakes. Consider verifying important information.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
            
            {/* Mobile Overlay */}
            {mobileSidebarOpen && (
                <div 
                    className="absolute inset-0 bg-black/20 backdrop-blur-sm z-20 md:hidden"
                    onClick={() => setMobileSidebarOpen(false)}
                />
            )}
        </div>
    );
}
