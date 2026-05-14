'use client';
import { useRouter } from 'next/navigation';
import { X, Coins, CreditCard } from 'lucide-react';

interface InsufficientCreditsModalProps {
  isOpen: boolean;
  onClose: () => void;
  featureName: string;
  needed: number;
  balance: number;
}

export default function InsufficientCreditsModal({
  isOpen,
  onClose,
  featureName,
  needed,
  balance,
}: InsufficientCreditsModalProps) {
  const router = useRouter();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-2xl bg-white dark:bg-[#111c28] shadow-2xl border border-gray-200 dark:border-[#D4A843]/20">
        <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-[#D4A843]/10">
          <h3 className="text-sm font-bold text-gray-900 dark:text-[#e8e4dc]">积分不足</h3>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-white/10">
            <X className="size-4 text-gray-500 dark:text-[#6a7a7e]" />
          </button>
        </div>
        <div className="p-4 space-y-4">
          <div className="text-center space-y-2">
            <div className="inline-flex items-center justify-center size-12 rounded-full bg-amber-100 dark:bg-[#D4A843]/15">
              <Coins className="size-6 text-amber-600 dark:text-[#D4A843]" />
            </div>
            <p className="text-sm text-gray-700 dark:text-[#e8e4dc]">
              <strong>{featureName}</strong>需要 <strong>{needed}</strong> 积分
            </p>
            <p className="text-xs text-gray-500 dark:text-[#6a7a7e]">
              当前余额：<strong>{balance}</strong> 积分
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => { onClose(); router.push('/koala/pricing#credit-packs'); }}
              className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-semibold bg-[#1A1A2E] dark:bg-[#D4A843] text-white dark:text-[#080c10]"
            >
              <Coins className="size-3.5" />
              充值积分
            </button>
            <button
              onClick={() => { onClose(); router.push('/koala/pricing#subscriptions'); }}
              className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-semibold bg-amber-50 dark:bg-[#D4A843]/6 text-amber-700 dark:text-[#D4A843] border border-gray-300 dark:border-[#D4A843]/20"
            >
              <CreditCard className="size-3.5" />
              查看订阅
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
