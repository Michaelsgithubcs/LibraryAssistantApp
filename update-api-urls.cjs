const fs = require('fs');
const path = require('path');

const files = [
  'src/components/AdminBookUpload.tsx',
  'src/components/AdminDashboard.tsx',
  'src/components/BookRequests.tsx',
  'src/components/BookSearch.tsx',
  'src/components/EnhancedMemberManagement.tsx',
  'src/components/FinesManagement.tsx',
  'src/components/IssueReturn.tsx',
  'src/components/LibraryChatbot.tsx',
  'src/components/MyBooks.tsx',
  'src/components/UserDashboard.tsx',
  'src/pages/Index.tsx'
];

files.forEach(filePath => {
  const fullPath = path.join(__dirname, filePath);
  if (!fs.existsSync(fullPath)) {
    console.log(`Skipping ${filePath} - not found`);
    return;
  }
  
  let content = fs.readFileSync(fullPath, 'utf8');
  
  // Add import if not exists
  if (!content.includes('API_BASE_URL')) {
    // Find the first import statement and add after it
    const importMatch = content.match(/^import .+$/m);
    if (importMatch) {
      const insertPos = importMatch.index + importMatch[0].length;
      content = content.slice(0, insertPos) + '\nimport { API_BASE_URL } from "@/config/api";' + content.slice(insertPos);
    }
  }
  
  // Replace all localhost URLs
  content = content.replace(/['"]http:\/\/localhost:5001\/api/g, '`${API_BASE_URL}');
  
  fs.writeFileSync(fullPath, content, 'utf8');
  console.log(`✅ Updated ${filePath}`);
});

console.log('\n✅ All files updated!');
