export function normalizeRouteKey(value: string) {
  return value.trim().toLowerCase().replace(/[\s-]+/g, "");
}

export function matchingRouteNumbers(contractRoutes: string[], jointRoutes: string[]) {
  const jointKeys = new Set(jointRoutes.map(normalizeRouteKey).filter(Boolean));
  const seen = new Set<string>();
  const matches: string[] = [];
  for (const route of contractRoutes) {
    const key = normalizeRouteKey(route);
    if (!key || !jointKeys.has(key) || seen.has(key)) continue;
    seen.add(key);
    matches.push(route.trim());
  }
  return matches;
}

export type JointCandidate = {
  id: string;
  hostName: string;
  joinerDistricts?: string | null;
  routes: string[];
  statusName?: string;
};

export function jointMatchesForContract(
  contract: { type: string; routes: string[] },
  joints: JointCandidate[]
) {
  if (contract.type === "joint" || contract.type === "addendum") return [];
  return joints.flatMap((joint) => {
    const matchedRoutes = matchingRouteNumbers(contract.routes, joint.routes);
    if (!matchedRoutes.length) return [];
    return [{ ...joint, matchedRoutes }];
  });
}

export function jointRouteLabel(routes: string[]) {
  return routes.map((route) => route.trim()).filter(Boolean).join(", ");
}
