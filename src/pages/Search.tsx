import { useState, useMemo } from 'react';
import { useLocation } from 'wouter';
import { useLanguage } from '@/lib/i18n';
import { useData } from '@/lib/dataContext';
import { useAuth } from '@/lib/auth';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search as SearchIcon, UserPlus, AlertCircle, Clock, ChevronRight, Filter, X, AlertTriangle, ExternalLink } from 'lucide-react';
import { GAZA_AREAS } from '@/data/mockData';

const PAGE_SIZE = 20;

const statusColors: Record<string, string> = {
  active:   'bg-green-100 text-green-700',
  open:     'bg-blue-100 text-blue-700',
  closed:   'bg-gray-100 text-gray-600',
  inactive: 'bg-yellow-100 text-yellow-700',
};
const statusLabels: Record<string, string> = {
  active: 'نشط', open: 'مفتوح', closed: 'مغلق', inactive: 'غير نشط',
};

export default function Search() {
  const { t, language } = useLanguage();
  const [, setLocation] = useLocation();
  const { beneficiaries, sessions } = useData();
  const { currentUser } = useAuth();

  const userProjects = currentUser?.projects || [];
  const isAdmin = currentUser?.role === 'admin';

  const allowedBeneficiaries = useMemo(() => {
    if (isAdmin || userProjects.length === 0) return beneficiaries;
    return beneficiaries.filter(b => userProjects.includes(b.project as any));
  }, [beneficiaries, userProjects, isAdmin]);

  const [nationalId,    setNationalId]    = useState('');
  const [nameFilter,    setNameFilter]    = useState('');
  const [projectFilter, setProjectFilter] = useState<string>('all');
  const [areaFilter,    setAreaFilter]    = useState<string>('all');
  const [statusFilter,  setStatusFilter]  = useState<string>('all');
  const [showAll,       setShowAll]       = useState(false);
  const [idSearched,    setIdSearched]    = useState(false);
  const [currentPage,   setCurrentPage]   = useState(1);
  const [searchHistory, setSearchHistory] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem('rehab-search-history') || '[]'); } catch { return []; }
  });

  const sessionCountMap = useMemo(() => {
    const map: Record<string, number> = {};
    sessions.forEach(s => { map[s.beneficiaryId] = (map[s.beneficiaryId] || 0) + 1; });
    return map;
  }, [sessions]);

  const lastSessionMap = useMemo(() => {
    const map: Record<string, string> = {};
    sessions.forEach(s => {
      if (!map[s.beneficiaryId] || s.serviceDate > map[s.beneficiaryId])
        map[s.beneficiaryId] = s.serviceDate;
    });
    return map;
  }, [sessions]);

  const hasFilters   = projectFilter !== 'all' || areaFilter !== 'all' || statusFilter !== 'all' || nameFilter.trim() !== '';
  const isSearchMode = hasFilters || showAll;

  const filteredResults = useMemo(() => {
    if (!isSearchMode) return [];
    return allowedBeneficiaries.filter(b => {
      if (nameFilter.trim() && !b.fullName.includes(nameFilter) && !b.nationalId.includes(nameFilter)) return false;
      if (projectFilter !== 'all' && b.project !== projectFilter) return false;
      if (areaFilter    !== 'all' && b.residenceArea !== areaFilter) return false;
      if (statusFilter  !== 'all' && b.caseStatus !== statusFilter) return false;
      return true;
    });
  }, [allowedBeneficiaries, nameFilter, projectFilter, areaFilter, statusFilter, isSearchMode]);

  const totalPages      = Math.ceil(filteredResults.length / PAGE_SIZE);
  const paginatedResults = filteredResults.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );

  const nameDuplicates = useMemo(() => {
    const q = nameFilter.trim();
    if (q.length < 3) return [];
    return allowedBeneficiaries.filter(b =>
      b.fullName.includes(q) || b.nationalId.includes(q)
    );
  }, [allowedBeneficiaries, nameFilter]);

  const clearFilters = () => {
    setNameFilter(''); setProjectFilter('all'); setAreaFilter('all');
    setStatusFilter('all'); setShowAll(false); setCurrentPage(1);
  };

  const handleIdSearch = () => {
    if (!nationalId.trim()) return;
    setIdSearched(true);
    const history = [nationalId, ...searchHistory.filter(h => h !== nationalId)].slice(0, 5);
    setSearchHistory(history);
    localStorage.setItem('rehab-search-history', JSON.stringify(history));
  };

  const foundCase = nationalId.trim()
    ? allowedBeneficiaries.find(b => b.nationalId === nationalId.trim())
    : null;

  const BeneficiaryCard = ({ b, testId, highlight }: { b: (typeof beneficiaries)[0]; testId?: string; highlight?: boolean }) => (
    <Card
      data-testid={testId}
      className={`cursor-pointer transition-colors ${highlight ? 'border-amber-300 bg-amber-50/50 hover:bg-amber-50' : 'hover:bg-muted/30'}`}
      onClick={() => setLocation(`/beneficiary/${b.id}`)}
    >
      <CardContent className="p-4 flex items-center gap-3">
        <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${highlight ? 'bg-amber-100' : 'bg-primary/10'}`}>
          <span className={`text-sm font-semibold ${highlight ? 'text-amber-700' : 'text-primary'}`}>{b.fullName.charAt(0)}</span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm truncate">{b.fullName}</p>
          <div className="flex flex-wrap items-center gap-2 mt-0.5">
            <span className="text-xs text-muted-foreground">{b.nationalId}</span>
            <span className="text-xs text-muted-foreground">·</span>
            <span className="text-xs text-muted-foreground">{b.residenceArea}</span>
            {lastSessionMap[b.id] && (
              <><span className="text-xs text-muted-foreground">·</span>
              <span className="text-xs text-muted-foreground">آخر جلسة: {lastSessionMap[b.id]}</span></>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0 flex-wrap justify-end">
          <Badge className={`text-[10px] px-1.5 border-0 ${b.project === 'CBM' ? 'bg-blue-100 text-blue-700' : 'bg-emerald-100 text-emerald-700'}`}>
            {b.project}
          </Badge>
          <Badge className={`text-[10px] px-1.5 border-0 ${statusColors[b.caseStatus]}`}>
            {statusLabels[b.caseStatus] || b.caseStatus}
          </Badge>
          {(sessionCountMap[b.id] ?? 0) > 0 && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">
              {sessionCountMap[b.id]} جلسة
            </span>
          )}
          <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
        </div>
      </CardContent>
    </Card>
  );

  const availableProjects = isAdmin || userProjects.length === 0
    ? ['CBM', 'Church']
    : userProjects;

  // ─── Pagination Component ─────────────────────────────────────────────────
  const PaginationBar = () => {
    if (totalPages <= 1) return null;
    const pages = Array.from({ length: totalPages }, (_, i) => i + 1)
      .filter(p => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1)
      .reduce((acc: (number | string)[], p, i, arr) => {
        if (i > 0 && (p as number) - (arr[i - 1] as number) > 1) acc.push('...');
        acc.push(p);
        return acc;
      }, []);

    return (
      <div className="space-y-2 pt-2">
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline" size="sm"
            disabled={currentPage === 1}
            onClick={() => setCurrentPage(p => p - 1)}
            className="text-xs h-8 px-3"
          >
            السابق
          </Button>
          <div className="flex items-center gap-1">
            {pages.map((p, i) =>
              p === '...' ? (
                <span key={`dots-${i}`} className="text-xs text-muted-foreground px-1">...</span>
              ) : (
                <button
                  key={p}
                  onClick={() => setCurrentPage(p as number)}
                  className={`w-8 h-8 rounded-lg text-xs font-medium transition-colors ${
                    currentPage === p
                      ? 'bg-primary text-primary-foreground'
                      : 'hover:bg-muted text-muted-foreground'
                  }`}
                >
                  {p}
                </button>
              )
            )}
          </div>
          <Button
            variant="outline" size="sm"
            disabled={currentPage === totalPages}
            onClick={() => setCurrentPage(p => p + 1)}
            className="text-xs h-8 px-3"
          >
            التالي
          </Button>
        </div>
        <p className="text-xs text-center text-muted-foreground">
          عرض {(currentPage - 1) * PAGE_SIZE + 1}–{Math.min(currentPage * PAGE_SIZE, filteredResults.length)} من {filteredResults.length} نتيجة
        </p>
      </div>
    );
  };

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-5" dir="rtl">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-xl font-bold">{t('Search')}</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {allowedBeneficiaries.length} حالة مسجّلة —{' '}
            <span className="text-green-600 font-medium">
              {allowedBeneficiaries.filter(b => b.caseStatus !== 'closed').length} نشطة
            </span>
            {userProjects.length > 0 && !isAdmin && (
              <span className="text-xs text-muted-foreground me-1">
                ({userProjects.join(' + ')})
              </span>
            )}
          </p>
        </div>
        <Button
          data-testid="btn-add-beneficiary-header"
          className="gap-2 shrink-0"
          onClick={() => setLocation('/beneficiary/new')}
        >
          <UserPlus className="w-4 h-4" />تسجيل حالة جديدة
        </Button>
      </div>

      {/* ─── ID Search ─────────────────────────────────────────────────────── */}
      <Card>
        <CardContent className="p-5 space-y-4">
          <div>
            <label className="text-sm font-medium mb-1.5 block">{t('National ID')}</label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <SearchIcon className="absolute top-2.5 right-3 w-4 h-4 text-muted-foreground" />
                <Input
                  data-testid="input-national-id"
                  placeholder="أدخل رقم الهوية..."
                  value={nationalId}
                  onChange={e => { setNationalId(e.target.value); setIdSearched(false); }}
                  onKeyDown={e => e.key === 'Enter' && handleIdSearch()}
                  className="pr-9"
                />
              </div>
              <Button data-testid="btn-search" onClick={handleIdSearch} disabled={!nationalId.trim()}>
                {t('Search')}
              </Button>
            </div>
          </div>

          {idSearched && foundCase && (
            <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 space-y-3">
              <div className="flex items-start gap-2.5">
                <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-amber-800 text-sm">⚠️ هذه الحالة مسجّلة مسبقاً!</p>
                  <p className="text-xs text-amber-700 mt-0.5">
                    رقم الهوية <span className="font-bold">{nationalId}</span> موجود بالفعل في النظام
                  </p>
                </div>
              </div>
              <div className="bg-white rounded-lg border border-amber-200 p-3 space-y-1.5">
                <div className="flex items-center justify-between">
                  <p className="font-semibold text-sm">{foundCase.fullName}</p>
                  <Badge className={`text-[10px] border-0 ${statusColors[foundCase.caseStatus]}`}>
                    {statusLabels[foundCase.caseStatus]}
                  </Badge>
                </div>
                <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-muted-foreground">
                  <span>المنطقة: {foundCase.residenceArea}</span>
                  <span>المشروع: {foundCase.project}</span>
                  <span>الجلسات: {sessionCountMap[foundCase.id] ?? 0}</span>
                  {lastSessionMap[foundCase.id] && <span>آخر جلسة: {lastSessionMap[foundCase.id]}</span>}
                </div>
              </div>
              <div className="flex gap-2">
                <Button className="flex-1 gap-2" onClick={() => setLocation(`/beneficiary/${foundCase.id}`)}>
                  <ExternalLink className="w-4 h-4" />فتح ملف الحالة
                </Button>
                <Button variant="outline" onClick={() => { setNationalId(''); setIdSearched(false); }}>
                  إلغاء
                </Button>
              </div>
            </div>
          )}

          {idSearched && !foundCase && nationalId.trim() && (
            <div className="p-4 rounded-lg bg-muted/60 border border-border text-center space-y-3">
              <AlertCircle className="w-7 h-7 text-muted-foreground mx-auto" />
              <p className="font-medium text-sm">{t('Case Not Found')}</p>
              <p className="text-xs text-muted-foreground">لا توجد حالة برقم الهوية: {nationalId}</p>
              <Button
                data-testid="btn-add-new-case"
                onClick={() => setLocation(`/beneficiary/new?nationalId=${nationalId}`)}
                variant="outline"
                className="gap-2"
              >
                <UserPlus className="w-4 h-4" />{t('Add New Case')}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ─── Filters ───────────────────────────────────────────────────────── */}
      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium flex items-center gap-1.5"><Filter className="w-4 h-4" />تصفية الحالات</span>
            {hasFilters && (
              <button onClick={clearFilters} className="text-xs text-muted-foreground hover:text-destructive flex items-center gap-1">
                <X className="w-3 h-3" />مسح الفلاتر
              </button>
            )}
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">البحث بالاسم أو رقم الهوية</label>
            <Input
              data-testid="input-name-filter"
              placeholder="ابحث بالاسم أو رقم الهوية..."
              value={nameFilter}
              onChange={e => { setNameFilter(e.target.value); setShowAll(false); setCurrentPage(1); }}
            />
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">المشروع</label>
              <Select value={projectFilter} onValueChange={v => { setProjectFilter(v); setShowAll(true); setCurrentPage(1); }}>
                <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="الكل"/></SelectTrigger>
                <SelectContent>
                  {availableProjects.length > 1 && <SelectItem value="all">الكل</SelectItem>}
                  {availableProjects.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">الحالة</label>
              <Select value={statusFilter} onValueChange={v => { setStatusFilter(v); setShowAll(true); setCurrentPage(1); }}>
                <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="الكل"/></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">الكل</SelectItem>
                  <SelectItem value="active">نشط</SelectItem>
                  <SelectItem value="closed">مغلق</SelectItem>
                  <SelectItem value="open">مفتوح</SelectItem>
                  <SelectItem value="inactive">غير نشط</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">المنطقة</label>
              <Select value={areaFilter} onValueChange={v => { setAreaFilter(v); setShowAll(true); setCurrentPage(1); }}>
                <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="الكل"/></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">الكل</SelectItem>
                  {GAZA_AREAS.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          {!isSearchMode && (
            <Button variant="outline" size="sm" className="w-full gap-2 text-xs" onClick={() => { setShowAll(true); setCurrentPage(1); }}>
              <SearchIcon className="w-3.5 h-3.5" />عرض جميع الحالات ({allowedBeneficiaries.length})
            </Button>
          )}
        </CardContent>
      </Card>

      {/* ─── Duplicate name warning ─────────────────────────────────────────── */}
      {nameFilter.trim().length >= 3 && nameDuplicates.length > 0 && !isSearchMode && (
        <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-3 space-y-2">
          <p className="text-xs font-semibold text-amber-700 flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5" />
            تنبيه: وُجد {nameDuplicates.length} حالة مشابهة — تأكد قبل تسجيل حالة جديدة
          </p>
          {nameDuplicates.slice(0, 3).map(b => (
            <BeneficiaryCard key={b.id} b={b} highlight />
          ))}
          {nameDuplicates.length > 3 && (
            <p className="text-xs text-amber-600 text-center">و {nameDuplicates.length - 3} حالة أخرى...</p>
          )}
        </div>
      )}

      {/* ─── Results ───────────────────────────────────────────────────────── */}
      {isSearchMode ? (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-muted-foreground">
              {filteredResults.length} نتيجة
              {hasFilters && <span className="text-xs"> (من أصل {allowedBeneficiaries.length})</span>}
            </p>
          </div>
          {filteredResults.length === 0 ? (
            <Card><CardContent className="py-10 text-center text-sm text-muted-foreground">لا توجد نتائج تطابق الفلاتر المحددة</CardContent></Card>
          ) : (
            <>
              {paginatedResults.map(b => <BeneficiaryCard key={b.id} b={b} testId={`result-${b.id}`} />)}
              <PaginationBar />
            </>
          )}
        </div>
      ) : (
        <>
          {searchHistory.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                <Clock className="w-3 h-3" />بحث سابق
              </p>
              <div className="flex flex-wrap gap-2">
                {searchHistory.map(h => (
                  <button
                    key={h}
                    data-testid={`history-${h}`}
                    onClick={() => { setNationalId(h); setIdSearched(false); }}
                    className="text-xs px-3 py-1.5 rounded-full bg-muted hover:bg-muted/80 text-muted-foreground transition-colors"
                  >
                    {h}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">آخر الحالات المضافة</p>
              <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={() => setLocation('/beneficiary/new')} data-testid="btn-add-case-shortcut">
                <UserPlus className="w-3.5 h-3.5" />{t('Add New Case')}
              </Button>
            </div>
            {allowedBeneficiaries.slice(0, 5).map(b => (
              <BeneficiaryCard key={b.id} b={b} testId={`recent-${b.id}`} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
