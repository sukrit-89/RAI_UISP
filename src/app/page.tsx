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

import { Plus, FileText, ShoppingCart, Filter } from 'lucide-react';
import toast from 'react-hot-toast';

type TabType = 'invoices' | 'marketplace';
type StatusFilter = 'all' | 'pending' | 'verified' | 'listed' | 'sold';

export default function Dashboard() {
  const { isConnected, address, balance, updateBalance, signTx } = useWallet();
  const { invoices, listings, createInvoice, listInvoice, buyInvoice, isLoading } = useInvoiceStore(address, signTx);

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
    const invoice = await createInvoice(data.buyerName, data.amount, data.dueDate);
    if (invoice) {
      toast.success(`Invoice ${invoice.id} created!`);
    }
  };

  const handleSellClick = (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    setShowSellModal(true);
  };

  const handleListInvoice = async (invoiceId: string, price: number) => {
    const success = await listInvoice(invoiceId, price);
    if (success) {
      toast.success('📦 Invoice listed on marketplace!');
    }
  };

  const handleBuyClick = (listing: MarketplaceListing) => {
    setSelectedListing(listing);
    setShowBuyModal(true);
  };

  const handleBuyConfirm = async (listing: MarketplaceListing) => {
    if (!address) return;

    const result = await buyInvoice(listing.invoiceId, address);
    if (result) {
      // Update seller balance (the magic moment!)
      const newBalance = balance + listing.price;
      updateBalance(newBalance);

      toast.success('✅ Invoice sold. Cash received instantly!', {
        duration: 5000,
        icon: '💰',
      });
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

  // If not connected, show connect prompt
  if (!isConnected) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center">
        <div className="text-center max-w-lg mx-auto px-6">
          <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-teal-400 to-teal-600 flex items-center justify-center">
            <span className="text-white font-bold text-3xl">R</span>
          </div>
          <h1 className="text-4xl font-bold text-white mb-4">ReceivAI</h1>
          <p className="text-xl text-gray-400 mb-2">Autonomous Invoice Finance</p>
          <p className="text-gray-500 mb-8">
            Tokenize your invoices, get instant cash. No banks, no paperwork, fully on-chain.
          </p>
          <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700 mb-8">
            <p className="text-gray-400 text-sm">
              Connect your Freighter wallet to access the MSME Dashboard
            </p>
          </div>
          <button
            onClick={() => {
              const walletContext = document.querySelector('[data-wallet-connect]');
              // The TopBar handles connection, this is just UI
            }}
            className="btn-primary text-lg px-8 py-4"
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
          <div className="grid grid-cols-4 gap-4 mb-8">
            <div className="stat-card">
              <div className="text-sm text-gray-500 mb-1">Total Invoices</div>
              <div className="stat-value">{invoices.length}</div>
            </div>
            <div className="stat-card">
              <div className="text-sm text-gray-500 mb-1">Pending</div>
              <div className="stat-value text-red-600">{pendingCount}</div>
            </div>
            <div className="stat-card">
              <div className="text-sm text-gray-500 mb-1">Listed</div>
              <div className="stat-value text-blue-600">
                {invoices.filter(i => i.status === 'listed').length}
              </div>
            </div>
            <div className="stat-card stat-highlight">
              <div className="text-sm text-teal-700 mb-1">AI Suggestions</div>
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
            </div>

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

          {/* Content */}
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
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
                        />
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <MarketplaceTab
                  listings={listings}
                  onBuy={handleBuyClick}
                  currentWallet={address}
                />
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
