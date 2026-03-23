const fs = require('fs');
const path = 'smartlms-frontend/src/pages/student/MyAnalytics.jsx';
let content = fs.readFileSync(path, 'utf8');

const target1 = '<div className="bg-surface rounded-[2.5rem] shadow-sm border border-border p-10 md:p-12">';
const target2 = '<h3 className="text-3xl font-black text-text tracking-tight mb-10 flex items-center gap-4">';
const target3 = '<div className="p-4 bg-surface-elevated text-text-secondary rounded-2xl border border-border shadow-inner"><Info size={28} /></div> How Your Engagement Is Measured';
const target4 = '</h3>';

const replStart = 
                <details className="bg-surface rounded-[2.5rem] shadow-sm border border-border group overflow-hidden">
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
                    <div className="p-8 md:p-10 pt-0 border-t border-border mt-2">
;

let idx1 = content.indexOf(target1);
let idx2 = content.indexOf(target4, idx1);

if (idx1 !== -1 && idx2 !== -1) {
    content = content.substring(0, idx1) + replStart + content.substring(idx2 + target4.length);
    console.log("Replaced start");
}

let idx3 = content.indexOf('</div>\n                </div>\n            )}\n\n            {/* Recent Sessions */}');
if (idx3 !== -1) {
    content = content.substring(0, idx3) + '</div>\n                </details>\n            )}\n\n            {/* Recent Sessions */}';
    console.log("Replaced end LF");
}

let idx4 = content.indexOf('</div>\r\n                </div>\r\n            )}\r\n\r\n            {/* Recent Sessions */}');
if (idx4 !== -1) {
    content = content.substring(0, idx4) + '</div>\r\n                </details>\r\n            )}\r\n\r\n            {/* Recent Sessions */}';
    console.log("Replaced end CRLF");
}

fs.writeFileSync(path, content, 'utf8');
