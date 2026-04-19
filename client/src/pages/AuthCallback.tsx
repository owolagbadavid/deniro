import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { exchangeCode } from "../api";

export default function AuthCallback() {
  const navigate = useNavigate();
  const [error, setError] = useState("");

  useEffect(() => {
    const code = new URLSearchParams(window.location.search).get("code");
    if (!code) {
      setError("Missing authorization code");
      return;
    }

    exchangeCode(code)
      .then(() => {
        window.location.href = "/repos";
      })
      .catch((err) => {
        setError(err.message || "Failed to sign in");
      });
  }, []);

  if (error) {
    return (
      <div className="max-w-md mx-auto mt-16 text-center">
        <h2 className="text-xl font-semibold mb-2">Sign in failed</h2>
        <p className="text-(--muted) mb-4">{error}</p>
        <button
          onClick={() => navigate("/")}
          className="px-4 py-2 bg-(--accent) text-white rounded-lg text-sm font-medium hover:opacity-85"
        >
          Back to home
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto mt-16 text-center">
      <p className="text-(--muted)">Signing in...</p>
    </div>
  );
}
