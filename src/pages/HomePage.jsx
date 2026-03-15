import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useCartStore } from "../store/cartStore";
import { useFavoriteStore } from "../store/favoriteStore";
import { useAuthStore } from "../store/authStore";
import UniversalBottomNav from "../components/UniversalBottomNav";
import { mockProducts } from "./mockProducts";
import "./HomePage.css";

const categories = ["COFFEE", "DESSERTS"];

export default function HomePage() {
  const navigate = useNavigate();
  const [selectedCategory, setSelectedCategory] = useState("COFFEE");
  const [searchText, setSearchText] = useState("");
  const addItem = useCartStore((state) => state.addItem);
  const isFavorite = useFavoriteStore((state) => state.isFavorite);
  const toggleFavorite = useFavoriteStore((state) => state.toggleFavorite);
  const profile = useAuthStore((state) => state.profile);

  const filteredProducts = useMemo(
    () => {
      const mappedCategory = selectedCategory === "DESSERTS" ? "FOOD" : "COFFEE";
      return mockProducts.filter((product) => {
        const categoryMatches = product.category === mappedCategory;
        const searchMatches = product.name.toLowerCase().includes(searchText.toLowerCase());
        return categoryMatches && searchMatches;
      });
    },
    [selectedCategory, searchText]
  );

  return (
    <div className="homepage">
      <header className="home-header">
        <div className="row">
          <div className="location">
            <svg className="coffee-primary" fill="currentColor" viewBox="0 0 20 20" width="20" height="20" xmlns="http://www.w3.org/2000/svg">
              <path fillRule="evenodd" clipRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" />
            </svg>
            <span>{profile.address || "Manila, Globe St. ABC 123"}</span>
          </div>
          <button className="round-btn" aria-label="Call contact">
            <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
            </svg>
          </button>
        </div>

        <div className="search-wrap">
          <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input placeholder="Search .." value={searchText} onChange={(event) => setSearchText(event.target.value)} />
        </div>
      </header>

      <main className="main">
        <h2 className="title">Categories</h2>
        <div className="chips" data-purpose="category-scroller">
          {categories.map((category, index) => (
            <button key={category} className={`chip ${selectedCategory === category ? "active" : ""}`} onClick={() => setSelectedCategory(category)}>
              <span>{index === 0 ? "☕" : "🧁"}</span>
              <span>{category}</span>
            </button>
          ))}
        </div>

        <div className="menu-grid" id="menu-grid">
          {filteredProducts.map((product) => (
            <div key={product.id} className="card" data-purpose="product-card">
              <button className="heart-btn" onClick={() => toggleFavorite(product.id)} aria-label="Toggle favorite">
                <svg className={isFavorite(product.id) ? "coffee-primary" : ""} width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
              </button>
              <div className="image-box" onClick={() => navigate(`/products/${product.id}`)}>
                <img alt={product.name} src={product.imageUrl || ""} />
              </div>
              <h3>{product.name}</h3>
              <div className="sizes">
                <span className="size active">S</span>
                <span className="size">M</span>
                <span className="size">L</span>
              </div>
              <div className="price-row">
                <span className="price">{product.pricePhp}</span>
                <button className="home-add-btn" onClick={() => addItem(product, 1)} aria-label="Add to cart">
                  <span>+</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      </main>
      <UniversalBottomNav active="home" />
    </div>
  );
}
