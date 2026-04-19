import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import Header from "./components/Header";
import Landing from "./pages/Landing";
import Repos from "./pages/Repos";
import Explore from "./pages/Explore";
import PRList from "./pages/PRList";
import PRDetail from "./pages/PRDetail";
import AuthCallback from "./pages/AuthCallback";
import NotFound from "./pages/NotFound";
import { useEffect } from "react";

export default function App() {
  const { user, loading } = useAuth();

  useEffect(() => {
    document.title = "Diffr";
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-(--bg) text-(--text) flex items-center justify-center">
        <span className="text-(--muted)">Loading...</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-(--bg) text-(--text)">
      <Header />
      <main className="max-w-265 mx-auto px-8 py-8">
        <Routes>
          <Route path="/" element={user ? <Navigate to="/repos" replace /> : <Landing />} />
          <Route path="/repos" element={<Repos />} />
          <Route path="/explore" element={<Explore />} />
          <Route path="/:owner/:repo" element={<PRList />} />
          <Route path="/:owner/:repo/:number" element={<PRDetail />} />
          <Route path="/auth/callback" element={<AuthCallback />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
    </div>
  );
}
