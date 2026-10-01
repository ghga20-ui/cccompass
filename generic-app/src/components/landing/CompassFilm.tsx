"use client";

import { useEffect, useRef } from "react";
import styles from "./compass-film.module.css";

/** The approved native film is a same-origin document, isolating fonts and SVG IDs. */
export function CompassFilm() {
  const frame = useRef<HTMLIFrameElement>(null);
  const resize = useRef<ResizeObserver | null>(null);

  useEffect(() => () => resize.current?.disconnect(), []);

  function fitContent() {
    resize.current?.disconnect();
    const element = frame.current;
    const body = element?.contentDocument?.body;
    if (!element || !body) return;
    const fit = () => {
      const height = Math.ceil(body.getBoundingClientRect().height);
      if (height > 0) element.style.height = `${height}px`;
    };
    fit();
    if (typeof ResizeObserver !== "undefined") {
      resize.current = new ResizeObserver(fit);
      resize.current.observe(body);
    }
  }

  return (
    <section className={styles.section} aria-label="커리컴퍼스 서비스 소개">
      <p className={styles.srOnly}>
        학교 편제표를 올리고 과목과 선택군을 정리합니다. 교사 검토 후 진로 관심에 맞는
        과목을 추천받고, 여섯 학기의 계획을 직접 만들고 저장·공유합니다.
      </p>
      <iframe
        ref={frame}
        className={styles.film}
        src="/motion/cccompass-pop-15s-v2.html?embed=1"
        title="커리컴퍼스 · 학교 과목 선택과 3년 계획 안내"
        loading="lazy"
        onLoad={fitContent}
      />
    </section>
  );
}
