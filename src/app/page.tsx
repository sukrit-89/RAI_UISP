'use client';

import { useState, useMemo } from 'react';
import { useWallet } from '@/lib/wallet-context';
import { useInvoiceStore } from '@/lib/invoice-store';
import { generateRecommendations } from '@/lib/ai-rules';
import type { Invoice, AIRecommendation, MarketplaceListing } from '@/lib/types';

import { Sidebar } from '@/components/Sidebar';
import { TopBar } from '@/components/TopBar';
import { InvoiceCard } from '@/components/InvoiceCard';
import { CreateInvoiceModal } from '@/components/CreateInvoiceModal';
import { SellInvoiceModal } from '@/components/SellInvoiceModal';
import { AIAgentPanel } from '@/components/AIAgentPanel';
import { MarketplaceTab } from '@/components/MarketplaceTab';
import { BuyInvoiceModal } from '@/components/BuyInvoiceModal';
import { AnalyticsPanel } from '@/components/AnalyticsPanel';

import { Plus, FileText, ShoppingCart, Filter, RefreshCw, CheckCircle2, BarChart3 } from 'lucide-react';
import toast from 'react-hot-toast';
import { handleError } from '@/lib/error-handler';

type TabType = 'invoices' | 'marketplace' | 'analytics';
type StatusFilter = 'all' | 'pending' | 'verified' | 'listed' | 'sold';

