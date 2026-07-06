import type { ContractProfile } from "@/lib/contract-template";

export function kosanProfileToContractProfile(profile: {
  name: string;
  address: string | null;
  phone: string | null;
  email: string | null;
  managerName: string | null;
  contractLocation: string | null;
  latePenaltyPerDay: { toString(): string } | number | string;
  contractTemplate?: string | null;
  inventoryBaTemplate?: string | null;
}): ContractProfile {
  return {
    name: profile.name,
    address: profile.address,
    phone: profile.phone,
    email: profile.email,
    managerName: profile.managerName,
    contractLocation: profile.contractLocation,
    latePenaltyPerDay: Number(profile.latePenaltyPerDay),
    contractTemplate: profile.contractTemplate,
    inventoryBaTemplate: profile.inventoryBaTemplate,
  };
}
