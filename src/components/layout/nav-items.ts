import {
  LayoutDashboard,
  ArrowLeftRight,
  Landmark,
  TrendingUp,
  CreditCard,
  Repeat,
  PiggyBank,
  Target,
  Settings,
  type LucideIcon,
} from 'lucide-react'

export interface NavItem {
  key: string
  label: string
  icon: LucideIcon
}

export const PRIMARY_NAV = [
  { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { key: 'transactions', label: 'Transações', icon: ArrowLeftRight },
] as const satisfies readonly NavItem[]

export const SECONDARY_NAV = [
  { key: 'accounts', label: 'Contas', icon: Landmark },
  { key: 'income', label: 'Rendas', icon: TrendingUp },
  { key: 'debts', label: 'Dívidas', icon: CreditCard },
  { key: 'fixedExpenses', label: 'Contas fixas', icon: Repeat },
  { key: 'investments', label: 'Investimentos', icon: PiggyBank },
  { key: 'goals', label: 'Metas', icon: Target },
  { key: 'settings', label: 'Configurações', icon: Settings },
] as const satisfies readonly NavItem[]

export const ALL_NAV = [...PRIMARY_NAV, ...SECONDARY_NAV]

export type TabKey = (typeof ALL_NAV)[number]['key']
