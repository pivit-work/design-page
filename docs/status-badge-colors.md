# 상태 딱지 — 표에 없는 색 목록 (PW-840)

같은 뜻인데 **표의 색과 다른 색**을 쓰는 딱지들이다. 색을 바꾸는 것은 디자이너 몫이라
[PW-840] 에서는 **하나도 바꾸지 않고** 이 목록만 남겼다. 디자이너가 뜻마다 색 하나를 정하면,
그 줄을 `src/status-badge.css` 의 `--dp-badge-<뜻>-bg/-fg` 로 바꾸는 것으로 끝난다.

표(정본)는 `src/components/shared/statusBadgeTones.js` 와 `src/status-badge.css` 의 `:root` 에 있다.
이미 표와 같은 색이던 딱지 규칙 58개는 표를 바라보게 이어 두었다 — 표를 고치면 그 58곳이 같이 바뀐다.


## 중립 (neutral) — 표의 색 `var(--bg-secondary)` / `var(--text-tertiary)`

표와 다른 색 24가지 · 딱지 규칙 57개

| 바탕 / 글자 (적어 둔 이름) | 쓰는 딱지 |
|---|---|
| `var(--utility-gray-50) / var(--utility-gray-700)`<br>`var(--componentColors-utility-gray-utilityGray50) / var(--componentColors-utility-gray-utilityGray700)` | `.tab-badge` · `.evc-status-badge.tone-neutral` · `.manager-modal-snippet-tag` · `.ono-add-modal-member-badge` · `.ono-start-rec-badge` · `.ono-start-action-badge` · `.mgr-ts-tag` · `.rsx-tag` · `.ood-tag` |
| `var(--bg-secondary) / var(--text-secondary)` | `.admin-emp-role-pill.is-manager` · `.admin-emp-status.is-on-leave` · `.admin-snap-jg-pill` · `.admin-inv-csv-chip` · `.evc-type-badge` · `.evc-rm-sum-chip` · `.ono-mem-badge.is-done` · `.ono-mem-chip` · `.modal-status-badge` |
| `var(--bg-primary) / var(--text-secondary)` | `.evc-tpl-peek-grade` · `.modal-team-chip` · `.msc-hist-badge.is-hr` · `.evs-cw-roster-excluded-chip` · `.evc-wiz-calibscope-excluded-chip` |
| `var(--componentColors-alpha-alphaBlack3) / var(--text-secondary)`<br>`var(--componentColors-alpha-alphaBlack3, rgba(0, 0, 0, 0.03)) / var(--text-secondary)`<br>`var(--alpha-black-3) / var(--text-secondary)` | `.ai-badge.is-low` · `.admin-notif-role-chip` · `.mgr-krd-tag` · `.okr-p-chip-btn` · `.okr-wz-badge` |
| `var(--bg-primary) / var(--text-tertiary)` | `.admin-emp-hist-chip` · `.ono-done-manual-badge` · `.msc-reason-chip` |
| `var(--utility-gray-100) / var(--text-tertiary)` | `.evc-mode-badge.is-muted` · `.evs-cw-status.tone-muted` · `.evs-cw-badge.tone-muted` |
| `— / var(--text-secondary)` | `.admin-kit-chip` · `.rsx-meta-badge` |
| `var(--bg-secondary) / —` | `.evs-cw-dist-chip` · `.sq-chip` |
| `— / var(--text-white)` | `.okr-q-badge` · `.okr-role-badge` |
| `— / white` | `.status-badge-member` · `.role-badge` |
| `color-mix(in srgb, var(--kit-accent) 8%, transparent) / var(--kit-accent)` | `.admin-kit-chip.has-accent` |
| `— / var(--text-tertiary)` | `.admin-kit-chip.is-more` |
| `var(--bg-secondary) / var(--text-primary)` | `.evs-j4-pill` |
| `var(--bg-active) / var(--text-tertiary)` | `.evs-j4-pill-tag` |
| `var(--utility-gray-100) / var(--text-secondary)` | `.evc-wiz-committee-chip` |
| `var(--bg-primary) / —` | `.manager-status-badge` |
| `var(--bg-quaternary) / var(--text-tertiary)` | `.mgr-kr-obj-badge` |
| `var(--colors-background-bgTertiary) / var(--text-secondary)` | `.mtg-progress-pill` |
| `var(--fg-tertiary) / —` | `.okr-q-badge.is-gray` |
| `var(--bg-quaternary) / —` | `.okr-pill` |
| `var(--utility-gray-500) / —` | `.okr-role-badge.is-gray` |
| `rgba(255, 255, 255, 0.07) / rgba(255, 255, 255, 0.55)` | `.onb-panel-pill` |
| `var(--colors-grayLight-50) / var(--text-secondary)` | `.ono-start-topic-badge` |
| `transparent / var(--text-secondary)` | `.tl-weekly-entry-tag` |

