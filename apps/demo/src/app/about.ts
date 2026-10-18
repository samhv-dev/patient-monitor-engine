// The release label and the education-only line, shown in the app (Start and Settings → About) as the Debrief's print
// footer says it. The version is the packages' own (`@pme/renderer` `version`).
import { version } from '@pme/renderer';

export const RELEASE_LABEL = `Version ${version}${version.includes('-') ? ' (pre-release)' : ''}`;
export const EDUCATION_LINE = 'For education only. Not a medical device and not clinically validated: never use it for patient care.';
export const ABOUT_LINE = `${RELEASE_LABEL}. ${EDUCATION_LINE}`;
