// The release label and the education-only line, shown in the app (Start and Settings → About) as the Debrief's print
// footer says it. The version is the packages' own (`@pme/renderer` `version`).
import { version } from '@pme/renderer';

export const RELEASE_LABEL = `Version ${version}${version.includes('-') ? ' (pre-release)' : ''}`;
/** The owner's disclaimer (E125, 26 October), word for word: Settings → About, the footer line of every page but the
 *  monitor screens, and the Debrief's print footer. */
export const EDUCATION_LINE = 'For educational use only; Not to be used in patient care.';
export const ABOUT_LINE = `${RELEASE_LABEL}. ${EDUCATION_LINE}`;

declare const __PME_BUILD__: string;
/** The build a page was served from ("<commit>[+] <date>", vite.config.ts), or 'development'. */
export const BUILD_ID = typeof __PME_BUILD__ === 'string' ? __PME_BUILD__ : 'development';
const PRE = version.includes('-');
/** The rail's line under the name: "1.0.0-rc.4, pre-release". */
export const RAIL_VERSION = `${version}${PRE ? ', pre-release' : ''}`;
/** Home's line under the name: "Version 1.0.0-rc.4 · pre-release · build 2ebd743d". */
export const HOME_VERSION = [`Version ${version}`, PRE ? 'pre-release' : '', `build ${BUILD_ID.split(' ')[0]}`].filter(Boolean).join(' · ');
/** The footer line of every page but the monitor screens (shell.ts). */
export const FOOTER_LINE = EDUCATION_LINE;
/** Where the project lives (Home's code box and links). */
export const REPO = 'github.com/samhv-dev/patient-monitor-engine';
