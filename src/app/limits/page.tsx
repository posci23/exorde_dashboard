import { COMMON_LANGUAGES, HTTP_ERRORS, LIMITS } from "@/lib/constants";
import { Panel } from "@/components/ui";

export default function LimitsPage() {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Limits & Errors</h1>
        <p className="mt-1 text-sm text-text-muted">
          Request caps, rate limits, idempotency, history gates, and HTTP error remediation.
        </p>
      </header>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Request limits">
          <ul className="space-y-1.5 text-sm text-text-muted">
            <li>Date range: {LIMITS.maxDateRangeDays} days ({LIMITS.maxPerDaySpanDays} with per_day_limit)</li>
            <li>Keyword groups: {LIMITS.maxKeywordGroups} · terms/group: {LIMITS.maxTermsPerGroup}</li>
            <li>Domains / usernames / external IDs: {LIMITS.maxDomains} each</li>
            <li>Languages: {LIMITS.maxLanguages} per query (176+ codes supported)</li>
            <li>Exclude groups: {LIMITS.maxExcludeKeywordGroups} · proximity: {LIMITS.maxProximityGroups}</li>
            <li>Locations / URL patterns: {LIMITS.maxLocations} / {LIMITS.maxUrlPatterns}</li>
            <li>Profile filters: {LIMITS.maxProfileFilterFields} fields × {LIMITS.maxProfileFilterValues} values</li>
            <li>result_limit: 1 – {LIMITS.resultLimitMax.toLocaleString()}</li>
            <li>per_day_limit: 1 – {LIMITS.perDayLimitMax.toLocaleString()}</li>
          </ul>
        </Panel>

        <Panel title="History caps by plan">
          <ul className="space-y-1.5 text-sm text-text-muted">
            <li>Free: ~90 days back</li>
            <li>Pro: ~365 days back</li>
            <li>Enterprise: unlimited (incl. back_posts)</li>
            <li className="text-warning">Violation → HTTP 403 history_too_old</li>
            <li>Hot storage ~60 days (fast); colder data may be ~10× slower</li>
          </ul>
        </Panel>

        <Panel title="Rate limits" description="Weight unit = 7 days · ceil(span_days / 7)">
          <table className="w-full text-left text-sm">
            <thead className="text-text-muted">
              <tr className="border-b border-border">
                <th className="py-2">Plan</th>
                <th className="py-2">Burst</th>
                <th className="py-2">Sustained</th>
              </tr>
            </thead>
            <tbody className="text-text-muted">
              <tr className="border-b border-border/40">
                <td className="py-2">Free</td>
                <td>3 / min</td>
                <td>30 / hour</td>
              </tr>
              <tr className="border-b border-border/40">
                <td className="py-2">Pro</td>
                <td>30 / min</td>
                <td>600 / hour</td>
              </tr>
              <tr>
                <td className="py-2">Enterprise</td>
                <td>120 / min</td>
                <td>3000 / hour</td>
              </tr>
            </tbody>
          </table>
          <p className="mt-3 text-xs text-text-muted">
            Preview + export consume weight. Health, history, queue capacity, and GET status do not. Escalating
            cooldowns: 60s → 5m → 30m.
          </p>
        </Panel>

        <Panel title="Idempotency & concurrency">
          <ul className="space-y-1.5 text-sm text-text-muted">
            <li>Identical export body within 5 minutes → HTTP 409 with existing_job_id</li>
            <li>Failed/rejected jobs can be resubmitted immediately</li>
            <li>Global running cap: {LIMITS.concurrentGlobal}</li>
            <li>Per-customer running: {LIMITS.concurrentPerCustomer}</li>
            <li>Per-customer in-flight: {LIMITS.inFlightPerCustomer}</li>
            <li>Download URLs expire after {LIMITS.downloadsExpiryHours}h</li>
          </ul>
        </Panel>
      </div>

      <Panel title="HTTP status codes">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-text-muted">
              <tr className="border-b border-border">
                <th className="py-2 pr-3">Code</th>
                <th className="py-2 pr-3">Scenario</th>
                <th className="py-2">What to do</th>
              </tr>
            </thead>
            <tbody>
              {HTTP_ERRORS.map((row) => (
                <tr key={row.code} className="border-b border-border/40">
                  <td className="py-2 pr-3 font-mono text-accent">{row.code}</td>
                  <td className="py-2 pr-3">{row.scenario}</td>
                  <td className="py-2 text-text-muted">{row.tip}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      <Panel title="Search modes cheat sheet">
        <ul className="space-y-2 text-sm text-text-muted">
          <li>
            <span className="text-text">Fast mode</span> (default): word-boundary / Bloom — 10–20× faster
          </li>
          <li>
            <span className="text-text">Safe mode</span>: full_string_scan for partial words / short codes
          </li>
          <li>
            Trailing <span className="font-mono text-text">*</span> → prefix/substring regardless of mode
          </li>
          <li>
            Quoted <span className="font-mono text-text">&quot;exact phrase&quot;</span> → ordered whole-word phrase
            match
          </li>
          <li>Special chars (@ _ - # .) fall back to substring in fast mode</li>
        </ul>
      </Panel>

      <Panel title="Common languages (sample of 176+)">
        <div className="flex flex-wrap gap-2">
          {COMMON_LANGUAGES.map((l) => (
            <span
              key={l.code}
              className="rounded-md border border-border bg-bg-elevated px-2 py-1 font-mono text-xs"
            >
              {l.code} <span className="text-text-muted">{l.label}</span>
            </span>
          ))}
        </div>
      </Panel>
    </div>
  );
}
