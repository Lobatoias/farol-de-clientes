import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import type { Status } from "./types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatBRL(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatPercent(value: number, digits = 0): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "percent",
    maximumFractionDigits: digits,
  }).format(value);
}

export function daysAgo(iso: string): number {
  const now = new Date();
  const then = new Date(iso);
  return Math.floor((now.getTime() - then.getTime()) / (1000 * 60 * 60 * 24));
}

export function formatRelative(iso: string): string {
  const days = daysAgo(iso);
  if (days === 0) return "hoje";
  if (days === 1) return "ontem";
  if (days < 7) return `${days} dias atrás`;
  if (days < 30) return `${Math.floor(days / 7)} sem atrás`;
  if (days < 365) return `${Math.floor(days / 30)} meses atrás`;
  return `${Math.floor(days / 365)} anos atrás`;
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

/** Dias restantes até uma data (negativo = no passado). */
export function daysUntil(iso: string): number {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const then = new Date(iso);
  then.setHours(0, 0, 0, 0);
  return Math.floor((then.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

export const statusConfig: Record<
  Status,
  { label: string; dot: string; bg: string; ring: string; text: string }
> = {
  verde: {
    label: "OK",
    dot: "bg-emerald-500",
    bg: "bg-emerald-50 dark:bg-emerald-950/40",
    ring: "ring-emerald-200 dark:ring-emerald-900",
    text: "text-emerald-700 dark:text-emerald-300",
  },
  amarelo: {
    label: "Atenção",
    dot: "bg-amber-500",
    bg: "bg-amber-50 dark:bg-amber-950/40",
    ring: "ring-amber-200 dark:ring-amber-900",
    text: "text-amber-700 dark:text-amber-300",
  },
  vermelho: {
    label: "Crítico",
    dot: "bg-rose-500",
    bg: "bg-rose-50 dark:bg-rose-950/40",
    ring: "ring-rose-200 dark:ring-rose-900",
    text: "text-rose-700 dark:text-rose-300",
  },
};
