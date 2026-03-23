const fs = require('fs');
const file = 'src/pages/student/MyAnalytics.jsx';
let text = fs.readFileSync(file, 'utf8');

text = text.replace(/<\/div>\s*<\/div>\s*<\/div>\s*\)\;\s*\}/, '</div>\n            </div>\n            </div>\n            </div>\n            </div>\n    );\n}');

fs.writeFileSync(file, text);
