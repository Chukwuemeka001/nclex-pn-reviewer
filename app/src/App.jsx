import { useEffect, useMemo, useState } from "react";
import { BookOpen, BarChart3, ClipboardList, Target, RotateCcw, ShieldCheck, Wand2, NotebookPen, CalendarDays, UserCheck } from "lucide-react";
import { loadQuestions } from "./lib/questionLoader";
import Dashboard from "./pages/Dashboard";
import PracticeSetup from "./pages/PracticeSetup";
import QuizPlayer from "./pages/QuizPlayer";
import Results from "./pages/Results";
import Review from "./pages/Review";
import WeaknessDashboard from "./pages/WeaknessDashboard";
import AdminReview from "./pages/AdminReview";
import RewriteWorkbench from "./pages/RewriteWorkbench";
import ErrorJournal from "./pages/ErrorJournal";
import DailyPlan from "./pages/DailyPlan";
import ExternalReviewerGuide from "./pages/ExternalReviewerGuide";
import { buildErrorJournalEntries, loadErrorJournal, mergeJournalEntries, saveErrorJournal } from "./lib/errorJournal.js";

const defaultSetup = {
  mode: "Tutor Practice",
  clientNeedsCategory: "",
  clientNeedsSubcategory: "",
  clinicalJudgmentStep: "",
  questionType: "",
  topicTags: [],
  populationTags: [],
  safetyTags: [],
  skillTags: [],
  bodySystemTags: [],
  difficulty: "",
  numberOfQuestions: 10,
  tutorMode: true,
  timedMode: false,
};

const pathToRoute = {
  "/": "dashboard",
  "/daily-plan": "dailyPlan",
  "/setup": "setup",
  "/quiz": "quiz",
  "/results": "results",
  "/review": "review",
  "/weakness": "weakness",
  "/journal": "journal",
  "/admin": "admin",
  "/reviewer": "reviewer",
  "/rewrite": "rewrite",
};

const routeToPath = Object.fromEntries(Object.entries(pathToRoute).map(([path, route]) => [route, path]));

