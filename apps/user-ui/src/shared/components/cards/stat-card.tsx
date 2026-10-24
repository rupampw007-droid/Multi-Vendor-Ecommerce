import type { ReactNode } from 'react'

const StatCard = ({
  title,
  value,
  description,
  icon,
}: {
  title: string
  value: string
  description: string
  icon: ReactNode
}) => (
  <article className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
    <div className="flex items-start justify-between gap-3">
      <div>
        <p className="text-sm font-medium text-gray-600">{title}</p>
        <p className="mt-3 text-3xl font-bold tracking-tight text-gray-900">
          {value}
        </p>
      </div>
      <span className="rounded-xl bg-blue-50 p-3 text-blue-700">{icon}</span>
    </div>
    <p className="mt-3 text-xs leading-5 text-gray-500">{description}</p>
  </article>
)

export default StatCard
