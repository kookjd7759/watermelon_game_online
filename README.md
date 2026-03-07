# 🍉 Watermelon Online

README 링크를 통해 바로 플레이할 수 있는 브라우저 수박 게임입니다.
GitHub 로그인 사용자는 최고 기록을 온라인 랭킹에 등록할 수 있고, 랭킹 스냅샷을 README에도 자동 반영할 수 있습니다.

## 🎮 Play Now

[![Play Watermelon Online](https://img.shields.io/badge/PLAY-Watermelon_Online-22c55e?style=for-the-badge)](https://YOUR_GITHUB_ID.github.io/REPO_NAME/)

## 🏆 Current Top 10

<!-- LEADERBOARD_START -->
_아직 랭킹 데이터가 없습니다._
<!-- LEADERBOARD_END -->

---

## 1. 레포를 이렇게 준비하세요

이 프로젝트는 별도 빌드 없이 그대로 GitHub Pages에 올릴 수 있는 정적 웹앱입니다.

```bash
git clone https://github.com/YOUR_GITHUB_ID/REPO_NAME.git
cd REPO_NAME
```

`config.example.js`를 복사해서 `config.js`를 만든 뒤 값만 채우세요.

```bash
cp config.example.js config.js
```

## 2. Supabase 설정

### Auth > Providers > GitHub

Supabase 문서 기준으로 GitHub 로그인은 **GitHub OAuth App 생성 → Supabase에 Client ID/Secret 입력 → 리디렉트 URL 등록** 순서로 연결합니다. citeturn0search1turn0search19turn0search5

다음 URL을 등록하세요.

- Site URL
  - `https://YOUR_GITHUB_ID.github.io/REPO_NAME/`
- Redirect URL
  - `https://YOUR_GITHUB_ID.github.io/REPO_NAME/`
- 개발용
  - `http://localhost:5500/` 또는 네가 쓰는 로컬 서버 주소

### SQL Editor

`database.sql` 전체를 실행하세요.

### Project Settings > API

아래 두 값을 `config.js`에 넣으세요.

```js
export const SUPABASE_URL = 'https://YOUR_PROJECT_ID.supabase.co';
export const SUPABASE_ANON_KEY = 'YOUR_SUPABASE_ANON_KEY';
export const REDIRECT_TO = window.location.origin + window.location.pathname;
```

## 3. GitHub Pages 배포

GitHub Pages는 저장소의 정적 파일을 사이트로 배포할 수 있고, 필요하면 **GitHub Actions 기반 사용자 지정 워크플로**로 배포할 수 있습니다. citeturn0search0turn0search10turn0search6

이 프로젝트는 루트 정적 파일 방식이라서 가장 쉬운 방법은:

- 리포 업로드
- **Settings > Pages**
- **Deploy from a branch**
- Branch: `main`
- Folder: `/ (root)`

이렇게 설정하면 됩니다. 또는 아래 workflow를 그대로 사용해도 됩니다.

## 4. README 랭킹 자동 갱신

`.github/workflows/update-readme-leaderboard.yml`는 Supabase에서 랭킹을 읽어서 README의 `LEADERBOARD_START ~ LEADERBOARD_END` 구간을 자동 수정합니다.

GitHub Actions는 저장소에서 워크플로를 실행해 자동화 작업을 처리할 수 있습니다. citeturn0search14turn0search16turn0search20

### 저장소 Secrets에 추가

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

`SUPABASE_SERVICE_ROLE_KEY`는 절대 프론트엔드 `config.js`에 넣으면 안 됩니다.

## 5. 네가 수정해야 하는 곳

### README Play 링크

```md
[![Play Watermelon Online](https://img.shields.io/badge/PLAY-Watermelon_Online-22c55e?style=for-the-badge)](https://YOUR_GITHUB_ID.github.io/REPO_NAME/)
```

여기서:
- `YOUR_GITHUB_ID` → `kookjd7759`
- `REPO_NAME` → 네가 정한 레포 이름

### config.js

Supabase URL/anon key만 넣으면 됩니다.

## 6. 추천 레포 이름

- `watermelon-online`
- `suika-rank`
- `github-suika`
- `watermelon-leaderboard`
- `suika-pages`
- `melon-drop-arena`
- `watermelon-battleboard`

내 추천 1순위는 **`watermelon-online`** 입니다.
이유는 이름만 봐도 게임 + 온라인 랭킹 구조가 바로 이해되고, README 링크/배지 이름으로도 깔끔합니다.