## 정보 (info) — 표의 색 `var(--utility-blue-50)` / `var(--utility-blue-600)`

표와 다른 색 7가지 · 딱지 규칙 10개

| 바탕 / 글자 (적어 둔 이름) | 쓰는 딱지 |
|---|---|
| `var(--utility-blue-100) / var(--utility-blue-700)` | `.evm-history-grade` · `.evs-cw-roster-tag` · `.evc-wiz-calibscope-row-tag` |
| `var(--utility-blue-50) / var(--utility-blue-700)` | `.evrr-badge.is-approved` · `.rsx-badge.is-blue` |
| `var(--utility-blue-50) / var(--utility-blue-500)` | `.mgr-krd-pill.is-progress` |
| `var(--utility-blue-400) / —` | `.okr-q-badge.is-blue` |
| `— / var(--utility-blue-500)` | `.okr-pill.is-progress` |
| `var(--utility-blue-500) / —` | `.okr-role-badge.is-blue` |
| `var(--utility-indigo-50) / var(--utility-indigo-700)` | `.rsx-badge.is-indigo` |

## 진행 (progress) — 표의 색 `var(--utility-purple-50)` / `var(--utility-purple-500)`

표와 다른 색 3가지 · 딱지 규칙 4개

| 바탕 / 글자 (적어 둔 이름) | 쓰는 딱지 |
|---|---|
| `var(--utility-purple-50) / var(--utility-purple-700)`<br>`var(--utility-purple-50) / var(--componentColors-utility-purple-utilityPurple700)` | `.evrr-badge.is-override` · `.ono-done-share-badge.is-on` |
| `var(--colors-violet-50, #f5f3ff) / var(--colors-violet-500, #875bf7)` | `.admin-kit-chip.is-violet` |
| `var(--utility-purple-100) / var(--utility-purple-600)` | `.evc-sched-anchor-badge.is-manual` |

## 성공 (success) — 표의 색 `var(--utility-green-50)` / `var(--utility-green-600)`

표와 다른 색 6가지 · 딱지 규칙 15개

| 바탕 / 글자 (적어 둔 이름) | 쓰는 딱지 |
|---|---|
| `var(--utility-success-50) / var(--utility-success-700)` | `.evc-roster-badge` · `.evrr-badge.is-sent` · `.evrr-badge.is-done` · `.mgr-krd-pill.is-done` · `.okr-krfb-badge` · `.okr-ctx-admin-badge` · `.ood-done-badge` |
| `var(--utility-green-50) / var(--utility-green-700)` | `.evs-lp-tag.tone-green` · `.evs-re-grade.seg-top` · `.evs-cw-status.tone-green` · `.evs-cw-badge.tone-green` |
| `var(--colors-green-100, #d3f8df) / var(--colors-green-600, #099250)` | `.admin-kit-badge.is-success` |
| `var(--utility-green-100) / var(--utility-green-600)` | `.admin-snap-type-badge.is-green` |
| `— / var(--utility-green-600)` | `.okr-pill.is-done` |
| `var(--colors-background-bgSuccessPrimary) / var(--colors-foreground-fgSuccessPrimary)` | `.msc-pair-badge.is-on` |

## 주의 (warning) — 표의 색 `var(--utility-warning-50)` / `var(--utility-warning-700)`

표와 다른 색 6가지 · 딱지 규칙 16개

