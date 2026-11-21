"use client";

import Link from "next/link";
import { AlertCircle, Loader, LogIn, ShieldOff } from "lucide-react";
import { useAuth } from "./AuthProvider";
import type { IncidentsState } from "@/lib/useIncidents";

interface Props {
  state: Exclude<IncidentsState, { phase: "ready" }>;
  onRetry: () => void;
}

/** Loading, configuration, sign-in-required and error states for incident views. */
export default function IncidentsStateMessage({ state, onRetry }: Props) {
  const { signOut } = useAuth();

  if (state.phase === "loading") {
    return (
      <Panel icon={<Loader size={20} className="animate-spin text-slate-400" />} title="Loading incidents…" testId="incidents-loading" />
    );
  }

  if (state.phase === "config-error") {
    return (
      <Panel
        icon={<AlertCircle size={20} className="text-red-500" />}
        title="The dashboard is not configured"
        body={`${state.problems.join(" ")} See frontend/README.md.`}
        testId="incidents-config-error"
      />
    );
  }

  if (state.phase === "signed-out") {
    return (
      <Panel
        icon={<LogIn size={20} className="text-cyan-500" />}
        title="Sign in required"
        body="Sign in with an operator account to see incidents."
        action={<LinkButton href="/login">Sign in</LinkButton>}
        testId="incidents-signin-required"
      />
    );
  }

  const { error } = state;
  if (error.kind === "unauthenticated") {
    return (
      <Panel
        icon={<LogIn size={20} className="text-amber-500" />}
        title="Sign in again"
        body={`The API did not accept your sign-in: ${error.message}`}
        action={<Button onClick={() => void signOut()}>Sign out and sign in again</Button>}
        testId="incidents-unauthenticated"
      />
    );
  }
  if (error.kind === "forbidden") {
    return (
      <Panel
        icon={<ShieldOff size={20} className="text-amber-500" />}
        title="No access to incidents"
        body={`${error.message} Ask an admin to give your account the operator, supervisor or admin role.`}
        testId="incidents-forbidden"
      />
    );
  }
  return (
    <Panel
      icon={<AlertCircle size={20} className="text-red-500" />}
      title="Could not load incidents"
      body={error.status ? `${error.message} (HTTP ${error.status})` : error.message}
      action={<Button onClick={onRetry}>Retry</Button>}
      testId="incidents-error"
    />
  );
}

function Panel(props: { icon: React.ReactNode; title: string; body?: string; action?: React.ReactNode; testId: string }) {
  return (
    <div data-testid={props.testId} role="status" className="flex flex-col items-center justify-center gap-2 p-6 text-center">
      {props.icon}
      <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">{props.title}</p>
      {props.body && <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm break-words">{props.body}</p>}
      {props.action && <div className="mt-2">{props.action}</div>}
    </div>
  );
}

const buttonClass =
  "inline-flex items-center px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:border-slate-400 dark:hover:border-slate-500";

function Button({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick} className={buttonClass}>
      {children}
    </button>
  );
}

function LinkButton({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className={buttonClass}>
      {children}
    </Link>
  );
}
