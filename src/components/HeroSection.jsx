import styles from "./HeroSection.module.css";

export default function HeroSection() {
  return (
    <section className={styles.hero}>
      <div>
        <p className={styles.kicker}>Likhang Hiraya Delivery</p>
        <h1 className={styles.title}>Brewed Comfort, Delivered Fast</h1>
        <p className={styles.copy}>Warm cups, fresh meals, and your favorite pairings brought right to your doorstep.</p>
      </div>
    </section>
  );
}
