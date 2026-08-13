import { WINDOW_HOURS } from "@/lib/schedule-window";

/**
 * The schedule's columns are continuous, unlike the availability grid's
 * separated cells. That is partly to tell the two halves of the page apart, and
 * partly because a gutter between rows makes minutes-to-pixels piecewise: the
 * hour labels and the day columns then only line up if two independent stacks
 * agree on the gutter, and over seventeen rows they drifted.
 *
 * With no gutter the mapping is one multiplication, and the labels and columns
 * are rows of the same grid rather than two stacks that have to be kept in step.
 */
export const ROW_PX = 36;

/** Width of the hour gutter. Fixed, so a pointer's x maps to a day column. */
export const LABEL_PX = 64;

export const GRID_PX = WINDOW_HOURS * ROW_PX;

/** Below this a block has no room for its title, so it stops shrinking. */
export const MIN_BLOCK_PX = 20;

/** Above this a block can afford a second line. */
export const ROOMY_BLOCK_PX = 52;

export const minutesToPx = (minutes: number) => (minutes / 60) * ROW_PX;
export const pxToMinutes = (px: number) => (px / ROW_PX) * 60;
