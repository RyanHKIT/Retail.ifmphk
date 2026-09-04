import { useEffect, useState } from 'react';
import { api } from '@/api/retail';
import type { SettingsData } from '@/api/retail';
import { useRetailFilter } from '@/context/RetailFilterContext';
import {
  clearRuleOverrides,
  loadRuleOverrides,
  saveRuleOverrides,
  type RetailRules,
} from '@/lib/settingsStore';
import { useRetailLocale } from '@/context/RetailLocaleContext';
import type { MessageKey } from '@/i18n/messages';

export function SettingsPage() {
  const { storeId } = useRetailFilter();
  const { t } = useRetailLocale();
  const storeLabel = t(`filter.store.${storeId}` as MessageKey);
  const [base, setBase] = useState<SettingsData | null>(null);
  const [rules, setRules] = useState<RetailRules | null>(null);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.settings().then((data) => {
      setBase(data);
      const override = loadRuleOverrides();
      setRules({ ...data.rules, ...override });
      setLoading(false);
    });
  }, []);

  if (loading || !base || !rules) return <div className="loading">{t('common.loading')}</div>;

  const setNum = (key: keyof RetailRules, value: number) => {
    setRules((prev) => (prev ? { ...prev, [key]: value } : prev));
    setSaved(false);
  };

  const persist = () => {
    saveRuleOverrides(rules);
    setSaved(true);
  };

  const reset = () => {
    clearRuleOverrides();
    setRules({ ...base.rules });
    setSaved(false);
  };

  return (
    <>
      <h1 className="page-title">{t('settings.title')}</h1>
      <p className="page-subtitle">{storeLabel} · {t('settings.subtitle')}</p>

      <div className="card" style={{ marginBottom: 20 }}>
        <div className="card-title">{t('settings.storeInfo')}</div>
        <div className="settings-grid">
          <div><span className="muted">{t('settings.store')}</span><div>{storeLabel}</div></div>
          <div><span className="muted">{t('settings.hours')}</span><div>{base.business_hours}</div></div>
          <div><span className="muted">{t('settings.storeId')}</span><div style={{ fontFamily: 'var(--mono)' }}>{base.store_id}</div></div>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 20 }}>
        <div className="card-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>{t('settings.rules')}</span>
          <div className="btn-row">
            <button type="button" className="btn btn-ghost" onClick={reset}>{t('common.resetDefault')}</button>
            <button type="button" className="btn btn-primary" onClick={persist}>
              {saved ? t('common.saved') : t('common.saveLocal')}
            </button>
          </div>
        </div>
        <div className="settings-form">
          <label>
            {t('settings.dwell')}
            <input
              type="number"
              className="filter-select"
              value={rules.dwell_threshold_sec}
              min={30}
              step={10}
              onChange={(e) => setNum('dwell_threshold_sec', Number(e.target.value))}
            />
          </label>
          <label>
            {t('settings.sla')}
            <input
              type="number"
              className="filter-select"
              value={rules.first_contact_sec}
              min={30}
              step={10}
              onChange={(e) => setNum('first_contact_sec', Number(e.target.value))}
            />
          </label>
          <label>
            {t('settings.proximity')}
            <input
              type="number"
              className="filter-select"
              value={rules.staff_proximity_m}
              min={1}
              step={0.5}
              onChange={(e) => setNum('staff_proximity_m', Number(e.target.value))}
            />
          </label>
          <label>
            {t('settings.overstaff')}
            <input
              type="number"
              className="filter-select"
              value={rules.overstaff_multiplier}
              min={1}
              step={0.1}
              onChange={(e) => setNum('overstaff_multiplier', Number(e.target.value))}
            />
          </label>
        </div>
        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 12 }}>{base.note}</p>
      </div>

      <div className="card">
        <div className="card-title">{t('settings.zones')}</div>
        <table className="data-table">
          <thead>
            <tr>
              <th>{t('common.zone')}</th>
              <th>{t('settings.area')}</th>
              <th>{t('settings.minStaff')}</th>
            </tr>
          </thead>
          <tbody>
            {base.zones.map((z) => (
              <tr key={z.zone_id}>
                <td>{z.name}</td>
                <td>{z.area_sqm}</td>
                <td>{z.min_staff}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
