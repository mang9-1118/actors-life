# 공고 자동 완성

오디션 지원 탭에서 공고 정보(오디션명 · 작품 종류 · 마감일)를 자동으로 채우는 기능.
사이트마다 경로가 다르다.

| | 필름메이커스 | 플필 |
|---|---|---|
| 북마클릿 | **가능** (유일한 방법) | **가능** |
| 주소 붙여넣기 | 불가 — 사이트가 서버 접근을 403으로 막음 (아래) | 가능 |
| 파싱하는 곳 | `src/lib/castingBookmarklet.ts` (브라우저) | 위 + `api/casting.ts` (Edge 함수) |

**북마클릿 하나가 두 사이트를 다 처리한다.** `location.hostname`으로 갈라서 필름메이커스는
JSON-LD와 DOM을, 플필은 `__NEXT_DATA__`를 읽는다. 버튼도 하나, 등록도 한 번이다.

플필은 북마클릿과 주소 붙여넣기 두 경로가 다 살아 있다 — 모바일에는 북마크바가 없어
북마클릿을 누를 방법이 사실상 없으므로 주소 경로를 남겨뒀다. 두 경로는 같은
`draftFromNotice()`로 합쳐져 양식을 채운다.

주소 입력칸에 필름메이커스 주소를 넣으면 서버를 부르기 전에 북마클릿을 쓰라는 안내가
나온다 (`BOOKMARKLET_ONLY_HOSTS`).

## 필름메이커스를 서버에서 읽는 건 끝난 이야기다

**다시 시도하지 말 것.** 세 가지 구성에서 모두 403이고, 같은 코드가 가정용 IP에서는
200이다. 기준은 발신 IP다.

- 차단 주체는 평범한 Apache (`Server: Apache`, 정적 403 페이지 199바이트).
  Cloudflare나 JS 챌린지가 아니라 **서버 단 거부 규칙**이다.
- 헤더 없는 요청은 **한국 가정용 IP에서도 403**. 브라우저 헤더를 갖추면 200.
- 실패한 구성: ① Node 함수 / us-east(iad1) ② Node 함수 / 서울(icn1)
  ③ **Edge 런타임** (`b8025bb` 배포, 2026-07-27). 셋 다 완전한 브라우저 헤더를 보냈다.
- 사이트가 요청 빈도로 막는 건 아니다 (같은 IP로 10연속 요청 전부 200).
- `X-Frame-Options: SAMEORIGIN`이라 iframe으로 읽는 방법도 막혀 있다.
- 같은 배포에서 플필은 정상이므로 함수 자체의 문제가 아니다.

사이트 정책이 바뀌어 되돌리고 싶어지면, 서버용 필름메이커스 어댑터(JSON-LD +
라벨 행 파서)는 `git show b8025bb:api/casting.ts`에 온전히 있다.

## 북마클릿

`castingBookmarkletHref(appUrl)`이 `javascript:void((함수)("앱주소"))` 문자열을 만든다.
오디션 지원 탭의 `[오디션 가져오기]` 버튼이 그 주소를 달고 있고, 사용자가 북마크바로
끌어다 놓는다. 약 1.5KB.

- **`readFilmmakersNotice()`는 자기완결적이어야 한다.** 함수를 문자열화해서 내보내므로
  모듈 스코프를 참조하면 번들러가 이름을 바꿔 공고 페이지에서 터진다. `//` 주석도 두지
  않는다 (한 줄로 직렬화되므로).
- 앱 주소는 렌더 시점에 박힌다. 즉 **배포된 앱에서 끌어다 놓은 북마클릿은 배포된 앱으로,
  로컬 빌드에서 끌어다 놓은 것은 로컬로 돌아온다.** 배포 주소가 바뀌면 다시 등록해야 한다.
- 값 전달은 `#/train/audition-apply?import=<encodeURIComponent(JSON)>`. 앱이 `HashRouter`라
  해시가 곧 라우트이므로 쿼리는 해시 **안**에 넣는다. 프래그먼트는 서버로 전송되지 않아
  로그에도 남지 않는다.
- `window.open(target, 'actorsLifeCastingImport')` — `_blank`가 아니라 **이름 있는 창**이다.
  그래서 두 번째 이후로는 새 탭이 쌓이지 않고 같은 앱 탭이 재사용된다(해시만 바뀌어도
  `HashRouter`가 받는다). 공고 페이지는 그대로 남는다. 다만 브라우저가 아는 이름은
  `window.open`으로 열린 탭에만 붙으므로, **사용자가 직접 열어둔 앱 탭은 재사용되지 않고
  첫 클릭에서 탭이 하나 생긴다.** 팝업이 막히면 `location.href`로 현재 탭에서 이동한다.
