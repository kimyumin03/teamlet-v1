"use client";

import { useEffect, useRef } from "react";
import { markRecognitionsReadAction } from "@/lib/actions/recognition";

/** 인정·피드백 탭이 열리면 받은 메시지를 읽음 처리. 화면 출력 없음. */
export function MarkRecognitionsRead() {
  const done = useRef(false);
  useEffect(() => {
    if (done.current) return;
    done.current = true;
    void markRecognitionsReadAction();
  }, []);
  return null;
}
