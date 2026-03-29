import { useCallback, useEffect, useMemo, useState } from "react";
import {
  addInventoryProduct,
  fetchInventoryProducts,
  quickEditProduct,
  restockProduct,
  uploadProductImage,
} from "../../services/adminApi";
import { supabase } from "../../services/supabaseClient";
import styles from "./Admin.module.css";

function toPeso(value) {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
}

function upsertProduct(list, updated) {
  const foundIndex = list.findIndex((item) => item.id === updated.id);
  if (foundIndex === -1) {
    return [updated, ...list];
  }

  const next = [...list];
  next[foundIndex] = updated;
  return next;
}

const INITIAL_ADD_FORM = {
  name: "",
  category: "COFFEE",
  pricePhp: "",
  description: "",
};

export default function Inventory() {
  const [products, setProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const [addForm, setAddForm] = useState(INITIAL_ADD_FORM);
  const [addImageFile, setAddImageFile] = useState(null);
  const [isAdding, setIsAdding] = useState(false);

  const [quickEditState, setQuickEditState] = useState(null);
  const [isSavingQuickEdit, setIsSavingQuickEdit] = useState(false);

  const [restockState, setRestockState] = useState(null);
  const [isRestocking, setIsRestocking] = useState(false);

  const lowStockCount = useMemo(
    () => products.filter((product) => Number(product.stockQuantity || 0) <= 5).length,
    [products]
  );

  const loadProducts = useCallback(async (background = false) => {
    if (!background) {
      setIsLoading(true);
    }

    try {
      const next = await fetchInventoryProducts();
      setProducts(next);
      setError("");
    } catch (loadError) {
      setError(loadError.message || "Unable to load inventory.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProducts(false);
  }, [loadProducts]);

  useEffect(() => {
    const channel = supabase
      .channel(`admin-inventory-${Date.now()}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "products" }, () => {
        loadProducts(true);
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "products" }, () => {
        loadProducts(true);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadProducts]);

  async function handleAddProduct(event) {
    event.preventDefault();
    if (!addForm.name || !addForm.category || !addForm.pricePhp) {
      setError("Name, category, and price are required.");
      return;
    }

    setError("");
    setIsAdding(true);

    try {
      let imageUrl = "";
      if (addImageFile) {
        imageUrl = await uploadProductImage(addImageFile);
      }

      const created = await addInventoryProduct({
        name: addForm.name,
        category: addForm.category,
        pricePhp: Number(addForm.pricePhp),
        description: addForm.description,
        imageUrl,
      });

      setProducts((current) => upsertProduct(current, created));
      setAddForm(INITIAL_ADD_FORM);
      setAddImageFile(null);
    } catch (submitError) {
      setError(submitError.message || "Unable to add product.");
    } finally {
      setIsAdding(false);
    }
  }

  function openQuickEdit(product) {
    setQuickEditState({
      id: product.id,
      name: product.name,
      pricePhp: String(product.pricePhp),
      stockQuantity: String(product.stockQuantity),
    });
  }

  async function handleSaveQuickEdit(event) {
    event.preventDefault();
    if (!quickEditState) {
      return;
    }

    setIsSavingQuickEdit(true);
    setError("");

    try {
      const updated = await quickEditProduct(quickEditState.id, {
        pricePhp: Number(quickEditState.pricePhp),
        stockQuantity: Number(quickEditState.stockQuantity),
      });
      setProducts((current) => upsertProduct(current, updated));
      setQuickEditState(null);
    } catch (submitError) {
      setError(submitError.message || "Unable to save product changes.");
    } finally {
      setIsSavingQuickEdit(false);
    }
  }

  function openRestock(product) {
    setRestockState({
      id: product.id,
      name: product.name,
      quantityToAdd: "1",
    });
  }

  async function handleRestock(event) {
    event.preventDefault();
    if (!restockState) {
      return;
    }

    const quantityToAdd = Number(restockState.quantityToAdd);
    if (!Number.isFinite(quantityToAdd) || quantityToAdd <= 0) {
      setError("Restock quantity should be greater than 0.");
      return;
    }

    setError("");
    setIsRestocking(true);
    try {
      const updated = await restockProduct(restockState.id, quantityToAdd);
      setProducts((current) => upsertProduct(current, updated));
      setRestockState(null);
    } catch (submitError) {
      setError(submitError.message || "Unable to restock product.");
    } finally {
      setIsRestocking(false);
    }
  }

  return (
    <section className={styles.pageSection}>
      <div className={styles.sectionHeader}>
        <div>
          <h2 className={styles.sectionTitle}>Inventory Management</h2>
          <p className={styles.sectionSub}>
            Manage products, quick edit stock and pricing, and monitor low stock levels.
          </p>
        </div>
        <button type="button" className={styles.buttonSecondary} onClick={() => loadProducts(false)}>
          Refresh
        </button>
      </div>

      {error ? <p className={styles.error}>{error}</p> : null}

      <section className={styles.panel}>
        <h3>Add Product</h3>
        <form className={styles.formGrid} onSubmit={handleAddProduct}>
          <div className={styles.field}>
            <label htmlFor="admin-product-name">Name</label>
            <input
              id="admin-product-name"
              className={styles.input}
              value={addForm.name}
              onChange={(event) => setAddForm((prev) => ({ ...prev, name: event.target.value }))}
              placeholder="Iced Americano"
            />
          </div>

          <div className={styles.field}>
            <label htmlFor="admin-product-category">Category</label>
            <input
              id="admin-product-category"
              className={styles.input}
              value={addForm.category}
              onChange={(event) => setAddForm((prev) => ({ ...prev, category: event.target.value }))}
              placeholder="ESPRESSO"
            />
          </div>

          <div className={styles.field}>
            <label htmlFor="admin-product-price">Price (PHP)</label>
            <input
              id="admin-product-price"
              className={styles.input}
              type="number"
              min="0"
              step="1"
              value={addForm.pricePhp}
              onChange={(event) => setAddForm((prev) => ({ ...prev, pricePhp: event.target.value }))}
              placeholder="120"
            />
          </div>

          <div className={styles.field}>
            <label htmlFor="admin-product-image">Product Image</label>
            <input
              id="admin-product-image"
              className={styles.fileInput}
              type="file"
              accept="image/*"
              onChange={(event) => setAddImageFile(event.target.files?.[0] || null)}
            />
          </div>

          <div className={`${styles.field} ${styles.fieldFull}`}>
            <label htmlFor="admin-product-description">Description</label>
            <textarea
              id="admin-product-description"
              className={styles.textarea}
              value={addForm.description}
              onChange={(event) => setAddForm((prev) => ({ ...prev, description: event.target.value }))}
              placeholder="Brief description for customers"
            />
          </div>

          <div className={`${styles.field} ${styles.fieldFull}`}>
            <button className={styles.button} type="submit" disabled={isAdding}>
              {isAdding ? "Adding Product..." : "Add Product"}
            </button>
          </div>
        </form>
      </section>

      <section className={styles.panel}>
        <h3>
          Products ({products.length})
          {lowStockCount > 0 ? ` - ${lowStockCount} low stock` : ""}
        </h3>
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Name</th>
                <th>Category</th>
                <th>Price</th>
                <th>Stock Quantity</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {products.length === 0 ? (
                <tr>
                  <td colSpan={6}>
                    <p className={styles.emptyState}>{isLoading ? "Loading products..." : "No products found."}</p>
                  </td>
                </tr>
              ) : (
                products.map((product) => {
                  const lowStock = Number(product.stockQuantity) <= 5;
                  return (
                    <tr key={product.id} className={lowStock ? styles.inventoryLowStock : ""}>
                      <td>{product.name}</td>
                      <td>{product.category}</td>
                      <td>{toPeso(product.pricePhp)}</td>
                      <td>{product.stockQuantity}</td>
                      <td>
                        <span
                          className={
                            product.status === "Available" ? styles.inventoryStatusAvailable : styles.inventoryStatusHidden
                          }
                        >
                          {product.status}
                        </span>
                      </td>
                      <td>
                        <div className={styles.buttonRow}>
                          <button type="button" className={styles.buttonSecondary} onClick={() => openQuickEdit(product)}>
                            Quick Edit
                          </button>
                          <button type="button" className={styles.buttonSecondary} onClick={() => openRestock(product)}>
                            Restock
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>

      {quickEditState ? (
        <div className={styles.modalBackdrop}>
          <div className={styles.modalCard}>
            <h4 className={styles.modalTitle}>Quick Edit: {quickEditState.name}</h4>
            <form className={styles.formGrid} onSubmit={handleSaveQuickEdit}>
              <div className={styles.field}>
                <label htmlFor="quick-edit-price">Price (PHP)</label>
                <input
                  id="quick-edit-price"
                  className={styles.input}
                  type="number"
                  min="0"
                  step="1"
                  value={quickEditState.pricePhp}
                  onChange={(event) =>
                    setQuickEditState((prev) => ({ ...prev, pricePhp: event.target.value }))
                  }
                />
              </div>

              <div className={styles.field}>
                <label htmlFor="quick-edit-stock">Stock Quantity</label>
                <input
                  id="quick-edit-stock"
                  className={styles.input}
                  type="number"
                  min="0"
                  step="1"
                  value={quickEditState.stockQuantity}
                  onChange={(event) =>
                    setQuickEditState((prev) => ({ ...prev, stockQuantity: event.target.value }))
                  }
                />
              </div>

              <div className={`${styles.field} ${styles.fieldFull}`}>
                <div className={styles.buttonRow}>
                  <button className={styles.button} type="submit" disabled={isSavingQuickEdit}>
                    {isSavingQuickEdit ? "Saving..." : "Save"}
                  </button>
                  <button
                    className={styles.buttonSecondary}
                    type="button"
                    disabled={isSavingQuickEdit}
                    onClick={() => setQuickEditState(null)}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {restockState ? (
        <div className={styles.modalBackdrop}>
          <div className={styles.modalCard}>
            <h4 className={styles.modalTitle}>Restock: {restockState.name}</h4>
            <form className={styles.formGrid} onSubmit={handleRestock}>
              <div className={styles.field}>
                <label htmlFor="restock-qty">Quantity to Add</label>
                <input
                  id="restock-qty"
                  className={styles.input}
                  type="number"
                  min="1"
                  step="1"
                  value={restockState.quantityToAdd}
                  onChange={(event) =>
                    setRestockState((prev) => ({ ...prev, quantityToAdd: event.target.value }))
                  }
                />
              </div>

              <div className={`${styles.field} ${styles.fieldFull}`}>
                <div className={styles.buttonRow}>
                  <button className={styles.button} type="submit" disabled={isRestocking}>
                    {isRestocking ? "Updating..." : "Apply Restock"}
                  </button>
                  <button
                    className={styles.buttonSecondary}
                    type="button"
                    disabled={isRestocking}
                    onClick={() => setRestockState(null)}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </section>
  );
}