- React는 `javascript:` href를 지운다. 그래서 `CastingBookmarklet.tsx`는 마운트 후
  `setAttribute`로 직접 넣는다.
- 공고 상세가 아닌 페이지에서 누르면 `alert`로 알린다. 사이트별로 다른 문구가 나오도록
  필름메이커스는 JSON-LD `JobPosting`이 있는지, 플필은 `작품명`이나 `공고 모집 마감일`
  라벨이 있는지로 상세 페이지를 판별한다. 앱 안에서 눌러도 안내가 뜨고, 그게 이 버튼의
  사용법 힌트 역할을 한다.
- JSON에서 꺼낸 값은 HTML 엔티티가 살아 있어(`&quot;` 등) 분리된 `<textarea>`에 `innerHTML`로
  넣고 `value`로 되읽어 디코딩한다. textarea 안은 실행되지 않아 안전하다. DOM `textContent`로
  읽은 값은 이미 디코딩돼 있으니 다시 디코딩하지 않는다.

### 받는 쪽은 아무것도 믿지 않는다

`parseImportedNotice()`가 URL로 들어온 값을 검증한다. 링크는 카드 제목의 `href`가 되므로
**`javascript:`가 통과하면 XSS다.** 그래서 `NOTICE_HOSTS` 화이트리스트 + http(s)만 링크로
인정하고, 나머지는 링크를 버린다(제목은 살린다). 마감일은 `YYYY-MM-DD`가 아니면 무시하고,
오디션명이 없으면 전체를 거부한다. 지원처는 호스트가 인정된 경우에만 채운다.

## 필드 매핑 (2026-07-27 실제 공고로 확인)

| | 필름메이커스 — 북마클릿 | 플필 — 북마클릿 | 플필 — 서버 |
|---|---|---|---|
| 읽는 곳 | JSON-LD `JobPosting` + DOM | **DOM만** (아래 함정) | `__NEXT_DATA__` |
| 오디션명 | `작품 제목` 라벨의 다음 형제 (없으면 JSON-LD `title`) | `작품명` 라벨의 다음 `<p>` | `artWorkName` (없으면 `title`) |
| 작품 종류 | `.text-sub.font-bold.opacity-80` | `작품 카테고리` 라벨의 다음 `<p>` | `artCategoryName` |
| 마감일 | `validThrough` **+9시간** | `공고 모집 마감일` 값 그대로 (`2026-07-30`) | `castingEndDate` **+9시간** |
| 지원처 | `필름메이커스` 고정 | `플필` 고정 | `플필` 고정 |
| 공고 링크 | `location.origin + pathname` | 같음 | 쿼리스트링 뺀 주소 |

플필은 두 경로가 같은 값을 낸다 (4111·4119 실제 공고로 양쪽 확인).

### 함정: `__NEXT_DATA__`는 클릭 이동 후 낡는다

북마클릿의 플필 파싱은 처음에 `__NEXT_DATA__`를 읽었고 **실제 브라우저에서 실패했다.**
그 스크립트는 최초로 로드된 문서의 것이 그대로 남아, 목록에서 공고를 클릭해 들어가면
(Next.js 클라이언트 라우팅) 여전히 **목록**을 담고 있다. 서버 fetch로 검증할 때는 항상
새 문서를 받으니 이 문제가 드러나지 않는다.

그래서 북마클릿은 플필도 **화면에 렌더된 DOM**을 읽는다. 화면은 항상 지금 보고 있는 공고다.
`api/casting.ts`는 매번 새로 fetch하므로 `__NEXT_DATA__`를 계속 써도 된다.

jsdom 검증에는 **목록 페이지의 `__NEXT_DATA__`를 상세 페이지 HTML에 이식한 케이스**와
**스크립트를 아예 지운 케이스**를 넣어뒀다. 둘 다 정상 값이 나와야 한다.

온/오프라인은 파싱하지 않는다. 공고에서 가져온 건 **항상 온라인**이다.

