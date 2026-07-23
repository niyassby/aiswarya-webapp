import React from "react"
import { Badge } from "@/components/ui/badge"

type BadgeType = "order" | "purchase" | "complaint" | "priority"

interface StatusBadgeProps {
  status: string
  type: BadgeType
  className?: string
}

const statusConfig: Record<
  BadgeType,
  Record<string, { label: string; className: string }>
> = {
  order: {
    enquiry: {
      label: "Enquiry",
      className: "bg-blue-500/10 text-blue-500 border-blue-500/20",
    },
    quotation: {
      label: "Quotation",
      className: "bg-purple-500/10 text-purple-500 border-purple-500/20",
    },
    invoice: {
      label: "Invoice",
      className: "bg-indigo-500/10 text-indigo-500 border-indigo-500/20",
    },
    purchase: {
      label: "Purchase",
      className: "bg-amber-500/10 text-amber-500 border-amber-500/20",
    },
    completed: {
      label: "Completed",
      className: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
    },
    cancelled: {
      label: "Cancelled",
      className: "bg-rose-500/10 text-rose-500 border-rose-500/20",
    },
  },
  purchase: {
    requested: {
      label: "Requested",
      className: "bg-blue-500/10 text-blue-500 border-blue-500/20",
    },
    ordered: {
      label: "Ordered",
      className: "bg-amber-500/10 text-amber-500 border-amber-500/20",
    },
    received: {
      label: "Received",
      className: "bg-violet-500/10 text-violet-500 border-violet-500/20",
    },
    fulfilled: {
      label: "Fulfilled",
      className: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
    },
    cancelled: {
      label: "Cancelled",
      className: "bg-rose-500/10 text-rose-500 border-rose-500/20",
    },
  },
  complaint: {
    open: {
      label: "Open",
      className: "bg-blue-500/10 text-blue-500 border-blue-500/20",
    },
    assigned: {
      label: "Assigned",
      className: "bg-purple-500/10 text-purple-500 border-purple-500/20",
    },
    in_progress: {
      label: "In Progress",
      className: "bg-amber-500/10 text-amber-500 border-amber-500/20",
    },
    resolved: {
      label: "Resolved",
      className: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
    },
    closed: {
      label: "Closed",
      className: "bg-gray-500/10 text-gray-500 border-gray-500/20",
    },
  },
  priority: {
    low: {
      label: "Low",
      className: "bg-slate-500/10 text-slate-500 border-slate-500/20",
    },
    medium: {
      label: "Medium",
      className: "bg-blue-500/10 text-blue-500 border-blue-500/20",
    },
    high: {
      label: "High",
      className: "bg-orange-500/10 text-orange-500 border-orange-500/20",
    },
    urgent: {
      label: "Urgent",
      className:
        "bg-rose-500/10 text-rose-500 border-rose-500/20 animate-pulse",
    },
  },
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  type,
  className,
}) => {
  const normalized = status?.toLowerCase() || ""
  const config = statusConfig[type]?.[normalized] || {
    label: status,
    className: "bg-slate-500/10 text-slate-500 border-slate-500/20",
  }

  return (
    <Badge
      variant="outline"
      className={`${config.className} rounded-full px-2 py-0.5 font-medium ${className}`}
    >
      {config.label}
    </Badge>
  )
}

export default StatusBadge
