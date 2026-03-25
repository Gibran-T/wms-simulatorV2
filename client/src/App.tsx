import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { LanguageProvider } from "./contexts/LanguageContext";
import Home from "./pages/Home";
import MissionControl from "./pages/student/MissionControl";
import ScenarioList from "./pages/student/ScenarioList";
import StepForm from "./pages/student/StepForm";
import RunReport from "./pages/student/RunReport";
import Module2ScenarioList from "./pages/student/Module2ScenarioList";
import Module2ModeSelectionPage from "./pages/student/Module2ModeSelectionPage";
import PutawayFormPage from "./pages/student/PutawayFormPage";
import Module3ScenarioList from "./pages/student/Module3ScenarioList";
import Module3ModeSelectionPage from "./pages/student/Module3ModeSelectionPage";
import Module4Dashboard from "./pages/student/Module4Dashboard";
import Module5SimulationPage from "./pages/student/Module5SimulationPage";
import TeacherDashboard from "./pages/teacher/TeacherDashboard";
import CohortManager from "./pages/teacher/CohortManager";
import ScenarioManager from "./pages/teacher/ScenarioManager";
import AssignmentManager from "./pages/teacher/AssignmentManager";
import MonitorDashboard from "./pages/teacher/MonitorDashboard";
import AnalyticsDashboard from "./pages/teacher/AnalyticsDashboard";
import TeacherSlidesHub from "./pages/teacher/TeacherSlidesHub";
import AdminPanel from "./pages/admin/AdminPanel";
import StudentManager from "./pages/teacher/StudentManager";
import Legal from "./pages/Legal";
import LocalLogin from "./pages/LocalLogin";
import SlideViewer from "./pages/SlideViewer";
import StudentSlidesHub from "./pages/student/StudentSlidesHub";
import QuizPage from "./pages/student/QuizPage";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      {/* Student routes */}
      <Route path="/student" component={() => { window.location.replace("/student/scenarios"); return null; }} />
      <Route path="/student/scenarios" component={ScenarioList} />
      <Route path="/student/run/:runId" component={MissionControl} />
      <Route path="/student/run/:runId/step/:step" component={StepForm} />
      <Route path="/student/run/:runId/report" component={RunReport} />
      {/* Module 2 routes */}
      <Route path="/student/module2" component={Module2ScenarioList} />
      <Route path="/student/module2/scenario/:scenarioId/mode" component={Module2ModeSelectionPage} />
      <Route path="/student/module2/run/:runId/putaway" component={PutawayFormPage} />
      {/* Module 3 routes */}
      <Route path="/student/module3" component={Module3ScenarioList} />
      <Route path="/student/module3/scenario/:scenarioId/mode" component={Module3ModeSelectionPage} />
      {/* Module 4 routes */}
      <Route path="/student/module4" component={Module4Dashboard} />
      {/* Module 5 routes */}
      <Route path="/student/module5" component={Module5SimulationPage} />
      {/* Quiz routes */}
      <Route path="/student/quiz/:moduleId" component={QuizPage} />
      {/* Slides routes — requires authentication (handled by SlideViewer via FioriShell guard) */}
      <Route path="/student/slides" component={StudentSlidesHub} />
      <Route path="/student/slides/:moduleId" component={SlideViewer} />
      {/* Teacher routes */}
      <Route path="/teacher" component={TeacherDashboard} />
      <Route path="/teacher/cohorts" component={CohortManager} />
      <Route path="/teacher/scenarios" component={ScenarioManager} />
      <Route path="/teacher/assignments" component={AssignmentManager} />
      <Route path="/teacher/monitor" component={MonitorDashboard} />
      <Route path="/teacher/analytics" component={AnalyticsDashboard} />
      <Route path="/teacher/slides" component={TeacherSlidesHub} />
      <Route path="/teacher/students" component={StudentManager} />
      {/* Admin */}
      <Route path="/admin" component={AdminPanel} />
      {/* Legal */}
      <Route path="/login" component={LocalLogin} />
      <Route path="/legal" component={Legal} />
      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <LanguageProvider>
        <ThemeProvider defaultTheme="light" switchable>
          <TooltipProvider>
            <Toaster />
            <Router />
          </TooltipProvider>
        </ThemeProvider>
      </LanguageProvider>
    </ErrorBoundary>
  );
}

export default App;
