# docs

| 문서 | 내용 |
|---|---|
| [v2-plan.md](./v2-plan.md) | **PillStack v2 컨셉 기획서** — "서로 챙기는 영양제 리마인더". 방향 전환 배경, 코어 루프, 화면 구조, 알림 규칙, 데이터 모델, 구현 순서 |

## v2 작업 시 먼저 볼 것

- **알림 규칙은 9장**이 유일한 기준이다. 구현 중 규칙이 바뀌면 코드와 **같은 커밋에서** 9장도 고칠 것.
- DB 스키마·RLS·RPC 는 [`supabase/migrations/README.md`](../supabase/migrations/README.md) 참고.

## 놓치기 쉬운 함정 (실제로 겪은 것들)

- **앱 빌드는 반드시 `npm run sync`** (= `build:app` + `cap sync`).
  그냥 `npm run build` 로 만들면 Firebase Analytics 가 빈 shim 으로 번들되어 커스텀 이벤트가 전부 사라진다.
- **초대 링크 호스트는 `www.pillstack.kr`** 로 고정.
  apex(`pillstack.kr`)는 www 로 301 되는데 Android App Links 검증은 리다이렉트를 따라가지 않는다.
- **Supabase 인스턴스는 다른 프로젝트와 공용**이다. `weather_proxy_cache`, `user_profiles`, `pokemon.*` 는 건드리지 않는다.
- **무료 티어는 ~1주 미사용 시 자동 정지**된다. `api/cron/cleanup.js` 의 keep-alive ping 이 이를 막는다.
