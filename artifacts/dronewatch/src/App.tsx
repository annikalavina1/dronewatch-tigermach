import { useEffect, useRef, useState, type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useCreateDronewatchSummary } from '@workspace/api-client-react';
import type { DronewatchSummaryInput, DronewatchObservation } from '@workspace/api-client-react';
import {
  Activity, AlertTriangle, Aperture, ArrowUpRight, AudioLines, BrainCircuit,
  Check, ChevronDown, CircleDot, Clock3, Crosshair, Layers3, Minus,
  Navigation, Plus, Radar, Radio, RefreshCw, ScanLine, ShieldCheck, Signal,
  SignalLow, Sparkles, Target, Video, WifiOff,
} from 'lucide-react';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import NotFound from '@/pages/not-found';
import { Route, Switch, useLocation, Router as WouterRouter } from 'wouter';
import './index.css';

const queryClient = new QueryClient();

type Scenario = DronewatchSummaryInput['condition'];
const simulationAnchor = Date.now();

function simulatedTime(secondsAgo: number): string {
  return new Date(simulationAnchor - secondsAgo * 1000).toISOString();
}

function formatObservationTime(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleTimeString('en-GB', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        timeZone: 'UTC',
      });
}

const scenarioLabels: Record<Scenario, string> = {
  normal: 'Normal conditions',
  new_observation: 'New observation',
  multiple_observations: 'Multiple observations',
  sensor_loss: 'Lost sensor communication',
};

const baseObservations: DronewatchObservation[] = [
  {
    id: 'TRK-042', time: simulatedTime(0), sector: 'NORTH / C3', rangeMeters: 1840,
    bearingDegrees: 34, altitudeMeters: 122, confidence: 0.87,
    classification: 'Small multirotor', source: 'SIMULATED RADAR', trackStatus: 'tracking',
  },
  {
    id: 'TRK-039', time: simulatedTime(141), sector: 'EAST / D2', rangeMeters: 3260,
    bearingDegrees: 108, altitudeMeters: 86, confidence: 0.64,
    classification: 'Unclassified aerial', source: 'SIMULATED RF', trackStatus: 'intermittent',
  },
  {
    id: 'TRK-031', time: simulatedTime(349), sector: 'SOUTH / B5', rangeMeters: 4120,
    bearingDegrees: 191, altitudeMeters: 152, confidence: 0.92,
    classification: 'Small multirotor', source: 'SIMULATED OPTICAL', trackStatus: 'tracking',
  },
  {
    id: 'TRK-028', time: simulatedTime(612), sector: 'WEST / A3', rangeMeters: 2680,
    bearingDegrees: 276, altitudeMeters: 98, confidence: 0.73,
    classification: 'Unclassified aerial', source: 'SIMULATED RADAR', trackStatus: 'tracking',
  },
];

function makeScenarioInput(condition: Scenario): DronewatchSummaryInput {
  if (condition === 'normal') {
    return { condition, observations: [], sensorCommunication: 'online' };
  }
  if (condition === 'new_observation') {
    return {
      condition,
      observations: [baseObservations[0]],
      sensorCommunication: 'online',
    };
  }
  if (condition === 'multiple_observations') {
    return { condition, observations: baseObservations, sensorCommunication: 'online' };
  }
  return {
    condition,
    observations: [baseObservations[1], baseObservations[2]],
    sensorCommunication: 'lost',
  };
}

function ScenarioNotification({ condition }: { condition: Scenario }) {
  const details: Record<Scenario, { title: string; body: string; icon: typeof Check; className: string }> = {
    normal: {
      title: 'Airspace nominal',
      body: 'No active synthetic observations. All simulated feeds are reporting.',
      icon: ShieldCheck, className: '',
    },
    new_observation: {
      title: 'New synthetic observation · TRK-042',
      body: 'A simulated radar track appeared in North / C3. Review classification confidence.',
      icon: CircleDot, className: 'warn',
    },
    multiple_observations: {
      title: 'Multiple observations in view',
      body: 'Four synthetic tracks are present across the exercise area.',
      icon: AlertTriangle, className: 'warn',
    },
    sensor_loss: {
      title: 'Simulated sensor communication lost',
      body: 'Feed status is unavailable. Track positions may be stale or incomplete.',
      icon: WifiOff, className: 'loss',
    },
  };
  const item = details[condition];
  const Icon = item.icon;
  return (
    <div className={`notification ${item.className}`} data-testid="status-scenario-notification">
      <Icon className="notification-icon" size={16} />
      <div><strong>{item.title}</strong><span>{item.body}</span></div>
    </div>
  );
}

