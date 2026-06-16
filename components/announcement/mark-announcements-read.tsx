"use client";

import { useEffect, useRef } from "react";
import { markAnnouncementsReadAction } from "@/lib/actions/announcement";

/** 회사 소식 탭이 열리면 마운트되어 공지를 읽음 처리(마지막 확인 시각 갱신). 화면 출력 없음. */
export function MarkAnnouncementsRead() {
  const done = useRef(false);
  useEffect(() => {
    if (done.current) return;
    done.current = true;
    void markAnnouncementsReadAction();
  }, []);
  return null;
}
