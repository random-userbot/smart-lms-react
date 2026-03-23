import { useState, useEffect } from 'react';
import { adminAPI } from '../../api/client';
import { Users, Shield, Trash2, ToggleLeft, ToggleRight, Search } from 'lucide-react';

export default function UserManagement() {
    const [users, setUsers] = useState([]);
    const [roleFilter, setRoleFilter] = useState('');
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(true);

    const fetchUsers = () => {
        adminAPI.listUsers({ role: roleFilter || undefined })
            .then(res => setUsers(res.data || []))
            .catch(() => { }).finally(() => setLoading(false));
    };
    useEffect(fetchUsers, [roleFilter]);

    const handleToggle = async (userId) => {
        await adminAPI.toggleUserActive(userId);
        fetchUsers();
    };

    const handleDelete = async (userId) => {
        if (!confirm('Delete this user? This cannot be undone.')) return;
        await adminAPI.deleteUser(userId);
        fetchUsers();
    };

    const filtered = users.filter(u =>
        u.full_name.toLowerCase().includes(search.toLowerCase()) ||
        u.username.toLowerCase().includes(search.toLowerCase()) ||
        u.email.toLowerCase().includes(search.toLowerCase())
    );

    if (loading) return <div className="flex h-[50vh] items-center justify-center"><div className="w-12 h-12 border-4 border-accent-light border-t-accent rounded-full animate-spin"></div></div>;

    return (
        <div className="w-full mx-auto px-6 lg:px-10 py-12 animate-in fade-in">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
                <div>
                    <h1 className="text-4xl md:text-5xl font-black text-text tracking-tight mb-3">User Management</h1>
                    <p className="text-text-secondary font-medium text-xl">Manage all students, teachers, and admins on the platform.</p>
                </div>
                <div className="flex bg-surface-elevated p-2 rounded-2xl w-full md:w-auto shadow-sm border border-border">
                    {['', 'student', 'teacher', 'admin'].map(r => (
                        <button key={r} className={`flex-1 md:flex-none px-6 py-3 text-sm font-black rounded-xl transition-all ${roleFilter === r ? 'bg-accent text-white shadow-md' : 'text-text-muted hover:text-text-secondary hover:bg-surface-alt'}`}
                            onClick={() => setRoleFilter(r)}>
                            {r ? r.charAt(0).toUpperCase() + r.slice(1) : 'All Users'}
                        </button>
                    ))}
                </div>
            </div>

            <div className="bg-surface rounded-3xl shadow-sm border border-border overflow-hidden mb-8">
                <div className="p-6 border-b border-border bg-surface-alt">
                    <div className="relative w-full md:w-[450px] group">
                        <Search size={22} className="absolute left-5 top-1/2 -translate-y-1/2 text-text-muted group-focus-within:text-accent transition-colors" />
                        <input className="input py-4 !pl-14 text-base rounded-2xl bg-surface-elevated shadow-sm w-full"
                            placeholder="Search by name, username, or email..." value={search}
                            onChange={e => setSearch(e.target.value)} />
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm whitespace-nowrap">
                        <thead className="bg-surface-alt text-text-muted font-black uppercase tracking-widest text-xs border-b border-border">
                            <tr>
                                <th className="px-8 py-5">Name</th>
                                <th className="px-8 py-5">Username</th>
                                <th className="px-8 py-5">Email</th>
                                <th className="px-8 py-5">Role</th>
                                <th className="px-8 py-5">Status</th>
                                <th className="px-8 py-5 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {filtered.length > 0 ? filtered.map(u => (
                                <tr key={u.id} className="hover:bg-surface-alt/50 transition-colors">
                                    <td className="px-8 py-5 font-black text-text flex items-center gap-4 text-base">
                                        <div className="h-10 w-10 rounded-full bg-accent-light text-accent flex items-center justify-center font-black text-sm">
                                            {u.full_name.charAt(0)}
                                        </div>
                                        {u.full_name}
                                    </td>
                                    <td className="px-8 py-5 font-medium text-text-secondary">{u.username}</td>
                                    <td className="px-8 py-5 font-medium text-text-secondary">{u.email}</td>
                                    <td className="px-8 py-5">
                                        <span className={`inline-flex items-center px-4 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider ${u.role === 'admin' ? 'bg-danger-light text-danger' :
                                                u.role === 'teacher' ? 'bg-warning-light text-warning' :
                                                    'bg-info-light text-info'}`}>
                                            {u.role}
                                        </span>
                                    </td>
                                    <td className="px-8 py-5">
                                        <span className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider ${u.is_active ? 'bg-success-light text-success' : 'bg-surface-alt text-text-muted border border-border'}`}>
                                            <span className={`h-2 w-2 rounded-full ${u.is_active ? 'bg-success' : 'bg-border'}`}></span>
                                            {u.is_active ? 'Active' : 'Inactive'}
                                        </span>
                                    </td>
                                    <td className="px-8 py-5 text-right">
                                        <div className="flex items-center justify-end gap-3">
                                            <button className="p-2.5 text-text-muted hover:text-accent hover:bg-accent-light rounded-xl transition-colors" onClick={() => handleToggle(u.id)} title={u.is_active ? "Deactivate User" : "Activate User"}>
                                                {u.is_active ? <ToggleRight size={22} className="text-success" /> : <ToggleLeft size={22} />}
                                            </button>
                                            <button className="p-2.5 text-text-muted hover:text-danger hover:bg-danger-light rounded-xl transition-colors" onClick={() => handleDelete(u.id)} title="Delete User">
                                                <Trash2 size={22} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            )) : (
                                <tr>
                                    <td colSpan="6" className="px-8 py-20 text-center text-text-muted">
                                        <Users className="mx-auto h-16 w-16 text-border mb-4" />
                                        <p className="text-xl font-black text-text mb-2 tracking-tight">No users found</p>
                                        <p className="text-base font-medium">We couldn't find anyone matching your search.</p>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
