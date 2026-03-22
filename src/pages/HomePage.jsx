import { useEffect, useMemo, useState } from "react";
import { useCartStore } from "../store/cartStore";
import { useFavoriteStore } from "../store/favoriteStore";
import { useAuthStore } from "../store/authStore";
import UniversalBottomNav from "../components/UniversalBottomNav";
import LocationHeader from "../components/LocationHeader";
import ActiveOrdersDock from "../components/ActiveOrdersDock";
import ProductDetailModal from "../components/ProductDetailModal";
import { productApi } from "../services/api";
import "./HomePage.css";

function toPeso(value) {
  return new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" }).format(Number(value || 0));
}

export default function HomePage() {
  const [selectedCategory, setSelectedCategory] = useState("ALL");
  const [searchText, setSearchText] = useState("");
  const [products, setProducts] = useState([]);
  const [loadError, setLoadError] = useState("");
  const [selectedProduct, setSelectedProduct] = useState(null);
  const addItem = useCartStore((state) => state.addItem);
  const isFavorite = useFavoriteStore((state) => state.isFavorite);
  const toggleFavorite = useFavoriteStore((state) => state.toggleFavorite);
  const profile = useAuthStore((state) => state.profile);

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
          setLoadError(error.message || "Unable to load products from backend. Check API and Supabase connection.");
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const categories = useMemo(() => {
    const unique = new Set(products.map((product) => product.category).filter(Boolean));
    return ["ALL", ...Array.from(unique)];
  }, [products]);

  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      const categoryMatches = selectedCategory === "ALL" || product.category === selectedCategory;
      const searchMatches = product.name.toLowerCase().includes(searchText.toLowerCase());
      return categoryMatches && searchMatches;
    });
  }, [products, selectedCategory, searchText]);

  return (
    <div className="homepage">
      <LocationHeader
        locationText={profile.address || "Manila, Globe St. ABC 123"}
        searchText={searchText}
        onSearchChange={setSearchText}
      />

      <main className="main">
        <h2 className="title">Categories</h2>
        <div className="chips" data-purpose="category-scroller">
          {categories.map((category, index) => (
            <button key={category} className={`chip ${selectedCategory === category ? "active" : ""}`} onClick={() => setSelectedCategory(category)}>
              <span>{index === 0 ? "🍽️" : "☕"}</span>
              <span>{category}</span>
            </button>
          ))}
        </div>

        <div className="menu-grid" id="menu-grid">
          {loadError ? <p style={{ gridColumn: "1 / -1", color: "#b91c1c", fontWeight: 700 }}>{loadError}</p> : null}
          {filteredProducts.map((product) => (
            <div key={product.id} className="card" data-purpose="product-card">
              <button className="heart-btn" onClick={() => toggleFavorite(product.id)} aria-label="Toggle favorite">
                <svg className={isFavorite(product.id) ? "coffee-primary" : ""} width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
              </button>
              <div className="image-box" onClick={() => setSelectedProduct(product)}>
                <img alt={product.name} src={product.imageUrl || ""} />
              </div>
              <h3>{product.name}</h3>
              <div className="sizes">
                <span className="size active">S</span>
                <span className="size">M</span>
                <span className="size">L</span>
              </div>
              <div className="price-row">
                <span className="price">{toPeso(product.pricePhp)}</span>
                <button className="home-add-btn" onClick={() => addItem(product, 1)} aria-label="Add to cart">
                  <span>+</span>
                </button>
              </div>
            </div>
          ))}
          {!loadError && filteredProducts.length === 0 ? (
            <p style={{ gridColumn: "1 / -1", color: "#6b7280" }}>No products found in this category.</p>
          ) : null}
        </div>
      </main>

      <ActiveOrdersDock />
      <ProductDetailModal product={selectedProduct} isOpen={Boolean(selectedProduct)} onClose={() => setSelectedProduct(null)} />
      <UniversalBottomNav active="home" />
    </div>
  );
}
