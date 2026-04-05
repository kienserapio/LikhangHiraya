import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { addInventoryProduct, uploadProductImage } from "../../services/adminApi";
import adminStyles from "./Admin.module.css";
import styles from "./InventoryAddProduct.module.css";

const CATEGORY_OPTIONS = ["COFFEE", "FOOD", "BEVERAGE"];

const INITIAL_FORM = {
  name: "",
  category: "COFFEE",
  pricePhp: "",
  description: "",
};

export default function InventoryAddProduct() {
  const navigate = useNavigate();
  const [form, setForm] = useState(INITIAL_FORM);
  const [imageFile, setImageFile] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const imagePreviewUrl = useMemo(() => {
    if (!imageFile) {
      return "";
    }
    return URL.createObjectURL(imageFile);
  }, [imageFile]);

  useEffect(() => {
    return () => {
      if (imagePreviewUrl) {
        URL.revokeObjectURL(imagePreviewUrl);
      }
    };
  }, [imagePreviewUrl]);

  function handleFieldChange(field, value) {
    setForm((previous) => ({ ...previous, [field]: value }));
  }

  function handleFileChange(event) {
    const nextFile = event.target.files?.[0] || null;
    setImageFile(nextFile);
  }

  async function handleSubmit(event) {
    event.preventDefault();

    const normalizedName = form.name.trim();
    const normalizedPrice = Number(form.pricePhp);
    const normalizedDescription = form.description.trim();

    if (!normalizedName) {
      setError("Product name is required.");
      return;
    }

    if (!Number.isFinite(normalizedPrice) || normalizedPrice < 0) {
      setError("Price must be zero or greater.");
      return;
    }

    setError("");
    setSuccessMessage("");
    setIsSubmitting(true);

    try {
      let imageUrl = "";
      if (imageFile) {
        imageUrl = await uploadProductImage(imageFile);
      }

      const createdProduct = await addInventoryProduct({
        name: normalizedName,
        category: form.category,
        pricePhp: normalizedPrice,
        description: normalizedDescription,
        imageUrl,
      });

      setSuccessMessage(`Added ${createdProduct.name} successfully.`);
      setForm(INITIAL_FORM);
      setImageFile(null);
    } catch (submitError) {
      setError(submitError.message || "Unable to add product.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className={styles.addPage}>
      <header className={styles.pageHeader}>
        <div>
          <h2 className={styles.pageTitle}>Add Product</h2>
          <p className={styles.pageSub}>Create a new inventory item and upload its product image to Supabase storage.</p>
        </div>

        <button
          type="button"
          className={adminStyles.buttonSecondary}
          onClick={() => navigate("/admin/inventory")}
        >
          Back to Inventory
        </button>
      </header>

      {error ? <p className={adminStyles.error}>{error}</p> : null}
      {successMessage ? <p className={styles.success}>{successMessage}</p> : null}

      <section className={styles.formPanel}>
        <form className={styles.formGrid} onSubmit={handleSubmit}>
          <div className={styles.field}>
            <label htmlFor="add-name">Product Name</label>
            <input
              id="add-name"
              type="text"
              value={form.name}
              onChange={(event) => handleFieldChange("name", event.target.value)}
              placeholder="Iced Americano"
              required
            />
          </div>

          <div className={styles.field}>
            <label htmlFor="add-category">Category</label>
            <select
              id="add-category"
              value={form.category}
              onChange={(event) => handleFieldChange("category", event.target.value)}
            >
              {CATEGORY_OPTIONS.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </div>

          <div className={styles.field}>
            <label htmlFor="add-price">Price (PHP)</label>
            <input
              id="add-price"
              type="number"
              min="0"
              step="1"
              value={form.pricePhp}
              onChange={(event) => handleFieldChange("pricePhp", event.target.value)}
              placeholder="120"
              required
            />
          </div>

          <div className={styles.field}>
            <label htmlFor="add-image">Product Image</label>
            <input id="add-image" type="file" accept="image/*" onChange={handleFileChange} />
            <p className={styles.fieldHint}>Uploaded image URL is saved to the product record.</p>
          </div>

          <div className={`${styles.field} ${styles.fullWidth}`}>
            <label htmlFor="add-description">Description</label>
            <textarea
              id="add-description"
              value={form.description}
              onChange={(event) => handleFieldChange("description", event.target.value)}
              placeholder="Brief description for customers"
            />
          </div>

          <div className={`${styles.previewPane} ${styles.fullWidth}`}>
            {imagePreviewUrl ? (
              <img src={imagePreviewUrl} alt="Product preview" className={styles.previewImage} />
            ) : (
              <div className={styles.previewFallback}>No image selected</div>
            )}
          </div>

          <div className={`${styles.actions} ${styles.fullWidth}`}>
            <button type="submit" className={styles.primaryButton} disabled={isSubmitting}>
              {isSubmitting ? "Saving Product..." : "Save Product"}
            </button>
            <button
              type="button"
              className={adminStyles.buttonSecondary}
              disabled={isSubmitting}
              onClick={() => navigate("/admin/inventory")}
            >
              Back to Inventory
            </button>
          </div>
        </form>
      </section>
    </section>
  );
}
