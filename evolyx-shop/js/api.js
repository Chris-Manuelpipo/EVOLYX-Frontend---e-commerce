/**
 * Client API EVOLYX Shop.
 * FormData si images (multer) ; JSON sinon.
 * Consomme uniquement les routes existantes (promos, avis, wishlist, retours, facture).
 */
const API_BASE_URL =
  (window.EVOLYX_CONFIG && window.EVOLYX_CONFIG.API_BASE_URL) ||
  'https://apievolyxcm.vercel.app/api';

async function handleResponse(response) {
  if (response.status === 204) {
    return { success: true };
  }

  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('application/pdf') || contentType.includes('octet-stream')) {
    if (!response.ok) {
      const err = new Error(`HTTP ${response.status}`);
      err.status = response.status;
      throw err;
    }
    return response.blob();
  }

  let data;
  try {
    data = await response.json();
  } catch (e) {
    data = {};
  }

  if (!response.ok) {
    const err = new Error(data.message || data.error || `HTTP ${response.status}`);
    err.status = response.status;
    err.payload = data;
    throw err;
  }

  return data || { success: true };
}

function toFormData(fields, files = []) {
  const formData = new FormData();
  Object.entries(fields || {}).forEach(([key, value]) => {
    if (value === undefined || value === null) return;
    if (typeof value === 'boolean') {
      formData.append(key, value ? 'true' : 'false');
    } else {
      formData.append(key, String(value));
    }
  });
  (files || []).forEach((file) => {
    formData.append('images', file);
  });
  return formData;
}

function toQuery(params = {}) {
  const usp = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return;
    if (typeof value === 'boolean') {
      usp.set(key, value ? 'true' : 'false');
    } else {
      usp.set(key, String(value));
    }
  });
  const qs = usp.toString();
  return qs ? `?${qs}` : '';
}

async function apiCall(endpoint, options = {}) {
  const headers = { ...options.headers };
  const isFormData = typeof FormData !== 'undefined' && options.body instanceof FormData;

  if (!isFormData && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }

  const token = localStorage.getItem('adminToken');
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
    credentials: 'include',
  });

  return handleResponse(response);
}

function sendProduct(method, endpoint, productData, files = []) {
  const hasFiles = Array.isArray(files) && files.length > 0;
  return apiCall(endpoint, {
    method,
    body: hasFiles ? toFormData(productData, files) : JSON.stringify(productData),
  });
}

