import { useState } from "react";
import { EMPTY_LEADER_FILTER, LEADER_SORT_WARN } from "./evalLeaderTable.js";

/** 보기 · 검색 · 칩 · 정렬 · 선택 · 일괄 결과 — 섹션 로컬 «보기 조건»(칸 값은 부르는 쪽이 갖는다). */
export function useLeaderTableTools(rounds) {
  const [view, setViewState] = useState("target");
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState(EMPTY_LEADER_FILTER);
  const [sort, setSort] = useState(LEADER_SORT_WARN);
  /** 대상자 기준 = 대상자 id, 평가자 기준 = 칸 키 — 두 보기의 선택 단위가 달라 전환하면 비운다. */
  const [selected, setSelected] = useState(() => new Set());
  const [bulkRound, setBulkRound] = useState(1);
  const [result, setResult] = useState(null);
  const [expanded, setExpanded] = useState(() => new Set());
  return {
    view,
    setView: (v) => {
      setViewState(v);
      setSelected(new Set());
      setQuery("");
    },
    query,
    setQuery,
    filter,
    toggleFilter: (axis, v) =>
      setFilter((f) => ({
        ...f,
        [axis]: f[axis].includes(v) ? f[axis].filter((x) => x !== v) : [...f[axis], v],
      })),
    clearFilter: () => {
      setFilter(EMPTY_LEADER_FILTER);
      setQuery("");
    },
    sort,
    setSort,
    selected,
    /** `ids` 를 모두 켜거나(on) 끈다. */
    setSelectedMany: (ids, on) =>
      setSelected((prev) => {
        const next = new Set(prev);
        ids.forEach((id) => (on ? next.add(id) : next.delete(id)));
        return next;
      }),
    clearSelected: () => setSelected(new Set()),
    bulkRound: Math.min(bulkRound, Math.max(1, rounds)),
    setBulkRound,
    result,
    setResult,
    expanded,
    toggleExpanded: (id) =>
      setExpanded((prev) => {
        const next = new Set(prev);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        return next;
      }),
  };
}

