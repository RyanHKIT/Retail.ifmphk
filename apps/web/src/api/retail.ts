import rosterPlanJson from '@/mocks/roster-plan.json';
import settingsJson from '@/mocks/settings.json';
import energyJson from '@/mocks/energy.json';

export type DataSource = 'counter' | 'camera' | 'iot' | 'mock';

export interface ApiResponse<T> {
  code: number;
  message: string;
  data: T;
  meta?: {
    store_id: string;
    date: string;
    generated_at: string;
    source: DataSource;
  };
}

const importedMocks: Record<string, ApiResponse<unknown>> = {
  'energy.json': energyJson as ApiResponse<unknown>,
  'roster-plan.json': rosterPlanJson as ApiResponse<unknown>,
};

export async function fetchMockWithMeta<T>(file: string): Promise<{ data: T; meta?: ApiResponse<T>['meta'] }> {
  const imported = importedMocks[file];
  if (imported) {
    return { data: imported.data as T, meta: imported.meta };
  }
  const res = await fetch(`/mock/retail/${file}`);
  if (!res.ok) throw new Error(`Failed to load ${file}`);
  const json: ApiResponse<T> = await res.json();
  return { data: json.data, meta: json.meta };
}

async function fetchMock<T>(file: string): Promise<T> {
  const { data } = await fetchMockWithMeta<T>(file);
  return data;
}

export function toChipSource(source?: string): Exclude<DataSource, 'mock'> | null {
  if (source === 'counter' || source === 'camera' || source === 'iot') return source;
  return null;
}

export const api = {
  kpi: () => fetchMock<{ kpis: KpiItem[] }>('kpi.json'),
  footfallHourly: () => fetchMock<FootfallHourly>('footfall-hourly.json'),
  footfallFunnel: () => fetchMock<{ stages: FunnelStage[] }>('footfall-funnel.json'),
  passbyHourly: () => fetchMock<PassbyHourly>('passby-hourly.json'),
  footfallEvents: () => fetchMock<{ items: FootfallEvent[] }>('footfall-events.json'),
  heatmap: () => fetchMock<HeatmapData>('heatmap.json'),
  zoneDwell: () => fetchMock<{ zones: ZoneDwell[] }>('zone-dwell.json'),
  dwellTrend: () => fetchMock<DwellTrend>('dwell-trend.json'),
  journeyPaths: () => fetchMock<{ paths: JourneyPath[] }>('journey-paths.json'),
  peopleSummary: () => fetchMock<PeopleSummary>('people-summary.json'),
  peopleHourly: () => fetchMock<PeopleHourly>('people-hourly.json'),
  staffHourly: () => fetchMock<StaffHourly>('staff-hourly.json'),
  peopleByZone: () => fetchMock<{ zones: ZonePeople[] }>('people-by-zone.json'),
  roster: () => fetchMock<RosterData>('roster.json'),
  gapSummary: () => fetchMock<GapSummary>('gap-summary.json'),
  gapEvents: () => fetchMock<{ items: GapEvent[] }>('gap-events.json'),
  gapByZone: () => fetchMock<{ zones: GapByZone[] }>('gap-by-zone.json'),
  staffingMatrix: () => fetchMock<StaffingMatrix>('staffing-matrix.json'),
  alerts: () => fetchMock<{ items: AlertItem[] }>('alerts.json'),
  zones: () => fetchMock<ZonesData>('zones.json'),
  cameraSnapshot: () => fetchMock<{ cameras: CameraSnapshot[] }>('camera-snapshot.json'),
  rosterPlan: async (): Promise<RosterPlanData> =>
    (await fetchMockWithMeta<RosterPlanData>('roster-plan.json')).data,
  settings: async (): Promise<SettingsData> =>
    (settingsJson as ApiResponse<SettingsData>).data,
  energy: async (): Promise<EnergyData> =>
    (await fetchMockWithMeta<EnergyData>('energy.json')).data,
};

export interface KpiItem {
  id: string;
  label: string;
  value: number;
  unit: string;
  change_pct?: number;
  change_direction?: 'up' | 'down';
  compare_label?: string;
  realtime?: boolean;
  format?: string;
}

export interface FootfallHourly {
  hours: string[];
  series: { id: string; label: string; data: number[] }[];
}

export interface FunnelStage {
  id: string;
  label: string;
  value: number;
  rate: number;
  mock?: boolean;
  note?: string;
}

export interface PassbyHourly {
  summary: { passby_total: number; enter_total: number; not_entered_total: number; not_entered_rate: number };
  hours: string[];
  not_entered_by_hour: number[];
}

export interface FootfallEvent {
  event_id: string;
  timestamp: string;
  direction: string;
  track_id: string;
  role: string;
  role_confidence: number;
  camera_id: string;
}