const API = {
  getLegal: () => apiCall('/legal'),
  getCategories: () => apiCall('/categories'),
  getCategory: (id) => apiCall(`/categories/${id}`),

  getProducts: (params = {}) => apiCall(`/products${toQuery(params)}`),
  getProduct: (id) => apiCall(`/products/${id}`),
  getProductsByCategory: (categoryId, params = {}) =>
    apiCall(`/products/category/${categoryId}${toQuery(params)}`),
  searchProducts: (query, params = {}) =>
    apiCall(`/products${toQuery({ q: query, ...params })}`),
  getFeaturedProducts: () => apiCall('/products/featured'),
  getRelatedProducts: (id) => apiCall(`/products/${id}/related`),
  getReviews: (id) => apiCall(`/products/${id}/reviews`),
  postReview: (id, data) => {
    const name = data.name || data.author_name;
    return apiCall(`/products/${id}/reviews`, {
      method: 'POST',
      body: JSON.stringify({
        name,
        author_name: name,
        rating: data.rating,
        comment: data.comment || data.body,
      }),
    });
  },

  getVariations: (params = {}) => apiCall(`/variations${toQuery(params)}`),
  getVariation: (id) => apiCall(`/variations/${id}`),
  checkVariationStock: (id, quantity) =>
    apiCall(`/variations/${id}/check-stock?quantity=${quantity}`),
  getProductColors: (productId) => apiCall(`/variations/product/${productId}/colors`),
  getProductSizes: (productId) => apiCall(`/variations/product/${productId}/sizes`),
  getVariationStock: (variationId, quantity) =>
    apiCall(`/variations/${variationId}/check-stock?quantity=${quantity}`),

  createCart: () => apiCall('/cart', { method: 'POST' }),
  getCart: (token) => apiCall(`/cart/${token}`),
  addToCart: (cartToken, data) =>
    apiCall(`/cart/${cartToken}/items`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  updateCartItem: (cartToken, itemId, quantity) =>
    apiCall(`/cart/${cartToken}/items/${itemId}`, {
      method: 'PUT',
      body: JSON.stringify({ quantity }),
    }),
  removeFromCart: (cartToken, itemId) =>
    apiCall(`/cart/${cartToken}/items/${itemId}`, { method: 'DELETE' }),
  clearCart: (cartToken) => apiCall(`/cart/${cartToken}`, { method: 'DELETE' }),
  mergeCart: (cartToken, items) =>
    apiCall(`/cart/${cartToken}/merge`, {
      method: 'POST',
      body: JSON.stringify({ items }),
    }),

  validatePromo: (code, cartTotal) =>
    apiCall(`/promos/validate${toQuery({ code, cart_total: cartTotal })}`),

  createWishlist: (token) =>
    apiCall('/wishlist', {
      method: 'POST',
      body: JSON.stringify(token ? { token } : {}),
    }),
  getWishlist: (token) => apiCall(`/wishlist/${token}`),
  addToWishlist: (token, productId) =>
    apiCall(`/wishlist/${token}/items`, {
      method: 'POST',
      body: JSON.stringify({ product_id: Number(productId) }),
    }),
  removeFromWishlist: (token, itemId) =>
    apiCall(`/wishlist/${token}/items/${itemId}`, { method: 'DELETE' }),

  createOrder: (data) =>
    apiCall('/orders', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  getOrder: (id) => apiCall(`/orders/${id}`),
  trackOrder: (id, token) =>
    apiCall(`/orders/${id}/track${toQuery({ token })}`),
  requestReturn: (id, data) =>
    apiCall(`/orders/${id}/returns`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  createReturn: (id, data) =>
    apiCall(`/orders/${id}/returns`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  fetchInvoice: (id) => apiCall(`/admin/orders/${id}/invoice`),

  adminLogin: (email, password) =>
    apiCall('/admin/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),
  adminMe: () => apiCall('/admin/me'),
  adminLogout: async () => {
    try {
      return await apiCall('/admin/logout', { method: 'POST' });
    } catch (error) {
      return { success: true, local: true };
    }
  },
  createAdmin: (data) =>
    apiCall('/admin/admins', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  getAdminProducts: async (params = {}) => {
    try {
      const response = await apiCall(`/admin/products${toQuery(params)}`);
      if (response?.data?.products) {
        return {
          products: response.data.products,
          total: response.data.total,
          page: response.data.page,
          limit: response.data.limit,
          totalPages: response.data.totalPages,
        };
      }
      return response;
    } catch (error) {
      console.error('Erreur getAdminProducts:', error);
      return { products: [], total: 0, page: 1, limit: 20, totalPages: 1 };
    }
  },

  getAdminProduct: (id) => apiCall(`/admin/products/${id}`),

  createProduct: async (productData, files = []) => {
    const response = await apiCall('/admin/products', {
      method: 'POST',
      body: JSON.stringify(productData),
    });
    const product = response.data || response;
    const id = product && product.id;
    if (!id || !Array.isArray(files) || !files.length) {
      return response;
    }

    const uploadErrors = [];
    for (let i = 0; i < files.length; i++) {
      try {
        await API.uploadProductImage(id, files[i], i === 0);
      } catch (err) {
        uploadErrors.push(err.message || 'upload échoué');
      }
    }

    let refreshed = response;
    try {
      refreshed = await apiCall(`/admin/products/${id}`);
    } catch (_) {
      /* garder la réponse initiale */
    }

    if (uploadErrors.length) {
      const err = new Error(
        `Produit enregistré, mais ${uploadErrors.length} image(s) ont échoué : ${uploadErrors[0]}`
      );
      err.status = 502;
      err.partial = true;
      err.payload = refreshed;
      throw err;
    }

    return refreshed.data ? refreshed : { success: true, data: refreshed };
  },

  updateProduct: async (id, productData, files = []) => {
    const response = await apiCall(`/admin/products/${id}`, {
      method: 'PUT',
      body: JSON.stringify(productData),
    });
    if (!Array.isArray(files) || !files.length) return response;

    const uploadErrors = [];
    for (const file of files) {
      try {
        await API.uploadProductImage(id, file, false);
      } catch (err) {
        uploadErrors.push(err.message || 'upload échoué');
      }
    }

    let refreshed = response;
    try {
      refreshed = await apiCall(`/admin/products/${id}`);
    } catch (_) {
      /* ignore */
    }

    if (uploadErrors.length) {
      const err = new Error(
        `Produit mis à jour, mais ${uploadErrors.length} image(s) ont échoué : ${uploadErrors[0]}`
      );
      err.status = 502;
      err.partial = true;
      throw err;
    }

    return refreshed.data ? refreshed : { success: true, data: refreshed };
  },

  deleteProduct: (id) => apiCall(`/admin/products/${id}`, { method: 'DELETE' }),

  uploadProductImage: (id, file, isMain = false) => {
    const formData = new FormData();
    formData.append('image', file);
    if (isMain) formData.append('is_main', 'true');
    const headers = {};
    const token = localStorage.getItem('adminToken');
    if (token) headers.Authorization = `Bearer ${token}`;
    return fetch(`${API_BASE_URL}/admin/products/${id}/images`, {
      method: 'POST',
      body: formData,
      headers,
      credentials: 'include',
    }).then(handleResponse);
  },

  getAdminCategories: () => apiCall('/admin/categories'),
  createCategory: (data) =>
    apiCall('/admin/categories', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  updateCategory: (id, data) =>
    apiCall(`/admin/categories/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  deleteCategory: (id) => apiCall(`/admin/categories/${id}`, { method: 'DELETE' }),

  getAdminVariations: (params = {}) => apiCall(`/admin/variations${toQuery(params)}`),
  createVariation: (data) =>
    apiCall('/admin/variations', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  updateVariation: (id, data) =>
    apiCall(`/admin/variations/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  updateVariationStock: (id, stock) =>
    apiCall(`/admin/variations/${id}/stock`, {
      method: 'PATCH',
      body: JSON.stringify({ stock }),
    }),
  deleteVariation: (id) => apiCall(`/admin/variations/${id}`, { method: 'DELETE' }),

  getAdminOrders: (params = {}) => apiCall(`/admin/orders${toQuery(params)}`),
  getAdminOrder: (id) => apiCall(`/admin/orders/${id}`),
  updateOrderStatus: (id, status) =>
    apiCall(`/admin/orders/${id}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status }),
    }),

  getAdminPromos: () => apiCall('/admin/promos'),
  getAdminPromo: (id) => apiCall(`/admin/promos/${id}`),
  createPromo: (data) =>
    apiCall('/admin/promos', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  updatePromo: (id, data) =>
    apiCall(`/admin/promos/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  deletePromo: (id) => apiCall(`/admin/promos/${id}`, { method: 'DELETE' }),

  getAdminReturns: (params = {}) => apiCall(`/admin/returns${toQuery(params)}`),
  getAdminReturn: (id) => apiCall(`/admin/returns/${id}`),
  updateReturnStatus: (id, status) =>
    apiCall(`/admin/returns/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    }),

  getDashboardStats: (params = {}) => apiCall(`/admin/stats${toQuery(params)}`),
};

window.API = API;
window.API_BASE_URL = API_BASE_URL;