| 바탕 / 글자 (적어 둔 이름) | 쓰는 딱지 |
|---|---|
| `var(--bg-secondary) / var(--colors-text-textWarningPrimary, #dc6803)` | `.intg-status.is-connecting` · `.admin-emp-pill.is-amber` · `.admin-emp-status.is-probation` · `.admin-emp-status.is-pending` · `.admin-emp-invite-badge.is-pending` |
| `var(--colors-warning-50, #fffaeb) / var(--colors-warning-600, #dc6803)` | `.admin-kit-chip.is-warn` · `.admin-snap-status-badge.is-warn` · `.admin-snap-pv-status-warn` · `.admin-snap-type-badge.is-amber` |
| `var(--colors-warning-50, #fffbeb) / var(--colors-warning-500, #d97706)`<br>`var(--colors-warning-50, #fffaeb) / var(--colors-warning-500, #f79009)` | `.admin-kit-members-status.is-probation` · `.admin-kit-members-status.is-on_leave` · `.admin-activity-tag.is-eval` |
| `var(--utility-warning-50) / —` | `.sq-chip.is-lead` · `.sq-lead-chip` |
| `var(--colors-warning-100, #fef0c7) / var(--colors-warning-700, #b54708)` | `.admin-kit-badge.is-warn` |
| `var(--utility-warning-50, #fffaeb) / var(--utility-warning-600, #dc6803)` | `.okr-unaligned-badge` |

## 위험 (danger) — 표의 색 `var(--utility-error-50)` / `var(--utility-error-700)`

표와 다른 색 8가지 · 딱지 규칙 12개

| 바탕 / 글자 (적어 둔 이름) | 쓰는 딱지 |
|---|---|
| `var(--utility-error-50) / var(--text-error-primary)` | `.ai-badge.is-high` · `.admin-pill.is-redflag` · `.admin-snap-type-badge.is-red` |
| `var(--utility-error-50) / var(--colors-error-600)` | `.intg-pill.is-bad` · `.admin-activity-tag.is-alert` |
| `var(--utility-error-50, #fef3f2) / var(--utility-error-600, #d92d20)` | `.admin-snap-pv-status-error` · `.admin-snap-status-badge.is-error` |
| `var(--bg-secondary) / var(--colors-text-textErrorPrimary, #d92d20)` | `.intg-status.is-error` |
| `var(--utility-error-50) / var(--utility-error-500)` | `.evc-mode-badge.is-warn` |
| `var(--utility-pink-50) / var(--utility-pink-600)` | `.evc-wiz-committee-chip.is-chair` |
| `var(--utility-error-100) / var(--text-error-primary)` | `.mgr-ts-filter-chip.is-flag` |
| `var(--colors-pink-500, #ee46bc) / #fff` | `.tm-tag.is-amber` |

## 강조 (accent) — 표의 색 `var(--bg-brand-secondary)` / `var(--text-brand-secondary)`

표와 다른 색 9가지 · 딱지 규칙 21개

| 바탕 / 글자 (적어 둔 이름) | 쓰는 딱지 |
|---|---|
| `var(--utility-brand-50) / var(--text-brand-tertiary)`<br>`var(--utility-brand-50, #f1fffa) / var(--text-brand-tertiary, #21a67a)`<br>`var(--utility-brand-50) / var(--colors-text-textBrandTertiary)` | `.intg-pill.is-brand` · `.admin-kit-members-status.is-pending` · `.admin-activity-tag.is-meeting` · `.admin-emp-role-pill.is-admin` · `.admin-snap-type-badge.is-blue` · `.ono-start-source-badge` |
| `var(--colors-brand-100, #e1fef2) / var(--colors-brand-700, #10774d)` | `.intg-status.is-connected` · `.intg-pill.is-good` · `.admin-emp-status.is-active` · `.admin-emp-invite-badge.is-accepted` |
| `var(--bg-brand-secondary) / var(--text-brand-tertiary)`<br>`var(--colors-background-bgBrandSecondary) / var(--colors-text-textBrandTertiary)` | `.admin-inv-primary-badge` · `.tl-emp-tag` · `.tl-event-external-tag` |
| `var(--utility-brand-50) / var(--utility-brand-700)` | `.evs-lp-tag.tone-accent` · `.evs-j4-pill-tag.is-shared` · `.rsx-badge.is-brand` |
| `color-mix(in srgb, var(--text-brand-tertiary) 12%, transparent) / var(--text-brand-tertiary)` | `.admin-kit-badge.is-brand` |
| `var(--utility-brand-100) / var(--utility-brand-600)` | `.evc-sched-anchor-badge` |
| `var(--utility-brand-50) / var(--utility-brand-600)` | `.evs-re-grade.seg-mid` |
| `var(--utility-brand-100) / var(--utility-brand-700)` | `.evr-insight-badge` |
| `var(--onb-brand-light) / var(--onb-brand)` | `.onb-tag` |
