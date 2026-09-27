// Volatile/N2O uptake and distribution (Stage 7g; tables §5d/§6.1): a breathing-circuit volume, the alveolar gas
// (FRC), and three tissue groups in parallel on the cardiac output — vessel-rich group (VRG, whose tension is the
// brain's), muscle, fat — after Eger's and Mapleson's classic models. Tensions are fractions of 1 atm.
//   circuit : Vc·dFI/dt = FGF·(FD − FI) − U                           (rebreathing at low flow: FI < FD)
//   alveoli : VL·dFA/dt = VA·(FI − FA) − U,  U = Q·λb/g·(FA − Fv),  Fv = Σ q_i·F_i
//   tissue i: V_i·λ_i/b·dF_i/dt = Q·q_i·(FA − F_i)                      (arterial tension = alveolar)
// Stepped with forward Euler at 0.1 s: the fastest time constant (alveolar, ≈ 10–15 s) is ≥ 100 steps.
// No concentration or second-gas effect (v1 simplification, decision 9).

export type VolatileAgent = 'sevoflurane' | 'isoflurane' | 'desflurane' | 'n2o';

export interface AgentRow {
  bg: number; // blood/gas partition coefficient
  vrg: number; muscle: number; fat: number; // tissue/blood partition coefficients
  mac40: number; // % atm at 40 y (Mapleson 1996)
}

/**
 * Blood/gas: Miller 10e ch. 19 p. 427 (N2O 0.46, iso 1.46, sevo 0.65, des 0.42). Tissue/blood: Yasuda 1989/Eger via
 * Miller 10e ch. 18 Table 18.2 [VERIFY per row; Miller gives CNS/blood 2.2 for isoflurane, this row keeps 1.6 which
 * reproduces Yasuda's FA/FI]. MAC40: Mapleson 1996 (tables §5d; sevo 1.80, Q52).
 */
export const AGENTS: Record<VolatileAgent, AgentRow> = {
  n2o: { bg: 0.46, vrg: 1.1, muscle: 1.2, fat: 2.3, mac40: 104 },
  desflurane: { bg: 0.42, vrg: 1.3, muscle: 2.0, fat: 27, mac40: 6.6 },
  sevoflurane: { bg: 0.65, vrg: 1.7, muscle: 3.1, fat: 48, mac40: 1.8 },
  isoflurane: { bg: 1.46, vrg: 1.6, muscle: 2.9, fat: 45, mac40: 1.17 },
};

/** Tissue groups for 70 kg (volumes L, fraction of CO): Eger 1974 / Mapleson 1973 [TXT]; scaled by W/70. */
export const GROUPS = { vrg: { v: 6, q: 0.75 }, muscle: { v: 33, q: 0.19 }, fat: { v: 14.5, q: 0.06 } } as const;
export const CIRCUIT_L = 7; // circle system + bag + absorber gas volume [ENG]
export const MAC_AWAKE = 0.34; // × MAC for the potent agents (Miller 10e ch. 18 p. 406)

export interface VolatileState {
  agent: VolatileAgent;
  fd: number; // fraction delivered by the vaporiser / flowmeter (dial % / 100)
  fgf: number; // fresh gas flow, L/min
  fi: number; fa: number; vrg: number; muscle: number; fat: number;
}

export const createVolatile = (agent: VolatileAgent): VolatileState => ({ agent, fd: 0, fgf: 2, fi: 0, fa: 0, vrg: 0, muscle: 0, fat: 0 });

export interface VolatileEnv {
  vaLpm: number; // alveolar ventilation (0 in apnoea)
  coLpm: number;
  frcL: number;
  weightKg: number;
}

export function stepVolatile(s: VolatileState, env: VolatileEnv, dtS: number): void {
  const a = AGENTS[s.agent];
  const w = env.weightKg / 70;
  const dt = dtS / 60;
  const q = env.coLpm;
  const fv = GROUPS.vrg.q * s.vrg + GROUPS.muscle.q * s.muscle + GROUPS.fat.q * s.fat;
  const u = q * a.bg * (s.fa - fv);
  const fi = s.fi + (dt * (s.fgf * (s.fd - s.fi) - u)) / CIRCUIT_L;
  const fa = s.fa + (dt * (env.vaLpm * (s.fi - s.fa) - u)) / Math.max(0.5, env.frcL);
  s.vrg += (dt * q * GROUPS.vrg.q * (s.fa - s.vrg)) / (GROUPS.vrg.v * w * a.vrg);
  s.muscle += (dt * q * GROUPS.muscle.q * (s.fa - s.muscle)) / (GROUPS.muscle.v * w * a.muscle);
  s.fat += (dt * q * GROUPS.fat.q * (s.fa - s.fat)) / (GROUPS.fat.v * w * a.fat);
  s.fi = Math.max(0, fi);
  s.fa = Math.max(0, fa);
}

/** Age-adjusted MAC (% atm): MAC40·10^(−0.00269·(age − 40)) (Mapleson 1996; ≈ −6 % per decade). */
export const macForAge = (agent: VolatileAgent, ageY: number): number => AGENTS[agent].mac40 * 10 ** (-0.00269 * (ageY - 40));

/** Brain (VRG) MAC fraction of one agent. */
export const macFraction = (s: VolatileState, ageY: number): number => (100 * s.vrg) / macForAge(s.agent, ageY);
