"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowUpRight, Compass, Pause, Play } from "lucide-react";
import type { CompassScene } from "./compass-scene";
import styles from "./compass-film.module.css";

const chapters = [
  { label: "편제표 한 장", title: <>복잡했던 편제표가<br /><em>가능성으로 펼쳐집니다.</em></>, description: "편제표를 올리면 AI가 과목과 선택군을 정리합니다. 선생님의 검토를 거쳐 학생에게 전달됩니다.", tag: "학교의 교육과정을 담다", note: "편제표 업로드 → AI 정리 → 교사 검토" },
  { label: "진로의 방향", title: <>관심이 향하는 곳에,<br /><em>배움의 방향을 맞춥니다.</em></>, description: "관심 분야와 희망 학과를 바탕으로 과목을 추천합니다. 우리 학교의 개설 여부도 함께 확인합니다.", tag: "나에게 맞는 과목을 찾다", note: "관심 분야 · 희망 학과 → 과목 추천" },
  { label: "나만의 3년", title: <>오늘의 선택이 모여,<br /><em>나만의 길이 됩니다.</em></>, description: "학교에서 들을 수 있는 과목을 학기별로 선택합니다. 완성한 3년 로드맵은 저장하고 공유합니다.", tag: "선택을 계획으로 연결하다", note: "학기별 과목 선택 → 로드맵 저장 · 공유" },
];

export function CompassFilm() {
  const root = useRef<HTMLElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const progress = useRef<HTMLDivElement>(null);
  const scene = useRef<CompassScene | null>(null);
  const [chapter, setChapter] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const element = root.current;
    if (!element || !canvas.current) return;
    let disposed = false;
    let started = false;
    let visible = false;
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let wantsPlay = !motion.matches;
    const sync = () => scene.current?.setPlaying(wantsPlay && visible && !document.hidden);
    const load = async () => {
      if (started) return;
      started = true;
      try {
        const { createCompassScene } = await import("./compass-scene");
        if (disposed || !canvas.current) return;
        scene.current = createCompassScene(canvas.current, {
          onChapter: setChapter,
          onProgress: (value) => { if (progress.current) progress.current.style.transform = `scaleX(${value})`; },
          onFailure: () => { setReady(false); setPlaying(false); },
        });
        if (motion.matches) scene.current.seek(2);
        setReady(true);
        setPlaying(wantsPlay);
        sync();
      } catch {
        // The HTML storyboard remains readable if WebGL or the lazy chunk is unavailable.
        setPlaying(false);
      }
    };
    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      if (visible) void load();
      sync();
    }, { threshold: 0.05 });
    observer.observe(element);
    const onMotion = () => {
      wantsPlay = !motion.matches;
      setPlaying(wantsPlay);
      if (motion.matches) scene.current?.seek(2);
      sync();
    };
    const onPlayback = (event: Event) => {
      wantsPlay = (event as CustomEvent<boolean>).detail;
      sync();
    };
    element.addEventListener("compass-playback", onPlayback);
    document.addEventListener("visibilitychange", sync);
    motion.addEventListener("change", onMotion);
    return () => {
      disposed = true;
      observer.disconnect();
      element.removeEventListener("compass-playback", onPlayback);
      document.removeEventListener("visibilitychange", sync);
      motion.removeEventListener("change", onMotion);
      scene.current?.dispose();
      scene.current = null;
    };
  }, []);

  const select = (index: number) => {
    setChapter(index);
    scene.current?.seek(index);
  };

  return (
    <section ref={root} className={styles.film} aria-label="커리컴퍼스 서비스 소개 모션그래픽" data-ready={ready} data-chapter={chapter}>
      <div className={styles.topline}>
        <span><Compass size={17} /> CURRICOMPASS <span className={styles.topDivider}>/</span> THE JOURNEY</span>
        <span className={styles.edition}>한 장에서 시작되는 나의 길</span>
      </div>
      <div className={styles.stage}>
        <div className={styles.copy} key={chapter}>
          <p className={styles.eyebrow}><span>0{chapter + 1}</span> {chapters[chapter].tag}</p>
          <h2>{chapters[chapter].title}</h2>
          <p className={styles.description}>{chapters[chapter].description}</p>
          <p className={styles.note}><ArrowUpRight size={16} /> {chapters[chapter].note}</p>
        </div>
        <div className={styles.visual}>
          <div className={styles.fallback} aria-hidden="true">
            <Compass size={110} strokeWidth={0.7} />
            <p>편제표 한 장, 나만의 방향.</p>
            <div><span>편제표</span><span>진로 추천</span><span>3년 로드맵</span></div>
          </div>
          <canvas ref={canvas} aria-hidden="true" />
          <div className={styles.sceneLabel} aria-hidden="true">
            {chapter === 0 ? "OUR SCHOOL / 교육과정 편제표" : chapter === 1 ? "MY DIRECTION / 진로 나침반" : "MY ROADMAP / 1학년 → 2학년 → 3학년"}
          </div>
          <span className={styles.example}>서비스 흐름을 표현한 예시입니다</span>
        </div>
      </div>
      <div className={styles.controls}>
        <div className={styles.chapters} role="group" aria-label="소개 장면 선택">
          {chapters.map((item, index) => (
            <button key={item.label} type="button" aria-pressed={chapter === index} onClick={() => select(index)}>
              <span>0{index + 1}</span> {item.label}
            </button>
          ))}
        </div>
        <button className={styles.play} type="button" disabled={!ready} aria-label={playing ? "소개 모션 일시정지" : "소개 모션 재생"} onClick={() => {
          const next = !playing;
          setPlaying(next);
          root.current?.dispatchEvent(new CustomEvent("compass-playback", { detail: next }));
        }}>{playing ? <Pause size={16} /> : <Play size={16} />}<span>{playing ? "일시정지" : "재생"}</span></button>
      </div>
      <div className={styles.progress} aria-hidden="true"><div ref={progress} /></div>
    </section>
  );
}