export default function Dashboard() {
  const { isConnected, address, balance, updateBalance, signTx } = useWallet();
  const { invoices, listings, createInvoice, listInvoice, buyInvoice, settleInvoice, verifyInvoice, refreshData, isLoading } = useInvoiceStore(address, signTx);

  const [activeTab, setActiveTab] = useState<TabType>('invoices');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showSellModal, setShowSellModal] = useState(false);
  const [showBuyModal, setShowBuyModal] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [selectedListing, setSelectedListing] = useState<MarketplaceListing | null>(null);
  const [dismissedRecommendations, setDismissedRecommendations] = useState<Set<string>>(new Set());

  // Generate AI recommendations
  const recommendations = useMemo(() => {
    if (!isConnected) return [];
    const allRecs = generateRecommendations(invoices, balance);
    return allRecs.filter(rec => !dismissedRecommendations.has(rec.id));
  }, [invoices, balance, isConnected, dismissedRecommendations]);

  // Filter invoices
  const filteredInvoices = useMemo(() => {
    if (statusFilter === 'all') return invoices;
    return invoices.filter(inv => inv.status === statusFilter);
  }, [invoices, statusFilter]);

  // Count pending invoices
  const pendingCount = invoices.filter(inv => inv.status === 'pending').length;

  const handleCreateInvoice = async (data: { buyerName: string; amount: number; dueDate: Date }) => {
    try {
      toast.loading('Creating invoice...', { id: 'create' });
      const invoice = await createInvoice(data.buyerName, data.amount, data.dueDate);
      if (invoice) {
        toast.success(`✅ Invoice ${invoice.id} created!`, { id: 'create' });
        await refreshData();
      } else {
        const error = handleError(new Error('Invoice creation returned null'), 'Create Invoice');
        toast.error(error.userMessage, { id: 'create' });
      }
    } catch (error: any) {
      const appError = handleError(error, 'Create Invoice');
      toast.error(appError.userMessage, { id: 'create' });
    }
  };

  const handleSellClick = (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    setShowSellModal(true);
  };

  const handleListInvoice = async (invoiceId: string, price: number) => {
    try {
      toast.loading('Listing invoice...', { id: 'list' });
      const success = await listInvoice(invoiceId, price);
      if (success) {
        toast.success('📦 Invoice listed on marketplace!', { id: 'list' });
        await refreshData();
      } else {
        const error = handleError(new Error('Listing failed'), 'List Invoice');
        toast.error(error.userMessage, { id: 'list' });
      }
    } catch (error: any) {
      const appError = handleError(error, 'List Invoice');
      toast.error(appError.userMessage, { id: 'list' });
    }
  };

  const handleBuyClick = (listing: MarketplaceListing) => {
    setSelectedListing(listing);
    setShowBuyModal(true);
  };

  const handleBuyConfirm = async (listing: MarketplaceListing) => {
    if (!address) {
      const error = handleError(new Error('Wallet not connected'), 'Buy Invoice');
      toast.error(error.userMessage);
      return;
    }

    try {
      toast.loading('Purchasing invoice...', { id: 'buy' });
      const result = await buyInvoice(listing.invoiceId, address);
      if (result) {
        // Update seller balance (the magic moment!)
        const newBalance = balance + listing.price;
        updateBalance(newBalance);

        toast.success('✅ Invoice purchased! You are now the holder.', {
          id: 'buy',
          duration: 5000,
        });
        await refreshData();
      } else {
        const error = handleError(new Error('Purchase failed'), 'Buy Invoice');
        toast.error(error.userMessage, { id: 'buy' });
      }
    } catch (error: any) {
      const appError = handleError(error, 'Buy Invoice');
      toast.error(appError.userMessage, { id: 'buy' });
    }
  };

  const handleApproveRecommendation = (rec: AIRecommendation) => {
    if (rec.type === 'sell' && rec.invoiceId) {
      const invoice = invoices.find(inv => inv.id === rec.invoiceId);
      if (invoice) {
        handleSellClick(invoice);
      }
    }
    setDismissedRecommendations(prev => new Set([...prev, rec.id]));
  };

  const handleDismissRecommendation = (recId: string) => {
    setDismissedRecommendations(prev => new Set([...prev, recId]));
    toast('Suggestion dismissed', { icon: '👋' });
  };

  const handleRefresh = async () => {
    toast.loading('Refreshing data...', { id: 'refresh' });
    await refreshData();
    toast.success('Data refreshed!', { id: 'refresh' });
  };

  const handleSettleInvoice = async (invoice: Invoice) => {
    if (!address) {
      const error = handleError(new Error('Wallet not connected'), 'Settle Invoice');
      toast.error(error.userMessage);
      return;
    }

    if (invoice.buyerAddress !== address) {
      const error = handleError(new Error('Unauthorized'), 'Settle Invoice');
      toast.error(error.userMessage);
      return;
    }

    if (invoice.status !== 'sold') {
      const error = handleError(new Error('Invalid status transition'), 'Settle Invoice');
      toast.error(error.userMessage);
      return;
    }

    const daysUntilDue = Math.ceil((new Date(invoice.dueDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    if (daysUntilDue > 0) {
      const error = handleError(new Error('Invoice not due'), 'Settle Invoice');
      toast.error(`${error.userMessage} ${daysUntilDue} days remaining.`);
      return;
    }

    try {
      toast.loading('Settling invoice...', { id: 'settle' });
      const success = await settleInvoice(invoice.id, address);
      
      if (success) {
        toast.success('✅ Invoice settled! Payment sent to current holder.', { id: 'settle', duration: 5000 });
        await refreshData();
      } else {
        const error = handleError(new Error('Settlement failed'), 'Settle Invoice');
        toast.error(error.userMessage, { id: 'settle' });
      }
    } catch (error: any) {
      const appError = handleError(error, 'Settle Invoice');
      toast.error(appError.userMessage, { id: 'settle' });
    }
  };

  // If not connected, show connect prompt
  if (!isConnected) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-gray-900 to-slate-900 flex items-center justify-center relative overflow-hidden">
        {/* Animated background elements */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-teal-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob"></div>
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-purple-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-2000"></div>
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-pink-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-4000"></div>
        </div>
        
        <div className="text-center max-w-lg mx-auto px-6 relative z-10">
          <div className="w-24 h-24 mx-auto mb-8 rounded-3xl bg-gradient-to-br from-teal-400 via-teal-500 to-teal-600 flex items-center justify-center shadow-2xl hover:scale-110 transition-transform duration-300">
            <span className="text-white font-bold text-4xl">R</span>
          </div>
          <h1 className="text-5xl font-bold text-white mb-3 bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
            ReceivAI
          </h1>
          <p className="text-2xl text-gray-300 mb-2 font-semibold">Autonomous Invoice Finance</p>
          <p className="text-gray-400 mb-10 text-lg">
            Tokenize your invoices, get instant cash. No banks, no paperwork, fully on-chain.
          </p>
          <div className="bg-gray-800/60 backdrop-blur-lg rounded-2xl p-8 border border-gray-700/50 mb-10 shadow-xl">
            <p className="text-gray-300 text-base font-medium">
              Connect your Freighter wallet to access the MSME Dashboard
            </p>
          </div>
          <button
            onClick={() => {
              const walletContext = document.querySelector('[data-wallet-connect]');
              // The TopBar handles connection, this is just UI
            }}
            className="btn-primary text-lg px-10 py-5 text-lg shadow-2xl hover:shadow-teal-500/50"
          >
            Connect Wallet to Start
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />

      <div className="flex-1 ml-[240px]">
        <TopBar pendingCount={pendingCount} />

        <main className="p-8">
          {/* Stats row */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="stat-card hover-lift">
              <div className="text-sm text-gray-500 mb-2 font-semibold uppercase tracking-wide">Total Invoices</div>
              <div className="stat-value">{invoices.length}</div>
            </div>
            <div className="stat-card hover-lift">
              <div className="text-sm text-gray-500 mb-2 font-semibold uppercase tracking-wide">Pending</div>
              <div className="stat-value text-red-600">{pendingCount}</div>
            </div>
            <div className="stat-card hover-lift">
              <div className="text-sm text-gray-500 mb-2 font-semibold uppercase tracking-wide">Listed</div>
              <div className="stat-value text-blue-600">
                {invoices.filter(i => i.status === 'listed').length}
              </div>
            </div>
            <div className="stat-card stat-highlight hover-lift">
              <div className="text-sm text-teal-700 mb-2 font-semibold uppercase tracking-wide">AI Suggestions</div>
              <div className="stat-value">{recommendations.length}</div>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex items-center justify-between mb-6">
            <div className="tabs border-b-0">
              <button
                onClick={() => setActiveTab('invoices')}
                className={`tab flex items-center gap-2 ${activeTab === 'invoices' ? 'active' : ''}`}
              >
                <FileText size={18} />
                Your Invoices
              </button>
              <button
                onClick={() => setActiveTab('marketplace')}
                className={`tab flex items-center gap-2 ${activeTab === 'marketplace' ? 'active' : ''}`}
              >
                <ShoppingCart size={18} />
                Marketplace
                {listings.length > 0 && (
                  <span className="ml-1 px-2 py-0.5 bg-teal-100 text-teal-700 text-xs rounded-full">
                    {listings.length}
                  </span>
                )}
              </button>
              <button
                onClick={() => setActiveTab('analytics')}
                className={`tab flex items-center gap-2 ${activeTab === 'analytics' ? 'active' : ''}`}
              >
                <BarChart3 size={18} />
                Analytics
              </button>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleRefresh}
                className="btn-secondary flex items-center gap-2"
                title="Refresh data from blockchain"
              >
                <RefreshCw size={18} />
                Refresh
              </button>
              {activeTab === 'invoices' && (
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="btn-primary"
                >
                  <Plus size={18} />
                  New Invoice
                </button>
              )}
            </div>
          </div>

          {/* Content */}
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            {/* Main content area */}
            <div className="lg:col-span-3">
              {activeTab === 'invoices' ? (
                <>
                  {/* Filter tabs */}
                  <div className="flex items-center gap-2 mb-6">
                    <Filter size={16} className="text-gray-400" />
                    {(['all', 'pending', 'verified', 'listed', 'sold'] as StatusFilter[]).map((filter) => (
                      <button
                        key={filter}
                        onClick={() => setStatusFilter(filter)}
                        className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${statusFilter === filter
                          ? 'bg-teal-100 text-teal-700'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                          }`}
                      >
                        {filter.charAt(0).toUpperCase() + filter.slice(1)}
                      </button>
                    ))}
                  </div>

                  {/* Invoice grid */}
                  {isLoading ? (
                    <div className="text-center py-16 text-gray-500">Loading invoices...</div>
                  ) : filteredInvoices.length === 0 ? (
                    <div className="text-center py-16">
                      <FileText size={48} className="mx-auto mb-4 text-gray-300" />
                      <h3 className="text-lg font-semibold text-gray-700 mb-2">No invoices found</h3>
                      <p className="text-gray-500 mb-4">Create your first invoice to get started</p>
                      <button
                        onClick={() => setShowCreateModal(true)}
                        className="btn-primary"
                      >
                        <Plus size={18} />
                        Create Invoice
                      </button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                      {filteredInvoices.map((invoice) => (
                        <InvoiceCard
                          key={invoice.id}
                          invoice={invoice}
                          onSell={handleSellClick}
                          onTrackSettlement={handleSettleInvoice}
                        />
                      ))}
                    </div>
                  )}
                </>
              ) : activeTab === 'marketplace' ? (
                <MarketplaceTab
                  listings={listings}
                  onBuy={handleBuyClick}
                  currentWallet={address}
                />
              ) : (
                <AnalyticsPanel invoices={invoices} />
              )}
            </div>

            {/* AI Agent sidebar */}
            <div className="lg:col-span-1">
              <div id="ai-agent">
                <AIAgentPanel
                  recommendations={recommendations}
                  onApprove={handleApproveRecommendation}
                  onDismiss={handleDismissRecommendation}
                />
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* Modals */}
      <CreateInvoiceModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSubmit={handleCreateInvoice}
      />

      <SellInvoiceModal
        isOpen={showSellModal}
        invoice={selectedInvoice}
        onClose={() => {
          setShowSellModal(false);
          setSelectedInvoice(null);
        }}
        onList={handleListInvoice}
      />

      <BuyInvoiceModal
        isOpen={showBuyModal}
        listing={selectedListing}
        onClose={() => {
          setShowBuyModal(false);
          setSelectedListing(null);
        }}
        onConfirm={handleBuyConfirm}
      />
    </div>
  );
}
