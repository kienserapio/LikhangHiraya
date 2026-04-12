import { useEffect, useMemo, useState } from "react";
import { useCartStore } from "../store/cartStore";
import { useFavoriteStore } from "../store/favoriteStore";
import "../pages/ProductDetailPage.css";

const sizes = ["Small", "Medium", "Large"];
const toppings = ["Caramel", "Banana", "Chocolate", "Strawberry"];
const sizePriceModifiers = {
  Small: 0,
  Medium: 20,
  Large: 40,
};

function toPeso(value) {
  return new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" }).format(Number(value || 0));
}

export default function ProductDetailModal({ product, isOpen, onClose }) {
  const addItem = useCartStore((state) => state.addItem);
  const isFavorite = useFavoriteStore((state) => state.isFavorite);
  const toggleFavorite = useFavoriteStore((state) => state.toggleFavorite);
  const [selectedSize, setSelectedSize] = useState("Small");
  const [toppingQty, setToppingQty] = useState({});
  const [isHeartAnimating, setIsHeartAnimating] = useState(false);

  const toppingTotal = useMemo(
    () => Object.values(toppingQty).reduce((sum, qty) => sum + Number(qty || 0), 0),
    [toppingQty]
  );

  const selectedToppings = useMemo(
    () => Object.entries(toppingQty)
      .filter(([, qty]) => Number(qty || 0) > 0)
      .reduce((accumulator, [name, qty]) => {
        accumulator[name] = Number(qty || 0);
        return accumulator;
      }, {}),
    [toppingQty]
  );

  useEffect(() => {
    if (!isHeartAnimating) {
      return undefined;
    }

    const timer = setTimeout(() => {
      setIsHeartAnimating(false);
    }, 180);

    return () => {
      clearTimeout(timer);
    };
  }, [isHeartAnimating]);

  if (!isOpen || !product) {
    return null;
  }

  const stockQuantity = Number(product.stock_quantity ?? product.stockQuantity ?? product.stock ?? 0);
  const isOutOfStock = stockQuantity <= 0;
  const isLowStock = stockQuantity > 0 && stockQuantity <= 5;
  const isFavorited = isFavorite(product.id);

  const sizePrice = Number(product.pricePhp || 0) + Number(sizePriceModifiers[selectedSize] || 0);
  const total = sizePrice + toppingTotal;

  function changeTopping(name, delta) {
    setToppingQty((prev) => {
      const next = Math.max((prev[name] || 0) + delta, 0);
      return { ...prev, [name]: next };
    });
  }

  function handleToggleFavorite() {
    if (isOutOfStock) {
      return;
    }

    toggleFavorite(product.id);
    setIsHeartAnimating(true);
  }

  return (
    <div className="product-modal-overlay" role="dialog" aria-modal="true" aria-label="Product Details">
      <div className="product-modal-shell">
        <div className="product-page">
          <main className="product-main">
            <section className={`hero ${isOutOfStock ? "hero-out-of-stock" : ""}`} data-purpose="product-hero">
              <img alt={product.name} src={product.imageUrl || ""} />

              {isOutOfStock ? (
                <div className="hero-unavailable-overlay">
                  <span className="hero-unavailable-text">Not Available</span>
                </div>
              ) : null}

              <div className="hero-top">
                <button aria-label="Close" className="icon-btn back-btn" onClick={onClose} type="button">
                  <svg width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path d="M15 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
                  </svg>
                </button>
                <button
                  aria-label={isFavorited ? "Remove from favorites" : "Add to favorites"}
                  className={`icon-btn fav-btn ${isFavorited ? "fav-btn-active" : ""} ${isHeartAnimating ? "fav-btn-pulse" : ""}`}
                  onClick={handleToggleFavorite}
                  disabled={isOutOfStock}
                  aria-pressed={isFavorited}
                  type="button"
                >
                  <svg width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" fill={isFavorited ? "currentColor" : "none"} />
                  </svg>
                </button>
              </div>

              <div className="hero-bottom">
                <div className="hero-title-block">
                  <h1>{product.name}</h1>
                  <p className={`hero-stock ${isLowStock ? "hero-stock-low" : ""}`}>Stock: {Math.max(0, stockQuantity)}</p>
                </div>
                <div className="rating" data-purpose="rating-badge">
                  <svg width="16" height="16" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                  <span>{product.rating}</span>
                </div>
              </div>
            </section>

            <section className="content-panel" data-purpose="product-details">
              <div className="section">
                <h2>Size</h2>
                <div className="size-row">
                  {sizes.map((size) => (
                    <button
                      key={size}
                      className={`size-btn ${selectedSize === size ? "size-btn-active" : ""}`}
                      onClick={() => setSelectedSize(size)}
                      type="button"
                    >
                      {size}
                    </button>
                  ))}
                </div>
                <div className="size-price-preview" aria-live="polite">
                  <span className="size-price-label">{selectedSize} price</span>
                  <strong key={`${product.id}-${selectedSize}`} className="size-price-value">{toPeso(sizePrice)}</strong>
                </div>
              </div>

              <div className="section">
                <h2>About</h2>
                <p className="about">{product.description}</p>
              </div>

              <div className="section">
                <h2>Add Topping ({toPeso(1)} each)</h2>
                <div className="toppings">
                  {toppings.map((name) => {
                    const qty = toppingQty[name] || 0;
                    return (
                      <div className="topping-row" key={name}>
                        <span className="topping-name">{name}</span>
                        <div className="topping-controls">
                          <button className={`round-icon ${qty === 0 ? "muted" : ""}`} onClick={() => changeTopping(name, -1)} aria-label={`Decrease ${name}`} type="button">
                            <svg width="24" height="24" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><path fillRule="evenodd" clipRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM7 9a1 1 0 000 2h6a1 1 0 100-2H7z" /></svg>
                          </button>
                          <span className="qty">{qty}</span>
                          <button className="round-icon" onClick={() => changeTopping(name, 1)} aria-label={`Increase ${name}`} type="button">
                            <svg width="24" height="24" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><path fillRule="evenodd" clipRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z" /></svg>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="product-cta-wrap" data-purpose="footer-button-container">
                <button
                  className="product-add-btn"
                  type="button"
                  disabled={isOutOfStock}
                  onClick={() => {
                    addItem({
                      ...product,
                      name: `${product.name} (${selectedSize})`,
                      pricePhp: total,
                      selectedSize,
                      toppings: selectedToppings,
                      toppingTotal,
                    }, 1);
                    onClose();
                  }}
                >
                  <span>{isOutOfStock ? "Not Available" : `Add to Cart | ${toPeso(total)}`}</span>
                </button>
              </div>
            </section>
          </main>
        </div>
      </div>
    </div>
  );
}
