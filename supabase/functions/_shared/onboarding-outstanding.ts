// Shared rules for "what is still outstanding" on a project onboarding record.
// Mirrors the section completion logic used by the Onboarding tab UI so the
// follow-up email checklist always matches what the admin sees on screen.

export interface OutstandingItem {
  section: string;
  label: string;
}



export type AnyRecord = Record<string, unknown>;

const filled = (v: unknown): boolean => {
  if (v === null || v === undefined) return false;
  if (typeof v === "number") return !isNaN(v);
  return String(v).trim() !== "";
};

function parseRows(raw: unknown, marker: string): AnyRecord[] {
  if (typeof raw !== "string" || raw.trim() === "") return [];
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0 && typeof parsed[0] === "object" && parsed[0] !== null && marker in (parsed[0] as AnyRecord)) {
      return parsed as AnyRecord[];
    }
  } catch {
    // not JSON — legacy single value
  }
  return [];
}

export function computeOutstanding(
  fields: AnyRecord | null,
  documents: AnyRecord[],
  project: AnyRecord | null,
): OutstandingItem[] {
  const f = fields ?? {};
  const docs = documents ?? [];
  const hasDoc = (category: string) => docs.some((d) => d.category === category);
  const out: OutstandingItem[] = [];
  const add = (section: string, label: string) => out.push({ section, label });

  // ---- System details ----
  const systemRequired: Array<[string, string]> = [
    ["system_name", "System name"],
    ["system_address", "Site address"],
    ["ownership_type", "Ownership type"],
    ["connection_type", "Grid connection type"],
    ["alternative_power_source", "Alternative power source"],
    ["meter_type", "Meter type"],
    ["system_gps_lat", "GPS latitude"],
    ["system_gps_lng", "GPS longitude"],
  ];
  for (const [key, label] of systemRequired) {
    if (!filled(f[key])) add("System Details", label);
  }

  const phases = Array.isArray(f.phases_json) ? (f.phases_json as AnyRecord[]) : [];
  if (phases.length > 0) {
    phases.forEach((p, i) => {
      if (!filled(p.commissionDate)) add("System Details", `Commissioning date for phase ${i + 1}`);
    });
  } else if (!filled(f.commissioning_date)) {
    add("System Details", "Commissioning date");
  }

  if (f.meter_type === "Discrete" && !hasDoc("calibration_cert")) {
    add("Documents", "Meter calibration certificate (dedicated meter)");
  }

  // ---- Inverters ----
  const qty = f.inverter_quantity;
  if (!(typeof qty === "number" && qty >= 1)) add("Inverters", "Number of inverters");

  const inverters = parseRows(f.inverter_serial, "brand");
  if (inverters.length === 0) {
    add("Inverters", "Inverter brand, model, capacity and serial number(s)");
  } else {
    inverters.forEach((inv, i) => {
      const missing: string[] = [];
      if (!filled(inv.brand)) missing.push("brand");
      if (!filled(inv.model)) missing.push("model");
      if (inv.capacity_kw === null || inv.capacity_kw === undefined) missing.push("capacity (kW)");
      if (!filled(inv.serial)) missing.push("serial number");
      if (missing.length) add("Inverters", `Inverter ${i + 1}: ${missing.join(", ")}`);
    });
  }

  // ---- Battery ----
  if (f.has_battery === null || f.has_battery === undefined) {
    add("Battery", "Confirm whether a battery is installed");
  } else if (f.has_battery === true) {
    if (!filled(f.battery_brand)) add("Battery", "Battery brand");
    if (!filled(f.battery_capacity_kwh)) add("Battery", "Battery capacity (kWh)");
    if (!filled(f.battery_cost)) add("Battery", "Battery cost");
  }

  // ---- Panels ----
  const panels = parseRows(f.panel_brand, "brand");
  if (panels.length === 0) {
    add("Panels", "Panel brand, size, quantity and total kWp");
  } else {
    panels.forEach((p, i) => {
      const missing: string[] = [];
      if (!filled(p.brand)) missing.push("brand");
      if (p.size_wp === null || p.size_wp === undefined) missing.push("panel size (Wp)");
      if (p.quantity === null || p.quantity === undefined) missing.push("quantity");
      if (p.total_kwp === null || p.total_kwp === undefined) missing.push("total kWp");
      if (missing.length) add("Panels", `Panel array ${i + 1}: ${missing.join(", ")}`);
    });
  }

  // ---- Financial ----
  if (!filled(f.total_capex)) add("Financial", "Total project cost (CAPEX)");

  // ---- Documents ----
  if (!hasDoc("coc")) add("Documents", "Certificate of Compliance (CoC)");
  if (!hasDoc("invoice")) add("Documents", "Installation invoice");

  // ---- O&M ----
  if (f.has_maintenance_agreement === null || f.has_maintenance_agreement === undefined) {
    add("Maintenance", "Confirm whether a maintenance agreement is in place");
  } else if (f.has_maintenance_agreement === true) {
    if (!filled(f.maintenance_agreement_term_years)) add("Maintenance", "Maintenance agreement term (years)");
    if (!filled(f.maintenance_cost_annual)) add("Maintenance", "Annual maintenance cost");
    if (!hasDoc("om_agreement")) add("Maintenance", "Signed maintenance agreement document");
  }

  // ---- Data access ----
  if (!project?.data_access_verified) {
    add("Monitoring Access", "Monitoring portal / data access not yet verified");
  }

  return out;
}

export function groupOutstanding(items: OutstandingItem[]): Array<{ section: string; labels: string[] }> {
  const order: string[] = [];
  const map = new Map<string, string[]>();
  for (const item of items) {
    if (!map.has(item.section)) {
      map.set(item.section, []);
      order.push(item.section);
    }
    map.get(item.section)!.push(item.label);
  }
  return order.map((section) => ({ section, labels: map.get(section)! }));
}
