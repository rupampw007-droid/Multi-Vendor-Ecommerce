import type { ReactNode } from 'react'

const QuickActionCard = ({
  label,
  icon,
  active = false,
  onClick,
}: {
  label: string
  icon: ReactNode
  active?: boolean
  onClick: () => void
}) => (
  <button
    type="button"
    onClick={onClick}
    aria-current={active ? 'page' : undefined}
    className={`flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left text-sm font-medium transition ${
      active
        ? 'border-blue-200 bg-blue-50 text-blue-800'
        : 'border-gray-200 bg-white text-gray-700 hover:border-blue-200 hover:bg-blue-50/60'
    }`}
  >
    <span
      className={`flex h-9 w-9 items-center justify-center rounded-lg ${
        active ? 'bg-white text-blue-700' : 'bg-gray-50 text-gray-500'
      }`}
    >
      {icon}
    </span>
    <span>{label}</span>
  </button>
)

export default QuickActionCard
