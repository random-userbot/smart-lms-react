import React, { useState } from 'react';
import { 
    FileText, FileArchive, FileIcon, Download 
} from 'lucide-react';

export default function MaterialsTab({ materials, trackEvent }) {
    const [viewerUrl, setViewerUrl] = useState(null);
    const [viewerTitle, setViewerTitle] = useState('');

    if (materials.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center p-24 text-center">
                <div className="p-8 bg-surface-alt text-text-muted rounded-[2rem] mb-6 inline-flex items-center justify-center">
                    <FileText size={64} strokeWidth={1}/>
                </div>
                <h3 className="text-2xl font-black text-text mb-3 tracking-tight">No materials available</h3>
                <p className="text-text-secondary font-medium text-lg max-w-sm">There are no reading materials or resources attached to this lecture.</p>
            </div>
        );
    }

    const handleDownload = (mat) => {
        if (trackEvent) trackEvent('material_download', { file_id: mat.id, file_name: mat.title, file_type: mat.file_type });
        const a = document.createElement('a');
        a.href = mat.file_url;
        a.download = mat.title;
        a.target = '_blank';
        a.click();
    };

    const handleView = (mat) => {
        if (trackEvent) trackEvent('material_viewed', { file_id: mat.id, file_name: mat.title, file_type: mat.file_type });
        setViewerTitle(mat.title);
        setViewerUrl(mat.file_url);
    };

    const getIcon = (type = '') => {
        if (type.includes('pdf')) return <div className="p-4 bg-danger-light text-danger rounded-2xl flex-shrink-0"><FileText size={28} /></div>;
        if (type.includes('zip') || type.includes('rar')) return <div className="p-4 bg-warning-light text-warning rounded-2xl flex-shrink-0"><FileArchive size={28} /></div>;
        return <div className="p-4 bg-info-light text-info rounded-2xl flex-shrink-0"><FileIcon size={28} /></div>;
    };

    const isPdf = (type = '') => type.includes('pdf');

    return (
        <>
            <div className="p-10 md:p-14 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8 bg-surface-alt">
                {materials.map(mat => (
                    <div key={mat.id} className="bg-surface rounded-3xl p-6 shadow-sm border border-border hover:shadow-md hover:border-accent/30 transition-all group flex flex-col gap-4">
                        <div className="flex items-center gap-4">
                            {getIcon(mat.file_type)}
                            <div className="flex-1 overflow-hidden">
                                <h4 className="font-bold text-text text-lg mb-1 truncate leading-tight" title={mat.title}>{mat.title}</h4>
                                <span className="text-xs font-black text-text-muted uppercase tracking-widest">
                                    {mat.file_type} • {(mat.file_size / 1024).toFixed(0)} KB
                                </span>
                            </div>
                        </div>
                        <div className="flex gap-3 pt-2 border-t border-border">
                            {isPdf(mat.file_type) && (
                                <button
                                    className="flex-1 btn btn-sm bg-accent-light text-accent border-accent/20 hover:bg-accent hover:text-white justify-center"
                                    onClick={() => handleView(mat)}
                                >
                                    👁 View Full
                                </button>
                            )}
                            <button
                                className="flex-1 btn btn-sm bg-surface-elevated text-text-secondary border-border hover:bg-surface hover:text-accent justify-center"
                                onClick={() => handleDownload(mat)}
                                title="Download">
                                <Download size={16} className="mr-1.5" /> Download
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            {/* PDF Full-View Modal */}
            {viewerUrl && (
                <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center p-4 animate-in fade-in">
                    <div className="w-full max-w-5xl h-[90vh] bg-surface rounded-[2rem] overflow-hidden border border-border shadow-2xl flex flex-col">
                        <div className="flex items-center justify-between px-8 py-5 border-b border-border bg-surface-alt flex-shrink-0">
                            <div className="flex items-center gap-4">
                                <div className="p-2.5 bg-danger-light text-danger rounded-xl border border-danger/20">
                                    <FileText size={22} />
                                </div>
                                <span className="font-black text-text text-lg truncate max-w-[500px]">{viewerTitle}</span>
                            </div>
                            <div className="flex items-center gap-3">
                                <a
                                    href={viewerUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    download
                                    className="btn btn-sm bg-surface text-text-secondary border-border hover:bg-accent hover:text-white hover:border-accent"
                                >
                                    <Download size={16} className="mr-1.5" /> Download
                                </a>
                                <button
                                    onClick={() => setViewerUrl(null)}
                                    className="w-10 h-10 flex items-center justify-center rounded-xl bg-surface text-text-muted hover:text-text hover:bg-surface-elevated border border-border transition-all font-black text-xl"
                                >×</button>
                            </div>
                        </div>
                        <iframe
                            src={viewerUrl}
                            className="flex-1 w-full bg-white"
                            title={viewerTitle}
                        />
                    </div>
                </div>
            )}
        </>
    );
}