function Overview() {
  const [scenario, setScenario] = useState<Scenario>('multiple_observations');
  const [eyewearOn, setEyewearOn] = useState(true);
  const [zoom, setZoom] = useState(1);
  const [layersOn, setLayersOn] = useState(true);
  const [selectedTrack, setSelectedTrack] = useState<string | null>(null);
  const [summaryResult, setSummaryResult] = useState<ReturnType<typeof useCreateDronewatchSummary>['data']>();
  const summaryRequestId = useRef(0);

  const summaryMutation = useCreateDronewatchSummary();

  const runSummary = (condition: Scenario) => {
    const input = makeScenarioInput(condition);
    const requestId = ++summaryRequestId.current;
    setScenario(condition);
    setSelectedTrack(null);
    setSummaryResult(undefined);
    summaryMutation.mutate(
      { data: input },
      {
        onSuccess: (result) => {
          if (requestId === summaryRequestId.current) {
            setSummaryResult(result);
          }
        },
      },
    );
  };

  useEffect(() => {
    runSummary('multiple_observations');
  }, []);

  const observations = makeScenarioInput(scenario).observations;
  const sensor = makeScenarioInput(scenario).sensorCommunication;
  const activeCount = observations.length;
  const sensorClass = sensor === 'lost' ? 'lost' : sensor === 'degraded' ? 'degraded' : '';
  const points = [
    { left: '59%', top: '36%' },
    { left: '72%', top: '54%' },
    { left: '43%', top: '72%' },
    { left: '27%', top: '44%' },
  ];

  const formatGeneratedAt = (value?: string) => {
    if (!value) return 'Awaiting summary';
    const date = new Date(value);
    return Number.isNaN(date.getTime())
      ? value
      : date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  return (
    <div className="dashboard">
      <header className="topbar">
        <div className="brand">
          <div className="brand-mark"><Aperture size={18} strokeWidth={2.3} /></div>
          <div>
            <div className="brand-name">TIGERMACH</div>
            <div className="brand-sub">SITUATIONAL AWARENESS</div>
          </div>
        </div>
        <div className="topbar-center"><span className="live-dot" /> EXERCISE FEED <span>·</span> RANGE 07</div>
        <div className="top-actions">
          <div className="sim-chip"><Activity size={12} /> SIMULATION ONLY</div>
          <div className="top-divider" />
          <div className="system-chip"><Signal size={13} /> CONSOLE READY</div>
          <div className="avatar" aria-label="Analyst profile">TM</div>
        </div>
      </header>

      <div className="app-frame">
        <aside className="sidebar">
          <div className="workspace-label">Workspace</div>
          <div className="nav-item active"><Radar size={15} /><span>Airspace overview</span></div>
          <div className="nav-item"><ScanLine size={15} /><span>Observation review</span></div>
          <div className="nav-item"><AudioLines size={15} /><span>Sensor simulation</span></div>
          <div className="nav-item"><Video size={15} /><span>AR eyewear preview</span></div>
          <div className="sidebar-bottom">
            <div className="exercise-card">
              <div className="exercise-tag"><Target size={12} /> TRAINING ENVIRONMENT</div>
              <p>All tracks and sensor states shown here are synthetic exercise data.</p>
            </div>
            <div className="side-footer">BUILD 0.8.14 · REGION SIM-07</div>
          </div>
        </aside>

        <main className="main-content">
          <div className="page-heading">
            <div>
              <div className="eyebrow">SIMULATED AIRSPACE / OVERVIEW</div>
              <h1>Airspace awareness</h1>
              <p>Exercise range 07 · West perimeter · Scenario review console</p>
            </div>
            <div className="heading-meta">
              <div className="meta-square"><Clock3 size={13} /></div>
              <span>{new Date(simulationAnchor).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit', timeZone: 'UTC' })} UTC</span>
              <ChevronDown size={13} />
            </div>
          </div>

          <section className="scenario-bar" aria-label="Scenario controls">
            <span className="scenario-label">Scenario controls</span>
            <button className={`scenario-button ${scenario === 'normal' ? 'selected' : ''}`} data-testid="button-scenario-normal" onClick={() => runSummary('normal')}>
              <Check size={12} /> Normal conditions
            </button>
            <button className={`scenario-button ${scenario === 'new_observation' ? 'selected warn' : ''}`} data-testid="button-scenario-new" onClick={() => runSummary('new_observation')}>
              <CircleDot size={12} /> New observation
            </button>
            <button className={`scenario-button ${scenario === 'multiple_observations' ? 'selected warn' : ''}`} data-testid="button-scenario-multiple" onClick={() => runSummary('multiple_observations')}>
              <Layers3 size={12} /> Multiple observations
            </button>
            <button className={`scenario-button ${scenario === 'sensor_loss' ? 'selected loss' : ''}`} data-testid="button-scenario-loss" onClick={() => runSummary('sensor_loss')}>
              <SignalLow size={12} /> Sensor loss
            </button>
            <div className="scenario-count"><b>{activeCount.toString().padStart(2, '0')}</b> TRACKS IN VIEW</div>
          </section>

          <section className="metrics-row" aria-label="Current overview metrics">
            <div className="metric">
              <div className="metric-label">Synthetic tracks <Radar size={12} /></div>
              <div className="metric-value" data-testid="value-track-count">{activeCount.toString().padStart(2, '0')} <small>active</small></div>
              <div className={`metric-status ${activeCount > 1 ? 'alert' : ''}`}>{activeCount ? 'EXERCISE' : 'CLEAR'}</div>
            </div>
            <div className="metric">
              <div className="metric-label">Feed communication <Radio size={12} /></div>
              <div className="metric-value">{sensor === 'online' ? 'Online' : sensor === 'lost' ? 'Lost' : 'Degraded'}</div>
              <div className={`metric-status ${sensor !== 'online' ? 'alert' : ''}`}>{sensor === 'online' ? 'ALL FEEDS' : 'SIMULATED STATE'}</div>
            </div>
            <div className="metric">
              <div className="metric-label">Highest confidence <Crosshair size={12} /></div>
              <div className="metric-value">{activeCount ? `${Math.round(Math.max(...observations.map((item) => item.confidence)) * 100)}%` : '—'}</div>
              <div className="metric-status">OBSERVATION</div>
            </div>
            <div className="metric">
              <div className="metric-label">Exercise window <Clock3 size={12} /></div>
              <div className="metric-value">00:18 <small>elapsed</small></div>
              <div className="metric-status">RANGE 07</div>
            </div>
          </section>

          <section className="content-grid">
            <div className="panel map-panel">
              <div className="panel-head">
                <div className="panel-title"><Radar size={14} /> Simulated airspace map</div>
                <span className="panel-kicker">LOCAL GRID · EXERCISE DATA</span>
              </div>
              <div className="map-area">
                <div className="radar-sweep" />
                <svg className="map-svg" viewBox="0 0 800 380" preserveAspectRatio="none" aria-label="Stylized simulated airspace map">
                  <path className="map-coast" d="M0,0 H207 C196,32 240,55 225,93 C209,130 244,151 219,181 C191,215 243,246 228,283 C218,311 245,344 231,380 H0 Z" />
                  <path className="map-coast" d="M800,0 H598 C623,32 586,68 609,103 C638,145 590,171 614,208 C641,249 588,281 607,314 C619,338 589,359 597,380 H800 Z" />
                  <path className="map-road" d="M85,0 C117,76 98,147 155,203 C211,257 151,314 194,380" />
                  <path className="map-road" d="M0,115 C164,129 227,104 335,142 C449,183 542,131 800,147" />
                  <path className="map-road" d="M0,279 C184,254 287,306 394,267 C527,218 656,258 800,233" />
                  <path className="map-minor" d="M25,46 L185,106 L251,159 L336,223 L467,238 L585,189 L722,188" />
                  <path className="map-minor" d="M64,351 L199,306 L288,255 L383,173 L490,121 L674,62" />
                  {layersOn && <>
                    <circle className="map-ring" cx="408" cy="198" r="74" />
                    <circle className="map-ring" cx="408" cy="198" r="137" />
                    <circle className="map-ring" cx="408" cy="198" r="198" />
                    <circle className="map-center" cx="408" cy="198" r="5" />
                    <text className="map-label" x="421" y="193">RANGE ORIGIN</text>
                    <text className="map-sector" x="396" y="36">NORTH / C</text>
                    <text className="map-sector" x="695" y="198">EAST / D</text>
                    <text className="map-sector" x="394" y="355">SOUTH / B</text>
                    <text className="map-sector" x="25" y="198">WEST / A</text>
                    <text className="map-label" x="102" y="90">RIDGELINE</text>
                    <text className="map-label" x="643" y="301">FIELD 07</text>
                  </>}
                </svg>
                <div className="map-overlay-top">
                  <span className="map-chip">GRID 07-C</span><span className="map-chip">SCALE 1:4,000</span>
                </div>
                <div className="map-controls">
                  <button className="icon-button" aria-label="Zoom in" data-testid="button-map-zoom-in" onClick={() => setZoom((value) => Math.min(1.4, Number((value + 0.1).toFixed(1))))}><Plus size={13} /></button>
                  <button className="icon-button" aria-label="Zoom out" data-testid="button-map-zoom-out" onClick={() => setZoom((value) => Math.max(.8, Number((value - 0.1).toFixed(1))))}><Minus size={13} /></button>
                  <button className={`icon-button ${layersOn ? 'layer-enabled' : ''}`} aria-label={layersOn ? 'Hide map layers' : 'Show map layers'} data-testid="button-map-layers" onClick={() => setLayersOn((value) => !value)}><Layers3 size={13} /></button>
                </div>
                {observations.map((item, index) => (
                  <button
                    key={item.id}
                    className={`track-point ${index > 0 ? 'multi' : ''}`}
                    style={{ left: points[index % points.length].left, top: points[index % points.length].top, transform: `translate(-50%,-50%) scale(${zoom})` }}
                    title={`${item.id} · ${item.classification}`}
                    aria-label={`Select synthetic track ${item.id}`}
                    data-testid={`button-map-track-${item.id}`}
                    onClick={() => setSelectedTrack(item.id)}
                  >
                    {selectedTrack === item.id && <span className="track-label">{item.id} / {Math.round(item.confidence * 100)}%</span>}
                  </button>
                ))}
                <div className="map-overlay-bottom">
                  <span className="legend-item"><i className="legend-dot" /> RANGE ORIGIN</span>
                  <span className="legend-item"><i className="legend-dot track" /> SYNTHETIC TRACK</span>
                </div>
              </div>
              <div className="map-footer">
                <span className={`sensor-status ${sensorClass}`}><i className="live-dot" /> {sensor === 'lost' ? 'SIMULATED LINK LOST' : sensor === 'degraded' ? 'LINK DEGRADED' : 'SIMULATED FEEDS ONLINE'}</span>
                <span>ZOOM {Math.round(zoom * 100)}% <span style={{ margin: '0 8px' }}>·</span> POSITION GRID-LOCAL</span>
              </div>
            </div>

            <div className="right-column">
              <section className="panel summary-panel">
                <div className="panel-head">
                  <div className="panel-title"><BrainCircuit size={14} /> Incident summary</div>
                  <span className="ai-badge"><Sparkles size={11} /> AI SUMMARY</span>
                </div>
                <div className="summary-body">
                  {summaryMutation.isPending ? (
                    <div aria-label="Generating summary" data-testid="loading-summary">
                      <div className="skeleton-line" style={{ width: '92%' }} /><div className="skeleton-line" style={{ width: '78%' }} /><div className="skeleton-line" style={{ width: '56%' }} />
                      <p className="summary-copy loading">Reviewing the current synthetic scenario…</p>
                    </div>
                  ) : summaryMutation.isError ? (
                    <div className="summary-error" role="alert" data-testid="error-summary">
                      Summary is unavailable. Scenario data remains local and unchanged.
                      <br />
                      <button className="retry-button" data-testid="button-retry-summary" onClick={() => runSummary(scenario)}>Retry summary</button>
                    </div>
                  ) : (
                    <p className="summary-copy" data-testid="text-ai-summary">
                      {summaryResult?.summary ?? 'No generated summary yet. Select a scenario or refresh to request a concise AI review.'}
                    </p>
                  )}
                  {summaryResult?.uncertainty?.length ? (
                    <div className="uncertainty" data-testid="list-summary-uncertainty">
                      <div className="uncertainty-title"><AlertTriangle size={11} /> Uncertainty cues</div>
                      {summaryResult.uncertainty.map((item, index) => <div className="uncertainty-item" key={`${index}-${item}`}>{item}</div>)}
                    </div>
                  ) : null}
                </div>
                <div className="ai-foot">
                  <span>GENERATED {formatGeneratedAt(summaryResult?.generatedAt)}</span>
                  <button data-testid="button-refresh-summary" disabled={summaryMutation.isPending} onClick={() => runSummary(scenario)}>
                    <RefreshCw size={11} className={summaryMutation.isPending ? 'refreshing' : ''} /> Refresh summary
                  </button>
                </div>
              </section>

              <section className="panel eyewear-panel">
                <div className="panel-head">
                  <div className="panel-title"><ScanLine size={14} /> Virtual AR eyewear</div>
                  <span className="panel-kicker">PREVIEW</span>
                </div>
                <div className="eyewear-content">
                  <div className="glasses-visual" aria-hidden="true">
                    <span className="glasses-arm left" /><span className="glasses-arm right" />
                    <span className="glasses-lens" /><span className="glasses-lens" /><span className="glasses-bridge" />
                    {eyewearOn && <span className="glasses-overlay">{observations[0]?.id ?? 'NO TRACK'}</span>}
                  </div>
                  <div className="eyewear-copy">
                    <div className="eyewear-title">Overlay visualization</div>
                    <p className="eyewear-desc">Virtual display of synthetic track labels and confidence. No connected eyewear.</p>
                    <div className={`eyewear-state ${eyewearOn ? '' : 'off'}`}><span className="live-dot" /> {eyewearOn ? 'PREVIEW ACTIVE' : 'PREVIEW PAUSED'}</div>
                  </div>
                </div>
                <button className="eyewear-toggle" data-testid="button-eyewear-toggle" onClick={() => setEyewearOn((value) => !value)}>
                  <span>Show simulated overlay</span><span className={`toggle ${eyewearOn ? '' : 'off'}`}><i className="toggle-knob" /></span>
                </button>
              </section>
            </div>
          </section>

          <section className="panel observations-panel">
            <div className="panel-head">
              <div className="panel-title"><Navigation size={14} /> Incoming synthetic observations <span className="panel-kicker">{activeCount} IN SCENARIO</span></div>
              <div className="obs-head-right"><span>RULE-BASED EVENT FLAGS</span><button data-testid="button-sort-observations" onClick={() => setSelectedTrack(observations[0]?.id ?? null)}>FOCUS LATEST <ArrowUpRight size={10} /></button></div>
            </div>
            {observations.length ? (
              <div className="table-wrap">
                <table className="obs-table">
                  <thead><tr><th>Track ID</th><th>Time</th><th>Sector</th><th>Range</th><th>Altitude</th><th>Classification</th><th>Source</th><th>Confidence</th><th>Status</th></tr></thead>
                  <tbody>
                    {observations.map((item) => (
                      <tr key={item.id} data-testid={`row-observation-${item.id}`} onClick={() => setSelectedTrack(item.id)} style={{ cursor: 'pointer', background: selectedTrack === item.id ? 'rgba(85,214,163,.055)' : undefined }}>
                        <td className="obs-id">{item.id}</td><td>{formatObservationTime(item.time)}</td><td>{item.sector}</td>
                        <td>{item.rangeMeters.toLocaleString()} m</td><td>{item.altitudeMeters} m</td><td>{item.classification}</td>
                        <td><span className="source-tag"><i className="source-dot" />{item.source.replace('SIMULATED ', '')}</span></td>
                        <td><span className="confidence"><span className="confidence-bar"><i style={{ width: `${item.confidence * 100}%` }} /></span>{Math.round(item.confidence * 100)}%</span></td>
                        <td><span className={`status-pill ${item.trackStatus}`}>{item.trackStatus}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : <div className="empty-observations" data-testid="empty-observations">No synthetic observations in this scenario. Choose another scenario to populate the review list.</div>}
          </section>

          <div className="bottom-row">
            <ScenarioNotification condition={scenario} />
            <div className="model-meta" data-testid="summary-usage">
              <span>MODEL <b>{summaryResult?.model ?? '—'}</b></span>
              <span>IN <b>{summaryResult ? summaryResult.usage.promptTokens.toLocaleString() : '—'}</b></span>
              <span>OUT <b>{summaryResult ? summaryResult.usage.completionTokens.toLocaleString() : '—'}</b></span>
              <span>TOTAL <b>{summaryResult ? summaryResult.usage.totalTokens.toLocaleString() : '—'}</b></span>
              <span>EST. COST <b>{summaryResult ? `$${summaryResult.estimatedCostUsd.toFixed(5)}` : '—'}</b></span>
            </div>
          </div>

          <div className="footer-line">
            <span>All tracks, feeds, and notifications are simulated</span>
            <span>UI event rules · AI used for summary and uncertainty cues only</span>
          </div>
        </main>
      </div>
    </div>
  );
}

function RoutedErrorBoundary({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  return <ErrorBoundary resetKey={location}>{children}</ErrorBoundary>;
}

function Router() {
  return (
    <RoutedErrorBoundary>
      <Switch>
        <Route path="/" component={Overview} />
        <Route component={NotFound} />
      </Switch>
    </RoutedErrorBoundary>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
