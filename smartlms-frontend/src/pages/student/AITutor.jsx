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
    }, []);

    // Scroll to bottom
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages, isTyping]);

    const speakText = (text) => {
        if (!autoSpeak) return;
        if (window.speechSynthesis) window.speechSynthesis.cancel(); // Stop any current speech
        const utterance = new SpeechSynthesisUtterance(text);

        // Try to pick an appropriate voice based on mode
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
                // Set language for recognition
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
            // Append a placeholder for the assistant
            setMessages([...newMessages, { role: 'assistant', content: '' }]);

            const fullResponse = await tutorAPI.chat(
                { messages: newMessages, mode, target_language: targetLanguage },
                (chunk) => {
                    // Update the last message as chunks arrive
                    setMessages(prev => {
                        const updated = [...prev];
                        updated[updated.length - 1].content = chunk;
                        return updated;
                    });
                }
            );

            // Speak the final response if enabled
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
        <div className="flex flex-col h-[calc(100vh-80px)] max-w-7xl mx-auto p-4 md:p-8">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 p-6 md:p-8 bg-surface rounded-[2rem] shadow-sm border border-border mb-6 transition-all">
                <div className="flex items-center gap-5">
                    <div className="flex items-center justify-center w-16 h-16 rounded-[1.5rem] bg-accent text-surface shadow-md">
                        <Bot size={32} />
                    </div>
                    <div>
                        <h1 className="text-2xl md:text-3xl font-black text-text leading-tight tracking-tight">Smart AI Tutor</h1>
                        <button 
                            onClick={() => setShowModelInfo(!showModelInfo)}
                            className="text-sm font-bold text-text-secondary flex items-center gap-2 mt-1 hover:text-accent transition-colors"
                        >
                            <Sparkles size={16} className="text-warning" />
                            {MODEL_INFO[mode]?.icon} {MODEL_INFO[mode]?.name} — {MODEL_INFO[mode]?.desc}
                            {showModelInfo ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                        </button>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-4">
                    {/* Clear chat */}
                    <button
                        onClick={() => setMessages([{ role: 'assistant', content: "Chat cleared! How can I help you?" }])}
                        className="btn btn-secondary px-4 !py-3 bg-surface-alt hover:bg-danger-light hover:text-danger hover:border-danger/30 group"
                        title="Clear conversation"
                    >
                        <Trash2 size={20} className="group-hover:scale-110 transition-transform"/>
                    </button>

                    <div className="relative group">
                        <select
                            className="input !py-3 pr-10 cursor-pointer text-sm font-black tracking-wider uppercase"
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
                        <div className="absolute inset-y-0 right-0 flex items-center px-4 pointer-events-none text-text-muted group-hover:text-accent transition-colors">
                            <svg className="w-5 h-5 fill-current" viewBox="0 0 20 20"><path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" fillRule="evenodd"></path></svg>
                        </div>
                    </div>

                    {(mode === 'language_practice' || mode === 'grammar_check') && (
                        <div className="relative group flex items-center">
                            <div className="absolute left-4 text-text-muted z-10 group-hover:text-success transition-colors">
                                <Globe size={20} />
                            </div>
                            <select
                                className="input !py-3 pl-12 pr-10 cursor-pointer text-sm font-black tracking-wider uppercase border-border focus:border-success focus:ring-success/50 hover:border-success/50"
                                value={targetLanguage}
                                onChange={e => setTargetLanguage(e.target.value)}
                            >
                                <option value="Spanish">Spanish</option>
                                <option value="French">French</option>
                                <option value="German">German</option>
                                <option value="Japanese">Japanese</option>
                            </select>
                            <div className="absolute inset-y-0 right-0 flex items-center px-4 pointer-events-none text-text-muted group-hover:text-success transition-colors">
                                <svg className="w-5 h-5 fill-current" viewBox="0 0 20 20"><path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" fillRule="evenodd"></path></svg>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Model Info Panel */}
            {showModelInfo && (
                <div className="bg-surface rounded-[2rem] shadow-sm border border-border mb-6 p-8 animate-in fade-in slide-in-from-top-4 duration-200">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {Object.entries(MODEL_INFO).map(([key, info]) => (
                            <div key={key} className={`p-6 rounded-[1.5rem] border-2 transition-all ${mode === key ? 'border-accent bg-accent-light shadow-sm' : 'border-border bg-surface-alt opacity-70 hover:opacity-100'}`}>
                                <div className="flex items-center gap-3 mb-2">
                                    <span className="text-2xl">{info.icon}</span>
                                    <span className="font-black text-text text-base tracking-tight">{info.name}</span>
                                    {mode === key && <span className="ml-auto text-[10px] font-black tracking-widest bg-accent text-surface shadow-sm px-2.5 py-1 rounded-md uppercase">Active</span>}
                                </div>
                                <p className="text-sm font-medium text-text-secondary">{info.desc}</p>
                                <p className="text-xs font-black text-text-muted uppercase tracking-widest mt-2">
                                    {key === 'general' ? 'General Tutoring' : key === 'language_practice' ? 'Language Practice' : 'Grammar Check'}
                                </p>
                            </div>
                        ))}
                    </div>
                    <div className="mt-6 flex items-start sm:items-center gap-3 text-sm font-bold text-text-secondary px-2 p-4 bg-surface-alt border border-border rounded-xl">
                        <Brain size={20} className="text-accent shrink-0" />
                        <span>The AI Tutor uses your <strong className="text-text">engagement analytics, ICAP state, and quiz history</strong> to personalize responses. All models run via Groq API with streaming.</span>
                    </div>
                </div>
            )}

            {/* Suggested Prompts — show when conversation is short */}
            {messages.length <= 2 && !isTyping && (
                <div className="mb-6 flex flex-wrap gap-3">
                    {(SUGGESTED_PROMPTS[mode] || SUGGESTED_PROMPTS.general).map((prompt, i) => (
                        <button
                            key={i}
                            onClick={() => { setInput(prompt); handleSend(prompt); }}
                            className="bg-surface border border-border rounded-xl px-5 py-3 text-sm font-bold text-text-secondary hover:bg-surface-alt hover:border-accent/40 hover:text-accent transition-all shadow-sm flex items-center gap-2 group"
                        >
                            <Zap size={16} className="text-warning group-hover:scale-110 transition-transform" />{prompt}
                        </button>
                    ))}
                </div>
            )}

            {/* Chat Area */}
            <div className="flex-1 bg-surface rounded-t-[2.5rem] border border-border shadow-sm overflow-hidden flex flex-col mb-0">
                <div className="flex-1 overflow-y-auto p-6 md:p-10 space-y-10 scroll-smooth">
                    {messages.map((msg, i) => (
                        <div key={i} className={`flex gap-4 md:gap-6 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                            {/* Avatar */}
                            <div className={`flex items-center justify-center w-12 h-12 md:w-14 md:h-14 rounded-2xl flex-shrink-0 shadow-md border
                                ${msg.role === 'user'
                                    ? 'bg-text text-surface border-border'
                                    : 'bg-accent-light text-accent border-accent/20'}`}>
                                {msg.role === 'user' ? <User size={24} /> : <Bot size={28} />}
                            </div>

                            {/* Message Bubble */}
                            <div className={`relative max-w-[85%] md:max-w-[75%] px-6 py-5 rounded-[1.5rem] shadow-sm text-base md:text-lg leading-relaxed
                                ${msg.role === 'user'
                                    ? 'bg-text text-surface rounded-tr-sm'
                                    : 'bg-surface-alt text-text border border-border rounded-tl-sm'}`}>
                                {msg.role === 'assistant' ? (
                                    <ReactMarkdown
                                        className={`prose prose-sm md:prose-base dark:prose-invert max-w-none prose-p:leading-relaxed prose-pre:bg-surface-elevated prose-pre:text-text prose-pre:border prose-pre:border-border prose-pre:rounded-[1.5rem] prose-pre:shadow-inner prose-code:text-accent prose-code:bg-accent-light prose-code:px-2 prose-code:py-1 prose-code:rounded-lg prose-code:before:content-none prose-code:after:content-none`}
                                    >
                                        {msg.content || '...'}
                                    </ReactMarkdown>
                                ) : (
                                    <div className="whitespace-pre-wrap font-medium">{msg.content}</div>
                                )}
                            </div>
                        </div>
                    ))}

                    {/* Typing Indicator */}
                    {isTyping && messages[messages.length - 1]?.role !== 'assistant' && (
                        <div className="flex gap-4 md:gap-6">
                            <div className="flex items-center justify-center w-12 h-12 md:w-14 md:h-14 rounded-2xl border border-accent/20 bg-accent-light text-accent shadow-sm">
                                <Bot size={28} />
                            </div>
                            <div className="bg-surface-alt border border-border px-6 py-5 rounded-[1.5rem] rounded-tl-sm shadow-sm flex items-center gap-3">
                                <div className="flex space-x-2">
                                    <div className="w-3 h-3 bg-accent/60 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                                    <div className="w-3 h-3 bg-accent/60 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                                    <div className="w-3 h-3 bg-accent/60 rounded-full animate-bounce"></div>
                                </div>
                                <span className="text-sm font-bold text-accent ml-2 uppercase tracking-widest">Thinking</span>
                            </div>
                        </div>
                    )}
                    <div ref={messagesEndRef} className="h-4" />
                </div>
            </div>

            {/* Input Area */}
            <div className="bg-surface rounded-b-[2.5rem] border border-border border-t-0 shadow-sm p-6 relative z-10 transition-all focus-within:ring-2 focus-within:ring-accent/20">
                <div className="flex items-end gap-3 md:gap-4 relative max-w-6xl mx-auto">

                    {/* Audio Controls */}
                    <div className="flex gap-3 mb-1.5 shrink-0">
                        <button
                            className={`p-4 rounded-2xl flex items-center justify-center transition-all shadow-sm border ${autoSpeak ? 'bg-warning-light text-warning border-warning/20' : 'bg-surface-elevated text-text-secondary border-border hover:bg-surface-alt hover:text-text'}`}
                            onClick={toggleAutoSpeak}
                            title={autoSpeak ? "Disable TTS" : "Enable Auto-TTS"}
                        >
                            {isSpeaking ? <Volume2 size={24} className="animate-pulse" /> : autoSpeak ? <Volume2 size={24} /> : <VolumeX size={24} />}
                        </button>

                        <button
                            className={`p-4 rounded-2xl flex items-center justify-center transition-all shadow-sm border ${isListening ? 'bg-danger text-surface border-danger shadow-danger/30 animate-pulse' : 'bg-surface-elevated text-text-secondary border-border hover:bg-surface-alt hover:text-text'}`}
                            onClick={toggleListening}
                            title={isListening ? "Stop Listening" : "Start Speaking"}
                        >
                            {isListening ? <MicOff size={24} /> : <Mic size={24} />}
                        </button>
                    </div>

                    {/* Text Input */}
                    <div className="flex-1 relative">
                        <textarea
                            className="input w-full px-6 py-4 resize-none max-h-[160px] min-h-[60px] text-base"
                            placeholder={isListening ? "Listening natively..." : "Message your AI Tutor..."}
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
                    </div>

                    {/* Send Button */}
                    <button
                        className="mb-1.5 p-4 bg-text hover:bg-text-secondary text-surface rounded-2xl shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center shrink-0 border border-text group"
                        onClick={() => handleSend()}
                        disabled={!input.trim() || isTyping}
                    >
                        {isTyping ? <Loader2 size={24} className="animate-spin" /> : <Send size={24} className="group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />}
                    </button>

                </div>
                <div className="mt-4 flex flex-col sm:flex-row items-center justify-between max-w-6xl mx-auto gap-2">
                    <p className="text-xs font-bold text-text-muted text-center sm:text-left">AI Tutor can make mistakes. Always verify facts and exercise critical thinking.</p>
                    <span className="text-[10px] font-black text-text-muted uppercase tracking-widest shrink-0">{messages.length} interactions</span>
                </div>
            </div>
        </div>
    );
}
