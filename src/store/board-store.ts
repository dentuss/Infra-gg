import type Konva from "konva";
import { create } from "zustand";

import {
  BOARD_COLORS,
  newId,
  newPage,
  type BoardElement,
  type BoardPage,
  type BoardScene,
  type BoardTool,
} from "@/lib/strategy";

const HISTORY_LIMIT = 50;

function clonePages(pages: BoardPage[]): BoardPage[] {
  return JSON.parse(JSON.stringify(pages)) as BoardPage[];
}

type BoardStore = {
  pages: BoardPage[];
  activePage: number;
  selectedId: string | null;
  editingTextId: string | null;
  tool: BoardTool;
  color: string;
  zoom: number;
  dirty: boolean;
  history: BoardPage[][];
  historyIndex: number;
  stage: Konva.Stage | null;

  load: (scene: BoardScene) => void;
  setStage: (stage: Konva.Stage | null) => void;
  setTool: (tool: BoardTool) => void;
  setColor: (color: string) => void;
  setZoom: (zoom: number) => void;
  select: (id: string | null) => void;
  setEditingText: (id: string | null) => void;
  setActivePage: (index: number) => void;
  addPage: (floor: string) => void;
  removeActivePage: () => void;
  setActiveFloor: (floor: string) => void;
  addElement: (element: BoardElement) => void;
  updateElement: (
    id: string,
    patch: Partial<BoardElement>,
    options?: { commit?: boolean },
  ) => void;
  deleteSelected: () => void;
  undo: () => void;
  redo: () => void;
  markSaved: () => void;
};

function commit(state: BoardStore, pages: BoardPage[]) {
  const history = [
    ...state.history.slice(0, state.historyIndex + 1),
    clonePages(pages),
  ].slice(-HISTORY_LIMIT);
  return {
    pages,
    history,
    historyIndex: history.length - 1,
    dirty: true,
  };
}

export const useBoardStore = create<BoardStore>()((set, get) => ({
  pages: [],
  activePage: 0,
  selectedId: null,
  editingTextId: null,
  tool: "select",
  color: BOARD_COLORS[0] ?? "#fafafa",
  zoom: 1,
  dirty: false,
  history: [],
  historyIndex: -1,
  stage: null,

  load: (scene) => {
    const pages = scene.pages.length ? clonePages(scene.pages) : [];
    set({
      pages,
      activePage: 0,
      selectedId: null,
      editingTextId: null,
      tool: "select",
      zoom: 1,
      dirty: false,
      history: [clonePages(pages)],
      historyIndex: 0,
    });
  },

  setStage: (stage) => set({ stage }),
  setTool: (tool) => set({ tool, selectedId: null, editingTextId: null }),
  setColor: (color) => {
    const { selectedId } = get();
    if (selectedId) {
      get().updateElement(selectedId, { color }, { commit: true });
    }
    set({ color });
  },
  setZoom: (zoom) => set({ zoom: Math.min(3, Math.max(0.5, zoom)) }),
  select: (id) => set({ selectedId: id }),
  setEditingText: (id) => set({ editingTextId: id }),

  setActivePage: (index) =>
    set({ activePage: index, selectedId: null, editingTextId: null }),

  addPage: (floor) => {
    const state = get();
    const pages = [...clonePages(state.pages), newPage(floor)];
    set({
      ...commit(state, pages),
      activePage: pages.length - 1,
      selectedId: null,
    });
  },

  removeActivePage: () => {
    const state = get();
    if (state.pages.length <= 1) return;
    const pages = clonePages(state.pages).filter(
      (_, index) => index !== state.activePage,
    );
    set({
      ...commit(state, pages),
      activePage: Math.max(0, state.activePage - 1),
      selectedId: null,
    });
  },

  setActiveFloor: (floor) => {
    const state = get();
    const pages = clonePages(state.pages);
    const page = pages[state.activePage];
    if (!page) return;
    page.floor = floor;
    set(commit(state, pages));
  },

  addElement: (element) => {
    const state = get();
    const pages = clonePages(state.pages);
    const page = pages[state.activePage];
    if (!page) return;
    page.elements.push(element);
    set({ ...commit(state, pages), selectedId: element.id, tool: "select" });
  },

  updateElement: (id, patch, options) => {
    const state = get();
    const pages = clonePages(state.pages);
    const page = pages[state.activePage];
    if (!page) return;
    const element = page.elements.find((candidate) => candidate.id === id);
    if (!element) return;
    Object.assign(element, patch);
    if (options?.commit) {
      set(commit(state, pages));
    } else {
      set({ pages, dirty: true });
    }
  },

  deleteSelected: () => {
    const state = get();
    if (!state.selectedId) return;
    const pages = clonePages(state.pages);
    const page = pages[state.activePage];
    if (!page) return;
    page.elements = page.elements.filter(
      (element) => element.id !== state.selectedId,
    );
    set({ ...commit(state, pages), selectedId: null, editingTextId: null });
  },

  undo: () => {
    const state = get();
    if (state.historyIndex <= 0) return;
    const index = state.historyIndex - 1;
    set({
      pages: clonePages(state.history[index] ?? []),
      historyIndex: index,
      selectedId: null,
      dirty: true,
    });
  },

  redo: () => {
    const state = get();
    if (state.historyIndex >= state.history.length - 1) return;
    const index = state.historyIndex + 1;
    set({
      pages: clonePages(state.history[index] ?? []),
      historyIndex: index,
      selectedId: null,
      dirty: true,
    });
  },

  markSaved: () => set({ dirty: false }),
}));

export function newIconElement(
  src: string,
  name: string,
  x: number,
  y: number,
): BoardElement {
  return {
    id: newId(),
    type: "icon",
    x,
    y,
    rotation: 0,
    scaleX: 1,
    scaleY: 1,
    src,
    name,
    width: 64,
    height: 64,
    color: "#fafafa",
  };
}
