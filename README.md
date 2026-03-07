# 🍉 Watermelon Game

GitHub Pages로 바로 플레이할 수 있는 브라우저 수박 게임입니다.

## 실행 링크 예시

```md
[🎮 Play Watermelon Game](https://kookjd7759.github.io/watermelon-game/)
```

## 특징

- HTML / CSS / JavaScript만으로 동작
- Matter.js 기반 물리 처리
- 최고 기록 localStorage 저장
- GitHub Pages에 바로 배포 가능
- 로그인 / 서버 / DB 없이 순수 플레이용

## 로컬 실행

그냥 `index.html`을 열어도 되지만, 브라우저 정책 때문에 가장 안정적인 방법은 간단한 로컬 서버 실행입니다.

### VS Code Live Server
- 프로젝트 폴더 열기
- `index.html` 우클릭
- `Open with Live Server`

### Python 서버
```bash
python -m http.server 8000
```
그 뒤 브라우저에서 `http://localhost:8000` 접속

## GitHub Pages 배포

1. 새 저장소 생성
2. 이 파일들 업로드
3. GitHub 저장소에서 **Settings → Pages** 이동
4. **Deploy from a branch** 선택
5. 브랜치 `main`, 폴더 `/ (root)` 선택
6. 저장
7. 몇 분 뒤 아래 주소로 접속

```text
https://kookjd7759.github.io/레포이름/
```

## 추천 레포 이름

- `watermelon-game`
- `suika-game-web`
- `watermelon-drop`
- `fruit-merge-game`
- `k-watermelon-game`

제일 무난한 건 **`watermelon-game`**.

## README 버튼 예시

```md
# 🍉 Watermelon Game

[![Play Game](https://img.shields.io/badge/PLAY-Watermelon_Game-22c55e?style=for-the-badge)](https://kookjd7759.github.io/watermelon-game/)
```
