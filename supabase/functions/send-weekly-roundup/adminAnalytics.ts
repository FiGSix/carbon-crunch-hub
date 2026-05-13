/**
 * Phase 3.5 — Admin email analytics block.
 * Aggregates last 7 days of `email_cta_events` for the weekly admin summary:
 *  - Send volume per segment
 *  - A/B subject performance per segment
 *  - CTR per CTA type
 *  - Top clicked target URLs
 *
 * Returns ready-to-inject HTML matching the existing admin email styling.
 */

interface SupabaseLike {
  from: (table: string) => any;
}

const MIN_SAMPLE_FOR_WINNER = 20;

interface SegmentRow {
  segment: string;
  variant: "A" | "B" | string;
  sent: number;
  opened: number;
  clicked: number;
}

interface CtaRow {
  cta_type: string;
  sent: number;
  clicked: number;
}

interface TopLinkRow {
  target_url: string;
  cta_type: string | null;
  clicks: number;
}

export interface AdminAnalytics {
  totalSent: number;
  totalOpened: number;
  totalClicked: number;
  segments: SegmentRow[];
  ctas: CtaRow[];
  topLinks: TopLinkRow[];
  windowDays: number;
}

export async function getRoundupAnalytics(
  supabase: SupabaseLike,
  windowDays = 7
): Promise<AdminAnalytics> {
  const since = new Date(Date.now() - windowDays * 24 * 60 * 60 * 1000).toISOString();

  // Pull all events for the window. Volume is small (one row per CTA per send).
  const { data, error } = await (supabase as any)
    .from("email_cta_events")
    .select("agent_id,email_type,cta_type,target_url,variant,subject,message_id,sent_at,opened_at,clicked_at,raw_payload")
    .gte("sent_at", since)
    .limit(10000);

  if (error) {
    console.error("[adminAnalytics] query failed:", error.message);
    return emptyAnalytics(windowDays);
  }

  const rows = (data as any[]) || [];

  // Segment is stored on raw_payload.segment when index.ts logs the send.
  const segMap = new Map<string, SegmentRow>();
  const ctaMap = new Map<string, CtaRow>();
  const linkMap = new Map<string, TopLinkRow>();

  let totalSent = 0;
  let totalOpened = 0;
  let totalClicked = 0;

  // Deduplicate sends by message_id for per-email counts.
  // Each row in email_cta_events == one CTA impression for one email send.
  const sendKeys = new Set<string>();

  for (const r of rows) {
    const segment: string = r.raw_payload?.segment || "unknown";
    const variant: string = r.variant || "A";
    const ctaType: string = r.cta_type || "unknown";
    const opened = !!r.opened_at;
    const clicked = !!r.clicked_at;

    // Per-segment / variant: count unique sends (one per message_id+segment+variant)
    const sendKey = `${r.message_id || r.sent_at}|${segment}|${variant}`;
    const isNewSend = !sendKeys.has(sendKey);
    if (isNewSend) sendKeys.add(sendKey);

    const segKey = `${segment}|${variant}`;
    if (!segMap.has(segKey)) {
      segMap.set(segKey, { segment, variant, sent: 0, opened: 0, clicked: 0 });
    }
    const seg = segMap.get(segKey)!;
    if (isNewSend) {
      seg.sent += 1;
      totalSent += 1;
      if (opened) {
        seg.opened += 1;
        totalOpened += 1;
      }
    }
    if (clicked) seg.clicked += 1;

    // Per CTA type
    if (!ctaMap.has(ctaType)) ctaMap.set(ctaType, { cta_type: ctaType, sent: 0, clicked: 0 });
    const cta = ctaMap.get(ctaType)!;
    cta.sent += 1;
    if (clicked) {
      cta.clicked += 1;
      totalClicked += 1;
    }

    // Top links
    if (clicked && r.target_url) {
      const lk = linkMap.get(r.target_url) || {
        target_url: r.target_url,
        cta_type: ctaType,
        clicks: 0,
      };
      lk.clicks += 1;
      linkMap.set(r.target_url, lk);
    }
  }

  return {
    totalSent,
    totalOpened,
    totalClicked,
    segments: Array.from(segMap.values()).sort((a, b) =>
      a.segment === b.segment ? a.variant.localeCompare(b.variant) : a.segment.localeCompare(b.segment)
    ),
    ctas: Array.from(ctaMap.values()).sort((a, b) => b.sent - a.sent),
    topLinks: Array.from(linkMap.values())
      .sort((a, b) => b.clicks - a.clicks)
      .slice(0, 5),
    windowDays,
  };
}

