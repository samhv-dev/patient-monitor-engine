// Every dataset the harness reads, with the licence and attribution the report and NOTICES carry (brief §8, R6).
// Checked on the project pages 2026-09-26. Only derived statistics and manifests (ids, times, hashes) are committed.
export type SourceId = 'vitaldb' | 'mghdb' | 'pwdb' | 'cudb' | 'mitdb' | 'ptbxl';

export interface DatasetSource {
  id: SourceId;
  title: string;
  version: string;
  url: string;
  doi: string;
  licence: 'CC BY 4.0' | 'ODC-By 1.0' | 'PDDL 1.0';
  licenceUrl: string;
  attribution: string;
  notice: string;
  redistribution: string;
}

export const SOURCES: Record<SourceId, DatasetSource> = {
  vitaldb: {
    id: 'vitaldb', title: 'VitalDB (PhysioNet copy)', version: '1.0.0', url: 'https://physionet.org/content/vitaldb/1.0.0/', doi: '10.13026/czw8-9p62',
    licence: 'CC BY 4.0', licenceUrl: 'https://creativecommons.org/licenses/by/4.0/',
    attribution: 'Lee HC, Park Y, Yoon SB, Yang SM, Park D, Jung CW. VitalDB, a high-fidelity multi-parameter vital signs database in surgical patients. Sci Data 9:279 (2022). Data from the PhysioNet copy, v1.0.0.',
    notice: 'N-080', redistribution: 'Cache only; committed: case ids, window times, SHA-256, derived statistics.',
  },
  mghdb: {
    id: 'mghdb', title: 'MGH/MF Waveform Database', version: '1.0.0', url: 'https://physionet.org/content/mghdb/1.0.0/', doi: '10.13026/C26K5Q',
    licence: 'ODC-By 1.0', licenceUrl: 'https://opendatacommons.org/licenses/by/1-0/',
    attribution: 'Welch J, Ford P, Teplick R, Rubsamen R. The Massachusetts General Hospital-Marquette Foundation Hemodynamic and Electrocardiographic Database -- Comprehensive collection of critical care waveforms. J Clin Monitoring 7(1):96-97 (1991). PhysioNet v1.0.0.',
    notice: 'N-081', redistribution: 'Cache only; committed: record ids, window times, SHA-256, derived statistics.',
  },
  pwdb: {
    id: 'pwdb', title: 'Pulse Wave Database (PWDB)', version: '0.1.0', url: 'https://zenodo.org/records/2633175', doi: '10.5281/zenodo.2633175',
    licence: 'PDDL 1.0', licenceUrl: 'https://opendatacommons.org/licenses/pddl/1-0/',
    attribution: 'Charlton PH, Mariscal Harana J, Vennin S, Li Y, Chowienczyk P, Alastruey J. Modeling arterial pulse waves in healthy aging: a database for in silico evaluation of hemodynamics and pulse wave indexes. Am J Physiol Heart Circ Physiol 317:H1062-H1085 (2019).',
    notice: 'N-082', redistribution: 'Cache only; committed: derived per-site/age statistics.',
  },
  cudb: {
    id: 'cudb', title: 'Creighton University Ventricular Tachyarrhythmia Database', version: '1.0.0', url: 'https://physionet.org/content/cudb/1.0.0/', doi: '10.13026/C2X59M',
    licence: 'ODC-By 1.0', licenceUrl: 'https://opendatacommons.org/licenses/by/1-0/',
    attribution: 'Nolle FM, Badura FK, Catlett JM, Bowser RW, Sketch MH. CREI-GARD, a new concept in computerized arrhythmia monitoring systems. Computers in Cardiology 13:515-518 (1986).',
    notice: 'N-050', redistribution: 'Stage 5 templates (N-050); Stage 8a reads the cache only.',
  },
  mitdb: {
    id: 'mitdb', title: 'MIT-BIH Arrhythmia Database', version: '1.0.0', url: 'https://physionet.org/content/mitdb/1.0.0/', doi: '10.13026/C2F305',
    licence: 'ODC-By 1.0', licenceUrl: 'https://opendatacommons.org/licenses/by/1-0/',
    attribution: 'Moody GB, Mark RG. The impact of the MIT-BIH Arrhythmia Database. IEEE Eng in Med and Biol 20(3):45-50 (2001).',
    notice: 'N-051', redistribution: 'Stage 5 templates (N-051); Stage 8a reads the cache only.',
  },
  ptbxl: {
    id: 'ptbxl', title: 'PTB-XL', version: '1.0.3', url: 'https://physionet.org/content/ptb-xl/1.0.3/', doi: '10.13026/kfzx-aw45',
    licence: 'CC BY 4.0', licenceUrl: 'https://creativecommons.org/licenses/by/4.0/',
    attribution: 'Wagner P, Strodthoff N, Bousseljot R, Samek W, Schaeffter T. PTB-XL, a large publicly available electrocardiography dataset (version 1.0.3). PhysioNet (2022).',
    notice: 'N-052', redistribution: 'Cache only; committed: derived interval distributions and correlations.',
  },
};
