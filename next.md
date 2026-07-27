# 다음에 할 일

## 공고 주소 자동 완성 (처음부터 다시)

**현재 이 기능은 코드에서 전부 제거된 상태다.** 오디션 지원 탭에는 사이트 퀵링크와
수기 입력 폼만 있다. 아래는 지웠지만 유효한 조사 결과이니, 다시 만들 때 다시
파헤치지 않도록 남겨둔다.

목표는 필름메이커스와 플필 **동시 지원**.

### 지운 코드 위치

전부 커밋 `921520f`에 있다. 필요한 부분만 꺼내 참고할 수 있다.

```
git show 921520f:api/casting.ts              # 서버: 호스트 allowlist + 사이트별 파서
git show 921520f:src/lib/casting.ts          # 클라이언트: /api/casting 호출
git show 921520f:src/features/CastingUrlImport.tsx   # UI: 주소 입력 + 불러오기
```

플필 어댑터(`plfilNoticeData()`, `stringField()`, `PLFIL`)는 `921520f`에는 없다.
플필까지 있던 마지막 버전은 `30fcacb`다.

```
git show 30fcacb:api/casting.ts
```

`AuditionItem`에 있던 `url` 필드(공고 링크 저장, 카드 제목을 링크로)도 함께 제거했고,
스토어 마이그레이션 v3에서 기존 데이터의 `url`을 지운다. 다시 만들 때 필드를 되살리려면
마이그레이션을 한 번 더 올려야 한다. `category`(작품 종류)는 수기 입력 칸이 있어 남겨뒀다.

### 두 사이트 필드 매핑 (확인된 값)

| | 필름메이커스 | 플필 |
|---|---|---|
| 데이터 출처 | JSON-LD `JobPosting` + HTML 라벨 행 | `__NEXT_DATA__` → `props.pageProps.data` |
| 오디션명 | `작품 제목` 라벨의 값 | `artWorkName` (없으면 `title`) |
| 작품 종류 | `text-sub font-bold opacity-80 decoration-indigo-200 text-base` 클래스 | `artCategoryName` |
| 마감일 | `validThrough` (`...T23:59:59+09:00`) | `castingEndDate` (`...T23:59:59.000Z`) |
| 지원처 | `필름메이커스` (사이트명 고정) | `플필` (사이트명 고정) |
| 온/오프라인 | `online` 고정 | `online`으로 넣었음 — **확정 필요** |

마감일은 두 사이트 모두 "한국 날짜의 마지막 순간"을 뜻하는데 직렬화 방식이 다르다.
기존 `kstDateKey()`가 +9시간 이동으로 두 형식을 모두 올바르게 처리한다. 각 사이트가
화면에 표시하는 D-day와 대조해 검증했다.

## 막혀 있는 문제: 필름메이커스가 배포 환경에서 403

**로컬에서는 되고 Vercel에서는 안 된다.** 같은 코드, 같은 헤더다.

측정한 사실:

- 차단 주체는 평범한 Apache (`Server: Apache`, 정적 403 페이지 199바이트).
  Cloudflare나 JS 챌린지가 아니라 **서버 단 거부 규칙**이다.
- 헤더 없는 요청은 **한국 가정용 IP에서도 403**. 브라우저 헤더를 갖추면 200.
- 브라우저 헤더를 완전히 갖춰도 **Vercel에서는 403**. `us-east(iad1)`와
  `서울(icn1)` 두 리전 모두 실패.
- 사이트가 요청 빈도로 막는 건 아니다 (같은 IP로 10연속 요청 전부 200).
- 즉 **발신 IP의 평판/대역**이 기준으로 보인다. 클라우드 IP를 광범위하게 막는 쪽.
- `X-Frame-Options: SAMEORIGIN`이라 iframe으로 읽는 방법도 막혀 있다.

이미 시도해서 실패한 것:

1. 브라우저 헤더 일체 추가 (`Accept`, `Sec-Fetch-*`, `Sec-Ch-Ua*` 등) — 실패
2. 함수 리전을 서울로 변경 — 실패

시도했고 **결과 미확인**:

3. Edge 런타임 전환 (`export const config = { runtime: 'edge' }`) — Vercel 엣지망은
   AWS Lambda와 IP 대역이 다르다. 배포해서 눌러봐야 알 수 있다.

Edge도 403이면 서버에서 읽는 방식은 소진된 것으로 본다. 그다음 선택지:

- **북마클릿**: 공고 페이지를 보고 있는 브라우저에서 클릭하면 DOM에서 값을 읽어
  앱으로 넘긴다. 회원 본인 브라우저는 그 사이트에 정상 접근하므로 확실하게 동작하고,
  차단을 우회하는 것도 아니다. 앱에 수신 경로(예: 해시 파라미터로 받아 보드에 추가)를
  추가하는 작업이 붙는다. 파싱이 클라이언트로 옮겨가면 `api/casting.ts`는 필요 없어진다.
- **불러오기 UI 제거**: `CastingUrlImport`를 떼고 수기 입력만 남긴다.

플필은 배포 환경에서도 정상 동작했다. 즉 이 문제는 필름메이커스에만 해당한다.

## 알아둘 것

- **함수 리전은 대시보드 설정만으로 유지되지 않는다.** Settings에서 서울로 바꾸고
  Redeploy하면 그 배포에는 적용되지만, 이후 git 푸시로 만들어진 배포는 다시
  `iad1`로 돌아갔다 (`X-Vercel-Id`의 두 번째 값으로 확인). 계속 유지하려면
  `vercel.json`에 `{ "regions": ["icn1"] }`를 넣어야 한다.
- **필름메이커스는 응답이 느리다** (5~7초). fetch 타임아웃을 짧게 잡으면 간헐적으로
  취소된다. 한 번 8초로 줄였다가 실패를 겪었고 20초로 되돌렸다. Node 함수는 10초
  상한이 있으니, 이 사이트를 서버에서 읽는 동안은 Edge가 유리하다.
- 필름메이커스는 JSON-LD 안에 HTML 엔티티를 그대로 저장한다 (`&lt;`, `&#039;`).
  `decodeHtmlEntities()`가 처리한다.
- `/api/casting`은 다른 API와 같이 `APP_ACCESS_KEY`로 게이트된다. 설정에 앱 접근 키가
  없으면 401이 난다.

### 로컬에서 검증하는 방법

`npm run dev`는 `/api/*`를 서빙하지 않아서 불러오기를 시험할 수 없다. 핸들러만
따로 떼어 실제 공고로 돌리는 게 가장 빠르다.

```
npx esbuild api/casting.ts --format=esm --platform=node --target=node20 --outfile=tmp/casting.mjs
```

그리고 Node에서 `handler(new Request('https://x/api/casting', { method:'POST',
body: JSON.stringify({ url }), headers:{'Content-Type':'application/json'} }))`를
호출해 응답을 확인한다. 정상 공고와 오류 경로(목록 페이지, 없는 번호, 미지원 호스트,
잘못된 주소, 빈 본문, GET)를 함께 돌리면 회귀를 잡을 수 있다.

빌드된 앱까지 같이 띄워 화면에서 확인하려면, `dist/`를 정적 서빙하면서
`/api/casting`만 위 핸들러로 넘기는 작은 Node 서버를 하나 두면 된다. 필요하면
`npm run dev:api` 같은 스크립트로 저장소에 정식으로 넣을 것.
