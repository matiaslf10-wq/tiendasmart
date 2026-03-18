'use client';

type StoreToastProps = {
  message: string;
  tone?: 'success' | 'error' | 'info';
};

export default function StoreToast({
  message,
  tone = 'info',
}: StoreToastProps) {
  const toneClass =
    tone === 'success'
      ? 'border-green-200 bg-green-50 text-green-700'
      : tone === 'error'
        ? 'border-red-200 bg-red-50 text-red-700'
        : 'border-gray-200 bg-white text-gray-700';

  return (
    <div
      className={`fixed bottom-24 left-1/2 z-[60] -translate-x-1/2 rounded-2xl border px-4 py-3 text-sm font-medium shadow-lg ${toneClass}`}
    >
      {message}
    </div>
  );
}