마감일은 두 사이트 모두 "한국 날짜의 마지막 순간"이지만 직렬화가 다르다. **+9시간 이동**이
두 형식을 모두 맞게 처리한다. 화면 표시값과 대조해 검증했다 (필름메이커스
`~8월 15일 (토) D-19`, 플필 `오늘 마감 / 26-07-27`). 특히 플필의
`2026-07-26T23:59:59.000Z`는 **07-27이 맞다** — 문자열의 날짜 부분을 그대로 쓰면 하루 밀린다.

작품 종류 클래스는 공고 페이지에 한 번만 나오고 제목 `<h1>` 바로 위에 있다 (사이드바의
카테고리 필터와 섞이지 않는다).

## 알아둘 것

- 공고 링크는 `AuditionItem.url`에 저장하고 보드 카드의 오디션명을 그 링크로 만든다.
  수기 입력 오디션은 링크가 없어 제목이 평문이다. 양식에 링크 칸은 없지만
  `AuditionDraft.url`로 실려 다녀 수정해도 사라지지 않는다.
- 스토어는 **v4**. v3이 지웠던 `url`을 되돌린다. 기존 값이 이기도록 써서 v3을 거치지 않은
  v2 데이터는 링크를 되찾는다. 저장된 payload에 `version`이 없으면 zustand가 마이그레이션을
  건너뛰므로 `url`·`category`가 없는 항목이 남을 수 있다 — 카드와 `draftFromItem()`이
  각각 방어한다.
- `/api/casting`은 다른 API와 같이 `APP_ACCESS_KEY`로 게이트된다. 설정에 앱 접근 키가
  없으면 401이다.
- **함수 리전은 대시보드 설정만으로 유지되지 않는다.** Settings에서 서울로 바꾸고
  Redeploy하면 그 배포에는 적용되지만 이후 git 푸시로 만들어진 배포는 다시 `iad1`로
  돌아갔다 (`X-Vercel-Id`의 두 번째 값으로 확인). 유지하려면 `vercel.json`에
  `{ "regions": ["icn1"] }`가 필요하다. 지금은 Edge라 무관.

## 로컬에서 검증하는 방법

`npm run dev`는 `/api/*`를 서빙하지 않는다. 핸들러만 떼어 실제 공고로 돌리는 게 빠르다.

```
npx esbuild api/casting.ts --format=esm --platform=node --target=node20 --outfile=tmp/casting.mjs
```

Node에서 `handler(new Request('https://x/api/casting', { method:'POST',
body: JSON.stringify({ url }), headers:{'Content-Type':'application/json'} }))`를 호출한다.
정상 공고와 오류 경로(목록 페이지, 없는 번호, 미지원 호스트, 잘못된 주소, 빈 본문, GET)를
함께 돌리면 회귀를 잡을 수 있다.

**북마클릿은 jsdom으로 실제 공고 페이지에 대고 돌려볼 수 있다.** 두 사이트의 공고와 목록
페이지, 그리고 엉뚱한 사이트까지 돌리면 안내 문구 분기까지 잡힌다. 저장소를 건드리지 않게
설치한다:

```
npm install --no-save --no-package-lock jsdom
npx esbuild src/lib/castingBookmarklet.ts --bundle --minify --format=esm --outfile=tmp/bm.mjs
```

`--minify`로 뽑는 게 중요하다 — 자기완결성이 깨지면 여기서 드러난다. 공고 HTML을 fetch해
`new JSDOM(html, { url: 공고주소, runScripts: 'outside-only' })`에 넣고, `window.open`과
`window.alert`를 가로챈 뒤 `window.eval(href.slice('javascript:'.length))`를 호출해
넘어가는 payload를 확인한다. 끝나면 `npm uninstall --no-save --no-package-lock jsdom`.

스토어 마이그레이션은 `useAuditionStore.ts`를 `--alias:@=./src`로 번들해 Node에서
`globalThis.window = { localStorage: ... }`를 깔고(zustand가 `window.localStorage`를 본다)
버전별 payload로 하이드레이션해 확인한다.

## 다음에 할 일

- **브라우저에서 북마클릿을 실제로 등록해 눌러본 적이 없다.** jsdom으로 파싱과 payload는
  검증했지만, 북마크바 드래그 → 클릭 → 앱이 열리며 양식이 채워지는 흐름은 사람이 한 번
  해봐야 한다.
- `dist/`를 정적 서빙하면서 `/api/casting`만 핸들러로 넘기는 작은 Node 서버를 두면 화면까지
  같이 볼 수 있다. 자주 쓸 것 같으면 `npm run dev:api` 스크립트로 저장소에 넣을 것.
