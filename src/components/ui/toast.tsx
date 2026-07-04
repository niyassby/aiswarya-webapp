"use client"
import * as React from "react"
import {
  Toast,
  type ToastManagerUpdateOptions,
} from "@base-ui/react/toast"
import { cva } from "class-variance-authority"
import {
  CheckCircle2,
  CircleAlert,
  Info,
  LoaderCircle,
  TriangleAlert,
} from "lucide-react"

const toastRootVariants = cva(
  `absolute z-[calc(1000-var(--toast-index))] h-(--height) w-full border select-none [--gap:0.75rem] [--height:var(--toast-frontmost-height,var(--toast-height))] [--peek:0.75rem] [--scale:calc(max(0,1-(var(--toast-index)*0.1)))] [--shrink:calc(1-var(--scale))] [transition:transform_0.5s_cubic-bezier(0.22,1,0.36,1),opacity_0.5s,height_0.15s] after:absolute after:left-0 after:h-[calc(var(--gap)+1px)] after:w-full after:content-[''] data-ending-style:opacity-0 data-expanded:h-(--toast-height) data-expanded:transform-[translateX(var(--toast-swipe-movement-x))_translateY(calc(var(--offset-y)))] data-limited:opacity-0 data-ending-style:data-[swipe-direction=down]:transform-[translateY(calc(var(--toast-swipe-movement-y)+150%))] data-expanded:data-ending-style:data-[swipe-direction=down]:transform-[translateY(calc(var(--toast-swipe-movement-y)+150%))] data-ending-style:data-[swipe-direction=left]:transform-[translateX(calc(var(--toast-swipe-movement-x)-150%))_translateY(var(--offset-y))] data-expanded:data-ending-style:data-[swipe-direction=left]:transform-[translateX(calc(var(--toast-swipe-movement-x)-150%))_translateY(var(--offset-y))] data-ending-style:data-[swipe-direction=right]:transform-[translateX(calc(var(--toast-swipe-movement-x)+150%))_translateY(var(--offset-y))] data-expanded:data-ending-style:data-[swipe-direction=right]:transform-[translateX(calc(var(--toast-swipe-movement-x)+150%))_translateY(var(--offset-y))] data-ending-style:data-[swipe-direction=up]:transform-[translateY(calc(var(--toast-swipe-movement-y)-150%))] data-expanded:data-ending-style:data-[swipe-direction=up]:transform-[translateY(calc(var(--toast-swipe-movement-y)-150%))]`,
  {
    variants: {
      position: {
        "top-center":
          "top-0 right-0 left-0 mx-auto origin-top transform-[translateX(var(--toast-swipe-movement-x))_translateY(calc(var(--toast-swipe-movement-y)+(var(--toast-index)*var(--peek))+(var(--shrink)*var(--height))))_scale(var(--scale))] [--offset-y:calc(var(--toast-offset-y)+(var(--toast-index)*var(--gap))+var(--toast-swipe-movement-y))] after:bottom-full data-starting-style:transform-[translateY(-150%)] [&[data-ending-style]:not([data-limited]):not([data-swipe-direction])]:transform-[translateY(-150%)]",
        "top-right":
          "top-0 right-0 left-auto mr-0 origin-top transform-[translateX(var(--toast-swipe-movement-x))_translateY(calc(var(--toast-swipe-movement-y)+(var(--toast-index)*var(--peek))+(var(--shrink)*var(--height))))_scale(var(--scale))] [--offset-y:calc(var(--toast-offset-y)+(var(--toast-index)*var(--gap))+var(--toast-swipe-movement-y))] after:bottom-full data-starting-style:transform-[translateY(-150%)] [&[data-ending-style]:not([data-limited]):not([data-swipe-direction])]:transform-[translateY(-150%)]",
        "top-left":
          "top-0 right-auto left-0 ml-0 origin-top transform-[translateX(var(--toast-swipe-movement-x))_translateY(calc(var(--toast-swipe-movement-y)+(var(--toast-index)*var(--peek))+(var(--shrink)*var(--height))))_scale(var(--scale))] [--offset-y:calc(var(--toast-offset-y)+(var(--toast-index)*var(--gap))+var(--toast-swipe-movement-y))] after:bottom-full data-starting-style:transform-[translateY(-150%)] [&[data-ending-style]:not([data-limited]):not([data-swipe-direction])]:transform-[translateY(-150%)]",
        "bottom-left":
          "right-auto bottom-0 left-0 ml-0 origin-bottom transform-[translateX(var(--toast-swipe-movement-x))_translateY(calc(var(--toast-swipe-movement-y)-(var(--toast-index)*var(--peek))-(var(--shrink)*var(--height))))_scale(var(--scale))] [--offset-y:calc(var(--toast-offset-y)*-1+calc(var(--toast-index)*var(--gap)*-1)+var(--toast-swipe-movement-y))] after:top-full data-starting-style:transform-[translateY(150%)] [&[data-ending-style]:not([data-limited]):not([data-swipe-direction])]:transform-[translateY(150%)]",
        "bottom-center":
          "right-0 bottom-0 left-0 mx-auto origin-bottom transform-[translateX(var(--toast-swipe-movement-x))_translateY(calc(var(--toast-swipe-movement-y)-(var(--toast-index)*var(--peek))-(var(--shrink)*var(--height))))_scale(var(--scale))] [--offset-y:calc(var(--toast-offset-y)*-1+calc(var(--toast-index)*var(--gap)*-1)+var(--toast-swipe-movement-y))] after:top-full data-starting-style:transform-[translateY(150%)] [&[data-ending-style]:not([data-limited]):not([data-swipe-direction])]:transform-[translateY(150%)]",
        "bottom-right":
          "right-0 bottom-0 left-auto mr-0 origin-bottom transform-[translateX(var(--toast-swipe-movement-x))_translateY(calc(var(--toast-swipe-movement-y)-(var(--toast-index)*var(--peek))-(var(--shrink)*var(--height))))_scale(var(--scale))] [--offset-y:calc(var(--toast-offset-y)*-1+calc(var(--toast-index)*var(--gap)*-1)+var(--toast-swipe-movement-y))] after:top-full data-starting-style:transform-[translateY(150%)] [&[data-ending-style]:not([data-limited]):not([data-swipe-direction])]:transform-[translateY(150%)]",
      },
      variant: {
        default:
          "border-neutral-950 bg-white text-neutral-950 shadow-[0.25rem_0.25rem_0] shadow-black/12 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-50 dark:shadow-none",
          success:
          "border-emerald-600 bg-emerald-50 text-emerald-950 shadow-[0.25rem_0.25rem_0] shadow-emerald-600/20 dark:border-emerald-500/30 dark:bg-emerald-950/20 dark:text-emerald-50 dark:shadow-none",
          error:
          "border-red-600 bg-red-50 text-red-950 shadow-[0.25rem_0.25rem_0] shadow-red-600/20 dark:border-red-500/30 dark:bg-red-950/20 dark:text-red-50 dark:shadow-none",
          warning:
          "border-amber-600 bg-amber-50 text-amber-950 shadow-[0.25rem_0.25rem_0] shadow-amber-600/20 dark:border-amber-500/30 dark:bg-amber-950/20 dark:text-amber-50 dark:shadow-none",
          info: "border-sky-600 bg-sky-50 text-sky-950 shadow-[0.25rem_0.25rem_0] shadow-sky-600/20 dark:border-sky-500/30 dark:bg-sky-950/20 dark:text-sky-50 dark:shadow-none",
          loading:
            "border-neutral-950 bg-white text-neutral-950 shadow-[0.25rem_0.25rem_0] shadow-black/12 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-50 dark:shadow-none",
      },
    },
    defaultVariants: {
      position: "top-center",
      variant: "default",
    },
  }
)

