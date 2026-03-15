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
      <div className={styles.card}>
        <h1 className={styles.title}>Quick Verification</h1>
        <p>Solve this to continue: {challenge.a} {challenge.op} {challenge.b} = ?</p>
        <form className={styles.form} onSubmit={handleSubmit}>
          <input
            className={styles.input}
            inputMode="numeric"
            value={answer}
            onChange={(event) => setAnswer(event.target.value)}
            placeholder="Enter answer"
          />
          {error ? <p className={styles.error}>{error}</p> : null}
          <button className={styles.submit} type="submit">Verify and Continue</button>
        </form>
      </div>
    </div>
  );
}
