'use client';
import { useState, useMemo } from 'react';
import { useMarsam } from '@/lib/store';
import { useAsyncAction } from '@/hooks/useAsyncAction';
import { useBarcodeScanner } from '@/hooks/useBarcodeScanner';
import { Pagination } from '@/components/common/Pagination';
import {
  ShoppingBag, Search, Plus, Minus, Trash2, Printer, CheckCircle,
  AlertTriangle, DollarSign, Package, TrendingUp, Barcode, ArrowUpRight,
  Filter, Tag, User as UserIcon, X, Edit3
} from 'lucide-react';

export default function SuppliesPage() {
  const {
    supplyItems, supplySales, students,
    addSupplyItem, updateSupplyItem, deleteSupplyItem, updateSupplyStock, createSupplySale, settings
  } = useMarsam();

  const [activeTab, setActiveTab] = useState<'pos' | 'inventory' | 'financials'>('pos');
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  
  // Pagination States
  const [inventoryPage, setInventoryPage] = useState(1);
  const [salesPage, setSalesPage] = useState(1);
  const ITEMS_PER_PAGE = 15;

  const { isSubmitting: isCheckingOut, execute: executeCheckout } = useAsyncAction();
  const { isSubmitting: isAddingProduct, execute: executeAddProduct } = useAsyncAction();
  const { isSubmitting: isUpdatingProduct, execute: executeUpdateProduct } = useAsyncAction();
  const { isSubmitting: isDeletingProduct, execute: executeDeleteProduct } = useAsyncAction();

  // Edit and Delete Modal States
  const [editingProduct, setEditingProduct] = useState<any | null>(null);
  const [editForm, setEditForm] = useState({
    name: '',
    category: 'ألوان',
    barcode: '',
    costPrice: 0,
    sellPrice: 0,
    stockQty: 10,
    minStock: 3
  });
  const [deletingProduct, setDeletingProduct] = useState<any | null>(null);

  // POS Cart State
  const [cart, setCart] = useState<Array<{ productId: string; quantity: number }>>([]);
  const [customerType, setCustomerType] = useState<'walkin' | 'student'>('student');
  const [selectedStudentId, setSelectedStudentId] = useState<string>('');
  const [walkinName, setWalkinName] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'instapay' | 'vodafone' | 'card'>('cash');
  const [notes, setNotes] = useState('');
  
  // Barcode quick input
  const [barcodeInput, setBarcodeInput] = useState('');

  // Add Product Modal
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [newProduct, setNewProduct] = useState({
    name: '',
    category: 'ألوان',
    barcode: '',
    costPrice: 0,
    sellPrice: 0,
    stockQty: 10,
    minStock: 3
  });

  // Printable Invoice State
  const [currentInvoice, setCurrentInvoice] = useState<any | null>(null);

  // Global Hardware Barcode Scanner Hook
  useBarcodeScanner({
    onScan: (scanned) => {
      const found = supplyItems.find(p => p.barcode === scanned);
      if (found) {
        addToCart(found.id);
      }
    },
    enabled: true
  });

  const categories = useMemo(() => {
    const set = new Set(supplyItems.map(i => i.category));
    return ['all', ...Array.from(set)];
  }, [supplyItems]);

  const filteredItems = useMemo(() => {
    return supplyItems.filter(item => {
      const matchesCat = selectedCategory === 'all' || item.category === selectedCategory;
      const matchesSearch = item.name.includes(search) || item.barcode.includes(search);
      return matchesCat && matchesSearch;
    });
  }, [supplyItems, selectedCategory, search]);

  const paginatedInventory = useMemo(() => {
    const start = (inventoryPage - 1) * ITEMS_PER_PAGE;
    return filteredItems.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredItems, inventoryPage]);

  const paginatedSales = useMemo(() => {
    const start = (salesPage - 1) * ITEMS_PER_PAGE;
    return supplySales.slice(start, start + ITEMS_PER_PAGE);
  }, [supplySales, salesPage]);

  // Cart operations
  const addToCart = (productId: string) => {
    const product = supplyItems.find(p => p.id === productId);
    if (!product || product.stockQty <= 0) return;

    setCart(prev => {
      const existing = prev.find(i => i.productId === productId);
      if (existing) {
        if (existing.quantity >= product.stockQty) return prev;
        return prev.map(i => i.productId === productId ? { ...i, quantity: i.quantity + 1 } : i);
      }
      return [...prev, { productId, quantity: 1 }];
    });
  };

  const updateCartQty = (productId: string, delta: number) => {
    const product = supplyItems.find(p => p.id === productId);
    setCart(prev => {
      return prev.map(i => {
        if (i.productId === productId) {
          const newQty = i.quantity + delta;
          if (newQty <= 0) return null;
          if (product && newQty > product.stockQty) return i;
          return { ...i, quantity: newQty };
        }
        return i;
      }).filter(Boolean) as Array<{ productId: string; quantity: number }>;
    });
  };

  const removeFromCart = (productId: string) => {
    setCart(prev => prev.filter(i => i.productId !== productId));
  };

  const handleBarcodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!barcodeInput.trim()) return;
    const found = supplyItems.find(p => p.barcode === barcodeInput.trim());
    if (found) {
      addToCart(found.id);
      setBarcodeInput('');
    } else {
      alert('لم يتم العثور على أداة بهذا الباركود');
    }
  };

  // Handle Edit Product
  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct) return;
    if (!editForm.name.trim() || Number(editForm.sellPrice) <= 0) {
      alert('برجاء كتابة اسم الأداة وتحديد سعر بيع صحيح أكبر من الصفر');
      return;
    }

    executeUpdateProduct(() => {
      updateSupplyItem(editingProduct.id, {
        name: editForm.name,
        category: editForm.category,
        barcode: editForm.barcode,
        costPrice: Number(editForm.costPrice),
        sellPrice: Number(editForm.sellPrice),
        stockQty: Number(editForm.stockQty),
        minStock: Number(editForm.minStock)
      });
      setEditingProduct(null);
    });
  };

  // Handle Delete Product
  const handleConfirmDelete = () => {
    if (!deletingProduct) return;
    executeDeleteProduct(() => {
      deleteSupplyItem(deletingProduct.id);
      setCart(prev => prev.filter(c => c.productId !== deletingProduct.id));
      setDeletingProduct(null);
    });
  };

  // Cart totals
  const cartSummary = useMemo(() => {
    let subtotal = 0;
    let totalItems = 0;
    cart.forEach(c => {
      const p = supplyItems.find(item => item.id === c.productId);
      if (p) {
        subtotal += p.sellPrice * c.quantity;
        totalItems += c.quantity;
      }
    });
    return { subtotal, totalItems };
  }, [cart, supplyItems]);

  // Checkout
  const handleCheckout = () => {
    if (cart.length === 0) return;

    let customerName = walkinName || 'عميل زائر';
    let customerId: string | undefined = undefined;

    if (customerType === 'student') {
      const student = students.find(s => s.id === selectedStudentId);
      if (student) {
        customerName = student.name;
        customerId = student.id;
      } else {
        alert('برجاء اختيار الطالب المشتري');
        return;
      }
    }

    executeCheckout(() => {
      const sale = createSupplySale({
        customerType,
        customerName,
        customerId,
        items: cart,
        paymentMethod,
        notes
      });

      setCart([]);
      setNotes('');
      setWalkinName('');
      setCurrentInvoice(sale);
    });
  };

  // Financial calculations
  const totalSalesRevenue = supplySales.reduce((acc, s) => acc + s.totalAmount, 0);
  const totalSalesCost = supplySales.reduce((acc, s) => acc + s.totalCost, 0);
  const totalSalesProfit = totalSalesRevenue - totalSalesCost;
  const profitMargin = totalSalesRevenue > 0 ? Math.round((totalSalesProfit / totalSalesRevenue) * 100) : 0;
  const inventoryAssetValue = supplyItems.reduce((acc, i) => acc + (i.costPrice * i.stockQty), 0);
  const lowStockCount = supplyItems.filter(i => i.stockQty <= i.minStock).length;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-[#F8FAFC] flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#0D9488]/20 border border-[#0D9488]/40 flex items-center justify-center text-[#2DD4BF]">
              <ShoppingBag size={22} />
            </div>
            متجر ومخزن الأدوات الفنية
          </h1>
          <p className="text-[#94A3B8] text-xs mt-1">
            بيع الأدوات ومتابعة المخزون مع فصل مالي كامل عن حسابات الكورسات
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex gap-1.5 p-1.5 bg-[#111827] border border-[#2A3B56] rounded-xl shadow-md">
          <button
            onClick={() => setActiveTab('pos')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${activeTab === 'pos' ? 'bg-[#0D9488] text-white shadow-md shadow-[#0D9488]/30 border border-[#0D9488]' : 'text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-[#1B2537]'}`}
          >
            نقطة البيع (POS)
          </button>
          <button
            onClick={() => setActiveTab('inventory')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${activeTab === 'inventory' ? 'bg-[#0D9488] text-white shadow-md shadow-[#0D9488]/30 border border-[#0D9488]' : 'text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-[#1B2537]'}`}
          >
            المخزون
            {lowStockCount > 0 && (
              <span className="w-4 h-4 rounded-full bg-red-500 text-white text-[10px] flex items-center justify-center font-bold">
                {lowStockCount}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('financials')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${activeTab === 'financials' ? 'bg-[#0D9488] text-white shadow-md shadow-[#0D9488]/30 border border-[#0D9488]' : 'text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-[#1B2537]'}`}
          >
            الماليات والأرباح
          </button>
        </div>
      </div>

      {/* ================= TAB 1: POS ================= */}
      {activeTab === 'pos' && (
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Products Catalog (2 Cols) */}
          <div className="lg:col-span-2 space-y-4">
            {/* Search & Barcode Bar */}
            <div className="grid sm:grid-cols-2 gap-3">
              <form onSubmit={handleBarcodeSubmit} className="relative">
                <Barcode size={18} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#2DD4BF]" />
                <input
                  className="w-full bg-[#111827] border border-[#2A3B56] rounded-xl pr-11 pl-4 py-2.5 text-xs font-mono text-[#F8FAFC] placeholder-[#94A3B8] focus:outline-none focus:border-[#0D9488] transition-colors shadow-inner"
                  placeholder="امسح الباركود بالسكانر واضغط Enter..."
                  value={barcodeInput}
                  onChange={e => setBarcodeInput(e.target.value)}
                  autoFocus
                />
              </form>
              <div className="relative">
                <Search size={18} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#94A3B8]" />
                <input
                  className="w-full bg-[#111827] border border-[#2A3B56] rounded-xl pr-11 pl-4 py-2.5 text-xs text-[#F8FAFC] placeholder-[#94A3B8] focus:outline-none focus:border-[#0D9488] transition-colors shadow-inner"
                  placeholder="بحث باسم الأداة..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                />
              </div>
            </div>

            {/* Categories Chips */}
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
              {categories.map(cat => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all ${selectedCategory === cat ? 'bg-[#0D9488] text-white shadow-sm border border-[#0D9488]' : 'bg-[#1B2537] border border-[#2A3B56] text-[#94A3B8] hover:border-[#0D9488]/40 hover:text-[#F8FAFC]'}`}
                >
                  {cat === 'all' ? 'جميع الأدوات' : cat}
                </button>
              ))}
            </div>

            {/* Products Grid */}
            <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-3.5">
              {filteredItems.map(item => {
                const isOutOfStock = item.stockQty <= 0;
                const isLowStock = item.stockQty <= item.minStock && !isOutOfStock;
                const inCart = cart.find(c => c.productId === item.id);

                return (
                  <div
                    key={item.id}
                    onClick={() => !isOutOfStock && addToCart(item.id)}
                    className={`bg-[#1B2537] border border-[#2A3B56] p-4 rounded-xl flex flex-col justify-between transition-all cursor-pointer relative overflow-hidden group shadow-md ${isOutOfStock ? 'opacity-40 cursor-not-allowed' : 'hover:border-[#0D9488] hover:shadow-lg hover:shadow-[#0D9488]/5'}`}
                  >
                    {inCart && (
                      <span className="absolute top-2.5 left-2.5 bg-[#0D9488] text-white font-black text-xs w-6 h-6 rounded-full flex items-center justify-center shadow-md">
                        {inCart.quantity}
                      </span>
                    )}

                    <div>
                      <span className="text-[11px] text-[#94A3B8] font-semibold block mb-0.5">{item.category}</span>
                      <h4 className="font-bold text-sm text-[#F8FAFC] line-clamp-2 leading-snug">{item.name}</h4>
                      <p className="text-[11px] text-[#94A3B8] font-mono mt-1">كود: {item.barcode}</p>
                    </div>

                    <div className="mt-4 pt-3 border-t border-[#2A3B56] flex items-center justify-between">
                      <div>
                        <span className="text-lg font-black text-[#2DD4BF] font-mono">{item.sellPrice} ج</span>
                      </div>
                      <span className={`text-xs px-2.5 py-0.5 rounded-lg font-semibold border ${isOutOfStock ? 'bg-red-500/10 border-red-500/30 text-red-400' : isLowStock ? 'bg-amber-500/10 border-amber-500/30 text-amber-300' : 'bg-[#111827] border-[#2A3B56] text-[#94A3B8]'}`}>
                        {isOutOfStock ? 'نفد المخزون' : `متبقي ${item.stockQty}`}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Cart & Checkout Sidebar (1 Col) */}
          <div className="bg-[#1B2537] border border-[#2A3B56] p-5 rounded-2xl flex flex-col justify-between space-y-4 shadow-xl">
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-[#2A3B56]">
                <h3 className="font-bold text-base text-[#F8FAFC] flex items-center gap-2">
                  <ShoppingBag size={18} className="text-[#2DD4BF]" />
                  فاتورة البيع الحالية
                </h3>
                {cart.length > 0 && (
                  <button onClick={() => setCart([])} className="text-xs text-red-400 hover:text-red-300 hover:underline">
                    مسح السلة
                  </button>
                )}
              </div>

              {/* Cart Items List */}
              <div className="space-y-2 mt-4 max-h-56 overflow-y-auto pr-1">
                {cart.length === 0 ? (
                  <div className="py-10 text-center text-[#94A3B8] text-xs leading-relaxed">
                    السلة فارغة.<br />اضغط على أداة أو امسح الباركود لإضافتها.
                  </div>
                ) : (
                  cart.map(c => {
                    const product = supplyItems.find(p => p.id === c.productId);
                    if (!product) return null;
                    return (
                      <div key={c.productId} className="flex items-center justify-between p-2.5 rounded-xl bg-[#111827] border border-[#2A3B56] text-xs">
                        <div className="flex-1 min-w-0 pr-2">
                          <p className="font-semibold text-[#F8FAFC] truncate">{product.name}</p>
                          <p className="text-[11px] text-[#2DD4BF] font-mono font-bold mt-0.5">{product.sellPrice * c.quantity} ج ({product.sellPrice} ج للقطعة)</p>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <button onClick={() => updateCartQty(c.productId, -1)} className="p-1 rounded-lg bg-[#1B2537] border border-[#2A3B56] hover:bg-[#2A3B56] text-[#F8FAFC] transition-colors">
                            <Minus size={11} />
                          </button>
                          <span className="font-bold text-xs w-5 text-center text-[#F8FAFC]">{c.quantity}</span>
                          <button onClick={() => updateCartQty(c.productId, 1)} className="p-1 rounded-lg bg-[#1B2537] border border-[#2A3B56] hover:bg-[#2A3B56] text-[#F8FAFC] transition-colors">
                            <Plus size={11} />
                          </button>
                          <button onClick={() => removeFromCart(c.productId)} className="p-1 text-red-400 hover:text-red-300 mr-1 transition-colors">
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Customer Selector */}
              <div className="mt-4 pt-4 border-t border-[#2A3B56] space-y-3">
                <div className="flex gap-2">
                  <button
                    onClick={() => setCustomerType('student')}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${customerType === 'student' ? 'bg-[#0D9488] text-white shadow-sm border border-[#0D9488]' : 'bg-[#111827] text-[#94A3B8] border border-[#2A3B56] hover:bg-[#1B2537]'}`}
                  >
                    طالب مقيد
                  </button>
                  <button
                    onClick={() => setCustomerType('walkin')}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${customerType === 'walkin' ? 'bg-[#0D9488] text-white shadow-sm border border-[#0D9488]' : 'bg-[#111827] text-[#94A3B8] border border-[#2A3B56] hover:bg-[#1B2537]'}`}
                  >
                    مشتري خارجي
                  </button>
                </div>

                {customerType === 'student' ? (
                  <div>
                    <label className="block text-[11px] text-[#94A3B8] font-bold mb-1">اختر الطالب:</label>
                    <select
                      className="w-full bg-[#111827] border border-[#2A3B56] text-[#F8FAFC] rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-[#0D9488]"
                      value={selectedStudentId}
                      onChange={e => setSelectedStudentId(e.target.value)}
                    >
                      <option value="" className="bg-[#111827] text-[#94A3B8]">-- اختر من قائمة الطلاب --</option>
                      {students.map(s => (
                        <option key={s.id} value={s.id} className="bg-[#111827] text-[#F8FAFC]">{s.name} ({s.qrToken})</option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <div>
                    <label className="block text-[11px] text-[#94A3B8] font-bold mb-1">اسم المشتري الخارجي:</label>
                    <input
                      className="w-full bg-[#111827] border border-[#2A3B56] text-[#F8FAFC] placeholder-[#94A3B8] rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-[#0D9488]"
                      placeholder="مثال: أحمد مصطفى"
                      value={walkinName}
                      onChange={e => setWalkinName(e.target.value)}
                    />
                  </div>
                )}

                {/* Payment Method */}
                <div>
                  <label className="block text-[11px] text-[#94A3B8] font-bold mb-1">طريقة الدفع:</label>
                  <select
                    className="w-full bg-[#111827] border border-[#2A3B56] text-[#F8FAFC] rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-[#0D9488]"
                    value={paymentMethod}
                    onChange={e => setPaymentMethod(e.target.value as any)}
                  >
                    <option value="cash" className="bg-[#111827] text-[#F8FAFC]">نقداً (كاش الخزينة)</option>
                    <option value="instapay" className="bg-[#111827] text-[#F8FAFC]">انستاباي (InstaPay)</option>
                    <option value="vodafone" className="bg-[#111827] text-[#F8FAFC]">فودافون كاش</option>
                    <option value="card" className="bg-[#111827] text-[#F8FAFC]">بطاقة بنكية / فيزا</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Total and Checkout Button */}
            <div className="pt-4 border-t border-[#2A3B56] space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="text-[#94A3B8]">إجمالي القطع:</span>
                <span className="font-bold text-[#F8FAFC]">{cartSummary.totalItems} قطع</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-bold text-sm text-[#F8FAFC]">إتمام المطلوب:</span>
                <span className="font-black text-2xl text-[#2DD4BF] font-mono">{cartSummary.subtotal} ج</span>
              </div>

              <button
                disabled={cart.length === 0 || isCheckingOut}
                onClick={handleCheckout}
                className="w-full bg-[#0D9488] hover:bg-[#0F766E] disabled:bg-[#111827] disabled:text-[#94A3B8] disabled:border-[#2A3B56] disabled:border text-white font-bold py-3 text-xs rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-[#0D9488]/20 transition-all disabled:shadow-none disabled:cursor-not-allowed"
              >
                <Printer size={16} />
                {isCheckingOut ? 'جاري إتمام البيع...' : 'إتمام البيع وطباعة الفاتورة'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= TAB 2: INVENTORY ================= */}
      {activeTab === 'inventory' && (
        <div className="space-y-4">
          {/* Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-[#1B2537] border border-[#2A3B56] p-4 rounded-xl shadow-md">
              <p className="text-xs text-[#94A3B8] font-semibold">إجمالي الأصناف</p>
              <p className="text-2xl font-black text-[#2DD4BF] mt-1">{supplyItems.length}</p>
            </div>
            <div className="bg-[#1B2537] border border-[#2A3B56] p-4 rounded-xl shadow-md">
              <p className="text-xs text-[#94A3B8] font-semibold">إجمالي قطع المخزن</p>
              <p className="text-2xl font-black text-[#F8FAFC] mt-1">
                {supplyItems.reduce((acc, i) => acc + i.stockQty, 0)} قطعة
              </p>
            </div>
            <div className="bg-[#1B2537] border border-[#2A3B56] p-4 rounded-xl shadow-md">
              <p className="text-xs text-[#94A3B8] font-semibold">أصناف أوشكت على النفاد</p>
              <p className="text-2xl font-black text-red-400 mt-1">{lowStockCount}</p>
            </div>
            <div className="bg-[#1B2537] border border-[#2A3B56] p-4 rounded-xl shadow-md">
              <p className="text-xs text-[#94A3B8] font-semibold">قيمة المخزون (بسعر الشراء)</p>
              <p className="text-2xl font-black text-[#2DD4BF] mt-1">{inventoryAssetValue.toLocaleString()} ج</p>
            </div>
          </div>

          {/* Action and Search Bar */}
          <div className="flex items-center justify-between gap-4">
            <div className="relative flex-1 max-w-md">
              <Search size={16} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#94A3B8]" />
              <input
                className="w-full bg-[#111827] border border-[#2A3B56] rounded-xl pr-10 pl-4 py-2 text-xs text-[#F8FAFC] placeholder-[#94A3B8] focus:outline-none focus:border-[#0D9488]"
                placeholder="بحث في المخزون بالاسم أو الباركود..."
                value={search}
                onChange={e => {
                  setSearch(e.target.value);
                  setInventoryPage(1);
                }}
              />
            </div>
            <button
              onClick={() => setShowAddProduct(true)}
              className="bg-[#0D9488] hover:bg-[#0F766E] text-white text-xs font-bold px-4 py-2 rounded-xl flex items-center gap-1.5 shadow-md shadow-[#0D9488]/20 transition-all"
            >
              <Plus size={15} /> إضافة صنف جديد
            </button>
          </div>

          {/* Table */}
          <div className="bg-[#1B2537] border border-[#2A3B56] rounded-2xl overflow-hidden shadow-lg">
            <table className="w-full text-right text-xs">
              <thead className="bg-[#111827] text-[#94A3B8] font-bold border-b border-[#2A3B56]">
                <tr>
                  <th className="p-3.5">الباركود</th>
                  <th className="p-3.5">اسم الأداة</th>
                  <th className="p-3.5">القسم</th>
                  <th className="p-3.5">سعر الشراء</th>
                  <th className="p-3.5">سعر البيع</th>
                  <th className="p-3.5">الربح المتوقع</th>
                  <th className="p-3.5">الكمية بالمخزن</th>
                  <th className="p-3.5 text-center">الرصيد السريع</th>
                  <th className="p-3.5 text-center">إدارة الصنف</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#2A3B56]/50">
                {paginatedInventory.map(item => {
                  const isLow = item.stockQty <= item.minStock;
                  return (
                    <tr key={item.id} className="hover:bg-[#111827]/60 transition-colors">
                      <td className="p-3.5 font-mono text-xs text-[#2DD4BF] font-bold">{item.barcode}</td>
                      <td className="p-3.5 font-semibold text-[#F8FAFC]">{item.name}</td>
                      <td className="p-3.5">
                        <span className="bg-[#111827] border border-[#2A3B56] text-[#2DD4BF] text-[11px] px-2.5 py-0.5 rounded-lg font-bold">
                          {item.category}
                        </span>
                      </td>
                      <td className="p-3.5 text-[#94A3B8]">{item.costPrice} ج</td>
                      <td className="p-3.5 font-bold text-[#F8FAFC]">{item.sellPrice} ج</td>
                      <td className="p-3.5 text-[#2DD4BF] font-bold font-mono">+{item.sellPrice - item.costPrice} ج</td>
                      <td className="p-3.5">
                        <span className={`text-[11px] px-2 py-0.5 rounded-lg font-bold border ${item.stockQty === 0 ? 'bg-red-500/10 border-red-500/30 text-red-400' : isLow ? 'bg-amber-500/10 border-amber-500/30 text-amber-300' : 'bg-[#111827] border-[#2A3B56] text-[#2DD4BF]'}`}>
                          {item.stockQty} {isLow && item.stockQty > 0 && '(أوشك على النفاد)'}
                        </span>
                      </td>
                      <td className="p-3.5 text-center">
                        <div className="inline-flex items-center gap-1 bg-[#111827] border border-[#2A3B56] p-1 rounded-lg">
                          <button
                            onClick={() => updateSupplyStock(item.id, -1)}
                            className="p-1 rounded hover:bg-red-500/20 text-red-400 transition-colors"
                            title="خصم قطعة"
                          >
                            <Minus size={12} />
                          </button>
                          <span className="text-xs px-2 font-mono font-bold text-[#F8FAFC]">{item.stockQty}</span>
                          <button
                            onClick={() => updateSupplyStock(item.id, 1)}
                            className="p-1 rounded hover:bg-[#0D9488]/20 text-[#2DD4BF] transition-colors"
                            title="إضافة قطعة للمخزن"
                          >
                            <Plus size={12} />
                          </button>
                        </div>
                      </td>
                      <td className="p-3.5 text-center">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            onClick={() => {
                              setEditingProduct(item);
                              setEditForm({
                                name: item.name,
                                category: item.category,
                                barcode: item.barcode,
                                costPrice: item.costPrice,
                                sellPrice: item.sellPrice,
                                stockQty: item.stockQty,
                                minStock: item.minStock
                              });
                            }}
                            className="p-1.5 rounded-lg border border-[#0D9488]/30 bg-[#0D9488]/10 text-[#2DD4BF] hover:bg-[#0D9488]/20 transition-all"
                            title="تعديل بيانات الأداة"
                          >
                            <Edit3 size={13} />
                          </button>
                          <button
                            onClick={() => setDeletingProduct(item)}
                            className="p-1.5 rounded-lg border border-red-500/30 bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-all"
                            title="حذف الأداة نهائياً من المخزن"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            <Pagination
              currentPage={inventoryPage}
              totalItems={filteredItems.length}
              pageSize={ITEMS_PER_PAGE}
              onPageChange={setInventoryPage}
              className="p-3 border-t border-[#2A3B56] bg-[#1B2537]"
            />
          </div>
        </div>
      )}

      {/* ================= TAB 3: FINANCIALS ================= */}
      {activeTab === 'financials' && (
        <div className="space-y-6">
          {/* Financial KPIs (Separated for Supplies only) */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-[#1B2537] border border-[#2A3B56] p-5 rounded-2xl shadow-md border-r-4 border-r-[#0D9488]">
              <p className="text-xs text-[#94A3B8] font-semibold">إجمالي مبيعات الأدوات</p>
              <p className="text-2xl font-black text-[#2DD4BF] mt-1">{totalSalesRevenue.toLocaleString()} ج</p>
              <p className="text-[11px] text-[#94A3B8] mt-1">خزينة متجر الأدوات</p>
            </div>
            <div className="bg-[#1B2537] border border-[#2A3B56] p-5 rounded-2xl shadow-md border-r-4 border-r-[#0D9488]/60">
              <p className="text-xs text-[#94A3B8] font-semibold">تكلفة البضاعة المباعة</p>
              <p className="text-2xl font-black text-[#F8FAFC] mt-1">{totalSalesCost.toLocaleString()} ج</p>
              <p className="text-[11px] text-[#94A3B8] mt-1">رأس المال المسترد</p>
            </div>
            <div className="bg-[#1B2537] border border-[#2A3B56] p-5 rounded-2xl shadow-md border-r-4 border-r-[#2DD4BF]">
              <p className="text-xs text-[#94A3B8] font-semibold">صافي أرباح الأدوات فقط</p>
              <p className="text-2xl font-black text-[#2DD4BF] mt-1">{totalSalesProfit.toLocaleString()} ج</p>
              <p className="text-[11px] text-[#94A3B8] mt-1">هامش ربح {profitMargin}%</p>
            </div>
            <div className="bg-[#1B2537] border border-[#2A3B56] p-5 rounded-2xl shadow-md border-r-4 border-r-[#2A3B56]">
              <p className="text-xs text-[#94A3B8] font-semibold">عدد فواتير الأدوات</p>
              <p className="text-2xl font-black text-[#F8FAFC] mt-1">{supplySales.length}</p>
              <p className="text-[11px] text-[#94A3B8] mt-1">ترقيم SHP-2026</p>
            </div>
          </div>

          {/* Invoices List */}
          <div className="bg-[#1B2537] border border-[#2A3B56] p-5 rounded-2xl shadow-xl">
            <h3 className="font-bold text-base text-[#F8FAFC] mb-4 flex items-center gap-2">
              <Tag size={18} className="text-[#2DD4BF]" />
              سجل فواتير بيع الأدوات (خزينة الأدوات المستقلة)
            </h3>

            <div className="divide-y divide-[#2A3B56]">
              {paginatedSales.map(sale => (
                <div key={sale.id} className="py-3.5 flex items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-[#2DD4BF] bg-[#111827] border border-[#2A3B56] px-2 py-0.5 rounded">
                        {sale.invoiceNumber}
                      </span>
                      <span className="font-bold text-sm text-[#F8FAFC]">{sale.customerName}</span>
                      <span className="bg-[#111827] border border-[#2A3B56] text-[#94A3B8] text-[11px] px-2 py-0.5 rounded font-semibold">
                        {sale.customerType === 'student' ? 'طالب' : 'خارجي'}
                      </span>
                    </div>
                    <p className="text-xs text-[#94A3B8] mt-1">
                      {sale.date} • {sale.items.map(i => `${i.productName} (${i.quantity})`).join(', ')}
                    </p>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="text-left">
                      <p className="font-black text-sm text-[#2DD4BF] font-mono">{sale.totalAmount} ج</p>
                      <p className="text-xs text-[#94A3B8]">ربح: +{sale.profit} ج</p>
                    </div>
                    <button
                      onClick={() => setCurrentInvoice(sale)}
                      className="bg-[#111827] border border-[#2A3B56] text-[#2DD4BF] hover:bg-[#2A3B56] hover:text-[#F8FAFC] px-3 py-1.5 rounded-xl text-xs flex items-center gap-1 transition-colors"
                    >
                      <Printer size={13} />
                      عرض / طباعة
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <Pagination
              currentPage={salesPage}
              totalItems={supplySales.length}
              pageSize={ITEMS_PER_PAGE}
              onPageChange={setSalesPage}
              className="pt-4 border-t border-[#2A3B56]"
            />
          </div>
        </div>
      )}

      {/* ================= MODAL: ADD PRODUCT ================= */}
      {showAddProduct && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-[#1B2537] border border-[#2A3B56] text-[#F8FAFC] shadow-2xl p-6 rounded-2xl max-w-md w-full space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#2A3B56]">
              <h3 className="font-bold text-base text-[#F8FAFC]">إضافة أداة / منتج جديد</h3>
              <button onClick={() => setShowAddProduct(false)} className="text-[#94A3B8] hover:text-white">
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs text-[#94A3B8] font-bold mb-1">اسم الأداة أو الخامة:</label>
                <input
                  className="w-full bg-[#111827] border border-[#2A3B56] rounded-xl px-3 py-2 text-xs text-[#F8FAFC] placeholder-[#94A3B8] focus:outline-none focus:border-[#0D9488]"
                  placeholder="مثال: ألوان مائية فنانين 24 لون"
                  value={newProduct.name}
                  onChange={e => setNewProduct({ ...newProduct, name: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-[#94A3B8] font-bold mb-1">القسم:</label>
                  <select
                    className="w-full bg-[#111827] border border-[#2A3B56] rounded-xl px-3 py-2 text-xs text-[#F8FAFC] focus:outline-none focus:border-[#0D9488]"
                    value={newProduct.category}
                    onChange={e => setNewProduct({ ...newProduct, category: e.target.value })}
                  >
                    <option value="ألوان" className="bg-[#111827]">ألوان</option>
                    <option value="فرش وأدوات" className="bg-[#111827]">فرش وأدوات</option>
                    <option value="ورق وسكتشات" className="bg-[#111827]">ورق وسكتشات</option>
                    <option value="كانفاس ومجسمات" className="bg-[#111827]">كانفاس ومجسمات</option>
                    <option value="أقلام وفحم" className="bg-[#111827]">أقلام وفحم</option>
                    <option value="نحت وصلصال" className="bg-[#111827]">نحت وصلصال</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-[#94A3B8] font-bold mb-1">الباركود (اختياري):</label>
                  <input
                    className="w-full bg-[#111827] border border-[#2A3B56] rounded-xl px-3 py-2 text-xs font-mono text-[#F8FAFC] placeholder-[#94A3B8] focus:outline-none focus:border-[#0D9488]"
                    placeholder="امسح بالسكانر أو اتركه تلقائي"
                    value={newProduct.barcode}
                    onChange={e => setNewProduct({ ...newProduct, barcode: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-[#94A3B8] font-bold mb-1">سعر الشراء (التكلفة):</label>
                  <input
                    type="number"
                    className="w-full bg-[#111827] border border-[#2A3B56] rounded-xl px-3 py-2 text-xs text-[#F8FAFC] focus:outline-none focus:border-[#0D9488]"
                    value={newProduct.costPrice || ''}
                    onChange={e => setNewProduct({ ...newProduct, costPrice: Number(e.target.value) })}
                  />
                </div>
                <div>
                  <label className="block text-xs text-[#94A3B8] font-bold mb-1">سعر البيع للطالب:</label>
                  <input
                    type="number"
                    className="w-full bg-[#111827] border border-[#2A3B56] rounded-xl px-3 py-2 text-xs font-bold text-[#2DD4BF] focus:outline-none focus:border-[#0D9488]"
                    value={newProduct.sellPrice || ''}
                    onChange={e => setNewProduct({ ...newProduct, sellPrice: Number(e.target.value) })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-[#94A3B8] font-bold mb-1">الكمية الأولية بالمخزن:</label>
                  <input
                    type="number"
                    className="w-full bg-[#111827] border border-[#2A3B56] rounded-xl px-3 py-2 text-xs text-[#F8FAFC] focus:outline-none focus:border-[#0D9488]"
                    value={newProduct.stockQty}
                    onChange={e => setNewProduct({ ...newProduct, stockQty: Number(e.target.value) })}
                  />
                </div>
                <div>
                  <label className="block text-xs text-[#94A3B8] font-bold mb-1">حد التنبيه بنقص المخزون:</label>
                  <input
                    type="number"
                    className="w-full bg-[#111827] border border-[#2A3B56] rounded-xl px-3 py-2 text-xs text-[#F8FAFC] focus:outline-none focus:border-[#0D9488]"
                    value={newProduct.minStock}
                    onChange={e => setNewProduct({ ...newProduct, minStock: Number(e.target.value) })}
                  />
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-[#2A3B56] flex gap-2">
              <button
                disabled={isAddingProduct}
                onClick={() => {
                  if (!newProduct.name || !newProduct.sellPrice) {
                    alert('برجاء كتابة الاسم وسعر البيع');
                    return;
                  }
                  executeAddProduct(() => {
                    addSupplyItem(newProduct);
                    setShowAddProduct(false);
                    setNewProduct({
                      name: '', category: 'ألوان', barcode: '', costPrice: 0,
                      sellPrice: 0, stockQty: 10, minStock: 3
                    });
                  });
                }}
                className="bg-[#0D9488] hover:bg-[#0F766E] text-white flex-1 py-2 rounded-xl text-xs font-bold shadow-md shadow-[#0D9488]/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-colors"
              >
                {isAddingProduct ? 'جاري الحفظ...' : 'حفظ الأداة في المخزون'}
              </button>
              <button
                onClick={() => setShowAddProduct(false)}
                className="bg-[#111827] border border-[#2A3B56] text-[#94A3B8] hover:text-white px-4 py-2 rounded-xl text-xs font-bold transition-colors"
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL: EDIT PRODUCT ================= */}
      {editingProduct && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-[#1B2537] border border-[#2A3B56] text-[#F8FAFC] shadow-2xl p-6 rounded-2xl max-w-md w-full space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#2A3B56]">
              <h3 className="font-bold text-base text-[#F8FAFC] flex items-center gap-2">
                <Edit3 size={18} className="text-[#2DD4BF]" />
                تعديل بيانات الأداة / المنتج
              </h3>
              <button onClick={() => setEditingProduct(null)} className="text-[#94A3B8] hover:text-white">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-3">
              <div>
                <label className="block text-xs text-[#94A3B8] font-bold mb-1">اسم الأداة أو الخامة:</label>
                <input
                  className="w-full bg-[#111827] border border-[#2A3B56] rounded-xl px-3 py-2 text-xs text-[#F8FAFC] focus:outline-none focus:border-[#0D9488]"
                  required
                  value={editForm.name}
                  onChange={e => setEditForm({ ...editForm, name: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-[#94A3B8] font-bold mb-1">القسم / التصنيف:</label>
                  <input
                    className="w-full bg-[#111827] border border-[#2A3B56] rounded-xl px-3 py-2 text-xs text-[#F8FAFC] focus:outline-none focus:border-[#0D9488]"
                    required
                    value={editForm.category}
                    onChange={e => setEditForm({ ...editForm, category: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-xs text-[#94A3B8] font-bold mb-1">كود الباركود:</label>
                  <input
                    className="w-full bg-[#111827] border border-[#2A3B56] rounded-xl px-3 py-2 text-xs font-mono font-bold text-[#2DD4BF] focus:outline-none focus:border-[#0D9488]"
                    required
                    value={editForm.barcode}
                    onChange={e => setEditForm({ ...editForm, barcode: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-[#94A3B8] font-bold mb-1">سعر الشراء (التكلفة):</label>
                  <input
                    type="number"
                    className="w-full bg-[#111827] border border-[#2A3B56] rounded-xl px-3 py-2 text-xs text-[#F8FAFC] focus:outline-none focus:border-[#0D9488]"
                    value={editForm.costPrice}
                    onChange={e => setEditForm({ ...editForm, costPrice: Number(e.target.value) })}
                  />
                </div>
                <div>
                  <label className="block text-xs text-[#94A3B8] font-bold mb-1">سعر البيع للطالب:</label>
                  <input
                    type="number"
                    className="w-full bg-[#111827] border border-[#2A3B56] rounded-xl px-3 py-2 text-xs font-bold text-[#2DD4BF] focus:outline-none focus:border-[#0D9488]"
                    required
                    value={editForm.sellPrice}
                    onChange={e => setEditForm({ ...editForm, sellPrice: Number(e.target.value) })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-[#94A3B8] font-bold mb-1">الكمية بالمخزن:</label>
                  <input
                    type="number"
                    className="w-full bg-[#111827] border border-[#2A3B56] rounded-xl px-3 py-2 text-xs text-[#F8FAFC] focus:outline-none focus:border-[#0D9488]"
                    value={editForm.stockQty}
                    onChange={e => setEditForm({ ...editForm, stockQty: Number(e.target.value) })}
                  />
                </div>
                <div>
                  <label className="block text-xs text-[#94A3B8] font-bold mb-1">حد التنبيه بنقص المخزون:</label>
                  <input
                    type="number"
                    className="w-full bg-[#111827] border border-[#2A3B56] rounded-xl px-3 py-2 text-xs text-[#F8FAFC] focus:outline-none focus:border-[#0D9488]"
                    value={editForm.minStock}
                    onChange={e => setEditForm({ ...editForm, minStock: Number(e.target.value) })}
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-[#2A3B56] flex gap-2">
                <button
                  type="submit"
                  disabled={isUpdatingProduct}
                  className="bg-[#0D9488] hover:bg-[#0F766E] text-white flex-1 py-2 rounded-xl text-xs font-bold shadow-md shadow-[#0D9488]/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-colors"
                >
                  {isUpdatingProduct ? 'جاري حفظ التعديلات...' : 'حفظ التعديلات'}
                </button>
                <button
                  type="button"
                  onClick={() => setEditingProduct(null)}
                  className="bg-[#111827] border border-[#2A3B56] text-[#94A3B8] hover:text-white px-4 py-2 rounded-xl text-xs font-bold transition-colors"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL: DELETE CONFIRMATION ================= */}
      {deletingProduct && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-[#1B2537] border border-[#2A3B56] text-[#F8FAFC] shadow-2xl p-6 rounded-2xl max-w-sm w-full space-y-4">
            <div className="flex items-center gap-3 text-red-400 border-b border-[#2A3B56] pb-3">
              <div className="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center shrink-0 border border-red-500/30">
                <Trash2 size={20} />
              </div>
              <div>
                <h3 className="font-bold text-base text-[#F8FAFC]">تأكيد حذف الأداة</h3>
                <p className="text-xs text-[#94A3B8]">سيتم إزالة الصنف من قائمة المخزون</p>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-[#111827] border border-[#2A3B56] text-xs space-y-2">
              <div className="flex justify-between">
                <span className="text-[#94A3B8]">اسم الأداة:</span>
                <strong className="text-[#F8FAFC]">{deletingProduct.name}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-[#94A3B8]">كود الباركود:</span>
                <span className="font-mono text-[#2DD4BF] font-bold">{deletingProduct.barcode}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#94A3B8]">الرصيد بالمخزن:</span>
                <span className="font-bold text-[#F8FAFC]">{deletingProduct.stockQty} قطعة</span>
              </div>
            </div>

            <div className="text-xs text-[#94A3B8]">
              هل أنت متأكد من رغبتك في حذف هذا الصنف نهائياً من قاعدة بيانات المخزن؟
            </div>

            <div className="pt-2 border-t border-[#2A3B56] flex gap-2">
              <button
                onClick={handleConfirmDelete}
                disabled={isDeletingProduct}
                className="bg-red-600 hover:bg-red-700 text-white flex-1 py-2 rounded-xl text-xs disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 font-bold shadow-md transition-colors"
              >
                {isDeletingProduct ? 'جاري الحذف...' : 'تأكيد الحذف'}
              </button>
              <button
                onClick={() => setDeletingProduct(null)}
                className="bg-[#111827] border border-[#2A3B56] text-[#94A3B8] hover:text-white px-4 py-2 rounded-xl text-xs font-bold transition-colors"
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL: PRINTABLE INVOICE ================= */}
      {currentInvoice && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white text-slate-900 rounded-2xl max-w-md w-full p-6 shadow-2xl relative border-2 border-[#0D9488]/40">
            <button
              onClick={() => setCurrentInvoice(null)}
              className="absolute top-4 left-4 text-slate-400 hover:text-slate-800"
            >
              <X size={20} />
            </button>

            {/* Receipt Content */}
            <div id="printable-receipt" className="space-y-4">
              <div className="text-center border-b pb-4">
                <h2 className="text-xl font-black text-slate-900">{settings.name}</h2>
                <p className="text-xs text-slate-500 mt-0.5">قسم متجر ومبيعات الأدوات الفنية</p>
                <p className="text-xs text-slate-400">{settings.address} • {settings.phone}</p>
                <div className="mt-2 inline-block bg-[#0D9488]/10 px-3 py-1 rounded text-xs font-mono font-bold text-[#0D9488] border border-[#0D9488]/20">
                  فاتورة رقم: {currentInvoice.invoiceNumber}
                </div>
              </div>

              <div className="text-xs space-y-1 text-slate-600 border-b pb-3">
                <div className="flex justify-between">
                  <span>التاريخ:</span>
                  <span className="font-semibold text-slate-800">{currentInvoice.date}</span>
                </div>
                <div className="flex justify-between">
                  <span>اسم المشتري:</span>
                  <span className="font-semibold text-slate-900">{currentInvoice.customerName}</span>
                </div>
                <div className="flex justify-between">
                  <span>طريقة الدفع:</span>
                  <span className="font-semibold text-slate-800">{currentInvoice.paymentMethod}</span>
                </div>
              </div>

              {/* Items Table */}
              <table className="w-full text-right text-xs">
                <thead>
                  <tr className="border-b text-slate-500">
                    <th className="py-1">الصنف</th>
                    <th className="py-1 text-center">الكمية</th>
                    <th className="py-1 text-left">الإجمالي</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {currentInvoice.items.map((item: any, idx: number) => (
                    <tr key={idx} className="py-1.5">
                      <td className="py-1.5 text-slate-800">{item.productName}</td>
                      <td className="py-1.5 text-center font-bold text-slate-900">{item.quantity}</td>
                      <td className="py-1.5 text-left font-bold text-[#0D9488] font-mono">{item.total} ج</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Total */}
              <div className="border-t pt-3 flex justify-between items-center">
                <span className="font-black text-sm text-slate-900">إجمالي الفاتورة:</span>
                <span className="font-black text-xl text-[#0D9488] font-mono">{currentInvoice.totalAmount} ج</span>
              </div>

              <p className="text-center text-[10px] text-slate-400 pt-2 border-t">
                شكراً لتعاملكم مع مرسم الإبداع • الفاتورة مسجلة رسمياً بنظام الإدارة
              </p>
            </div>

            {/* Actions */}
            <div className="mt-5 pt-3 border-t flex gap-2">
              <button
                onClick={() => window.print()}
                className="bg-[#0D9488] hover:bg-[#0F766E] text-white flex-1 py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-md shadow-[#0D9488]/20 transition-colors"
              >
                <Printer size={16} /> طباعة الفاتورة (طابعة حرارية / A5)
              </button>
              <button
                onClick={() => setCurrentInvoice(null)}
                className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2.5 rounded-xl text-xs font-bold transition-colors"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
