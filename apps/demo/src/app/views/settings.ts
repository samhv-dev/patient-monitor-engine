// Settings (research/13 §4.8, P11): the room's site profile — monitor, screen, frame rate, where the instructor works,
// gas units, sensors-off start — exportable as one file for the next room, plus the shortcut sheet.
import { shortcutsDialog } from '../commands.ts';
import type { AppSession } from '../session.ts';
import { applySkinAlarmColours } from '../shell.ts';
import { setDrugNames } from '../glossary.ts';
import { DRUG_NAME_SETS, MONITORS, parseSite, saveSite, THEMES, type SiteProfile } from '../site.ts';
import { button, download, h, seg, select, toast } from '../ui.ts';
import type { View } from '../shell.ts';

export function settingsView(site: SiteProfile, session: AppSession | null): View {
  const save = (msg = 'Saved for this browser') => {
    saveSite(site);
    toast(msg);
  };
  const skin = () => {
    if (session) void session.setSkin(site.skin, site.theme); // the session applies the alarm colours (review F5)
    else applySkinAlarmColours(site.skin, site.theme);
    document.documentElement.dataset.theme = site.theme === 'projector-light' ? 'bench' : '';
  };
  const mon = select('Monitor', MONITORS.map((m) => [m.id, m.label]), site.skin, (v) => ((site.skin = v), skin(), save()));
  const theme = select('Screen', THEMES.map(([id, l]) => [id, l]), site.theme, (v) => ((site.theme = v as SiteProfile['theme']), skin(), save()));
  const fps = seg<string>('Frame rate', [['60', '60 per second'], ['30', '30 per second (projectors, tablets on battery)']], String(site.fps), (v) => {
    site.fps = v === '30' ? 30 : 60;
    session?.monitor?.setFps(site.fps);
    save();
  });
  const panel = seg<SiteProfile['panel']>('Instructor panel on wide screens', [['split', 'Beside the monitor'], ['drawer', 'Over the monitor (drawer)']], site.panel, (v) => ((site.panel = v), save()));
  const gas = seg<SiteProfile['gasUnit']>('Gas pressures in tables', [['mmHg', 'mmHg'], ['kPa', 'kPa']], site.gasUnit, (v) => ((site.gasUnit = v), save()));
  const names = seg<SiteProfile['drugNames']>('Drug names', [...DRUG_NAME_SETS], site.drugNames, (v) => {
    site.drugNames = v;
    setDrugNames(v);
    save('Saved: drug names change as each screen redraws');
  });
  const sensors = h('input', { type: 'checkbox', id: 'set-sensors', onchange: () => ((site.sensorsOff = sensors.checked), save()) });
  sensors.checked = site.sensorsOff;
  const file = h('input', { type: 'file', accept: 'application/json', class: 'sr-only', id: 'set-import', onchange: async () => {
    const f = file.files?.[0];
    if (!f) return;
    try {
      Object.assign(site, parseSite(JSON.parse(await f.text())));
      setDrugNames(site.drugNames);
      save('Site profile imported');
      skin();
    } catch {
      toast('That file is not a site profile');
    }
  } });
  const el = h('section', { 'aria-labelledby': 'set-h' }, h('div', { class: 'page narrow' },
    h('h1', { id: 'set-h' }, 'Settings'),
    h('p', { class: 'lede' }, 'These settings belong to this room and this browser. A scenario never changes them.'),
    h('h2', {}, 'Monitor'), h('div', { class: 'grid2' }, mon.el, theme.el),
    h('h2', {}, 'Display'), field('Frame rate', fps), field('Instructor panel on wide screens', panel), field('Gas pressures in tables', gas), field('Drug names', names),
    h('h2', {}, 'New patients'), h('label', { class: 'check', for: 'set-sensors' }, sensors, 'Start with the sensors off (traces appear when they are attached)'),
    h('h2', {}, 'Language'), h('p', {}, 'English. The monitor labels follow the clinical glossary; other languages can be added later.'),
    h('h2', {}, 'Site profile'),
    h('div', { class: 'actions' },
      button('Export site profile', () => download('site-profile.json', JSON.stringify(site, null, 2), 'application/json')),
      h('label', { class: 'btn', for: 'set-import' }, 'Import site profile'), file,
      button('Keyboard shortcuts', () => void shortcutsDialog(), 'ghost')),
  ));
  return { id: 'settings', el, bench: true };
}

const field = (label: string, control: HTMLElement) => h('div', { class: 'field' }, h('span', {}, label), control);
