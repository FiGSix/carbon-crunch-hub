import { useEffect, useMemo, useState } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import { ArrowDown, ArrowUp, ArrowUpDown, ChevronDown, Download, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { queryKeys } from '@/lib/queryKeys';
import { useAgentsRealtime } from './realtime/useAgentsRealtime';
import { AgentData } from './types';
import { AgentManageDrawer } from './AgentManageDrawer';
import { STATUS_OPTIONS, StatusKey, renderStatusBadge } from './statusBadge';
import { PartnerStatsCards } from './PartnerStatsCards';

const PAGE_SIZE = 50;
const tierRate = (companyKwp: number) => (companyKwp >= 15000 ? 7 : 4);

const escapeCsv = (v: unknown) => {
  const s = v === null || v === undefined ? '' : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

type SortKey = 'company' | 'contact' | 'status' | 'rate' | 'mwp';
type SortDir = 'asc' | 'desc';

const statusRank = (a: AgentData): number => {
  if (a.is_invitation) {
    const expired = a.invitation_expires_at && new Date(a.invitation_expires_at) < new Date();
    return expired ? 3 : 2;
  }
  if (a.agent_status === 'active') return 0;
  if (a.agent_status === 'inactive') return 4;
  return 1;
};

const effectiveRate = (a: AgentData): number | null => {
  if (a.is_invitation) return null;
  if (a.company_commission_override != null) return Number(a.company_commission_override);
  return tierRate(a.company_signed_kwp || 0);
};

export function PartnersTable() {
  useAgentsRealtime();

  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusKey>('all');
  const [companyFilter, setCompanyFilter] = useState<string>('all');
  const [selectedAgent, setSelectedAgent] = useState<AgentData | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [sortBy, setSortBy] = useState<SortKey>('mwp');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  // Debounce the search input
  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput.trim()), 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  const {
    data,
    isLoading,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: queryKeys.agents.management.list(
      { status: statusFilter, search },
      { size: PAGE_SIZE },
    ),
    initialPageParam: 0,
    queryFn: async ({ pageParam }) => {
      const { data, error } = await supabase.rpc('get_agents_management_data', {
        status_filter: statusFilter === 'all' ? null : statusFilter,
        search_term: search || null,
        limit_param: PAGE_SIZE,
        offset_param: pageParam as number,
      });
      if (error) throw error;
      return (data ?? []) as unknown as AgentData[];
    },
    getNextPageParam: (lastPage, allPages) => {
      const loaded = allPages.reduce((n, p) => n + p.length, 0);
      const total = Number(lastPage?.[0]?.total_count ?? 0);
      return loaded < total ? loaded : undefined;
    },
  });

  const rows: AgentData[] = useMemo(
    () => (data?.pages ?? []).flat(),
    [data],
  );

  const totalCount = useMemo(() => {
    const first = data?.pages?.[0]?.[0];
    return Number(first?.total_count ?? rows.length);
  }, [data, rows.length]);

  const companyOptions = useMemo(() => {
    const set = new Set<string>();
    rows.forEach((a) => {
      if (a.company_name) set.add(a.company_name);
    });
    return Array.from(set).sort();
  }, [rows]);

  const filteredRows = useMemo(() => {
    const base = companyFilter === 'all' ? rows : rows.filter((a) => a.company_name === companyFilter);

    const dir = sortDir === 'asc' ? 1 : -1;
    const cmp = (a: AgentData, b: AgentData): number => {
      if (sortBy === 'mwp' || sortBy === 'rate') {
        if (a.is_invitation && !b.is_invitation) return 1;
        if (!a.is_invitation && b.is_invitation) return -1;
      }
      switch (sortBy) {
        case 'company': {
          const av = (a.company_name || '').toLowerCase();
          const bv = (b.company_name || '').toLowerCase();
          return av.localeCompare(bv) * dir;
        }
        case 'contact': {
          const av = (a.agent_name || a.agent_email || '').toLowerCase();
          const bv = (b.agent_name || b.agent_email || '').toLowerCase();
          return av.localeCompare(bv) * dir;
        }
        case 'status':
          return (statusRank(a) - statusRank(b)) * dir;
        case 'rate': {
          const av = effectiveRate(a);
          const bv = effectiveRate(b);
          if (av == null && bv == null) return 0;
          if (av == null) return 1;
          if (bv == null) return -1;
          return (av - bv) * dir;
        }
        case 'mwp':
        default: {
          const av = a.company_signed_kwp || 0;
          const bv = b.company_signed_kwp || 0;
          return (av - bv) * dir;
        }
      }
    };
    return [...base].sort(cmp);
  }, [rows, companyFilter, sortBy, sortDir]);

  const toggleSort = (key: SortKey) => {
    if (sortBy === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(key);
      setSortDir(key === 'mwp' || key === 'rate' ? 'desc' : 'asc');
    }
  };

  const sortIcon = (key: SortKey) => {
    if (sortBy !== key) return <ArrowUpDown className="h-3 w-3 opacity-40" />;
    return sortDir === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />;
  };

  const ariaSort = (key: SortKey): 'ascending' | 'descending' | 'none' =>
    sortBy !== key ? 'none' : sortDir === 'asc' ? 'ascending' : 'descending';

  const renderRate = (a: AgentData) => {
    if (a.is_invitation) return '';
    if (a.company_commission_override != null) {
      return `${a.company_commission_override}% SP Rate`;
    }
    return `${tierRate(a.company_signed_kwp || 0)}% (Tier)`;
  };

  const exportCsv = () => {
    const headers = ['Company', 'Name', 'Email', 'Status', 'Rate', 'Company MWp Signed'];
    const lines = filteredRows.map((a) => {
      const mwp = a.is_invitation ? '' : ((a.company_signed_kwp || 0) / 1000).toFixed(2);
      const status = a.is_invitation
        ? a.invitation_expires_at && new Date(a.invitation_expires_at) < new Date()
          ? 'Expired'
          : 'Invited'
        : a.agent_status;
      return [a.company_name || '', a.agent_name || '', a.agent_email, status, renderRate(a), mwp]
        .map(escapeCsv)
        .join(',');
    });
    const csv = [headers.join(','), ...lines].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `partners-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const openManage = (agent: AgentData) => {
    setSelectedAgent(agent);
    setDrawerOpen(true);
  };

  const SortHeader = ({ label, k, className }: { label: string; k: SortKey; className?: string }) => (
    <TableHead className={className} aria-sort={ariaSort(k)}>
      <button
        type="button"
        onClick={() => toggleSort(k)}
        className="inline-flex items-center gap-1 font-medium hover:text-foreground"
      >
        {label}
        {sortIcon(k)}
      </button>
    </TableHead>
  );

  const loadedCount = rows.length;
  // When companyFilter narrows client-side, show the visible count instead of server total
  const visibleTotal = companyFilter === 'all' ? totalCount : filteredRows.length;
  const shownCount = companyFilter === 'all' ? loadedCount : filteredRows.length;

  return (
    <div className="space-y-4">
      {/* Glance cards */}
      <PartnerStatsCards
        activeFilter={statusFilter}
        onSelect={(k) => setStatusFilter(k)}
      />

      {/* Filter row */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative max-w-xs flex-1 min-w-[220px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search by name, email or company…"
            className="pl-9"
            aria-label="Search partners"
          />
        </div>

        <Select
          value={statusFilter}
          onValueChange={(v) => setStatusFilter(v as StatusKey)}
        >
          <SelectTrigger className="w-[180px]" aria-label="Filter by status">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                <span className="inline-flex items-center gap-2">
                  <span className={`h-2 w-2 rounded-full ${o.swatch}`} />
                  {o.label}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={companyFilter} onValueChange={setCompanyFilter}>
          <SelectTrigger className="w-[200px]" aria-label="Filter by company">
            <SelectValue placeholder="All Companies" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Companies</SelectItem>
            {companyOptions.map((c) => (
              <SelectItem key={c} value={c}>
                {c}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button variant="outline" size="sm" onClick={exportCsv} className="ml-auto">
          <Download className="h-4 w-4 mr-2" />
          Export CSV
        </Button>
      </div>

      {/* Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <SortHeader label="Company" k="company" />
              <SortHeader label="Contact" k="contact" />
              <SortHeader label="Status" k="status" />
              <SortHeader label="Current Rate" k="rate" />
              <SortHeader label="MWp Signed" k="mwp" />
              <TableHead className="w-[100px]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                  Loading…
                </TableCell>
              </TableRow>
            ) : error ? (
              <TableRow>
                <TableCell colSpan={6} className="py-10 text-center text-destructive">
                  {(error as Error).message}
                </TableCell>
              </TableRow>
            ) : filteredRows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                  No partners match the current filters.
                </TableCell>
              </TableRow>
            ) : (
              filteredRows.map((a) => {
                const mwp = (a.company_signed_kwp || 0) / 1000;
                return (
                  <TableRow key={`${a.is_invitation ? 'inv' : 'ag'}-${a.agent_id}`}>
                    <TableCell>
                      {a.company_name && a.company_name !== 'Private' ? (
                        a.company_name
                      ) : (
                        <span className="italic text-muted-foreground">Private</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">{a.agent_name || '—'}</div>
                      <div className="text-xs text-muted-foreground">{a.agent_email}</div>
                    </TableCell>
                    <TableCell>{renderStatusBadge(a)}</TableCell>
                    <TableCell>
                      {a.is_invitation ? (
                        <span className="text-muted-foreground">N/A</span>
                      ) : a.company_commission_override != null ? (
                        <Badge
                          variant="outline"
                          className="border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-700 dark:bg-amber-950/30 dark:text-amber-200"
                        >
                          {a.company_commission_override}% SP Rate
                        </Badge>
                      ) : (
                        <span className="text-sm">
                          {tierRate(a.company_signed_kwp || 0)}% (Tier)
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      {a.is_invitation ? (
                        <span className="text-muted-foreground">—</span>
                      ) : (
                        `${mwp.toFixed(2)} MWp`
                      )}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openManage(a)}
                        aria-label={`Manage partner ${a.agent_name || a.agent_email}`}
                      >
                        Manage
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Footer: Load more + count */}
      {filteredRows.length > 0 && (
        <div className="flex flex-col items-center gap-2 py-4">
          {companyFilter === 'all' && hasNextPage && (
            <Button
              variant="outline"
              onClick={() => fetchNextPage()}
              disabled={isFetchingNextPage}
              className="w-full max-w-xs"
            >
              <ChevronDown className="h-4 w-4 mr-2" />
              {isFetchingNextPage ? 'Loading…' : 'Load More Partners'}
            </Button>
          )}
          <p className="text-sm text-muted-foreground">
            Showing {shownCount} of {visibleTotal} partners
          </p>
        </div>
      )}

      <AgentManageDrawer
        agent={selectedAgent}
        open={drawerOpen}
        onOpenChange={(o) => {
          setDrawerOpen(o);
          if (!o) setSelectedAgent(null);
        }}
      />
    </div>
  );
}
