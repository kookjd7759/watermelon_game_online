const fs = require('fs');

const repoOwner = process.env.GITHUB_REPOSITORY?.split('/')[0] || 'YOUR_GITHUB_ID';
const repoName = process.env.GITHUB_REPOSITORY?.split('/')[1] || 'REPO_NAME';
const supabaseUrl = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error('SUPABASE_URL 또는 SUPABASE_SERVICE_ROLE_KEY 가 없습니다.');
}

async function main() {
  const endpoint = `${supabaseUrl}/rest/v1/scores?select=username,best_score,updated_at&order=best_score.desc,updated_at.asc&limit=10`;

  const response = await fetch(endpoint, {
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Supabase 조회 실패: ${response.status} ${response.statusText}`);
  }

  const rows = await response.json();

  const table = rows.length === 0
    ? '_아직 랭킹 데이터가 없습니다._'
    : [
        '| Rank | User | Score | Updated |',
        '|---:|---|---:|---|',
        ...rows.map((row, index) => `| ${index + 1} | ${row.username} | ${row.best_score} | ${new Date(row.updated_at).toLocaleString('ko-KR')} |`),
      ].join('\n');

  const playLink = `https://${repoOwner}.github.io/${repoName}/`;

  let readme = fs.readFileSync('README.md', 'utf8');
  readme = readme.replace(
    /\[!\[Play Watermelon Online\]\([^\)]*\)\]\([^\)]*\)/,
    `[![Play Watermelon Online](https://img.shields.io/badge/PLAY-Watermelon_Online-22c55e?style=for-the-badge)](${playLink})`,
  );

  readme = readme.replace(
    /<!-- LEADERBOARD_START -->[\s\S]*<!-- LEADERBOARD_END -->/,
    `<!-- LEADERBOARD_START -->\n${table}\n<!-- LEADERBOARD_END -->`,
  );

  fs.writeFileSync('README.md', readme, 'utf8');
  console.log('README leaderboard updated successfully.');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