const toastViewportVariants = cva(
  "fixed z-1000000 mx-auto w-[calc(100vw-2rem)] max-w-90",
  {
    variants: {
      position: {
        "top-center": "top-4 right-0 bottom-auto left-0",
        "top-left": "top-4 bottom-auto left-4",
        "top-right": "top-4 right-4 bottom-auto",
        "bottom-center": "top-auto right-0 bottom-4 left-0",
        "bottom-left": "top-auto right-auto bottom-4 left-4",
        "bottom-right": "top-auto right-4 bottom-4",
      },
    },
    defaultVariants: {
      position: "top-center",
    },
  }
)

const toastButtonVariants = cva(
  `flex h-8 shrink-0 cursor-pointer items-center justify-center gap-2 rounded-none border px-3 py-0 font-[inherit] text-sm leading-none font-normal whitespace-nowrap transition-colors focus-visible:outline-2 focus-visible:-outline-offset-1 focus-visible:outline-neutral-950 active:not-data-disabled:scale-[0.97] disabled:border-neutral-500 disabled:text-neutral-500 data-disabled:border-neutral-500 data-disabled:text-neutral-500`,
  {
    variants: {
      variant: {
        default: `border-neutral-950 bg-white text-neutral-950 hover:not-data-disabled:bg-neutral-100 dark:border-white dark:bg-neutral-950 dark:text-white dark:hover:not-data-disabled:bg-neutral-800`,
        success: `border-emerald-600 bg-white text-emerald-950 hover:not-data-disabled:bg-emerald-50 dark:border-emerald-500 dark:bg-neutral-950 dark:text-emerald-50 dark:hover:not-data-disabled:bg-emerald-950/40`,
        error: `border-red-600 bg-white text-red-950 hover:not-data-disabled:bg-red-50 dark:border-red-500 dark:bg-neutral-950 dark:text-red-50 dark:hover:not-data-disabled:bg-red-950/40`,
        warning: `border-amber-600 bg-white text-amber-950 hover:not-data-disabled:bg-amber-50 dark:border-amber-500 dark:bg-neutral-950 dark:text-amber-50 dark:hover:not-data-disabled:bg-amber-950/40`,
        info: `border-sky-600 bg-white text-sky-950 hover:not-data-disabled:bg-sky-50 dark:border-sky-500 dark:bg-neutral-950 dark:text-sky-50 dark:hover:not-data-disabled:bg-sky-950/40`,
        loading: `border-neutral-950 bg-white text-neutral-950 hover:not-data-disabled:bg-neutral-100 dark:border-white dark:bg-neutral-950 dark:text-white dark:hover:not-data-disabled:bg-neutral-800`,
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export const TOAST_VARIANTS = {
  DEFAULT: "default",
  SUCCESS: "success",
  ERROR: "error",
  WARNING: "warning",
  INFO: "info",
  LOADING: "loading",
} as const

export type ToastVariant = (typeof TOAST_VARIANTS)[keyof typeof TOAST_VARIANTS]

export type ToastPosition =
  | "top-center"
  | "top-right"
  | "top-left"
  | "bottom-center"
  | "bottom-left"
  | "bottom-right"

export type ToastAction = {
  label: string
  onClick?: () => void
}

export type ToastOptions = {
  id?: string
  description?: React.ReactNode
  duration?: number
  action?: ToastAction
  variant?: ToastVariant
  icon?: React.ReactNode
  className?: string
}

export interface CustomToastData {
  variant?: ToastVariant
  action?: ToastAction
  icon?: React.ReactNode
  className?: string
}

/* -------------------------------------------------------------------------- */
/*                              TOAST MANAGER                                 */
/* -------------------------------------------------------------------------- */

export const toastManager = Toast.createToastManager<CustomToastData>()

/* -------------------------------------------------------------------------- */
/*                             PROMISE UTILITIES                              */
/* -------------------------------------------------------------------------- */

function mapPromiseState<T>(
  stateOption: | string | (Omit<ToastOptions, "title"> & { title?: React.ReactNode })
    | ((  val: T ) => | string | (Omit<ToastOptions, "title"> & { title?: React.ReactNode })),
  defaultVariant: ToastVariant,
  val?: T
): ToastManagerUpdateOptions<CustomToastData> {
  const resolved =
    typeof stateOption === "function" ? stateOption(val as T) : stateOption

  if (typeof resolved === "string") {
    return {
      title: resolved,
      type: defaultVariant,
      data: {
        variant: defaultVariant,
      },
    }
  }

  return {
    title: resolved.title,
    description: resolved.description,
    timeout: resolved.duration,
    type: resolved.variant ?? defaultVariant,
    data: {
      variant: resolved.variant ?? defaultVariant,
      action: resolved.action,
      icon: resolved.icon,
      className: resolved.className,
    },
  }
}

/* -------------------------------------------------------------------------- */
/*                                  TOAST API                                 */
/* -------------------------------------------------------------------------- */

export const toast = Object.assign(
  (title: React.ReactNode, options?: Omit<ToastOptions, "title">) => {
    return toastManager.add({
      id: options?.id,
      title,
      description: options?.description,
      timeout: options?.duration ?? 4000,
      type: options?.variant ?? "default",
      data: {
        variant: options?.variant ?? "default",
        action: options?.action,
        icon: options?.icon,
        className: options?.className,
      },
    })
  },
  {
    success: (
      title: React.ReactNode,
      options?: Omit<ToastOptions, "title" | "variant">
    ) => toast(title, { variant: "success", ...options }),

    error: (
      title: React.ReactNode,
      options?: Omit<ToastOptions, "title" | "variant">
    ) => toast(title, { variant: "error", ...options }),

    warning: (
      title: React.ReactNode,
      options?: Omit<ToastOptions, "title" | "variant">
    ) => toast(title, { variant: "warning", ...options }),

    info: (
      title: React.ReactNode,
      options?: Omit<ToastOptions, "title" | "variant">
    ) => toast(title, { variant: "info", ...options }),

    loading: (
      title: React.ReactNode,
      options?: Omit<ToastOptions, "title" | "variant">
    ) => toast(title, { variant: "loading", duration: options?.duration ?? Infinity, ...options }),

    dismiss: (id: string) => toastManager.close(id),

    update: (id: string, title: React.ReactNode, options?: Omit<ToastOptions, "title">) =>
      toastManager.update(id, {
        title,
        description: options?.description,
        timeout: options?.duration,
        type: options?.variant ?? "default",
        data: {
          variant: options?.variant ?? "default",
          action: options?.action,
          icon: options?.icon,
          className: options?.className,
        },
      }),

    promise: <Value,>(
      promiseValue: Promise<Value>,
      options: {
        loading:
          | string
          | (Omit<ToastOptions, "title"> & { title?: React.ReactNode })
        success:
          | string
          | (Omit<ToastOptions, "title"> & { title?: React.ReactNode })
          | ((
              result: Value
            ) =>
              | string
              | (Omit<ToastOptions, "title"> & { title?: React.ReactNode }))
        error:
          | string
          | (Omit<ToastOptions, "title"> & { title?: React.ReactNode })
          | ((
              error: any
            ) =>
              | string
              | (Omit<ToastOptions, "title"> & { title?: React.ReactNode }))
      }
    ): Promise<Value> => {
      return toastManager.promise(promiseValue, {
        loading: mapPromiseState(options.loading, "loading"),
        success: (res) => mapPromiseState(options.success, "success", res),
        error: (err) => mapPromiseState(options.error, "error", err),
      })
    },
  }
)

/* -------------------------------------------------------------------------- */
/*                              TOAST PROVIDER                                */
/* -------------------------------------------------------------------------- */

export default function ToastProvider({
  position = "top-center",
}: {
  position?: ToastPosition
}) {
  return (
    <Toast.Provider toastManager={toastManager}>
      <Toast.Portal>
        <Toast.Viewport 
          className={toastViewportVariants({
            position,
          })}
        >
          <ToastList position={position} />
        </Toast.Viewport>
      </Toast.Portal>
    </Toast.Provider>
  )
}

/* -------------------------------------------------------------------------- */
/*                               TOAST ICONS                                  */
/* -------------------------------------------------------------------------- */

// ✅ After — memoized component, only re-renders if toast data changes

type ToastIconProps = {
  icon?: React.ReactNode
  variant: ToastVariant
}

const ToastIcon = React.memo(function ToastIcon({ icon, variant }: ToastIconProps) {
  if (icon) {
    return (
      <div className="flex shrink-0 items-center justify-center">
        {icon}
      </div>
    )
  }

  switch (variant) {
    case TOAST_VARIANTS.SUCCESS:
      return <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-500" />

    case TOAST_VARIANTS.ERROR:
      return <CircleAlert className="h-5 w-5 shrink-0 text-red-500" />

    case TOAST_VARIANTS.WARNING:
      return <TriangleAlert className="h-5 w-5 shrink-0 text-amber-500" />

    case TOAST_VARIANTS.INFO:
      return <Info className="h-5 w-5 shrink-0 text-sky-500" />

    case TOAST_VARIANTS.LOADING:
      return <LoaderCircle className="h-5 w-5 shrink-0 animate-spin text-neutral-500" />

    default:
      return null
  }
})

/* -------------------------------------------------------------------------- */
/*                                TOAST LIST                                  */
/* -------------------------------------------------------------------------- */

function ToastList({ position }: { position?: ToastPosition }) {
  const { toasts, close } = Toast.useToastManager<CustomToastData>()

  return toasts.map((toast) => {
    const activeVariant = (toast.data?.variant || toast.type || "default") as ToastVariant

    let pulseClassName: string | null = null;

    // New toasts start with `updateKey: 0`, so the first add skips the replay pulse.
    if (toast.updateKey) {
      pulseClassName = toast.updateKey % 2 === 0 ? "pulse-animation1" : "pulse-animation2";
    }

    const className = toast?.data?.className + " " + pulseClassName

    return (
      <Toast.Root
        key={toast.id}
        toast={toast}
        swipeDirection="right"
        className={toastRootVariants({
          position: position,
          variant: activeVariant,
          className
        })}
      >
        <Toast.Content className="flex h-full items-center gap-4 overflow-hidden p-3 transition-opacity duration-250 ease-[cubic-bezier(0.22,1,0.36,1)] data-behind:opacity-0 data-expanded:opacity-100">
           <ToastIcon
            icon={toast.data?.icon}
            variant={activeVariant}
          />

          <div className="flex min-w-0 flex-1 flex-col gap-0.5">
            <Toast.Title className="text-sm font-bold" />
            <Toast.Description className="text-xs opacity-90" />
          </div>

          {toast.data?.action && (
            <Toast.Action
              onClick={() => {
                close(toast.id)
                toast.data?.action?.onClick?.()
              }}
              className={toastButtonVariants({
                variant: activeVariant,
              })}
            >
              {toast.data.action.label}
            </Toast.Action>
          )}

          <Toast.Close
            className={toastButtonVariants({
              variant: activeVariant,
            })}
          >
            Dismiss
          </Toast.Close>
        </Toast.Content>
      </Toast.Root>
    )
  })
}
