import type Konva from "konva";
import { create } from "zustand";

import {
  BOARD_COLORS,
  DEFAULT_STROKE_WIDTH,
  newId,
  newPage,
  type BoardElement,
  type BoardPage,
  type BoardScene,
  type BoardTool,
} from "@/lib/strategy";

const HISTORY_LIMIT = 50;
const PASTE_OFFSET = 24;

function clonePages(pages: BoardPage[]): BoardPage[] {
  return JSON.parse(JSON.stringify(pages)) as BoardPage[];
}

function cloneElements(elements: BoardElement[]): BoardElement[] {
  return JSON.parse(JSON.stringify(elements)) as BoardElement[];
}

type BoardStore = {
  pages: BoardPage[];
  activePage: number;
  selectedIds: string[];
  editingTextId: string | null;
  tool: BoardTool;
  color: string;
  strokeWidth: number;
  filled: boolean;
  zoom: number;
  dirty: boolean;
  history: BoardPage[][];
  historyIndex: number;
  stage: Konva.Stage | null;
  clipboard: BoardElement[];
  /** Transient node positions captured at group-drag start. */
  dragOrigins: Record<string, { x: number; y: number }> | null;
  /** Transient snap guide lines shown while dragging. */
  guides: { v: number[]; h: number[] } | null;
  borderEnabled: boolean;
  borderColor: string;

  load: (scene: BoardScene) => void;
  setStage: (stage: Konva.Stage | null) => void;
  setTool: (tool: BoardTool) => void;
  setColor: (color: string) => void;
  setStrokeWidth: (strokeWidth: number) => void;
  setFilled: (filled: boolean) => void;
  setBorderEnabled: (borderEnabled: boolean) => void;
  setBorderColor: (borderColor: string) => void;
  setGuides: (guides: { v: number[]; h: number[] } | null) => void;
  setZoom: (zoom: number) => void;
  select: (id: string, additive?: boolean) => void;
  selectMany: (ids: string[]) => void;
  clearSelection: () => void;
  setEditingText: (id: string | null) => void;
  setDragOrigins: (
    origins: Record<string, { x: number; y: number }> | null,
  ) => void;
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
  updateElements: (
    patches: { id: string; patch: Partial<BoardElement> }[],
    options?: { commit?: boolean },
  ) => void;
  applyToSelected: (patch: Partial<BoardElement>) => void;
  deleteSelected: () => void;
  copySelected: () => void;
  paste: () => void;
  duplicateSelected: () => void;
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

function insertElements(state: BoardStore, elements: BoardElement[]) {
  const pages = clonePages(state.pages);
  const page = pages[state.activePage];
  if (!page || elements.length === 0) return null;
  page.elements.push(...elements);
  return {
    ...commit(state, pages),
    selectedIds: elements.map((element) => element.id),
    tool: "select" as BoardTool,
  };
}

function withNewIdsAndOffset(elements: BoardElement[]): BoardElement[] {
  return cloneElements(elements).map((element) => ({
    ...element,
    id: newId(),
    x: element.x + PASTE_OFFSET,
    y: element.y + PASTE_OFFSET,
  }));
}

export const useBoardStore = create<BoardStore>()((set, get) => ({
  pages: [],
  activePage: 0,
  selectedIds: [],
  editingTextId: null,
  tool: "select",
  color: BOARD_COLORS[0] ?? "#fafafa",
  strokeWidth: DEFAULT_STROKE_WIDTH,
  filled: true,
  zoom: 1,
  dirty: false,
  history: [],
  historyIndex: -1,
  stage: null,
  clipboard: [],
  dragOrigins: null,
  guides: null,
  borderEnabled: true,
  borderColor: "#09090b",

  load: (scene) => {
    const pages = scene.pages.length ? clonePages(scene.pages) : [];
    set({
      pages,
      activePage: 0,
      selectedIds: [],
      editingTextId: null,
      tool: "select",
      zoom: 1,
      dirty: false,
      history: [clonePages(pages)],
      historyIndex: 0,
      clipboard: [],
      dragOrigins: null,
    });
  },

  setStage: (stage) => set({ stage }),
  setTool: (tool) => set({ tool, selectedIds: [], editingTextId: null }),

  setColor: (color) => {
    set({ color });
    get().applyToSelected({ color });
  },
  setStrokeWidth: (strokeWidth) => {
    set({ strokeWidth });
    get().applyToSelected({ strokeWidth });
  },
  setFilled: (filled) => {
    set({ filled });
    get().applyToSelected({ filled });
  },
  setBorderEnabled: (borderEnabled) => {
    set({ borderEnabled });
    get().applyToSelected({ borderEnabled });
  },
  setBorderColor: (borderColor) => {
    set({ borderColor });
    get().applyToSelected({ borderColor, borderEnabled: true });
  },
  setGuides: (guides) => set({ guides }),

  setZoom: (zoom) => set({ zoom: Math.min(3, Math.max(0.5, zoom)) }),

  select: (id, additive = false) =>
    set((state) => {
      if (!additive) return { selectedIds: [id] };
      return {
        selectedIds: state.selectedIds.includes(id)
          ? state.selectedIds.filter((candidate) => candidate !== id)
          : [...state.selectedIds, id],
      };
    }),
  selectMany: (ids) => set({ selectedIds: ids }),
  clearSelection: () => set({ selectedIds: [], editingTextId: null }),
  setEditingText: (id) => set({ editingTextId: id }),
  setDragOrigins: (origins) => set({ dragOrigins: origins }),

  setActivePage: (index) =>
    set({ activePage: index, selectedIds: [], editingTextId: null }),

  addPage: (floor) => {
    const state = get();
    const pages = [...clonePages(state.pages), newPage(floor)];
    set({
      ...commit(state, pages),
      activePage: pages.length - 1,
      selectedIds: [],
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
      selectedIds: [],
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
    const update = insertElements(state, [element]);
    if (update) set(update);
  },

  updateElement: (id, patch, options) =>
    get().updateElements([{ id, patch }], options),

  updateElements: (patches, options) => {
    const state = get();
    const pages = clonePages(state.pages);
    const page = pages[state.activePage];
    if (!page) return;
    let touched = false;
    for (const { id, patch } of patches) {
      const element = page.elements.find((candidate) => candidate.id === id);
      if (!element) continue;
      Object.assign(element, patch);
      touched = true;
    }
    if (!touched) return;
    if (options?.commit) {
      set(commit(state, pages));
    } else {
      set({ pages, dirty: true });
    }
  },

  applyToSelected: (patch) => {
    const { selectedIds } = get();
    if (selectedIds.length === 0) return;
    get().updateElements(
      selectedIds.map((id) => ({ id, patch })),
      { commit: true },
    );
  },

  deleteSelected: () => {
    const state = get();
    if (state.selectedIds.length === 0) return;
    const pages = clonePages(state.pages);
    const page = pages[state.activePage];
    if (!page) return;
    page.elements = page.elements.filter(
      (element) => !state.selectedIds.includes(element.id),
    );
    set({ ...commit(state, pages), selectedIds: [], editingTextId: null });
  },

  copySelected: () => {
    const state = get();
    const page = state.pages[state.activePage];
    if (!page || state.selectedIds.length === 0) return;
    set({
      clipboard: cloneElements(
        page.elements.filter((element) =>
          state.selectedIds.includes(element.id),
        ),
      ),
    });
  },

  paste: () => {
    const state = get();
    const update = insertElements(state, withNewIdsAndOffset(state.clipboard));
    if (update) set(update);
  },

  duplicateSelected: () => {
    const state = get();
    const page = state.pages[state.activePage];
    if (!page || state.selectedIds.length === 0) return;
    const selected = page.elements.filter((element) =>
      state.selectedIds.includes(element.id),
    );
    const update = insertElements(state, withNewIdsAndOffset(selected));
    if (update) set(update);
  },

  undo: () => {
    const state = get();
    if (state.historyIndex <= 0) return;
    const index = state.historyIndex - 1;
    set({
      pages: clonePages(state.history[index] ?? []),
      historyIndex: index,
      selectedIds: [],
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
      selectedIds: [],
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
