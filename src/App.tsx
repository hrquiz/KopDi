import { useState, useEffect, FormEvent } from "react";
import { 
  LayoutDashboard, 
  Users, 
  Wallet, 
  ShoppingBag, 
  Package, 
  FileText, 
  LogOut, 
  Plus, 
  RefreshCw,
  ExternalLink,
  ShieldCheck,
  Smartphone,
  CreditCard,
  Info,
  Pencil,
  Trash2,
  Menu,
  X
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

// --- Types ---

interface Member {
  ID: string;
  Name: string;
  Email: string;
  Phone: string;
  JoinDate: string;
}

interface Saving {
  MemberID: string;
  Type: string;
  Amount: string;
  Date: string;
}

interface Product {
  ID: string;
  Name: string;
  Price: string;
  Category: string;
  Stock: string;
}

// --- Components ---

const SidebarItem = ({ icon: Icon, label, active, onClick }: any) => (
  <button
    onClick={onClick}
    className={`flex items-center w-full gap-3 px-4 py-3 rounded-lg transition-all ${
      active 
        ? "bg-emerald-600 text-white shadow-lg shadow-emerald-200" 
        : "text-slate-600 hover:bg-slate-100"
    }`}
  >
    <Icon size={20} />
    <span className="font-medium">{label}</span>
  </button>
);

const StatCard = ({ label, value, icon: Icon, color }: any) => (
  <div className="bg-white p-5 md:p-6 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4 min-w-0">
    <div className={`p-3 rounded-xl ${color} flex-shrink-0`}>
      <Icon size={24} className="text-white" />
    </div>
    <div className="min-w-0 flex-1">
      <p className="text-xs md:text-sm text-slate-500 font-medium truncate">{label}</p>
      <p className="text-lg md:text-2xl font-bold text-slate-900 break-words leading-tight">{value}</p>
    </div>
  </div>
);

export default function App() {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [userRole, setUserRole] = useState<string>("Admin"); // Default for demo
  const [showAddModal, setShowAddModal] = useState<string | null>(null);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [data, setData] = useState<any>({
    members: [],
    savings: [],
    products: [],
  });

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const res = await fetch("/api/auth/status");
      if (!res.ok) {
        const text = await res.text();
        console.error("Auth check failed:", text.slice(0, 100));
        setIsAuthenticated(false);
        return;
      }
      const { isAuthenticated } = await res.json();
      setIsAuthenticated(isAuthenticated);
      if (isAuthenticated) {
        fetchAllData();
      }
    } catch (err) {
      console.error(err);
      setIsAuthenticated(false);
    }
  };

  const fetchAllData = async () => {
    console.log("fetchAllData started");
    setLoading(true);
    try {
      const fetchJson = async (url: string) => {
        console.log(`Fetching JSON from ${url}...`);
        const res = await fetch(url);
        if (!res.ok) {
          const text = await res.text();
          throw new Error(`HTTP ${res.status}: ${text.slice(0, 100)}`);
        }
        return res.json();
      };

      const [members, savings, products] = await Promise.all([
        fetchJson("/api/sheets/data/Members"),
        fetchJson("/api/sheets/data/Savings"),
        fetchJson("/api/sheets/data/Products"),
      ]);
      console.log("Data fetched successfully:", { members, savings, products });
      setData({ members, savings, products });
    } catch (err) {
      console.error("Fetch error details:", err);
    } finally {
      setLoading(false);
      console.log("fetchAllData finished");
    }
  };

  const handleConnect = async () => {
    try {
      const res = await fetch("/api/auth/url");
      const { url } = await res.json();
      const authWindow = window.open(url, "google_auth", "width=600,height=700");
      
      const handleMessage = (event: MessageEvent) => {
        if (event.data?.type === 'OAUTH_AUTH_SUCCESS') {
          setIsAuthenticated(true);
          fetchAllData();
          window.removeEventListener('message', handleMessage);
        }
      };
      window.addEventListener('message', handleMessage);
    } catch (err) {
      console.error(err);
    }
  };

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    setIsAuthenticated(false);
  };

  const initSheets = async () => {
    console.log("initSheets started");
    setLoading(true);
    try {
      console.log("Fetching /api/sheets/init...");
      const res = await fetch("/api/sheets/init");
      console.log("Init result status:", res.status);
      fetchAllData();
    } catch (err) {
      console.error("Init error details:", err);
    } finally {
      setLoading(false);
      console.log("initSheets finished");
    }
  };

  const addData = async (sheetName: string, values: any[]) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/sheets/data/${sheetName}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ values }),
      });
      if (res.ok) {
        fetchAllData();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const canAddData = (tab: string) => {
    if (userRole === "Admin") return true;
    if (userRole === "Pengurus") {
      return tab === "inventory" || tab === "transactions";
    }
    return false;
  };

  const handleAddMember = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const name = formData.get("name") as string;
    const email = formData.get("email") as string;
    const phone = formData.get("phone") as string;
    
    if (name && email && phone) {
      const id = editingItem ? editingItem.ID : `MBR-${Math.floor(1000 + Math.random() * 9000)}`;
      const date = editingItem ? editingItem.JoinDate : new Date().toLocaleDateString();
      
      if (editingItem) {
        updateData("Members", id, [id, name, email, phone, date]);
      } else {
        addData("Members", [id, name, email, phone, date]);
      }
      setShowAddModal(null);
      setEditingItem(null);
    }
  };

  const handleAddProduct = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const name = formData.get("name") as string;
    const price = formData.get("price") as string;
    const category = formData.get("category") as string;
    const stock = formData.get("stock") as string;
    
    if (name && price && category && stock) {
      const id = editingItem ? editingItem.ID : `PRD-${Math.floor(1000 + Math.random() * 9000)}`;
      
      if (editingItem) {
        updateData("Products", id, [id, name, price, category, stock]);
      } else {
        addData("Products", [id, name, price, category, stock]);
      }
      setShowAddModal(null);
      setEditingItem(null);
    }
  };

  const updateData = async (sheetName: string, id: string, values: any[]) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/sheets/data/${sheetName}/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ values }),
      });
      if (res.ok) fetchAllData();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (sheetName: string, id: string) => {
    if (!confirm("Apakah Anda yakin ingin menghapus data ini?")) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/sheets/data/${sheetName}/${id}`, {
        method: "DELETE",
      });
      if (res.ok) fetchAllData();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const seedData = async () => {
    console.log("Seed button clicked");
    setLoading(true);
    try {
      console.log("Fetching /api/sheets/seed...");
      const res = await fetch("/api/sheets/seed", { method: "POST" });
      const result = await res.json();
      console.log("Seed result:", result);
      
      if (!res.ok) {
        throw new Error(result.error || "Gagal mengisi data sampel");
      }
      
      console.log("Fetching all data...");
      await fetchAllData();
      alert(`Berhasil! ${result.message}\n\nSpreadsheet ID: ${result.debug.spreadsheetId}\nSheets: ${result.debug.sheetsUpdated.join(", ")}`);
    } catch (err: any) {
      console.error("Seed error details:", err);
      alert(`Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  if (isAuthenticated === null) return <div className="h-screen flex items-center justify-center">Loading...</div>;

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-md w-full bg-white p-8 rounded-3xl shadow-xl border border-slate-100 text-center"
        >
          <div className="w-20 h-20 bg-emerald-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <ShieldCheck size={40} className="text-emerald-600" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mb-2">Koperasi Digital</h1>
          <p className="text-slate-500 mb-8">Hubungkan akun Google Anda untuk mengelola data koperasi melalui Google Sheets.</p>
          
          <button
            onClick={handleConnect}
            className="w-full bg-slate-900 text-white py-4 rounded-xl font-semibold hover:bg-slate-800 transition-all flex items-center justify-center gap-3"
          >
            <img src="https://www.google.com/favicon.ico" className="w-5 h-5" alt="Google" />
            Hubungkan Google Sheets
          </button>
          
          <div className="mt-8 pt-8 border-t border-slate-100 text-left">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-4">Langkah Persiapan:</h3>
            <ol className="text-sm text-slate-600 space-y-3 list-decimal pl-4">
              <li>Pastikan Anda sudah mengatur <b>GOOGLE_CLIENT_ID</b> dan <b>GOOGLE_CLIENT_SECRET</b> di panel Secrets.</li>
              <li>Gunakan Spreadsheet ID: <code className="bg-slate-100 px-1 rounded">1x75Ms8xPARMsz-dJGm7Hz6g8QvHJCZrRNQrf_X-HYZM</code></li>
              <li>Tambahkan Redirect URI: <code className="bg-slate-100 px-1 rounded block mt-1 break-all">{window.location.origin}/auth/callback</code></li>
            </ol>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col lg:flex-row">
      {/* Mobile Header */}
      <header className="lg:hidden bg-white border-b border-slate-200 p-4 flex items-center justify-between sticky top-0 z-30">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-emerald-600 rounded-lg flex items-center justify-center">
            <ShieldCheck size={18} className="text-white" />
          </div>
          <h1 className="font-bold text-slate-900">Koperasi Digital</h1>
        </div>
        <button 
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-all"
        >
          {isSidebarOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </header>

      {/* Sidebar Overlay */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40 lg:hidden"
            onClick={() => setIsSidebarOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <aside className={`
        fixed inset-y-0 left-0 z-50 w-72 bg-white border-r border-slate-200 flex flex-col p-6 transition-transform duration-300 lg:relative lg:translate-x-0
        ${isSidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
      `}>
        <div className="flex items-center gap-3 mb-10 px-2">
          <div className="w-10 h-10 bg-emerald-600 rounded-xl flex items-center justify-center">
            <ShieldCheck size={24} className="text-white" />
          </div>
          <h1 className="text-xl font-bold text-slate-900">Koperasi Digital</h1>
        </div>

        <nav className="flex-1 space-y-2 overflow-y-auto">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4 px-2">Pengurus (Admin)</p>
          <SidebarItem 
            icon={LayoutDashboard} 
            label="Dashboard" 
            active={activeTab === "dashboard"} 
            onClick={() => { setActiveTab("dashboard"); setIsSidebarOpen(false); }} 
          />
          <SidebarItem 
            icon={Users} 
            label="Anggota" 
            active={activeTab === "members"} 
            onClick={() => { setActiveTab("members"); setIsSidebarOpen(false); }} 
          />
          <SidebarItem 
            icon={Wallet} 
            label="Keuangan" 
            active={activeTab === "finance"} 
            onClick={() => { setActiveTab("finance"); setIsSidebarOpen(false); }} 
          />
          <SidebarItem 
            icon={Package} 
            label="Inventori" 
            active={activeTab === "inventory"} 
            onClick={() => { setActiveTab("inventory"); setIsSidebarOpen(false); }} 
          />
          
          <div className="pt-6">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4 px-2">Anggota (Member)</p>
            <SidebarItem 
              icon={Smartphone} 
              label="Mobile View" 
              active={activeTab === "mobile"} 
              onClick={() => { setActiveTab("mobile"); setIsSidebarOpen(false); }} 
            />
            <SidebarItem 
              icon={ShoppingBag} 
              label="Belanja Online" 
              active={activeTab === "shop"} 
              onClick={() => { setActiveTab("shop"); setIsSidebarOpen(false); }} 
            />
          </div>
        </nav>

        <div className="mt-auto pt-6 border-t border-slate-100">
          <div className="mb-4 px-4">
            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-2 tracking-wider">Level Akses (Demo)</label>
            <select 
              value={userRole}
              onChange={(e) => setUserRole(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold text-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="Admin">Administrator</option>
              <option value="Pengurus">Pengurus (Staff)</option>
              <option value="Anggota">Anggota</option>
            </select>
          </div>
          <button 
            onClick={handleLogout}
            className="flex items-center w-full gap-3 px-4 py-3 text-red-600 hover:bg-red-50 rounded-lg transition-all"
          >
            <LogOut size={20} />
            <span className="font-medium">Keluar</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto min-w-0">
        <header className="bg-white border-b border-slate-200 h-20 hidden lg:flex items-center justify-between px-8 sticky top-0 z-10">
          <h2 className="text-xl font-bold text-slate-900 capitalize">
            {activeTab === "dashboard" ? "Ringkasan Koperasi" : activeTab}
          </h2>
          <div className="flex items-center gap-4">
            <button 
              onClick={seedData}
              disabled={loading}
              className={`flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-all text-sm font-medium ${loading ? "opacity-50 cursor-not-allowed" : ""}`}
            >
              <Plus size={16} className={loading ? "animate-spin" : ""} />
              {loading ? "Mengisi..." : "Isi Data Sampel"}
            </button>
            <button 
              onClick={initSheets}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-700 rounded-lg hover:bg-emerald-100 transition-all text-sm font-medium"
            >
              <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
              Inisialisasi Sheet
            </button>
            <a 
              href={`https://docs.google.com/spreadsheets/d/${(process.env as any).SPREADSHEET_ID || "1x75Ms8xPARMsz-dJGm7Hz6g8QvHJCZrRNQrf_X-HYZM"}`}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-all text-sm font-medium"
            >
              <ExternalLink size={16} />
              Buka GSheet
            </a>
          </div>
        </header>

        {/* Mobile Sub-header for Actions */}
        <div className="lg:hidden bg-white border-b border-slate-100 p-4 flex flex-wrap gap-2 items-center justify-center">
          <button 
            onClick={seedData}
            disabled={loading}
            className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg text-xs font-medium"
          >
            <Plus size={14} />
            Data Sampel
          </button>
          <button 
            onClick={initSheets}
            className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 text-emerald-700 rounded-lg text-xs font-medium"
          >
            <RefreshCw size={14} />
            Init Sheet
          </button>
        </div>

        <div className="p-4 md:p-8">
          <AnimatePresence mode="wait">
            {activeTab === "dashboard" && (
              <motion.div 
                key="dashboard"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-8"
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 md:gap-6">
                  <StatCard 
                    label="Total Anggota" 
                    value={data.members.length} 
                    icon={Users} 
                    color="bg-blue-500" 
                  />
                  <StatCard 
                    label="Total Simpanan" 
                    value={`Rp ${data.savings.reduce((acc: number, s: any) => acc + Number(s.Amount || 0), 0).toLocaleString()}`} 
                    icon={Wallet} 
                    color="bg-emerald-500" 
                  />
                  <StatCard 
                    label="Produk Aktif" 
                    value={data.products.length} 
                    icon={Package} 
                    color="bg-orange-500" 
                  />
                  <StatCard 
                    label="Transaksi Hari Ini" 
                    value="12" 
                    icon={FileText} 
                    color="bg-purple-500" 
                  />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                    <div className="flex items-center justify-between mb-6">
                      <h3 className="font-bold text-slate-900">Anggota Terbaru</h3>
                      <button className="text-emerald-600 text-sm font-bold hover:underline">Lihat Semua</button>
                    </div>
                    <div className="space-y-4">
                      {data.members.slice(0, 5).map((member: any, i: number) => (
                        <div key={i} className="flex items-center justify-between p-3 hover:bg-slate-50 rounded-xl transition-all">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center font-bold text-slate-600">
                              {member.Name?.[0]}
                            </div>
                            <div>
                              <p className="font-bold text-slate-900">{member.Name}</p>
                              <p className="text-xs text-slate-500">{member.Email}</p>
                            </div>
                          </div>
                          <span className="text-xs font-medium text-slate-400">{member.JoinDate}</span>
                        </div>
                      ))}
                      {data.members.length === 0 && <p className="text-center text-slate-400 py-4">Belum ada data anggota.</p>}
                    </div>
                  </div>

                  <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                    <div className="flex items-center justify-between mb-6">
                      <h3 className="font-bold text-slate-900">Stok Produk Rendah</h3>
                      <button className="text-emerald-600 text-sm font-bold hover:underline">Kelola Stok</button>
                    </div>
                    <div className="space-y-4">
                      {data.products.filter((p: any) => Number(p.Stock) < 10).map((product: any, i: number) => (
                        <div key={i} className="flex items-center justify-between p-3 hover:bg-slate-50 rounded-xl transition-all">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-orange-50 rounded-xl flex items-center justify-center text-orange-600">
                              <Package size={20} />
                            </div>
                            <div>
                              <p className="font-bold text-slate-900">{product.Name}</p>
                              <p className="text-xs text-slate-500">{product.Category}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-red-600">{product.Stock}</p>
                            <p className="text-[10px] text-slate-400 uppercase font-bold">Sisa Stok</p>
                          </div>
                        </div>
                      ))}
                      {data.products.length === 0 && <p className="text-center text-slate-400 py-4">Belum ada data produk.</p>}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === "mobile" && (
              <motion.div 
                key="mobile"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex justify-center"
              >
                {/* Simulated Mobile Device */}
                <div className="w-[375px] h-[700px] bg-white rounded-[3rem] border-[8px] border-slate-900 shadow-2xl overflow-hidden relative">
                  <div className="h-6 bg-slate-900 w-32 mx-auto rounded-b-2xl absolute top-0 left-1/2 -translate-x-1/2 z-20"></div>
                  
                  <div className="h-full flex flex-col">
                    {/* App Header */}
                    <div className="bg-emerald-600 p-6 pt-12 text-white">
                      <div className="flex items-center justify-between mb-6">
                        <div>
                          <p className="text-emerald-100 text-sm">Selamat Datang,</p>
                          <h3 className="text-xl font-bold">Budi Santoso</h3>
                        </div>
                        <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center">
                          <Users size={24} />
                        </div>
                      </div>
                      <div className="bg-white/10 p-4 rounded-2xl backdrop-blur-md">
                        <p className="text-xs text-emerald-100 uppercase font-bold tracking-wider mb-1">Total Simpanan</p>
                        <p className="text-2xl font-bold">Rp 2.450.000</p>
                      </div>
                    </div>

                    {/* App Body */}
                    <div className="flex-1 bg-slate-50 p-6 space-y-6 overflow-y-auto">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex flex-col items-center text-center gap-2">
                          <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center">
                            <ShoppingBag size={20} />
                          </div>
                          <p className="text-xs font-bold text-slate-900">Belanja Online</p>
                        </div>
                        <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex flex-col items-center text-center gap-2">
                          <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center">
                            <CreditCard size={20} />
                          </div>
                          <p className="text-xs font-bold text-slate-900">Pembayaran</p>
                        </div>
                        <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex flex-col items-center text-center gap-2">
                          <div className="w-10 h-10 bg-purple-50 text-purple-600 rounded-xl flex items-center justify-center">
                            <Info size={20} />
                          </div>
                          <p className="text-xs font-bold text-slate-900">Info Anggota</p>
                        </div>
                        <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex flex-col items-center text-center gap-2">
                          <div className="w-10 h-10 bg-orange-50 text-orange-600 rounded-xl flex items-center justify-center">
                            <Wallet size={20} />
                          </div>
                          <p className="text-xs font-bold text-slate-900">Simpanan</p>
                        </div>
                      </div>

                      <div>
                        <h4 className="font-bold text-slate-900 mb-4">Transaksi Terakhir</h4>
                        <div className="space-y-3">
                          {[1, 2, 3].map(i => (
                            <div key={i} className="bg-white p-3 rounded-xl flex items-center justify-between border border-slate-100">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 bg-slate-50 rounded-lg flex items-center justify-center text-slate-400">
                                  <FileText size={16} />
                                </div>
                                <div>
                                  <p className="text-xs font-bold text-slate-900">Simpanan Wajib</p>
                                  <p className="text-[10px] text-slate-400">12 Feb 2024</p>
                                </div>
                              </div>
                              <p className="text-xs font-bold text-emerald-600">+Rp 50.000</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* App Navbar */}
                    <div className="bg-white border-t border-slate-100 p-4 flex justify-around items-center">
                      <LayoutDashboard size={20} className="text-emerald-600" />
                      <ShoppingBag size={20} className="text-slate-300" />
                      <div className="w-12 h-12 bg-emerald-600 rounded-full flex items-center justify-center -mt-10 border-4 border-slate-50 shadow-lg text-white">
                        <Plus size={24} />
                      </div>
                      <Wallet size={20} className="text-slate-300" />
                      <Users size={20} className="text-slate-300" />
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab !== "dashboard" && activeTab !== "mobile" && (
              <motion.div 
                key="other"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden"
              >
                <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                  <h3 className="font-bold text-slate-900">Data {activeTab}</h3>
                  {canAddData(activeTab) && (
                    <button 
                      onClick={() => setShowAddModal(activeTab)}
                      className="bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 hover:bg-emerald-700 transition-all"
                    >
                      <Plus size={16} />
                      Tambah Data
                    </button>
                  )}
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead className="bg-slate-50 text-slate-400 text-xs uppercase font-bold tracking-wider whitespace-nowrap">
                      <tr>
                        <th className="px-6 py-4">ID</th>
                        <th className="px-6 py-4">Detail</th>
                        <th className="px-6 py-4">{activeTab === "members" ? "Kontak" : "Kategori"}</th>
                        <th className="px-6 py-4">{activeTab === "members" ? "Tgl Gabung" : "Harga/Stok"}</th>
                        <th className="px-6 py-4">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {activeTab === "members" && data.members.map((m: any, i: number) => (
                        <tr key={i} className="hover:bg-slate-50 transition-all">
                          <td className="px-6 py-4 text-sm text-slate-500 whitespace-nowrap">{m.ID}</td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <p className="font-bold text-slate-900">{m.Name}</p>
                            <p className="text-xs text-slate-400">{m.Email}</p>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="px-2 py-1 bg-blue-50 text-blue-600 rounded text-[10px] font-bold uppercase">{m.Phone}</span>
                          </td>
                          <td className="px-6 py-4 font-bold text-slate-900 whitespace-nowrap">{m.JoinDate}</td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              <button 
                                onClick={() => { setEditingItem(m); setShowAddModal("members"); }}
                                className="text-slate-400 hover:text-blue-600 transition-all"
                              >
                                <Pencil size={16} />
                              </button>
                              <button 
                                onClick={() => handleDelete("Members", m.ID)}
                                className="text-slate-400 hover:text-red-600 transition-all"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                      {activeTab === "inventory" && data.products.map((p: any, i: number) => (
                        <tr key={i} className="hover:bg-slate-50 transition-all">
                          <td className="px-6 py-4 text-sm text-slate-500 whitespace-nowrap">{p.ID}</td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <p className="font-bold text-slate-900">{p.Name}</p>
                            <p className="text-xs text-slate-400">{p.Category}</p>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="px-2 py-1 bg-orange-50 text-orange-600 rounded text-[10px] font-bold uppercase">{p.Category}</span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <p className="font-bold text-slate-900">Rp {Number(p.Price).toLocaleString()}</p>
                            <p className="text-[10px] text-slate-400 uppercase font-bold">Stok: {p.Stock}</p>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              <button 
                                onClick={() => { setEditingItem(p); setShowAddModal("inventory"); }}
                                className="text-slate-400 hover:text-blue-600 transition-all"
                              >
                                <Pencil size={16} />
                              </button>
                              <button 
                                onClick={() => handleDelete("Products", p.ID)}
                                className="text-slate-400 hover:text-red-600 transition-all"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                      {((activeTab === "members" && data.members.length === 0) || (activeTab === "inventory" && data.products.length === 0)) && (
                        <tr>
                          <td colSpan={5} className="text-center py-8 text-slate-400">Belum ada data. Klik 'Tambah Data' untuk memulai.</td>
                        </tr>
                      )}
                      {activeTab !== "members" && activeTab !== "inventory" && (
                        <tr>
                          <td colSpan={5} className="text-center py-8 text-slate-400 italic">Modul {activeTab} sedang dalam pengembangan.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>

      {/* Add Data Modals */}
      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
            >
              <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                <h3 className="font-bold text-slate-900">{editingItem ? "Edit" : "Tambah"} {showAddModal === "members" ? "Anggota" : "Produk"}</h3>
                <button onClick={() => { setShowAddModal(null); setEditingItem(null); }} className="text-slate-400 hover:text-slate-600">
                  <Plus size={24} className="rotate-45" />
                </button>
              </div>
              <form onSubmit={showAddModal === "members" ? handleAddMember : handleAddProduct} className="p-6 space-y-4">
                {showAddModal === "members" ? (
                  <>
                    <div>
                      <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Nama Lengkap</label>
                      <input name="name" defaultValue={editingItem?.Name} required className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500" placeholder="Contoh: Budi Santoso" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Email</label>
                      <input name="email" defaultValue={editingItem?.Email} type="email" required className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500" placeholder="budi@email.com" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Nomor Telepon</label>
                      <input name="phone" defaultValue={editingItem?.Phone} required className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500" placeholder="0812..." />
                    </div>
                  </>
                ) : (
                  <>
                    <div>
                      <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Nama Produk</label>
                      <input name="name" defaultValue={editingItem?.Name} required className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500" placeholder="Contoh: Beras Premium" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Harga (Rp)</label>
                      <input name="price" defaultValue={editingItem?.Price} type="number" required className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500" placeholder="75000" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Kategori</label>
                      <select name="category" defaultValue={editingItem?.Category || "Sembako"} className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500">
                        <option>Sembako</option>
                        <option>Kebutuhan Rumah</option>
                        <option>Elektronik</option>
                        <option>Lainnya</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Stok Awal</label>
                      <input name="stock" defaultValue={editingItem?.Stock} type="number" required className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500" placeholder="10" />
                    </div>
                  </>
                )}
                <div className="pt-4">
                  <button 
                    type="submit"
                    disabled={loading}
                    className="w-full bg-emerald-600 text-white py-3 rounded-xl font-bold hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-100 disabled:opacity-50"
                  >
                    {loading ? "Menyimpan..." : (editingItem ? "Update Data" : "Simpan Data")}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
