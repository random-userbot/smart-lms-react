const fs = require('fs');
const file = 'src/pages/student/MyAnalytics.jsx';
let text = fs.readFileSync(file, 'utf8');

text = text.replace('</div>\n                </details>\n            )}\n\n            {/* Recent Sessions */}', '</div>\n                    </div>\n                </details>\n            )}\n\n            {/* Recent Sessions */}');

fs.writeFileSync(file, text);
