// The lane text's rows, shared by the canvas (monitor-core) and whoever lays out a monitor's box.

/** CSS px: the 14 px label row [ENG: display]. */
export const LABEL_STRIP_H = 18;
/** The shortest lane that shows both its label and its sweep speed (monitor-core rightTexts): the label's cleared box (6 px
 *  down, a label row less 2) above the speed's row at the bottom. The height a lane needs to be read [ENG: display]. */
export const MIN_LANE_PX = 6 + (LABEL_STRIP_H - 2) + LABEL_STRIP_H;
