import fs from "node:fs";

interface N8nNode {
  name: string;
  parameters: Record<string, unknown>;
}

interface N8nExport {
  nodes: N8nNode[];
}

export interface SenderListsRaw {
  goodOppExact: string[];
  goodOppDomains: string[];
  impExact: string[];
  impDomains: string[];
  agencyExact: string[];
  agencyDomains: string[];
  autocloseExact: string[];
  autocloseDomains: string[];
  impLabelIdPlaceholder: string | null;
}

export interface N8nParseResult {
  senderLists: SenderListsRaw;
  creatorUrls: Record<string, string>;
  creatorEmailMap: Record<string, string>;
  labelIds: string[];
}

// The array/object literals in the n8n Code nodes are JS syntax (single
// quotes, trailing commas, comments) rather than strict JSON, so we can't
// JSON.parse them directly. Evaluating the literal text via `new Function`
// is safe here because the source is a trusted local export file the user
// controls, not untrusted network input -- and it avoids hand-transcribing
// ~700 sender entries and 40+ creators.
function extractSetLiteral(code: string, varName: string): string[] {
  const re = new RegExp(`${varName}\\s*=\\s*new Set\\(\\s*\\[([\\s\\S]*?)\\]\\s*\\)`);
  const match = code.match(re);
  if (!match) throw new Error(`Could not find Set literal for ${varName}`);
  const arr = new Function(`return [${match[1]}]`)() as unknown[];
  return arr.map((v) => String(v));
}

function extractObjectLiteral(code: string, varName: string): Record<string, string> {
  const startMarker = `${varName} = {`;
  const start = code.indexOf(startMarker);
  if (start === -1) throw new Error(`Could not find object literal for ${varName}`);
  const bodyStart = start + startMarker.length;

  let depth = 1;
  let i = bodyStart;
  for (; i < code.length && depth > 0; i++) {
    if (code[i] === "{") depth++;
    else if (code[i] === "}") depth--;
  }
  const body = code.slice(bodyStart, i - 1);
  return new Function(`return {${body}}`)() as Record<string, string>;
}

function findNode(raw: N8nExport, name: string): N8nNode {
  const node = raw.nodes.find((n) => n.name === name);
  if (!node) throw new Error(`Node "${name}" not found in n8n export`);
  return node;
}

export function parseN8nExport(jsonPath: string): N8nParseResult {
  const raw = JSON.parse(fs.readFileSync(jsonPath, "utf8")) as N8nExport;

  const routerCode = findNode(raw, "NEW").parameters.jsCode as string;

  const impLabelMatch = routerCode.match(/IMP_LABEL_ID\s*=\s*'([^']+)'/);

  const senderLists: SenderListsRaw = {
    goodOppExact: extractSetLiteral(routerCode, "GOOD_OPP_EXACT"),
    goodOppDomains: extractSetLiteral(routerCode, "GOOD_OPP_DOMAINS"),
    impExact: extractSetLiteral(routerCode, "IMP_EXACT"),
    impDomains: extractSetLiteral(routerCode, "IMP_DOMAINS"),
    agencyExact: extractSetLiteral(routerCode, "AGENCY_EXACT"),
    agencyDomains: extractSetLiteral(routerCode, "AGENCY_DOMAINS"),
    autocloseExact: extractSetLiteral(routerCode, "AUTOCLOSE_EXACT"),
    autocloseDomains: extractSetLiteral(routerCode, "AUTOCLOSE_DOMAINS"),
    impLabelIdPlaceholder: impLabelMatch?.[1] ?? null,
  };

  const rateCardCode = findNode(raw, "Code in JavaScript1").parameters.jsCode as string;
  const creatorUrls = extractObjectLiteral(rateCardCode, "CREATOR_URLS");

  const emailMapCode = findNode(raw, "Code in JavaScript14").parameters.jsCode as string;
  const creatorEmailMap = extractObjectLiteral(emailMapCode, "CREATOR_EMAIL_MAP");

  const labelIds = new Set<string>();
  for (const node of raw.nodes) {
    const ids = (node.parameters as { labelIds?: unknown }).labelIds;
    if (Array.isArray(ids)) {
      for (const id of ids) if (typeof id === "string") labelIds.add(id);
    }
  }
  if (senderLists.impLabelIdPlaceholder) labelIds.add(senderLists.impLabelIdPlaceholder);

  return { senderLists, creatorUrls, creatorEmailMap, labelIds: [...labelIds] };
}