export interface HeatmapData {
  zones: { zone_id: string; name: string; visit_count: number; avg_dwell_sec: number; intensity: number }[];
}

export interface ZoneDwell {
  zone_id: string;
  name: string;
  avg_dwell_sec: number;
  avg_dwell_display: string;
  visit_count: number;
  rank: number;
}

export interface DwellTrend {
  dates: string[];
  series: { zone_id: string; label: string; data: number[] }[];
}

export interface JourneyPath {
  rank: number;
  path: string[];
  path_labels: string[];
  count: number;
  percentage: number;
}

export interface PeopleSummary {
  in_store: { staff: number; customer: number; total: number };
  today_totals: { staff_entries: number; customer_entries: number; pedestrian_passby: number };
  role_distribution: { role: string; label: string; count: number; percentage: number }[];
}

export interface PeopleHourly {
  hours: string[];
  series: { role: string; label: string; data: number[] }[];
}

export interface StaffHourly {
  hours: string[];
  staff_count: number[];
  roster_expected: number[];
}

export interface ZonePeople {
  zone_id: string;
  name: string;
  staff_count: number;
  customer_count: number;
  staffing_ratio: number | null;
  min_staff: number;
  status: string;
}

export interface RosterData {
  shifts: { shift_id: string; label: string; start: string; end: string; expected_staff: number; detected_avg_staff: number; variance: number; status: string }[];
  current_shift: { shift_id: string; expected_staff: number; detected_staff: number; as_of: string };
}

export interface GapSummary {
  gap_count: number;
  total_gap_duration_display: string;
  understaffed_pct: number;
  overstaffed_pct: number;
  vl_review: { confirmed: number; pending: number; false_positive: number };
}

export interface GapEvent {
  gap_id: string;
  started_at: string;
  ended_at: string;
  duration_display: string;
  zone_id?: string;
  zone_name: string;
  customer_count: number;
  staff_count: number;
  vl_review_status: string;
  vl_summary: string | null;
  clip_url: string;
}

export interface RosterPlanData {
  date: string;
  store_id: string;
  hours: string[];
  suggested: number[];
  expected: number[];
  detected: number[];
  enter_by_hour: number[];
  note: string;
  summary: {
    peak_hour: string;
    max_gap: number;
    under_hours: number;
    over_hours: number;
  };
}

export interface SettingsData {
  store_id: string;
  store_name: string;
  business_hours: string;
  rules: {
    dwell_threshold_sec: number;
    staff_proximity_m: number;
    first_contact_sec: number;
    overstaff_multiplier: number;
  };
  zones: { zone_id: string; name: string; min_staff: number; area_sqm: number }[];
  note: string;
}

export interface GapByZone {
  zone_id: string;
  name: string;
  gap_count: number;
  total_duration_sec: number;
}

export interface StaffingMatrix {
  hours: string[];
  zone_labels: Record<string, string>;
  status_legend: Record<string, { label: string; color: string }>;
  matrix: { hour: string; cells: { zone_id: string; status: string; staff: number; expected: number }[] }[];
  summary: { understaffed_pct: number; overstaffed_pct: number };
}

export interface AlertItem {
  alert_id: string;
  type: string;
  severity: string;
  title: string;
  message: string;
  zone_id: string;
  timestamp: string;
  read: boolean;
}

export interface ZonesData {
  store_name: string;
  zones: { zone_id: string; name: string; type: string; bbox: { x: number; y: number; w: number; h: number }; area_sqm: number }[];
}

export interface CameraSnapshot {
  camera_id: string;
  name: string;
  status: string;
  snapshot_url: string;
  last_count?: Record<string, number>;
}

export interface EnergySensor {
  sensor_id: string;
  zone_id: string;
  zone_name: string;
  temp_c?: number;
  humidity_pct?: number;
  type?: string;
  power_kw?: number;
  today_kwh?: number;
  status: string;
  battery_pct?: number;
  updated_at: string;
  note?: string;
}

export interface EnergyRule {
  id: string;
  name: string;
  trigger: string;
  action: string;
  status: string;
  fired_today: number;
}

export interface EnergyData {
  store_id: string;
  as_of: string;
  summary: {
    avg_temp_c: number;
    avg_humidity_pct: number;
    today_kwh: number;
    yesterday_kwh: number;
    change_pct: number;
    est_cost_hkd: number;
    tariff_hkd_per_kwh: number;
    hvac_share_pct: number;
    lighting_share_pct: number;
    other_share_pct: number;
  };
  sensors: EnergySensor[];
  hours: string[];
  temp_avg_c: number[];
  humidity_avg_pct: number[];
  occupancy_index: number[];
  power_kw: { hvac: number[]; lighting: number[]; other: number[] };
  kwh_by_hour: number[];
  rules: EnergyRule[];
  control_note: string;
  platform_note: string;
}