function initialRoute() {
  const hashPath = window.location.hash?.replace(/^#/, "");
  if (hashPath && pathToRoute[hashPath]) return pathToRoute[hashPath];
  return pathToRoute[window.location.pathname] || "dashboard";
}

export default function App() {
  const [route, setRouteState] = useState(initialRoute);
  const [bank, setBank] = useState({ questions: [], source: "loading", approvedCount: 0, error: null });
  const [setup, setSetup] = useState(defaultSetup);
  const [session, setSession] = useState(null);
  const [lastResult, setLastResult] = useState(null);
  const [flaggedIds, setFlaggedIds] = useState(new Set());
  const [journalEntries, setJournalEntriesState] = useState(() => loadErrorJournal());

  function setRoute(nextRoute) {
    setRouteState(nextRoute);
    const nextPath = routeToPath[nextRoute] || "/";
    const basePath = import.meta.env.BASE_URL && import.meta.env.BASE_URL !== "/" ? import.meta.env.BASE_URL.replace(/\/$/, "") : "";
    if (window.location.hash?.replace(/^#/, "") !== nextPath) window.history.pushState({}, "", `${basePath || ""}/#${nextPath}`);
  }

  useEffect(() => {
    const onPopState = () => setRouteState(initialRoute());
    window.addEventListener("popstate", onPopState);
    window.addEventListener("hashchange", onPopState);
    return () => {
      window.removeEventListener("popstate", onPopState);
      window.removeEventListener("hashchange", onPopState);
    };
  }, []);

  useEffect(() => {
    loadQuestions()
      .then(setBank)
      .catch((error) => setBank({
        questions: [],
        source: "error",
        approvedCount: 0,
        error: error.message || String(error),
      }));
  }, []);

  const nav = useMemo(() => [
    { id: "dashboard", label: "Dashboard", icon: BarChart3 },
    { id: "dailyPlan", label: "Daily Plan", icon: CalendarDays },
    { id: "setup", label: "Practice", icon: ClipboardList },
    { id: "weakness", label: "Weak Areas", icon: Target },
    { id: "journal", label: "Error Journal", icon: NotebookPen },
    { id: "review", label: "Review", icon: BookOpen },
    { id: "admin", label: "Admin", icon: ShieldCheck },
    { id: "reviewer", label: "Reviewer", icon: UserCheck },
    { id: "rewrite", label: "Rewrite Lab", icon: Wand2 },
  ], []);

  function setJournalEntries(updater) {
    setJournalEntriesState((current) => {
      const next = typeof updater === "function" ? updater(current) : updater;
      saveErrorJournal(next);
      return next;
    });
  }

  function saveMissesToJournal(result) {
    const incoming = buildErrorJournalEntries(result);
    setJournalEntries((current) => mergeJournalEntries(current, incoming));
    setRoute("journal");
  }

  function startQuiz(nextSession) {
    setSession(nextSession);
    setLastResult(null);
    setRoute("quiz");
  }

  function finishQuiz(result) {
    setLastResult(result);
    setRoute("results");
  }

  function toggleFlag(id) {
    setFlaggedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">PN</div>
          <div>
            <strong>NCLEX-PN</strong>
            <span>Study MVP</span>
          </div>
        </div>
        <nav>
          {nav.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                className={route === item.id ? "nav-item active" : "nav-item"}
                onClick={() => setRoute(item.id)}
              >
                <Icon size={18} />
                {item.label}
              </button>
            );
          })}
        </nav>
        <button className="nav-item subtle" onClick={() => {
          setSetup(defaultSetup);
          setSession(null);
          setLastResult(null);
          setRoute("dashboard");
        }}>
          <RotateCcw size={18} />
          Reset
        </button>
      </aside>
      <main className="main-panel">
        {bank.source === "demo" && (
          <div className="notice demo-banner">Using demo seed questions.</div>
        )}
        {bank.error && (
          <div className="notice error-banner">Question loading failed: {bank.error}</div>
        )}
        {route === "dashboard" && <Dashboard bank={bank} lastResult={lastResult} onStart={() => setRoute("setup")} />}
        {route === "dailyPlan" && <DailyPlan journalEntries={journalEntries} lastResult={lastResult} onPractice={() => setRoute("setup")} onJournal={() => setRoute("journal")} />}
        {route === "setup" && (
          <PracticeSetup
            questions={bank.questions}
            setup={setup}
            setSetup={setSetup}
            onStart={startQuiz}
          />
        )}
        {route === "quiz" && !session && (
          <section className="page empty-state">
            <h1>No active quiz session</h1>
            <p>Start from Practice Setup to create a quiz session.</p>
            <button className="primary-btn" onClick={() => setRoute("setup")}>Go to setup</button>
          </section>
        )}
        {route === "quiz" && session && (
          <QuizPlayer
            session={session}
            setup={setup}
            onFinish={finishQuiz}
            flaggedIds={flaggedIds}
            onToggleFlag={toggleFlag}
          />
        )}
        {route === "results" && !lastResult && (
          <section className="page empty-state">
            <h1>No results yet</h1>
            <p>Complete a quiz to see scoring and tag analytics.</p>
            <button className="primary-btn" onClick={() => setRoute("setup")}>Start practice</button>
          </section>
        )}
        {route === "results" && lastResult && (
          <Results result={lastResult} onReview={() => setRoute("review")} onPractice={() => setRoute("setup")} onSaveJournal={() => saveMissesToJournal(lastResult)} />
        )}
        {route === "review" && (
          <Review result={lastResult} flaggedIds={flaggedIds} onPractice={() => setRoute("setup")} />
        )}
        {route === "weakness" && <WeaknessDashboard result={lastResult} onPractice={() => setRoute("setup")} />}
        {route === "journal" && <ErrorJournal entries={journalEntries} setEntries={setJournalEntries} onPractice={() => setRoute("setup")} />}
        {route === "admin" && <AdminReview />}
        {route === "reviewer" && <ExternalReviewerGuide onAdmin={() => setRoute("admin")} />}
        {route === "rewrite" && <RewriteWorkbench />}
      </main>
    </div>
  );
}
