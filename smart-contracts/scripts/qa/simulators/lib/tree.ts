/**
 * Referral tree generator — depth 1–9, directs per user 1–5.
 */
export type TreeNode = {
  signer: any;
  sponsor: any | null;
  children: TreeNode[];
  depth: number;
};

export type TreeOptions = {
  depth: number; // 1–9
  directsPerUser: number; // 1–5
};

export function clampTreeOptions(opts: Partial<TreeOptions>): TreeOptions {
  const depth = Math.min(9, Math.max(1, opts.depth ?? 2));
  const directsPerUser = Math.min(5, Math.max(1, opts.directsPerUser ?? 2));
  return { depth, directsPerUser };
}

/**
 * Build a balanced tree from a signer pool.
 * signers[0] = root. Returns root node + flat list in BFS order.
 */
export function buildReferralTree(
  signers: any[],
  opts: Partial<TreeOptions> = {},
): { root: TreeNode; flat: TreeNode[]; used: number } {
  const { depth, directsPerUser } = clampTreeOptions(opts);
  if (signers.length < 1) {
    throw new Error("Need at least 1 signer for tree root");
  }

  let used = 0;
  const take = () => {
    if (used >= signers.length) {
      throw new Error(
        `Not enough signers for tree (need more than ${signers.length}; depth=${depth} directs=${directsPerUser})`,
      );
    }
    return signers[used++];
  };

  const root: TreeNode = {
    signer: take(),
    sponsor: null,
    children: [],
    depth: 0,
  };
  const flat: TreeNode[] = [root];
  let frontier: TreeNode[] = [root];

  for (let d = 1; d <= depth; d++) {
    const next: TreeNode[] = [];
    for (const parent of frontier) {
      for (let i = 0; i < directsPerUser; i++) {
        const child: TreeNode = {
          signer: take(),
          sponsor: parent.signer,
          children: [],
          depth: d,
        };
        parent.children.push(child);
        flat.push(child);
        next.push(child);
      }
    }
    frontier = next;
  }

  return { root, flat, used };
}

/** Count nodes needed for a balanced tree. */
export function nodesNeeded(depth: number, directsPerUser: number): number {
  const { depth: d, directsPerUser: b } = clampTreeOptions({
    depth,
    directsPerUser,
  });
  let total = 1;
  let level = 1;
  for (let i = 0; i < d; i++) {
    level *= b;
    total += level;
  }
  return total;
}
