/**
 * Package / income helpers for simulators.
 */
import { ethers as ethersLib } from "ethers";

export const PACKAGE_LADDER = [
  50n,
  100n,
  300n,
  500n,
  1000n,
  3000n,
  5000n,
  10000n,
] as const;

export async function fundAndApprove(
  mockBTCB: any,
  core: any,
  from: any,
  funder: any,
  tokenAmount: bigint,
) {
  await mockBTCB.connect(funder).transfer(from.address, tokenAmount);
  await mockBTCB.connect(from).approve(await core.getAddress(), tokenAmount);
}

export async function registerUser(core: any, user: any, sponsor: any | null) {
  const sponsorAddr = sponsor ? sponsor.address : ethersLib.ZeroAddress;
  await core.connect(user).register(sponsorAddr);
}

export async function activatePackageUsd(
  core: any,
  mockBTCB: any,
  user: any,
  funder: any,
  usdAmount: bigint,
) {
  const tokenAmount = await core.getPackageBTCBAmount(usdAmount);
  await fundAndApprove(mockBTCB, core, user, funder, tokenAmount);
  await core.connect(user).activatePackage(usdAmount);
  return tokenAmount;
}

/** Unlock next package by hitting ROI 3X (sets packageCompleted). */
export async function completeCurrentPackageByRoi(
  incomeManager: any,
  userAddr: string,
) {
  const principal = await incomeManager.principal(userAddr);
  if (principal === 0n) return;
  await incomeManager.recordIncome(userAddr, principal * 3n, 0);
}

/**
 * Walk package ladder: for each amount, do cycle 1 + complete + cycle 2 + complete
 * (except after 10000 C2 → unlimited top-ups handled separately).
 */
export async function progressThroughPackages(
  core: any,
  mockBTCB: any,
  incomeManager: any,
  user: any,
  funder: any,
  upToUsd: bigint = 10000n,
) {
  for (const pkg of PACKAGE_LADDER) {
    if (pkg > upToUsd) break;
    for (const cycle of [1, 2]) {
      const [nextPkg, nextCycle] = await core.getNextEligiblePackage(user.address);
      if (nextPkg !== pkg || Number(nextCycle) !== cycle) {
        throw new Error(
          `Expected next ${pkg} C${cycle}, got ${nextPkg} C${nextCycle}`,
        );
      }
      await activatePackageUsd(core, mockBTCB, user, funder, pkg);
      await completeCurrentPackageByRoi(incomeManager, user.address);
      if (pkg === 10000n && cycle === 2) {
        return; // unlimited mode starts
      }
    }
  }
}
