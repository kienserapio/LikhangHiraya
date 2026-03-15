import { useMemo, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useAuthStore } from "../store/authStore";
import styles from "./Auth.module.css";

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export default function MathChallengePage() {
  const navigate = useNavigate();
  const token = useAuthStore((state) => state.token);
  const verifyMfa = useAuthStore((state) => state.verifyMfa);
  const [answer, setAnswer] = useState("");
  const [error, setError] = useState("");

  const challenge = useMemo(() => {
    const a = randomInt(1, 12);
    const b = randomInt(1, 12);
    const operators = ["+", "-"];
    const op = operators[randomInt(0, operators.length - 1)];
    const expected = op === "+" ? a + b : a - b;
    return { a, b, op, expected };
  }, []);

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  function handleSubmit(event) {
    event.preventDefault();
    if (Number(answer) !== challenge.expected) {
      setError("Incorrect answer. Please try again.");
      return;
    }
    verifyMfa();
    navigate("/home", { replace: true });
  }

  return (
    <div className={styles.wrap}>
      <div className={`${styles.decorationContainer} ${styles.headerDecoration}`} aria-hidden="true">
        <svg className={styles.decorationSvg} preserveAspectRatio="none" viewBox="0 0 500 200" xmlns="http://www.w3.org/2000/svg">
          <path d="M0,0 L500,0 L500,100 C420,160 300,50 180,130 C100,180 40,110 0,160 Z" fill="#a68f82" />
        </svg>
        <img className={styles.placeholderPattern} src="/assets/Background.png" alt="" />
      </div>

      <div className={`${styles.decorationContainer} ${styles.footerDecoration}`} aria-hidden="true">
        <svg className={styles.decorationSvg} preserveAspectRatio="none" viewBox="0 0 500 150" xmlns="http://www.w3.org/2000/svg">
          <path d="M0,150 L500,150 L500,60 C420,120 300,10 180,90 C100,140 40,70 0,120 Z" fill="#a68f82" />
        </svg>
        <img className={styles.placeholderPattern} src="/assets/Background.png" alt="" />
      </div>

      <main className={styles.container}>
        <header className={styles.header}>
          <h1 className={styles.welcomeTitle}>Welcome back to<br />Likhang Hiraya!</h1>
          <p className={styles.subtitle}>Quick verification before we continue.</p>
        </header>

        <div className={styles.card}>
          <form className={styles.form} onSubmit={handleSubmit}>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="mfaAnswer">
                Solve this: {challenge.a} {challenge.op} {challenge.b} = ?
              </label>
              <input
                id="mfaAnswer"
                className={styles.input}
                inputMode="numeric"
                value={answer}
                onChange={(event) => setAnswer(event.target.value)}
                placeholder="Enter answer"
              />
              {error ? <p className={styles.error}>{error}</p> : null}
            </div>

            <button className={styles.submit} type="submit">Verify and Continue</button>
          </form>
        </div>
      </main>
    </div>
  );
}