function emptyAnalytics(windowDays: number): AdminAnalytics {
  return {
    totalSent: 0,
    totalOpened: 0,
    totalClicked: 0,
    segments: [],
    ctas: [],
    topLinks: [],
    windowDays,
  };
}

function pct(num: number, denom: number): string {
  if (!denom) return "—";
  return `${((num / denom) * 100).toFixed(1)}%`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function shortUrl(url: string, max = 60): string {
  if (url.length <= max) return url;
  return url.slice(0, max - 1) + "…";
}

/**
 * Group A/B segment rows so we can show winner per segment with sample-size flag.
 */
function buildSegmentSection(segments: SegmentRow[]): string {
  if (segments.length === 0) {
    return `<p style="color: #888; font-style: italic;">No A/B data yet — emails sent but no opens/clicks recorded by Resend webhook.</p>`;
  }

  // Group by segment
  const bySeg = new Map<string, { A?: SegmentRow; B?: SegmentRow }>();
  for (const s of segments) {
    if (!bySeg.has(s.segment)) bySeg.set(s.segment, {});
    const g = bySeg.get(s.segment)!;
    if (s.variant === "A") g.A = s;
    else if (s.variant === "B") g.B = s;
  }

  const rows = Array.from(bySeg.entries())
    .map(([segment, g]) => {
      const a = g.A || { sent: 0, opened: 0, clicked: 0 };
      const b = g.B || { sent: 0, opened: 0, clicked: 0 };
      const aOpen = a.sent ? a.opened / a.sent : 0;
      const bOpen = b.sent ? b.opened / b.sent : 0;
      const totalSent = a.sent + b.sent;

      let winner = "—";
      if (totalSent < MIN_SAMPLE_FOR_WINNER) {
        winner = `<span style="color:#888; font-style:italic;">low sample</span>`;
      } else if (aOpen === bOpen) {
        winner = "tie";
      } else {
        winner = aOpen > bOpen ? "<strong>A</strong>" : "<strong>B</strong>";
      }

      return `
        <tr>
          <td style="padding: 10px; border-bottom: 1px solid #eee; color: #333;">${escapeHtml(segment)}</td>
          <td style="padding: 10px; border-bottom: 1px solid #eee; color: #333; text-align: right;">${a.sent} / ${pct(a.opened, a.sent)} / ${pct(a.clicked, a.sent)}</td>
          <td style="padding: 10px; border-bottom: 1px solid #eee; color: #333; text-align: right;">${b.sent} / ${pct(b.opened, b.sent)} / ${pct(b.clicked, b.sent)}</td>
          <td style="padding: 10px; border-bottom: 1px solid #eee; color: #333; text-align: center;">${winner}</td>
        </tr>
      `;
    })
    .join("");

  return `
    <table style="width: 100%; border-collapse: collapse; margin: 10px 0; font-size: 13px;">
      <thead>
        <tr style="background-color: #f5f5f5;">
          <th style="padding: 10px; text-align: left; color: #666; font-weight: 600;">Segment</th>
          <th style="padding: 10px; text-align: right; color: #666; font-weight: 600;">A: sent / open / click</th>
          <th style="padding: 10px; text-align: right; color: #666; font-weight: 600;">B: sent / open / click</th>
          <th style="padding: 10px; text-align: center; color: #666; font-weight: 600;">Winner</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
    <p style="color: #888; font-size: 12px; font-style: italic; margin-top: 4px;">
      Winner determined by open-rate when combined sample ≥ ${MIN_SAMPLE_FOR_WINNER}.
    </p>
  `;
}

function buildCtaSection(ctas: CtaRow[]): string {
  if (ctas.length === 0) {
    return `<p style="color: #888; font-style: italic;">No CTA impressions yet.</p>`;
  }
  const rows = ctas
    .map(
      (c) => `
      <tr>
        <td style="padding: 10px; border-bottom: 1px solid #eee; color: #333;">${escapeHtml(c.cta_type)}</td>
        <td style="padding: 10px; border-bottom: 1px solid #eee; color: #333; text-align: right;">${c.sent}</td>
        <td style="padding: 10px; border-bottom: 1px solid #eee; color: #333; text-align: right;">${c.clicked}</td>
        <td style="padding: 10px; border-bottom: 1px solid #eee; color: #FFCD03; font-weight: 500; text-align: right;">${pct(c.clicked, c.sent)}</td>
      </tr>
    `
    )
    .join("");
  return `
    <table style="width: 100%; border-collapse: collapse; margin: 10px 0; font-size: 13px;">
      <thead>
        <tr style="background-color: #f5f5f5;">
          <th style="padding: 10px; text-align: left; color: #666; font-weight: 600;">CTA type</th>
          <th style="padding: 10px; text-align: right; color: #666; font-weight: 600;">Impressions</th>
          <th style="padding: 10px; text-align: right; color: #666; font-weight: 600;">Clicks</th>
          <th style="padding: 10px; text-align: right; color: #666; font-weight: 600;">CTR</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  `;
}

function buildTopLinksSection(links: TopLinkRow[]): string {
  if (links.length === 0) {
    return `<p style="color: #888; font-style: italic; margin-top: 10px;">No clicked links yet.</p>`;
  }
  const items = links
    .map(
      (l) => `
      <li style="margin-bottom: 6px; color: #555;">
        <strong style="color: #333;">${l.clicks}×</strong>
        ${l.cta_type ? `<span style="color:#888; font-size: 12px;">(${escapeHtml(l.cta_type)})</span> ` : ""}
        <a href="${escapeHtml(l.target_url)}" style="color: #1a73e8; word-break: break-all;">${escapeHtml(shortUrl(l.target_url))}</a>
      </li>
    `
    )
    .join("");
  return `<ul style="padding-left: 20px; margin: 10px 0;">${items}</ul>`;
}

export function renderAnalyticsHtml(a: AdminAnalytics): string {
  const overall = `
    <table style="width: 100%; border-collapse: collapse; margin: 10px 0; font-size: 14px;">
      <tr>
        <td style="padding: 10px; border-bottom: 1px solid #eee; color: #555;">Emails sent</td>
        <td style="padding: 10px; border-bottom: 1px solid #eee; color: #333; font-weight: bold; text-align: right;">${a.totalSent}</td>
      </tr>
      <tr>
        <td style="padding: 10px; border-bottom: 1px solid #eee; color: #555;">Open rate</td>
        <td style="padding: 10px; border-bottom: 1px solid #eee; color: #333; text-align: right;">${pct(a.totalOpened, a.totalSent)} (${a.totalOpened})</td>
      </tr>
      <tr>
        <td style="padding: 10px; color: #555;">Total CTA clicks</td>
        <td style="padding: 10px; color: #FFCD03; font-weight: bold; text-align: right;">${a.totalClicked}</td>
      </tr>
    </table>
  `;

  const note =
    a.totalSent === 0
      ? `<p style="color: #888; font-style: italic;">No tracked sends in the last ${a.windowDays} days. Once roundups go out, this section will populate as Resend reports opens and clicks.</p>`
      : "";

  return `
    <h2 style="color: #333; font-size: 18px; margin-top: 30px;">📬 Weekly Roundup Engagement (last ${a.windowDays} days)</h2>
    ${note}
    ${overall}

    <h3 style="color: #555; font-size: 15px; margin-top: 20px;">A/B subject performance by segment</h3>
    ${buildSegmentSection(a.segments)}

    <h3 style="color: #555; font-size: 15px; margin-top: 20px;">CTR by CTA type</h3>
    ${buildCtaSection(a.ctas)}

    <h3 style="color: #555; font-size: 15px; margin-top: 20px;">Top clicked links</h3>
    ${buildTopLinksSection(a.topLinks)}
  `;
}
