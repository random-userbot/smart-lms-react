import { useState, useRef, useEffect } from 'react';
import { tutorAPI } from '../../api/client';
import { useActivity } from '../../context/ActivityTracker';
import { Bot, Send, User, Mic, MicOff, Volume2, VolumeX, Loader2, Sparkles, Globe, Brain, Zap, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

const SUGGESTED_PROMPTS = {
    general: [
        "Explain the concept of machine learning in simple terms",
        "What are the ICAP framework engagement levels?",
        "Help me understand this topic step by step",
        "Can you quiz me on what I've learned?",
        "What study strategies work best for visual learners?",
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
    general: { name: 'Qwen 2.5 32B', icon: '🧠', desc: 'Deep reasoning & analysis' },
    language_practice: { name: 'Mixtral 8x7B', icon: '🗣️', desc: 'Fast multilingual responses' },
    grammar_check: { name: 'LLaMA 3.3 70B', icon: '✍️', desc: 'Precise language analysis' },
};

export default function AITutor() {
    const { trackEvent } = useActivity();
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const [mode, setMode] = useState('general');
    const [targetLanguage, setTargetLanguage] = useState('Spanish');
    const [showModelInfo, setShowModelInfo] = useState(false);

    // Audio / Speech States
    const [isListening, setIsListening] = useState(false);
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [autoSpeak, setAutoSpeak] = useState(false);

    const messagesEndRef = useRef(null);
    const recognitionRef = useRef(null);

    // Initial greeting + load student context
    useEffect(() => {
        setMessages([{
            role: 'assistant',
            content: "Hello! I'm your AI Tutor powered by advanced language models. I have access to your learning analytics to personalize my responses. I can help you understand concepts, practice languages verbally, or check your grammar.\n\nTry one of the suggested prompts below, or ask me anything!"
        }]);

        // Setup Speech Recognition
        if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
            if (SpeechRecognition) {
                recognitionRef.current = new SpeechRecognition();
                recognitionRef.current.continuous = false;
                recognitionRef.current.interimResults = false;

                recognitionRef.current.onresult = (event) => {
                    const transcript = event.results[0][0].transcript;
                    setInput(transcript);
                    handleSend(transcript);
                };

                recognitionRef.current.onerror = (event) => {
                    console.error('Speech recognition error', event.error);
                    setIsListening(false);
                };

                recognitionRef.current.onend = () => {
                    setIsListening(false);
                };
            }
        }
    }, []);

    // Scroll to bottom
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages, isTyping]);

    const speakText = (text) => {
        if (!autoSpeak) return;
        if (window.speechSynthesis) window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);

        if (mode === 'language_practice' && window.speechSynthesis) {
            const voices = window.speechSynthesis.getVoices();
            const langVoice = voices.find(v => v.lang.toLowerCase().includes(targetLanguage.slice(0, 2).toLowerCase()));
            if (langVoice) utterance.voice = langVoice;
        }

        utterance.onstart = () => setIsSpeaking(true);
        utterance.onend = () => setIsSpeaking(false);
        utterance.onerror = () => setIsSpeaking(false);

        if (window.speechSynthesis) window.speechSynthesis.speak(utterance);
    };

    const toggleListening = () => {
        if (isListening) {
            recognitionRef.current?.stop();
            setIsListening(false);
        } else {
            if (recognitionRef.current) {
                recognitionRef.current.lang = mode === 'language_practice' ? getLangCode(targetLanguage) : 'en-US';
                recognitionRef.current.start();
                setIsListening(true);
            } else {
                alert("Speech recognition is not supported in this browser.");
            }
        }
    };

    const toggleAutoSpeak = () => {
        if (autoSpeak) {
            if (window.speechSynthesis) window.speechSynthesis.cancel();
            setIsSpeaking(false);
        }
        setAutoSpeak(!autoSpeak);
    };

    const handleSend = async (overrideInput = null) => {
        const textToSubmit = typeof overrideInput === 'string' ? overrideInput : input;
        if (!textToSubmit.trim()) return;

        const newUserMsg = { role: 'user', content: textToSubmit };
        const newMessages = [...messages, newUserMsg];

        setMessages(newMessages);
        setInput('');
        setIsTyping(true);

        trackEvent('tutor_message_sent', { mode, length: textToSubmit.length });

        try {
            setMessages([...newMessages, { role: 'assistant', content: '' }]);

            const fullResponse = await tutorAPI.chat(
                { messages: newMessages, mode, target_language: targetLanguage },
                (chunk) => {
                    setMessages(prev => {
                        const updated = [...prev];
                        updated[updated.length - 1].content = chunk;
                        return updated;
                    });
                }
            );

            speakText(fullResponse);

        } catch (error) {
            setMessages([...newMessages, { role: 'assistant', content: 'Sorry, I encountered an error connecting to the backend. Please try again.' }]);
        } finally {
            setIsTyping(false);
        }
    };

    const getLangCode = (lang) => {
        const map = { 'Spanish': 'es-ES', 'French': 'fr-FR', 'German': 'de-DE', 'Japanese': 'ja-JP' };
        return map[lang] || 'en-US';
    };

    return (
        <div className="flex flex-col h-[calc(100vh-64px)] w-full bg-surface-alt font-sans">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 md:px-8 bg-surface border-b border-border z-10 sticky top-0">
                <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-accent text-surface shadow-sm hover:scale-105 transition-transform cursor-pointer" onClick={() => setShowModelInfo(!showModelInfo)}>
                        <Bot size={22} />
                    </div>
                    <div>
                        <h1 className="text-xl md:text-2xl font-black text-text tracking-tight flex items-center gap-2">
                            AI Tutor 
                            <span className="bg-surface-elevated text-text-muted text-[10px] px-2 py-0.5 rounded-full uppercase tracking-widest">{MODEL_INFO[mode]?.name}</span>
                        </h1>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    <button
                        onClick={() => setMessages([{ role: 'assistant', content: "Chat cleared! How can I help you today?" }])}
                        className="btn btn-ghost !p-2 text-text-muted hover:text-danger hover:bg-danger-light rounded-lg transition-colors"
                        title="Clear conversation"
                    >
                        <Trash2 size={20} />
                    </button>

                    <div className="relative group">
                        <select
                            className="input !py-2.5 !pl-4 !pr-10 text-sm font-bold bg-surface-elevated border-transparent focus:border-accent cursor-pointer hover:bg-border transition-colors appearance-none"
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
                        <ChevronDown size={16} className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-text-muted group-hover:text-text" />
                    </div>

                    {(mode === 'language_practice' || mode === 'grammar_check') && (
                        <div className="relative group flex items-center">
                            <Globe size={16} className="absolute left-4 text-text-muted z-10 group-hover:text-accent pointer-events-none" />
                            <select
                                className="input !py-2.5 !pl-10 !pr-10 text-sm font-bold bg-surface-elevated border-transparent focus:border-accent cursor-pointer hover:bg-border transition-colors appearance-none"
                                value={targetLanguage}
                                onChange={e => setTargetLanguage(e.target.value)}
                            >
                                <option value="Spanish">Spanish</option>
                                <option value="French">French</option>
                                <option value="German">German</option>
                                <option value="Japanese">Japanese</option>
                            </select>
                            <ChevronDown size={16} className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-text-muted group-hover:text-text" />
                        </div>
                    )}
                </div>
            </div>

            {/* Model Info Dropdown */}
            {showModelInfo && (
                <div className="bg-surface border-b border-border p-6 md:px-8 absolute top-[72px] inset-x-0 z-20 shadow-lg animate-in slide-in-from-top-2">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
                        {Object.entries(MODEL_INFO).map(([key, info]) => (
                            <div key={key} onClick={() => { setMode(key); setShowModelInfo(false); }} className={`p-5 rounded-2xl border-2 transition-all cursor-pointer ${mode === key ? 'border-accent bg-accent-light shadow-sm' : 'border-transparent bg-surface-alt hover:border-border hover:bg-surface-elevated'}`}>
                                <div className="flex items-center gap-3 mb-2">
                                    <span className="text-2xl">{info.icon}</span>
                                    <span className="font-bold text-text">{info.name}</span>
                                </div>
                                <p className="text-sm font-medium text-text-secondary">{info.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Chat Area - GPT Style (Full Width, Centered Content) */}
            <div className="flex-1 overflow-y-auto scroll-smooth">
                {messages.length === 1 && !isTyping && (
                    <div className="max-w-3xl mx-auto mt-16 px-6 text-center animate-in fade-in slide-in-from-bottom-4">
                        <div className="w-20 h-20 bg-surface rounded-3xl mx-auto flex items-center justify-center shadow-md border border-border mb-8 text-accent">
                            {MODEL_INFO[mode]?.icon}
                        </div>
                        <h2 className="text-3xl font-black text-text mb-8">How can I help you today?</h2>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left">
                            {(SUGGESTED_PROMPTS[mode] || SUGGESTED_PROMPTS.general).map((prompt, i) => (
                                <button
                                    key={i}
                                    onClick={() => { setInput(prompt); handleSend(prompt); }}
                                    className="p-4 bg-surface border border-border rounded-2xl hover:bg-surface-elevated hover:border-accent/40 hover:shadow-sm transition-all group flex flex-col items-start gap-1"
                                >
                                    <span className="text-sm font-bold text-text group-hover:text-accent transition-colors">{prompt}</span>
                                    <span className="text-xs font-medium text-text-muted">Click to ask</span>
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                <div className="pb-32 pt-6">
                    {messages.map((msg, i) => (
                        <div key={i} className={`w-full py-6 md:py-8 ${msg.role === 'assistant' ? 'bg-surface-alt border-y border-border/50' : 'bg-transparent'}`}>
                            <div className="max-w-3xl mx-auto px-4 md:px-6 flex gap-4 md:gap-6">
                                {/* Avatar */}
                                <div className={`flex items-center justify-center w-8 h-8 md:w-10 md:h-10 rounded-lg flex-shrink-0
                                    ${msg.role === 'user'
                                        ? 'bg-text text-surface'
                                        : 'bg-accent text-surface shadow-sm'}`}>
                                    {msg.role === 'user' ? <User size={20} /> : <Bot size={24} />}
                                </div>

                                {/* Message Content */}
                                <div className="flex-1 overflow-hidden min-w-0">
                                    <div className="font-bold text-text text-sm mb-1">{msg.role === 'user' ? 'You' : 'AI Tutor'}</div>
                                    <div className={`text-text text-base leading-relaxed ${msg.role === 'user' ? 'whitespace-pre-wrap font-medium' : ''}`}>
                                        {msg.role === 'assistant' ? (
                                            <ReactMarkdown
                                                className="prose prose-sm md:prose-base dark:prose-invert max-w-none prose-p:leading-relaxed prose-pre:bg-surface-elevated prose-pre:border prose-pre:border-border prose-pre:rounded-xl prose-pre:shadow-inner prose-code:bg-surface-elevated prose-code:text-accent prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded-md prose-code:before:content-none prose-code:after:content-none"
                                            >
                                                {msg.content || '...'}
                                            </ReactMarkdown>
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
                        <div className="w-full py-6 md:py-8 bg-surface-alt border-y border-border/50">
                            <div className="max-w-3xl mx-auto px-4 md:px-6 flex gap-4 md:gap-6">
                                <div className="flex items-center justify-center w-8 h-8 md:w-10 md:h-10 rounded-lg bg-accent text-surface shadow-sm shrink-0">
                                    <Bot size={24} />
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 bg-text-muted rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                                    <div className="w-2 h-2 bg-text-muted rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                                    <div className="w-2 h-2 bg-text-muted rounded-full animate-bounce"></div>
                                </div>
                            </div>
                        </div>
                    )}
                    <div ref={messagesEndRef} className="h-4" />
                </div>
            </div>

            {/* Input Area (Sticky at bottom, centered) */}
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-surface-alt via-surface-alt to-transparent pt-10 pb-6 px-4">
                <div className="max-w-3xl mx-auto relative">
                    {/* Audio Controls (Floating slightly above input) */}
                    <div className="absolute -top-12 right-2 flex gap-2">
                        <button
                            className={`p-2.5 rounded-full flex items-center justify-center transition-all shadow-md border ${isListening ? 'bg-danger text-surface border-danger' : 'bg-surface text-text-secondary border-border hover:bg-surface-elevated'}`}
                            onClick={toggleListening}
                            title={isListening ? "Stop Listening" : "Start Speaking"}
                        >
                            {isListening ? <MicOff size={18} /> : <Mic size={18} />}
                        </button>
                        <button
                            className={`p-2.5 rounded-full flex items-center justify-center transition-all shadow-md border bg-surface text-text-secondary border-border hover:bg-surface-elevated ${autoSpeak ? 'bg-warning-light border-warning/30 text-warning' : ''}`}
                            onClick={toggleAutoSpeak}
                            title={autoSpeak ? "Disable TTS" : "Enable Auto-TTS"}
                        >
                            {isSpeaking ? <Volume2 size={18} className="animate-pulse text-warning" /> : autoSpeak ? <Volume2 size={18} /> : <VolumeX size={18} />}
                        </button>
                    </div>

                    <div className="relative bg-surface rounded-3xl border border-border shadow-md focus-within:ring-2 focus-within:ring-accent/20 focus-within:border-accent transition-all overflow-hidden flex items-end">
                        <textarea
                            className="w-full bg-transparent text-text placeholder-text-muted px-6 py-4 resize-none max-h-[200px] min-h-[60px] text-base focus:outline-none leading-relaxed"
                            placeholder="Message AI Tutor..."
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
                        <button
                            className={`mb-2 mr-2 p-3 rounded-2xl flex items-center justify-center transition-all disabled:opacity-50 shrink-0 ${input.trim() ? 'bg-accent text-white shadow-sm hover:bg-accent-hover' : 'bg-surface-elevated text-text-muted'}`}
                            onClick={() => handleSend()}
                            disabled={!input.trim() || isTyping}
                        >
                            {isTyping ? <Loader2 size={20} className="animate-spin" /> : <Send size={20} />}
                        </button>
                    </div>
                    <div className="text-center mt-3">
                        <p className="text-[11px] font-medium text-text-muted tracking-wide">
                            AI Tutor can make mistakes. Consider verifying important information.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
