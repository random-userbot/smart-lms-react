import { useState, useEffect } from 'react';
import { gamificationAPI } from '../../api/client';
import { Trophy, Medal, Star, Flame, Zap, Award, Target, Sunrise, MessageCircle, PlayCircle, Pencil } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useActivity } from '../../context/ActivityTracker';

export default function Leaderboard() {
    const { user } = useAuth();
    const { trackEvent } = useActivity();
    const [leaderboard, setLeaderboard] = useState([]);
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        trackEvent('leaderboard_viewed');
        Promise.all([
            gamificationAPI.getLeaderboard(),
            gamificationAPI.getProfile(),
        ]).then(([lbRes, profRes]) => {
            setLeaderboard(lbRes.data);
            setProfile(profRes.data);
        }).catch(err => {
            console.error('Leaderboard load error:', err);
        }).finally(() => setLoading(false));
    }, []);

    if (loading) return (
        <div className="min-h-[50vh] flex items-center justify-center">
            <div className="w-12 h-12 border-4 border-warning-light border-t-warning rounded-full animate-spin"></div>
        </div>
    );

    const IconMap = {
        'play-circle': PlayCircle,
        'award': Award,
        'star': Star,
        'flame': Flame,
        'zap': Zap,
        'target': Target,
        'pencil': Pencil,
        'message-circle': MessageCircle,
        'sunrise': Sunrise,
        'trophy': Trophy,
    };

    return (
        <div className="max-w-[1200px] mx-auto px-6 lg:px-10 py-12 space-y-12 animate-in fade-in">
            {/* Header */}
            <div className="text-center max-w-2xl mx-auto mb-14">
                <div className="inline-flex items-center justify-center p-5 bg-warning-light text-warning rounded-[2rem] mb-8 shadow-inner">
                    <Trophy size={64} />
                </div>
                <h1 className="text-5xl md:text-6xl font-black text-text mb-6 tracking-tight">Global Leaderboard</h1>
                <p className="text-xl text-text-secondary font-medium leading-relaxed">Compete with other students, earn experience points (XP), and unlock rare badges.</p>
            </div>

            {/* User Profile Summary */}
            {profile && (
                <div className="bg-gradient-to-br from-amber-500 via-orange-500 to-rose-500 rounded-[2.5rem] shadow-lg p-10 md:p-12 text-surface flex flex-col md:flex-row items-center gap-10 md:gap-14 relative overflow-hidden">
                    <div className="absolute -bottom-20 -right-20 opacity-10 pointer-events-none transform -rotate-12">
                        <Trophy size={340} />
                    </div>

                    <div className="flex flex-col items-center flex-shrink-0 relative z-10 bg-surface/10 backdrop-blur-sm p-8 rounded-[2rem] shadow-inner">
                        <div className="text-surface/80 text-sm font-black uppercase tracking-widest mb-2">Your Level</div>
                        <div className="text-7xl md:text-8xl font-black leading-none drop-shadow-md">{profile.level}</div>
                    </div>

                    <div className="flex-[2] w-full relative z-10">
                        <div className="flex justify-between items-end mb-4 text-base md:text-lg font-bold">
                            <span className="text-surface text-2xl font-black tracking-tight">{profile.points.toLocaleString()} XP</span>
                            <span className="text-surface/80 font-bold">Next level: {(profile.level * 100).toLocaleString()} XP</span>
                        </div>
                        <div className="w-full bg-surface-alt/30 rounded-full h-5 backdrop-blur-sm shadow-inner p-0.5">
                            <div className="bg-surface rounded-full h-full shadow-sm transition-all duration-1000 ease-out" style={{ width: `${(profile.points % 100)}%` }} />
                        </div>
                    </div>

                    <div className="flex gap-10 flex-shrink-0 relative z-10">
                        <div className="flex flex-col items-center">
                            <div className="text-surface/80 text-xs md:text-sm font-black uppercase tracking-widest mb-3">Badges</div>
                            <div className="text-4xl font-black drop-shadow-sm">{profile.badges?.length || 0}</div>
                        </div>
                        <div className="flex flex-col items-center">
                            <div className="text-surface/80 text-xs md:text-sm font-black uppercase tracking-widest mb-3">Rank</div>
                            <div className="text-4xl font-black drop-shadow-sm">
                                #{leaderboard.findIndex(u => u.user_id === user.id) + 1 || '-'}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Leaderboard Table */}
            <div className="bg-surface rounded-[2.5rem] shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left whitespace-nowrap">
                        <thead className="bg-surface-alt text-text-muted font-black text-xs uppercase tracking-widest">
                            <tr>
                                <th className="px-10 py-6 w-24 text-center">Rank</th>
                                <th className="px-10 py-6">Student</th>
                                <th className="px-10 py-6 text-center">Level</th>
                                <th className="px-10 py-6 text-right w-40">XP</th>
                                <th className="px-10 py-6 text-center w-40">Badges</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border/60">
                            {leaderboard.map((u, i) => {
                                const isCurrentUser = u.user_id === user.id;
                                const isTop3 = i < 3;

                                return (
                                    <tr key={u.user_id} className={`transition-colors ${isCurrentUser ? 'bg-warning-light/40' : 'hover:bg-surface-alt/80'}`}>
                                        <td className="px-10 py-6 text-center">
                                            {i === 0 ? <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-warning-light shadow-sm text-warning font-black text-xl mx-auto"><Trophy size={24} /></div> :
                                                i === 1 ? <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-surface-elevated shadow-sm text-text-secondary font-black text-lg mx-auto"><Medal size={20} /></div> :
                                                    i === 2 ? <div className="inline-flex items-center justify-center w-10 h-10 rounded-2xl bg-danger-light shadow-sm text-danger font-black text-lg mx-auto"><Medal size={18} /></div> :
                                                        <div className="font-black text-text-muted text-xl w-10 text-center mx-auto">{i + 1}</div>}
                                        </td>
                                        <td className="px-10 py-6">
                                            <div className={`font-bold text-lg flex items-center gap-3 ${isCurrentUser ? 'text-warning' : 'text-text'}`}>
                                                {u.full_name} 
                                                {isCurrentUser && <span className="px-3 py-1 rounded-lg bg-warning text-surface text-[10px] uppercase font-black tracking-widest shadow-sm">You</span>}
                                            </div>
                                            <div className="text-sm font-bold text-text-muted mt-1">@{u.username}</div>
                                        </td>
                                        <td className="px-10 py-6 text-center">
                                            <span className="px-4 py-2 bg-accent-light text-accent font-black rounded-xl text-sm tracking-wide shadow-sm">
                                                Lvl {u.level}
                                            </span>
                                        </td>
                                        <td className="px-10 py-6 text-right font-black text-warning text-2xl tracking-tighter">
                                            {u.points.toLocaleString()}
                                        </td>
                                        <td className="px-10 py-6 text-center text-text-secondary font-black text-lg flex items-center justify-center gap-2">
                                            {u.badges_count} <Medal size={20} className="text-warning drop-shadow-sm" />
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Badges Inventory */}
            {profile && profile.available_badges && (
                <div className="pt-10">
                    <h2 className="text-4xl font-black text-text mb-10 tracking-tight">Badge Collection</h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                        {Object.entries(profile.available_badges).map(([key, badge]) => {
                            const earned = profile.badges.some(b => b.id === key);
                            const Icon = IconMap[badge.icon] || Award;
                            return (
                                <div key={key} className={`bg-surface rounded-[2rem] p-8 flex flex-col shadow-sm transition-all duration-300 ${earned ? 'hover:shadow-md hover:-translate-y-1 group' : 'opacity-70 grayscale-[0.5]'}`}>
                                    <div className={`w-16 h-16 rounded-[1.5rem] flex items-center justify-center mb-6 shadow-inner ${earned ? 'bg-warning-light text-warning group-hover:scale-110 transition-transform' : 'bg-surface-elevated text-text-secondary'}`}>
                                        <Icon size={32} />
                                    </div>
                                    <div className={`font-black text-xl mb-2 tracking-tight ${earned ? 'text-text group-hover:text-warning transition-colors' : 'text-text-secondary'}`}>{badge.name}</div>
                                    <div className={`text-sm font-medium leading-relaxed ${earned ? 'text-text-secondary' : 'text-text-muted'}`}>{badge.description}</div>

                                    {!earned && (
                                        <div className="mt-6 pt-6 border-t border-border/60 text-xs font-black text-text-muted uppercase tracking-widest flex items-center gap-2">
                                            <span>🔒 Locked</span>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
}
