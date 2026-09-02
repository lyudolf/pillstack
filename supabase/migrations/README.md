# Supabase 마이그레이션

이 프로젝트의 Supabase 인스턴스(`wjfxxwvjuuyontqgpafb`)는 **다른 프로젝트와 공용**이다.
`weather_proxy_cache`, `user_profiles`, `pokemon.*` 스키마는 PillStack 소유가 아니므로 건드리지 않는다.

## v2 (서로 챙기는 영양제 리마인더) 마이그레이션

적용 순서대로:

| 버전 | 이름 | 내용 |
|---|---|---|
| 20260902060219 | `pillstack_v2_groups_core` | `dose_slot` enum, `groups`, `group_members`, `invites`, `intake_events`, `nudges`, `reminder_times`, `device_tokens` 생성 + `user_supplements.slot` 컬럼 추가 |
| 20260902060259 | `pillstack_v2_rls` | 전 테이블 RLS 활성화 + 정책. `is_group_member()` / `shares_group_with()` 를 SECURITY DEFINER 로 두어 정책 내 무한 재귀 회피 |
| 20260902060402 | `pillstack_v2_lock_helper_functions` | 위 두 헬퍼의 EXECUTE 를 anon/authenticated 에서 회수 (RLS 내부 전용, REST 노출 차단) |
| 20260902060428 | `pillstack_v2_group_rpcs` | `create_group` / `create_invite` / `peek_invite` / `join_group` — 다단계 조작을 원자화 |
| 20260902060447 | `pillstack_v2_home_view` | `home_status(date, slot)` — 메인 화면용 그룹×구성원×복용여부 단일 조회 |

## 설계 메모

- **RLS 재귀 함정**: `group_members` 정책 안에서 `group_members` 를 조회하면 무한 재귀가 난다.
  반드시 `is_group_member()` (SECURITY DEFINER) 를 경유할 것.
- **영양제 목록은 공유하지 않는다**: 구성원끼리 보이는 것은 `intake_events`(먹었는지 여부)뿐이다.
  `user_supplements` 는 본인만 조회 가능한 정책을 유지한다.
- **초대는 승인 없음**: 유효한 코드/링크 = 입장권. 대신 7일 만료 + 인원 상한(`pillstack_group_limit()`, 현재 8) 으로 통제.
- **중복 방지는 DB 제약으로**: `intake_events(user_id, date, slot)` UNIQUE,
  `nudges(from_user, to_user, date, slot)` UNIQUE — 알림 스팸을 애플리케이션이 아니라 스키마가 막는다.

## 검증 완료 시나리오 (2026-09-02)

그룹 생성 → 초대 발급 → 미리보기 → 참여 → 복용 기록 → home_status 조회 →
중복 복용 차단 → 챙김 중복 차단 → **그룹 밖 사용자 완전 격리(0건)** → 만료 코드 거부. 전부 통과.
