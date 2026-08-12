import { WINDOW_HOURS } from "@/lib/schedule-window";

/**
 * The availability grid draws 32px cells separated by a 4px gutter, so one hour
 * of the schedule is worth 36px of pitch. Events are positioned on that same
 * pitch, which is what keeps the two halves of the calendar page in step.
 */
export const ROW_PX = 32;
export const GAP_PX = 4;
export const PITCH_PX = ROW_PX + GAP_PX;
export const COLUMN_PX = WINDOW_HOURS * PITCH_PX - GAP_PX;

/** Below this a block has no room for its title, so it stops shrinking. */
export const MIN_BLOCK_PX = 18;

export const minutesToPx = (minutes: number) => (minutes / 60) * PITCH_PX;
