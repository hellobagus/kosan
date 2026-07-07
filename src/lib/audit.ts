import type { SessionPayload } from "@/lib/auth";

export function withCreateAudit(session: SessionPayload) {
  return {
    createdByName: session.name,
    updatedByName: session.name,
  };
}

export function withUpdateAudit(session: SessionPayload) {
  return {
    updatedByName: session.name,
  };
}

export function withApprovalAudit(session: SessionPayload) {
  return {
    approvedByName: session.name,
    approvedAt: new Date(),
    updatedByName: session.name,
  };
}
