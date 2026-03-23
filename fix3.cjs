const fs = require('fs');
const file = 'smartlms-frontend/src/pages/student/MyAnalytics.jsx';
let text = fs.readFileSync(file, 'utf8');

const regexOpen = /<div className="bg-surface rounded-\[2\.5rem\] shadow-sm border border-border p-10 md:p-12">[\s\S]*?How Your Engagement Is Measured\s*<\/h3>/;
text = text.replace(regexOpen, `<details className="bg-surface rounded-[2.5rem] shadow-sm border border-border group overflow-hidden">
                    <summary className="p-8 md:p-10 flex text-left items-center justify-between cursor-pointer list-none hover:bg-surface-alt transition-colors focus:outline-none focus:ring-2 focus:ring-inset focus:ring-accent">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-surface-elevated text-text-secondary rounded-2xl border border-border shadow-inner"><Info size={24} /></div>
                            <div>
                                <h3 className="text-2xl font-black text-text tracking-tight m-0">How Your Engagement Is Measured</h3>
                                <p className="text-sm font-bold text-text-muted mt-1">Click to view model details, framework, and features analyzed</p>
                            </div>
                        </div>
                        <div className="text-text-muted group-open:rotate-180 transition-transform">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
                        </div>
                    </summary>
                    <div className="p-8 md:p-10 pt-0 border-t border-border mt-2">`);

const regexClose = /<\/div>\s*<\/div>\s*\)\}\s*\{\/\*\s*Recent Sessions\s*\*\/\}/;
text = text.replace(regexClose, `</div>\n                </details>\n            )}\n\n            {/* Recent Sessions */}`);

fs.writeFileSync(file, text);
console.log('done');
