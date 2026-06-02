import { useCallback, useEffect, useRef, useState, type MutableRefObject, type RefObject } from "react";
import { findSubtitleIndexByTime } from "../lib/subtitleSearch";
import { useSubtitleReader } from "../state/SubtitleReaderContext";
import type { PlayerSnapshot } from "../types";

const END_TIME_EPSILON = 0.03;

interface UseSubtitlePlayerResult {
  snapshot: PlayerSnapshot;
  togglePlay: () => void;
  seekToIndex: (index: number, shouldPlay?: boolean) => void;
  seekToCurrentStart: (shouldPlay?: boolean) => void;
  setPlaybackRate: (rate: number) => void;
  handleTimeUpdate: () => void;
}

export function useSubtitlePlayer(videoRef: RefObject<HTMLVideoElement | null>): UseSubtitlePlayerResult {
  const {
    subtitles,
    currentIndex,
    playMode,
    loopConfig,
    setCurrentIndex,
    resetLoopCount,
    dispatch,
  } = useSubtitleReader();

  const [snapshot, setSnapshot] = useState<PlayerSnapshot>({ isPlaying: false, playbackRate: 1 });
  const latestIndexRef = useRef(currentIndex);
  const loopConfigRef = useRef(loopConfig);
  const modeRef = useRef(playMode);
  const pendingLoopRef = useRef<number | null>(null);
  const lastHandledBoundaryRef = useRef<string>("");

  useEffect(() => {
    latestIndexRef.current = currentIndex;
  }, [currentIndex]);

  useEffect(() => {
    loopConfigRef.current = loopConfig;
  }, [loopConfig]);

  useEffect(() => {
    modeRef.current = playMode;
  }, [playMode]);

  useEffect(() => {
    return () => {
      if (pendingLoopRef.current !== null) {
        window.clearTimeout(pendingLoopRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) {
      return;
    }

    const handlePlay = () => {
      setSnapshot((previous) => ({ ...previous, isPlaying: true, playbackRate: video.playbackRate }));
    };

    const handlePause = () => {
      setSnapshot((previous) => ({ ...previous, isPlaying: false, playbackRate: video.playbackRate }));
    };

    const handleRateChange = () => {
      setSnapshot((previous) => ({ ...previous, playbackRate: video.playbackRate }));
    };

    video.addEventListener("play", handlePlay);
    video.addEventListener("pause", handlePause);
    video.addEventListener("ratechange", handleRateChange);

    return () => {
      video.removeEventListener("play", handlePlay);
      video.removeEventListener("pause", handlePause);
      video.removeEventListener("ratechange", handleRateChange);
    };
  }, [videoRef]);

  const setPlaybackRate = useCallback(
    (rate: number) => {
      const video = videoRef.current;
      if (!video) {
        return;
      }

      video.playbackRate = rate;
      setSnapshot((previous) => ({ ...previous, playbackRate: rate }));
    },
    [videoRef],
  );

  const play = useCallback(async () => {
    const video = videoRef.current;
    if (!video) {
      return;
    }

    await video.play();
    setSnapshot((previous) => ({ ...previous, isPlaying: true, playbackRate: video.playbackRate }));
  }, [videoRef]);

  const pause = useCallback(() => {
    const video = videoRef.current;
    if (!video) {
      return;
    }

    video.pause();
    setSnapshot((previous) => ({ ...previous, isPlaying: false, playbackRate: video.playbackRate }));
  }, [videoRef]);

  const togglePlay = useCallback(() => {
    const video = videoRef.current;
    if (!video) {
      return;
    }

    if (video.paused) {
      const activeItem = subtitles[latestIndexRef.current];
      if (
        modeRef.current === "intensive" &&
        loopConfigRef.current.intervalType === "infinite" &&
        activeItem &&
        video.currentTime >= activeItem.endTime
      ) {
        video.currentTime = activeItem.startTime;
        lastHandledBoundaryRef.current = "";
      }
      void play();
    } else {
      pause();
    }
  }, [pause, play, subtitles, videoRef]);

  const seekToIndex = useCallback(
    (index: number, shouldPlay = false) => {
      const video = videoRef.current;
      const item = subtitles[index];
      if (!video || !item) {
        return;
      }

      if (pendingLoopRef.current !== null) {
        window.clearTimeout(pendingLoopRef.current);
        pendingLoopRef.current = null;
      }

      video.currentTime = item.startTime;
      latestIndexRef.current = index;
      lastHandledBoundaryRef.current = "";
      setCurrentIndex(index);
      resetLoopCount();

      if (shouldPlay) {
        void play();
      }
    },
    [play, resetLoopCount, setCurrentIndex, subtitles, videoRef],
  );

  const seekToCurrentStart = useCallback(
    (shouldPlay = true) => {
      seekToIndex(latestIndexRef.current, shouldPlay);
    },
    [seekToIndex],
  );

  const handleTimeUpdate = useCallback(() => {
    const video = videoRef.current;
    if (!video || subtitles.length === 0) {
      return;
    }

    const time = video.currentTime;
    if (modeRef.current !== "intensive") {
      syncIndexByTime(subtitles, time, latestIndexRef, setCurrentIndex, lastHandledBoundaryRef);
      return;
    }

    const currentItem = subtitles[latestIndexRef.current];
    const shouldResync =
      !currentItem ||
      time < currentItem.startTime - END_TIME_EPSILON ||
      time > currentItem.endTime + 1;

    if (shouldResync) {
      syncIndexByTime(subtitles, time, latestIndexRef, setCurrentIndex, lastHandledBoundaryRef);
      return;
    }

    if (time < currentItem.endTime - END_TIME_EPSILON) {
      return;
    }

    const boundaryKey = `${currentItem.id}:${loopConfigRef.current.currentCount}`;
    if (lastHandledBoundaryRef.current === boundaryKey || pendingLoopRef.current !== null) {
      return;
    }
    lastHandledBoundaryRef.current = boundaryKey;

    const nextCount = loopConfigRef.current.currentCount + 1;
    loopConfigRef.current = { ...loopConfigRef.current, currentCount: nextCount };
    dispatch({ type: "INCREMENT_LOOP_COUNT" });

    const maxCount = loopConfigRef.current.maxCount;
    const reachedMax = maxCount > 0 && nextCount >= maxCount;
    if (reachedMax) {
      pause();
      return;
    }

    const restart = () => {
      video.currentTime = currentItem.startTime;
      lastHandledBoundaryRef.current = "";
      pendingLoopRef.current = null;
      void play();
    };

    const duration = Math.max(currentItem.endTime - currentItem.startTime, 0);
    const { intervalType, intervalValue } = loopConfigRef.current;

    if (intervalType === "infinite") {
      pause();
      return;
    }

    if (intervalType === "fixed" || intervalType === "multiplier") {
      pause();
      const delaySeconds =
        intervalType === "fixed" ? Math.max(intervalValue, 0) : Math.max(duration * intervalValue, 0);
      pendingLoopRef.current = window.setTimeout(restart, delaySeconds * 1000);
      return;
    }

    restart();
  }, [dispatch, pause, play, setCurrentIndex, subtitles, videoRef]);

  return {
    snapshot,
    togglePlay,
    seekToIndex,
    seekToCurrentStart,
    setPlaybackRate,
    handleTimeUpdate,
  };
}

function syncIndexByTime(
  subtitles: Parameters<typeof findSubtitleIndexByTime>[0],
  time: number,
  currentIndexRef: MutableRefObject<number>,
  setCurrentIndex: (index: number) => void,
  boundaryRef: MutableRefObject<string>,
) {
  const nextIndex = findSubtitleIndexByTime(subtitles, time, currentIndexRef.current);

  if (nextIndex !== currentIndexRef.current) {
    currentIndexRef.current = nextIndex;
    boundaryRef.current = "";
    setCurrentIndex(nextIndex);
  }
}
