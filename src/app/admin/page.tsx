'use client';

import React, { useState, useEffect } from 'react';
import { AdminSidebar } from '@/components/admin/AdminSidebar';
import { formatCurrency } from '@/lib/utils';
import {
  DollarSign,
  TrendingUp,
  ShoppingBag,
  Clock,
  CheckCircle2,
  FileText,
  CreditCard,
  PieChart as PieChartIcon,
  TrendingDown,
  Award,
  Users,
  PlusCircle,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

export default function AdminDashboardPage() {
  const [metrics, setMetrics] = useState<any>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [quotes, setQuotes] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadDashboardData() {
      try {
        const [finRes, ordRes, qutoRes, custRes] = await Promise.all([
          fetch('/api/finance?range=month'),
          fetch('/api/orders'),
          fetch('/api/quotes'),
          fetch('/api/customers'),
        ]);

        const [finData, ordData, qutoData, custData] = await Promise.all([
          finRes.json(),
          ordRes.json(),
          qutoRes.json(),
          custRes.json(),
        ]);

        if (finData && finData.metrics) setMetrics(finData.metrics);
        if (Array.isArray(ordData)) setOrders(ordData);
        if (Array.isArray(qutoData)) setQuotes(qutoData);
        if (Array.isArray(custData)) setCustomers(custData);
      } catch (err) {
        console.error('Error loading dashboard metrics:', err);
      } finally {
        setLoading(false);
      }
    }
    loadDashboardData();
  }, []);

  const currentMonth = new Date().getMonth();
  const birthdayCustomers = customers.filter((c) => {
    if (!c.birthDate) return false;
    const d = new Date(c.birthDate);
    return !isNaN(d.getTime()) && d.getMonth() === currentMonth;
  });

  // Compute calculated metrics
  const pendingOrdersCount = orders.filter((o) => ['NOVO', 'AGUARDANDO_CONFIRMACAO', 'PAGAMENTO_PENDENTE'].includes(o.status)).length;
  const confirmedOrdersCount = orders.filter((o) => ['CONFIRMADO', 'EM_PRODUCAO', 'PRONTO'].includes(o.status)).length;
  const pendingQuotesCount = quotes.filter((q) => q.status === 'PENDING').length;
  const approvedQuotesCount = quotes.filter((q) => q.status === 'APPROVED' || q.status === 'CONVERTED').length;

  // Chart sample data
  const revenueVsExpenseData = [
    { name: 'Jan', receita: 1200, despesa: 450 },
    { name: 'Fev', receita: 1850, despesa: 600 },
    { name: 'Mar', receita: 2400, despesa: 800 },
    { name: 'Abr', receita: 3100, despesa: 950 },
    { name: 'Mai', receita: (metrics?.totalRevenue || 0) + 1500, despesa: (metrics?.totalExpenses || 0) + 400 },
  ];

  const paymentMethodsData = [
    { name: 'Pix', value: 70 },
    { name: 'Cartão', value: 20 },
    { name: 'Dinheiro', value: 10 },
  ];

  const COLORS = ['#C27360', '#D59483', '#E6B9AE'];

  return (
    <div className="flex min-h-screen bg-[#FAF6F4]">
      <AdminSidebar />

      <main className="flex-1 p-6 md:p-10 space-y-8 overflow-y-auto">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="font-serif text-2xl md:text-3xl font-bold text-[#4A231A]">
              Painel Geral de Vendas
            </h1>
            <p className="text-xs md:text-sm text-[#645451]">
              Acompanhe o faturamento, pedidos pendentes e lucro da Confeitaria Cinthia Rodrigues
            </p>
          </div>

          <div className="flex items-center gap-3">
            <a
              href="/admin/pedidos"
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#C27360] to-[#A75644] text-white font-semibold text-xs shadow-blush hover:shadow-lg transition-all flex items-center gap-1.5"
            >
              <PlusCircle className="w-4 h-4" /> Novo Pedido
            </a>
          </div>
        </div>

        {/* 10 Key Indicator Metric Cards */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 animate-pulse">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
              <div key={i} className="h-28 rounded-2xl bg-gray-200" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            
            {/* Card 1: Faturamento do Mês */}
            <div className="bg-white p-5 rounded-2xl border border-[#F2D7D0] shadow-sm flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#645451]">
                  Faturamento Mês
                </span>
                <h3 className="text-xl font-bold text-[#4A231A] font-serif mt-1">
                  {formatCurrency(metrics?.totalRevenue || 0)}
                </h3>
                <span className="text-[10px] text-emerald-600 font-semibold flex items-center gap-0.5 mt-1">
                  <TrendingUp className="w-3 h-3" /> Receitas consolidadas
                </span>
              </div>
              <div className="w-12 h-12 rounded-xl bg-[#F9ECE9] text-[#C27360] flex items-center justify-center font-bold">
                <DollarSign className="w-6 h-6" />
              </div>
            </div>

            {/* Card 2: Lucro Estimado */}
            <div className="bg-white p-5 rounded-2xl border border-[#F2D7D0] shadow-sm flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#645451]">
                  Lucro Estimado Mês
                </span>
                <h3 className="text-xl font-bold text-emerald-700 font-serif mt-1">
                  {formatCurrency(metrics?.netProfit || 0)}
                </h3>
                <span className="text-[10px] text-[#645451] font-semibold mt-1 block">
                  Receita despesada
                </span>
              </div>
              <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                <TrendingUp className="w-6 h-6" />
              </div>
            </div>

            {/* Card 3: Pedidos Confirmados */}
            <div className="bg-white p-5 rounded-2xl border border-[#F2D7D0] shadow-sm flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#645451]">
                  Pedidos Confirmados
                </span>
                <h3 className="text-xl font-bold text-[#4A231A] font-serif mt-1">
                  {confirmedOrdersCount}
                </h3>
                <span className="text-[10px] text-[#C27360] font-semibold mt-1 block">
                  Em produção / prontos
                </span>
              </div>
              <div className="w-12 h-12 rounded-xl bg-[#FDF7F6] text-[#C27360] flex items-center justify-center font-bold">
                <CheckCircle2 className="w-6 h-6" />
              </div>
            </div>

            {/* Card 4: Pedidos Pendentes */}
            <div className="bg-white p-5 rounded-2xl border border-[#F2D7D0] shadow-sm flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#645451]">
                  Pedidos Pendentes
                </span>
                <h3 className="text-xl font-bold text-amber-700 font-serif mt-1">
                  {pendingOrdersCount}
                </h3>
                <span className="text-[10px] text-amber-600 font-semibold mt-1 block">
                  Aguardando confirmação
                </span>
              </div>
              <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
                <Clock className="w-6 h-6" />
              </div>
            </div>

            {/* Card 5: Orçamentos Pendentes */}
            <div className="bg-white p-5 rounded-2xl border border-[#F2D7D0] shadow-sm flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#645451]">
                  Orçamentos p/ Responder
                </span>
                <h3 className="text-xl font-bold text-[#4A231A] font-serif mt-1">
                  {pendingQuotesCount}
                </h3>
                <span className="text-[10px] text-[#645451] font-semibold mt-1 block">
                  Solicitações recebidas
                </span>
              </div>
              <div className="w-12 h-12 rounded-xl bg-[#F9ECE9] text-[#A75644] flex items-center justify-center font-bold">
                <FileText className="w-6 h-6" />
              </div>
            </div>

            {/* Card 6: Contas a Receber */}
            <div className="bg-white p-5 rounded-2xl border border-[#F2D7D0] shadow-sm flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#645451]">
                  Contas a Receber
                </span>
                <h3 className="text-xl font-bold text-[#4A231A] font-serif mt-1">
                  {formatCurrency(metrics?.accountsReceivable || 0)}
                </h3>
                <span className="text-[10px] text-rose-600 font-semibold mt-1 block">
                  Sinais a quitar na entrega
                </span>
              </div>
              <div className="w-12 h-12 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center font-bold">
                <CreditCard className="w-6 h-6" />
              </div>
            </div>

            {/* Card 7: Despesas do Mês */}
            <div className="bg-white p-5 rounded-2xl border border-[#F2D7D0] shadow-sm flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#645451]">
                  Despesas Mês
                </span>
                <h3 className="text-xl font-bold text-red-600 font-serif mt-1">
                  {formatCurrency(metrics?.totalExpenses || 0)}
                </h3>
                <span className="text-[10px] text-[#645451] font-semibold mt-1 block">
                  Ingredientes & Embalagens
                </span>
              </div>
              <div className="w-12 h-12 rounded-xl bg-red-50 text-red-500 flex items-center justify-center font-bold">
                <TrendingDown className="w-6 h-6" />
              </div>
            </div>

            {/* Card 8: Ticket Médio */}
            <div className="bg-white p-5 rounded-2xl border border-[#F2D7D0] shadow-sm flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#645451]">
                  Ticket Médio Pedido
                </span>
                <h3 className="text-xl font-bold text-[#4A231A] font-serif mt-1">
                  {formatCurrency(metrics?.averageTicket || 0)}
                </h3>
                <span className="text-[10px] text-[#645451] font-semibold mt-1 block">
                  Média por venda
                </span>
              </div>
              <div className="w-12 h-12 rounded-xl bg-[#FAF6F4] text-[#C27360] flex items-center justify-center font-bold">
                <Award className="w-6 h-6" />
              </div>
            </div>

          </div>
        )}

        {/* Birthday Reminders Banner Widget */}
        {birthdayCustomers.length > 0 && (
          <div className="bg-gradient-to-r from-rose-500 via-rose-600 to-pink-600 text-white p-6 rounded-3xl shadow-lg border border-rose-300 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-white/20 text-white flex items-center justify-center font-bold">
                  🎂
                </div>
                <div>
                  <h3 className="font-serif font-bold text-lg text-white">
                    Aniversariantes do Mês ({birthdayCustomers.length} Clientes Especialmente Queridas)
                  </h3>
                  <p className="text-xs text-rose-100">
                    Envie um abraço carinhoso e um cupom de 10% de desconto pelo WhatsApp com 1 clique!
                  </p>
                </div>
              </div>
              <a
                href="/admin/clientes"
                className="px-4 py-2 rounded-xl bg-white text-rose-700 font-bold text-xs hover:bg-rose-50 shadow-sm transition-colors hidden sm:block"
              >
                Ver CRM Completo
              </a>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-2">
              {birthdayCustomers.slice(0, 3).map((c) => (
                <div key={c.id} className="bg-white/10 backdrop-blur-md p-3.5 rounded-2xl border border-white/20 flex items-center justify-between">
                  <div>
                    <span className="font-bold text-sm text-white block truncate">{c.name}</span>
                    <span className="text-xs text-rose-100">
                      Aniversário: {new Date(c.birthDate).toLocaleDateString('pt-BR').slice(0, 5)}
                    </span>
                  </div>
                  <button
                    onClick={() => {
                      const text = `🎉 *FELIZ ANIVERSÁRIO, ${c.name.split(' ')[0].toUpperCase()}!* 🎂🎈\n\nA Confeitaria Cinthia Rodrigues deseja a você um dia muito doce e especial! 💕\n\nGanhe *10% DE DESCONTO* na sua encomenda com o cupom: *NIVER10*! ✨`;
                      window.open(`https://wa.me/${c.whatsapp}?text=${encodeURIComponent(text)}`, '_blank');
                    }}
                    className="px-3 py-1.5 rounded-xl bg-white text-rose-700 font-bold text-xs hover:bg-rose-50 shadow-sm transition-all"
                  >
                    Parabéns 🎁
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Main Bar Chart: Receitas x Despesas */}
          <div className="lg:col-span-8 bg-white p-6 rounded-3xl border border-[#F2D7D0] shadow-card space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-serif text-lg font-bold text-[#4A231A]">
                  Evolução do Faturamento Mensal
                </h3>
                <p className="text-xs text-[#645451]">Comparativo de Receitas vs Despesas Operacionais</p>
              </div>
            </div>

            <div className="h-72 w-full pt-4">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={revenueVsExpenseData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F2D7D0" />
                  <XAxis dataKey="name" stroke="#645451" fontSize={12} />
                  <YAxis stroke="#645451" fontSize={12} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#FAF6F4', borderRadius: '12px', border: '1px solid #F2D7D0' }}
                  />
                  <Bar dataKey="receita" fill="#C27360" name="Receita (R$)" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="despesa" fill="#D59483" name="Despesa (R$)" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Side Pie Chart: Formas de Pagamento */}
          <div className="lg:col-span-4 bg-white p-6 rounded-3xl border border-[#F2D7D0] shadow-card space-y-4">
            <div>
              <h3 className="font-serif text-lg font-bold text-[#4A231A]">
                Formas de Pagamento
              </h3>
              <p className="text-xs text-[#645451]">Distribuição das vendas por método</p>
            </div>

            <div className="h-60 w-full flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={paymentMethodsData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {paymentMethodsData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="space-y-2 pt-2 border-t border-[#F2D7D0]">
              {paymentMethodsData.map((p, i) => (
                <div key={p.name} className="flex justify-between items-center text-xs">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[i] }} />
                    <span className="text-[#4A231A] font-medium">{p.name}</span>
                  </div>
                  <span className="font-bold text-[#C27360]">{p.value}%</span>
                </div>
              ))}
            </div>
          </div>

        </div>

      </main>
    </div>
  );
}
