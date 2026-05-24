import { ServiceType, Provider } from '@prisma/client';
import prisma from './prisma';

export interface AllocateLeadInput {
  name: string;
  email: string;
  phone: string;
  serviceType: ServiceType;
  description: string;
}

const SERVICE_CONFIGS: Record<
  ServiceType,
  { mandatoryIds: string[]; poolIds: string[] }
> = {
  [ServiceType.SERVICE_1]: {
    mandatoryIds: ['provider_1'],
    poolIds: ['provider_2', 'provider_3', 'provider_4'],
  },
  [ServiceType.SERVICE_2]: {
    mandatoryIds: ['provider_5'],
    poolIds: ['provider_6', 'provider_7', 'provider_8'],
  },
  [ServiceType.SERVICE_3]: {
    mandatoryIds: ['provider_1', 'provider_4'],
    poolIds: ['provider_2', 'provider_3', 'provider_5', 'provider_6', 'provider_7', 'provider_8'],
  },
};

export async function allocateLead(input: AllocateLeadInput) {
  return await prisma.$transaction(
    async (tx) => {
      const existingLead = await tx.lead.findUnique({
        where: {
          phone_serviceType: {
            phone: input.phone,
            serviceType: input.serviceType,
          },
        },
      });

      if (existingLead) {
        throw new Error(
          `DUPLICATE_LEAD: A lead for phone number ${input.phone} and service ${input.serviceType} already exists.`
        );
      }

      const config = SERVICE_CONFIGS[input.serviceType];
      const totalRequiredProviders = 3;
      const requiredPoolCount = totalRequiredProviders - config.mandatoryIds.length;

      const mandatoryProviders = await tx.provider.findMany({
        where: {
          id: { in: config.mandatoryIds },
        },
      });

      if (mandatoryProviders.length !== config.mandatoryIds.length) {
        throw new Error(
          `ALLOCATION_FAILED: One or more mandatory providers for ${input.serviceType} could not be found.`
        );
      }

      for (const p of mandatoryProviders) {
        if (!p.isActive) {
          throw new Error(
            `ALLOCATION_FAILED: Mandatory provider "${p.name}" (${p.id}) is inactive.`
          );
        }
        if (p.currentLeadsCount >= p.quota) {
          throw new Error(
            `ALLOCATION_FAILED: Mandatory provider "${p.name}" (${p.id}) has exceeded quota.`
          );
        }
      }

      let allocationState = await tx.allocationState.findUnique({
        where: { serviceType: input.serviceType },
      });

      if (!allocationState) {
        allocationState = await tx.allocationState.create({
          data: {
            serviceType: input.serviceType,
            lastProviderId: null,
          },
        });
      }

      const lastProviderId = allocationState.lastProviderId;

      const poolProviders = await tx.provider.findMany({
        where: {
          id: { in: config.poolIds },
        },
      });

      const lastIdx = lastProviderId ? config.poolIds.indexOf(lastProviderId) : -1;
      const rotatedPoolIds = [
        ...config.poolIds.slice(lastIdx + 1),
        ...config.poolIds.slice(0, lastIdx + 1),
      ];

      const eligiblePoolSorted = rotatedPoolIds
        .map((id) => poolProviders.find((p) => p.id === id))
        .filter(
          (p): p is Provider =>
            p !== undefined && p.isActive && p.currentLeadsCount < p.quota
        );

      if (eligiblePoolSorted.length < requiredPoolCount) {
        throw new Error(
          `ALLOCATION_FAILED: Not enough eligible pool providers available for ${input.serviceType} (Required: ${requiredPoolCount}, Available: ${eligiblePoolSorted.length}).`
        );
      }

      const selectedPoolProviders = eligiblePoolSorted.slice(0, requiredPoolCount);
      const allSelectedProviders = [...mandatoryProviders, ...selectedPoolProviders];

      if (allSelectedProviders.length !== totalRequiredProviders) {
        throw new Error(
          `ALLOCATION_FAILED: Failed to select exactly ${totalRequiredProviders} providers.`
        );
      }

      const lead = await tx.lead.create({
        data: {
          name: input.name,
          email: input.email,
          phone: input.phone,
          serviceType: input.serviceType,
          description: input.description,
          status: 'ALLOCATED',
        },
      });

      await tx.leadAllocation.createMany({
        data: allSelectedProviders.map((p) => ({
          leadId: lead.id,
          providerId: p.id,
        })),
      });

      await tx.provider.updateMany({
        where: {
          id: { in: allSelectedProviders.map((p) => p.id) },
        },
        data: {
          currentLeadsCount: {
            increment: 1,
          },
        },
      });

      if (selectedPoolProviders.length > 0) {
        const lastAssignedPoolProviderId = selectedPoolProviders[selectedPoolProviders.length - 1].id;
        await tx.allocationState.update({
          where: { serviceType: input.serviceType },
          data: {
            lastProviderId: lastAssignedPoolProviderId,
          },
        });
      }

      return {
        lead,
        assignedProviders: allSelectedProviders,
      };
    },
    {
      maxWait: 10000,
      timeout: 10000,
    }
  );
}
