import React, { useEffect, useRef, useState } from 'react';
import { useCart } from '../context/CartContext';
import { getProductById } from '../services/api';

const ProductDetail = ({ productId, onClose }) => {
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [addedToCart, setAddedToCart] = useState(false);
  const closeButtonRef = useRef(null);
  const { addToCart } = useCart();

  useEffect(() => {
    const fetchProductDetail = async () => {
      try {
        setLoading(true);
        const data = await getProductById(productId);
        setProduct(data);
        setError(null);
      } catch (err) {
        setError(err.response?.data?.detail || err.message || 'Khong tim thay san pham');
      } finally {
        setLoading(false);
      }
    };

    fetchProductDetail();
  }, [productId]);

  useEffect(() => {
    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeButtonRef.current?.focus();

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = previousOverflow;
    };
  }, [onClose]);

  const handleAddToCart = () => {
    if (!product) return;
    addToCart(
      {
        id: product.id,
        name: product.name,
        price: Number(product.price) || 0,
        img: product.img,
        image_url: product.image_url,
        category: product.category,
        rating: product.rating,
      },
      quantity
    );
    setAddedToCart(true);
    setTimeout(() => setAddedToCart(false), 2000);
  };

  const handleQuantityChange = (value) => {
    const nextValue = parseInt(value, 10);
    if (Number.isFinite(nextValue) && nextValue > 0) {
      setQuantity(nextValue);
    }
  };

  const modalShell = (children) => (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      role="presentation"
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      {children}
    </div>
  );

  if (loading) {
    return modalShell(
      <div className="w-full max-w-md rounded-xl bg-white p-6 md:p-8" role="dialog" aria-modal="true">
        <p className="text-lg">Dang tai...</p>
      </div>
    );
  }

  if (error || !product) {
    return modalShell(
      <div className="w-full max-w-md rounded-xl bg-white p-6 md:p-8" role="dialog" aria-modal="true">
        <p className="mb-4 text-red-600">{error || 'Khong tim thay san pham'}</p>
        <button
          ref={closeButtonRef}
          type="button"
          onClick={onClose}
          className="w-full rounded bg-blue-600 px-4 py-2 font-bold text-white hover:bg-blue-700"
        >
          Dong
        </button>
      </div>
    );
  }

  return modalShell(
    <div
      className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-2xl bg-white"
      role="dialog"
      aria-modal="true"
      aria-labelledby="product-detail-title"
    >
      <div className="grid grid-cols-1 gap-6 p-6 md:grid-cols-2 md:gap-8 md:p-8">
        <div className="flex items-center justify-center">
          <img
            src={product.img}
            alt={product.name}
            className="h-80 w-full rounded-lg object-cover shadow-md"
            onError={(event) => {
              event.currentTarget.src = 'https://via.placeholder.com/400?text=No+Image';
            }}
          />
        </div>

        <div className="flex flex-col justify-between">
          <div>
            <h2 id="product-detail-title" className="mb-2 text-3xl font-bold">{product.name}</h2>

            <div className="mb-4 flex items-center gap-2">
              <span className="text-xl text-yellow-500">★</span>
              <span className="text-gray-600">{product.rating || 0}/5</span>
            </div>

            <div className="mb-4">
              <span className="text-gray-600">Danh muc:</span>
              <p className="ml-2 inline-block rounded bg-blue-100 px-3 py-1 text-blue-800">
                {product.category}
              </p>
            </div>

            <div className="mb-4">
              <label className="mb-2 block font-semibold text-gray-700">Mo ta:</label>
              <p className="leading-relaxed text-gray-600">{product.description || 'Khong co mo ta'}</p>
            </div>
          </div>

          <div>
            <p className="mb-4 text-3xl font-bold text-green-600">{product.priceText}</p>

            <div className="mb-4 flex items-center gap-4">
              <label className="font-semibold text-gray-700">So luong:</label>
              <div className="flex items-center rounded border border-gray-300">
                <button
                  type="button"
                  onClick={() => handleQuantityChange(quantity - 1)}
                  className="px-3 py-2 text-gray-600 hover:bg-gray-100"
                >
                  -
                </button>
                <input
                  type="number"
                  value={quantity}
                  onChange={(event) => handleQuantityChange(event.target.value)}
                  className="w-16 border-l border-r border-gray-300 px-2 py-2 text-center"
                  min="1"
                />
                <button
                  type="button"
                  onClick={() => handleQuantityChange(quantity + 1)}
                  className="px-3 py-2 text-gray-600 hover:bg-gray-100"
                >
                  +
                </button>
              </div>
            </div>

            {addedToCart && (
              <div className="mb-4 rounded border border-green-400 bg-green-100 px-4 py-3 text-green-800">
                Da them vao gio hang
              </div>
            )}

            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleAddToCart}
                className="flex-1 rounded bg-green-600 px-4 py-2 font-bold text-white transition hover:bg-green-700"
              >
                Them vao gio hang
              </button>
              <button
                ref={closeButtonRef}
                type="button"
                onClick={onClose}
                className="flex-1 rounded bg-gray-400 px-4 py-2 font-bold text-white transition hover:bg-gray-500"
              >
                Dong
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductDetail;