import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useReducer,
  type Dispatch,
  type PropsWithChildren,
} from "react";
import type { LayoutMode, LoopConfig, PlayMode, SubtitleItem } from "../types";

interface SubtitleReaderState {
  mediaSrc: string | null;
  subtitles: SubtitleItem[];
  currentIndex: number;
  playMode: PlayMode;
  layout: LayoutMode;
  loopConfig: LoopConfig;
}

type SubtitleReaderAction =
  | { type: "SET_MEDIA_SRC"; payload: string | null }
  | { type: "SET_SUBTITLES"; payload: SubtitleItem[] }
  | { type: "SET_CURRENT_INDEX"; payload: number }
  | { type: "SET_PLAY_MODE"; payload: PlayMode }
  | { type: "SET_LAYOUT"; payload: LayoutMode }
  | { type: "PATCH_LOOP_CONFIG"; payload: Partial<LoopConfig> }
  | { type: "RESET_LOOP_COUNT" }
  | { type: "INCREMENT_LOOP_COUNT" };

interface SubtitleReaderContextValue extends SubtitleReaderState {
  dispatch: Dispatch<SubtitleReaderAction>;
  setMediaSrc: (mediaSrc: string | null) => void;
  setSubtitles: (subtitles: SubtitleItem[]) => void;
  setCurrentIndex: (index: number) => void;
  setPlayMode: (mode: PlayMode) => void;
  setLayout: (layout: LayoutMode) => void;
  patchLoopConfig: (patch: Partial<LoopConfig>) => void;
  resetLoopCount: () => void;
}

const initialState: SubtitleReaderState = {
  mediaSrc: null,
  subtitles: [],
  currentIndex: -1,
  playMode: "reading",
  layout: "main",
  loopConfig: {
    maxCount: 3,
    currentCount: 0,
    intervalType: "fixed",
    intervalValue: 1,
  },
};

const SubtitleReaderContext = createContext<SubtitleReaderContextValue | null>(null);

export function SubtitleReaderProvider({ children }: PropsWithChildren) {
  const [state, dispatch] = useReducer(reducer, initialState);

  const setMediaSrc = useCallback((mediaSrc: string | null) => {
    dispatch({ type: "SET_MEDIA_SRC", payload: mediaSrc });
  }, []);

  const setSubtitles = useCallback((subtitles: SubtitleItem[]) => {
    dispatch({ type: "SET_SUBTITLES", payload: subtitles });
  }, []);

  const setCurrentIndex = useCallback((index: number) => {
    dispatch({ type: "SET_CURRENT_INDEX", payload: index });
  }, []);

  const setPlayMode = useCallback((mode: PlayMode) => {
    dispatch({ type: "SET_PLAY_MODE", payload: mode });
  }, []);

  const setLayout = useCallback((layout: LayoutMode) => {
    dispatch({ type: "SET_LAYOUT", payload: layout });
  }, []);

  const patchLoopConfig = useCallback((patch: Partial<LoopConfig>) => {
    dispatch({ type: "PATCH_LOOP_CONFIG", payload: patch });
  }, []);

  const resetLoopCount = useCallback(() => {
    dispatch({ type: "RESET_LOOP_COUNT" });
  }, []);

  const value = useMemo<SubtitleReaderContextValue>(
    () => ({
      ...state,
      dispatch,
      setMediaSrc,
      setSubtitles,
      setCurrentIndex,
      setPlayMode,
      setLayout,
      patchLoopConfig,
      resetLoopCount,
    }),
    [state, setMediaSrc, setSubtitles, setCurrentIndex, setPlayMode, setLayout, patchLoopConfig, resetLoopCount],
  );

  return <SubtitleReaderContext.Provider value={value}>{children}</SubtitleReaderContext.Provider>;
}

export function useSubtitleReader() {
  const context = useContext(SubtitleReaderContext);
  if (!context) {
    throw new Error("useSubtitleReader must be used inside SubtitleReaderProvider");
  }
  return context;
}

function reducer(state: SubtitleReaderState, action: SubtitleReaderAction): SubtitleReaderState {
  switch (action.type) {
    case "SET_MEDIA_SRC":
      return { ...state, mediaSrc: action.payload };
    case "SET_SUBTITLES":
      return {
        ...state,
        subtitles: action.payload,
        currentIndex: action.payload.length > 0 ? 0 : -1,
        loopConfig: { ...state.loopConfig, currentCount: 0 },
      };
    case "SET_CURRENT_INDEX":
      if (action.payload === state.currentIndex) {
        return state;
      }
      return {
        ...state,
        currentIndex: clampIndex(action.payload, state.subtitles.length),
        loopConfig: { ...state.loopConfig, currentCount: 0 },
      };
    case "SET_PLAY_MODE":
      return {
        ...state,
        playMode: action.payload,
        loopConfig: { ...state.loopConfig, currentCount: 0 },
      };
    case "SET_LAYOUT":
      return { ...state, layout: action.payload };
    case "PATCH_LOOP_CONFIG":
      return { ...state, loopConfig: { ...state.loopConfig, ...action.payload } };
    case "RESET_LOOP_COUNT":
      return { ...state, loopConfig: { ...state.loopConfig, currentCount: 0 } };
    case "INCREMENT_LOOP_COUNT":
      return {
        ...state,
        loopConfig: { ...state.loopConfig, currentCount: state.loopConfig.currentCount + 1 },
      };
    default:
      return state;
  }
}

function clampIndex(index: number, length: number): number {
  if (length === 0) {
    return -1;
  }
  return Math.min(Math.max(index, 0), length - 1);
}
