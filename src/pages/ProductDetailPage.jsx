import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useCartStore } from "../store/cartStore";
import { useFavoriteStore } from "../store/favoriteStore";
import { productApi } from "../services/api";
import "./ProductDetailPage.css";

const sizes = ["Small", "Medium", "Large"];
const toppings = ["Caramel", "Banana", "Chocolate", "Strawberry"];

function toPeso(value) {
  return new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" }).format(value);
}

export default function ProductDetailPage() {
  const navigate = useNavigate();
  const { productId } = useParams();
  const [products, setProducts] = useState([]);
  const [loadError, setLoadError] = useState("");
  const [selectedSize, setSelectedSize] = useState("Small");
  const [notes] = useState("");
  const [toppingQty, setToppingQty] = useState({});
  const addItem = useCartStore((state) => state.addItem);
  const isFavorite = useFavoriteStore((state) => state.isFavorite);
  const toggleFavorite = useFavoriteStore((state) => state.toggleFavorite);

  useEffect(() => {
    let isMounted = true;
    productApi
      .list()
      .then((data) => {
        if (isMounted) {
          setProducts(data);
          setLoadError("");
        }
      })
      .catch((error) => {
        if (isMounted) {
          setProducts([]);
          setLoadError(error.message || "Unable to load product details from backend.");
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const product = products.find((item) => String(item.id) === String(productId)) || products[0];

  if (!product) {
    return (
      <div className="product-page">
        <main className="product-main" style={{ padding: 24 }}>
          <p style={{ color: loadError ? "#b91c1c" : "#6b7280", fontWeight: 700 }}>
            {loadError || "Product not found."}
          </p>
          <button className="product-add-btn" onClick={() => navigate("/home")}>
            <span>Back to Home</span>
          </button>
        </main>
      </div>
    );
  }

  const toppingTotal = useMemo(
    () => Object.values(toppingQty).reduce((sum, qty) => sum + qty, 0),
    [toppingQty]
  );

  const total = product.pricePhp + toppingTotal;

  function changeTopping(name, delta) {
    setToppingQty((prev) => {
      const next = Math.max((prev[name] || 0) + delta, 0);
      return { ...prev, [name]: next };
    });
  }

  return (
    <div className="product-page">
      <main className="product-main">
        <section className="hero" data-purpose="product-hero">
          <img alt={product.name} src={product.imageUrl || ""} />

          <div className="hero-top">
            <button aria-label="Go back" className="icon-btn back-btn" onClick={() => navigate(-1)}>
              <svg width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path d="M15 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
              </svg>
            </button>
            <button aria-label="Add to favorites" className="icon-btn fav-btn" onClick={() => toggleFavorite(product.id)}>
              <svg width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" fill={isFavorite(product.id) ? "currentColor" : "none"} />
              </svg>
            </button>
          </div>

          <div className="hero-bottom">
            <h1>{product.name}</h1>
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
            <h2>Coffee Size</h2>
            <div className="size-row">
              {sizes.map((size) => (
                <button
                  key={size}
                  className={`size-btn ${selectedSize === size ? "size-btn-active" : ""}`}
                  onClick={() => setSelectedSize(size)}
                >
                  {size}
                </button>
              ))}
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
                      <button className={`round-icon ${qty === 0 ? "muted" : ""}`} onClick={() => changeTopping(name, -1)} aria-label={`Decrease ${name}`}>
                        <svg width="24" height="24" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><path fillRule="evenodd" clipRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM7 9a1 1 0 000 2h6a1 1 0 100-2H7z" /></svg>
                      </button>
                      <span className="qty">{qty}</span>
                      <button className="round-icon" onClick={() => changeTopping(name, 1)} aria-label={`Increase ${name}`}>
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
              onClick={() => {
                addItem({ ...product, name: `${product.name} (${selectedSize})`, pricePhp: total }, 1, notes);
                navigate("/cart");
              }}
            >
              <span>Add to Cart | {toPeso(total)}</span>
            </button>
          </div>
        </section>
      </main>
    </div>
  );
}
