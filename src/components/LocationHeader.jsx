import styles from "./LocationHeader.module.css";

const logoSrc = new URL("../../assets/hiraya.png", import.meta.url).href;

export default function LocationHeader({ locationText, searchText, onSearchChange }) {
  return (
    <header className={styles.header}>
      <div className={styles.row}>
        <div className={styles.locationWrap}>
          <img className={styles.logo} src={logoSrc} alt="Likhang Hiraya" />
          <div className={styles.location}>
            <svg className={styles.locationIcon} fill="currentColor" viewBox="0 0 20 20" width="20" height="20" xmlns="http://www.w3.org/2000/svg">
              <path fillRule="evenodd" clipRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" />
            </svg>
            <span>{locationText}</span>
          </div>
        </div>

        <button className={styles.callButton} aria-label="Call contact" type="button">
          <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
          </svg>
        </button>
      </div>

      <div className={styles.searchWrap}>
        <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          placeholder="Search .."
          value={searchText}
          onChange={(event) => onSearchChange(event.target.value)}
          aria-label="Search products"
        />
      </div>
    </header>
  );
}
