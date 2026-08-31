import { ComponentType, useEffect, useState, useCallback, lazy, Suspense } from "react";
import { Switch, Route, Router, Redirect } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { LanguageProvider } from "@/lib/i18n";
import { AuthProvider, useAuth } from "@/lib/auth";
import { DataProvider } from "@/lib/dataContext";
import Layout from "@/components/Layout";
import PinLock from "@/components/PinLock";
import Login from "@/pages/Login";
import NotFound from "@/pages/not-found";
import { Wrench } from "lucide-react";
import { getMaintenanceStatus } from "@/lib/api";


// Pages load when a route asks for them. Bundled together they were one
// 561 KB chunk that a data-entry user downloaded in full, reports and
// charting included, to reach screens their role blocks them from opening.
const Dashboard = lazy(() => import('@/pages/Dashboard'));
const Search = lazy(() => import('@/pages/Search'));
const NewBeneficiary = lazy(() => import('@/pages/NewBeneficiary'));
const BeneficiaryProfile = lazy(() => import('@/pages/BeneficiaryProfile'));
const AddVisit = lazy(() => import('@/pages/AddVisit'));
const Reports = lazy(() => import('@/pages/Reports'));
const Alerts = lazy(() => import('@/pages/Alerts'));
const Users = lazy(() => import('@/pages/Users'));
const Settings = lazy(() => import('@/pages/Settings'));
const AuditLog = lazy(() => import('@/pages/AuditLog'));
const Referrals = lazy(() => import('@/pages/Referrals'));
const Demographics = lazy(() => import('@/pages/Demographics'));
const StaffPerformance = lazy(() => import('@/pages/StaffPerformance'));
const AssessmentForm = lazy(() => import('@/pages/AssessmentForm'));
const SuccessStories = lazy(() => import('@/pages/SuccessStories'));
const MissedVisits = lazy(() => import('@/pages/MissedVisits'));
const Import = lazy(() => import('@/pages/Import'));

const queryClient = new QueryClient();

// ─── Maintenance Screen ───────────────────────────────────────────────────────
function MaintenanceScreen({ message }: { message: string }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background p-6 text-center">
      <div className="w-16 h-16 rounded-2xl bg-amber-100 flex items-center justify-center mb-6">
        <Wrench className="w-8 h-8 text-amber-600" />
      </div>
      <h1 className="text-2xl font-bold mb-2">الموقع تحت الصيانة</h1>
      <p className="text-muted-foreground max-w-sm">{message}</p>
      <p className="text-xs text-muted-foreground mt-6">Rehabilitation Database — جذور</p>
    </div>
  );
}

// ─── Protected Route ──────────────────────────────────────────────────────────
function Protected({ C, adminOnly = false, supervisorPlus = false }: { C: ComponentType; adminOnly?: boolean; supervisorPlus?: boolean }) {
  const { isAuthenticated, currentUser } = useAuth();
  if (!isAuthenticated) return <Redirect to="/" />;
  if (adminOnly && currentUser?.role !== "admin") return <Redirect to="/search" />;
  if (supervisorPlus && !["admin", "supervisor"].includes(currentUser?.role || "")) return <Redirect to="/search" />;
  return <Layout><C /></Layout>;
}

// ─── App Routes ───────────────────────────────────────────────────────────────
function AppRoutes() {
  const { isAuthenticated, pinLocked, currentUser } = useAuth();

  const [maintenanceEnabled, setMaintenanceEnabled] = useState(false);
  const [maintenanceMessage, setMaintenanceMessage] = useState('الموقع تحت الصيانة، يرجى المحاولة لاحقاً.');
  const [maintenanceLoaded, setMaintenanceLoaded]   = useState(false);

  const checkMaintenance = useCallback(() => {
    getMaintenanceStatus().then(({ enabled, message }) => {
      setMaintenanceEnabled(enabled);
      setMaintenanceMessage(message);
      setMaintenanceLoaded(true);
    }).catch(() => {
      // لو فشل الاتصال → ما نوقف الموقع، نكمل طبيعي
      setMaintenanceLoaded(true);
    });
  }, []);

  useEffect(() => {
    // فحص أولي عند التحميل
    checkMaintenance();

    // فحص دوري كل 30 ثانية
    const interval = setInterval(checkMaintenance, 30_000);

    return () => clearInterval(interval);
  }, [checkMaintenance]);

  // انتظر التحميل الأول فقط
  if (!maintenanceLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // الأدمن لا يتأثر بالصيانة أبداً
  const isAdmin = currentUser?.role === 'admin';
  const showMaintenance = maintenanceEnabled && !isAdmin;

  // لو مسجل دخول وليس أدمن والصيانة مفعلة → شاشة صيانة فوراً
  if (showMaintenance && isAuthenticated) {
    return <MaintenanceScreen message={maintenanceMessage} />;
  }

  if (pinLocked && isAuthenticated) return <PinLock />;

  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    }>
    <Switch>
      <Route path="/">
        {isAuthenticated
          ? <Redirect to="/search" />
          : (showMaintenance
              ? <div>
                  <MaintenanceScreen message={maintenanceMessage} />
                  {/* رابط خفي للأدمن */}
                  <div className="fixed bottom-4 left-1/2 -translate-x-1/2">
                    <a href="/admin-login" className="text-xs text-muted-foreground/30 hover:text-muted-foreground transition-colors">
                      admin
                    </a>
                  </div>
                </div>
              : <Login />)
        }
      </Route>

      {/* صفحة دخول الأدمن في وضع الصيانة */}
      <Route path="/admin-login">
        {isAuthenticated
          ? <Redirect to="/settings" />
          : <Login />
        }
      </Route>

      <Route path="/dashboard"><Protected C={Dashboard} /></Route>
      <Route path="/search"><Protected C={Search} /></Route>
      <Route path="/beneficiary/new"><Protected C={NewBeneficiary} /></Route>
      <Route path="/beneficiary/:id"><Protected C={BeneficiaryProfile} /></Route>
      <Route path="/add-visit/:id"><Protected C={AddVisit} /></Route>
      <Route path="/reports"><Protected C={Reports} supervisorPlus /></Route>
      <Route path="/alerts"><Protected C={Alerts} /></Route>
      <Route path="/users"><Protected C={Users} adminOnly /></Route>
      <Route path="/audit"><Protected C={AuditLog} adminOnly /></Route>
      <Route path="/referrals"><Protected C={Referrals} /></Route>
      <Route path="/demographics"><Protected C={Demographics} supervisorPlus /></Route>
      <Route path="/staff-performance"><Protected C={StaffPerformance} supervisorPlus /></Route>
      <Route path="/settings"><Protected C={Settings} /></Route>
      <Route path="/assessment/:id"><Protected C={AssessmentForm} /></Route>
      <Route path="/success-stories"><Protected C={SuccessStories} supervisorPlus /></Route>
      <Route path="/missed-visits"><Protected C={MissedVisits} /></Route>
      <Route path="/import"><Protected C={Import} adminOnly /></Route>
      <Route component={NotFound} />
      
    </Switch>
    </Suspense>
  );
}

// ─── Root ─────────────────────────────────────────────────────────────────────
export default function App() {
  const base = import.meta.env.BASE_URL.replace(/\/$/, "");
  return (
    <QueryClientProvider client={queryClient}>
      <LanguageProvider>
        <AuthProvider>
          <DataProvider>
            <TooltipProvider>
              <Router base={base}>
                <AppRoutes />
              </Router>
              <Toaster />
            </TooltipProvider>
          </DataProvider>
        </AuthProvider>
      </LanguageProvider>
    </QueryClientProvider>
  );
}
