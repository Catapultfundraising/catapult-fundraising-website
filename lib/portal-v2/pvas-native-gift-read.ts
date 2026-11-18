/** Pure, injected transport only. NOT bound to auth, fetch, SQL, state or routes. */
import { decodeNativeGiftPageV2, decodeNativePageRequestV2, NativeGiftWireHold, type NativePageRequest, type NativeGiftRecord } from "./pvas-native-gift-wire";
export function nativeGiftPageBodyV2(client: string, input: unknown) {
  if (client !== "pvas") throw new NativeGiftWireHold("request");
  return { op: "nativeGiftPageV2" as const, client: "pvas" as const, request: decodeNativePageRequestV2(input) };
}
export type NativeGiftReadBody = ReturnType<typeof nativeGiftPageBodyV2>;
export async function collectNativeGiftPagesV2(client: string, send: (body: NativeGiftReadBody) => Promise<unknown>, input: NativePageRequest, maxPages = 4096) {
  let request = nativeGiftPageBodyV2(client, input).request;
  if (request.after !== null || !Number.isInteger(maxPages) || maxPages < 1 || maxPages > 16384) throw new NativeGiftWireHold("request");
  const records: NativeGiftRecord[] = [], ids = new Set<number>(), aliases = new Set<string>();
  for (let page = 0; page < maxPages; page++) {
    const result = decodeNativeGiftPageV2(await send(nativeGiftPageBodyV2(client, request)), request);
    for (const record of result.records) {
      if (ids.has(record.giftId)) throw new NativeGiftWireHold("page");
      ids.add(record.giftId);
      for (const s of record.sources) {
        const key = JSON.stringify([s.system, s.key]);
        if (aliases.has(key)) throw new NativeGiftWireHold("source");
        aliases.add(key);
      }
      records.push(record);
    }
    if (result.done) return { v: 2 as const, lane: request.lane, view: request.view, records };
    request = { ...request, after: result.next };
  }
  throw new NativeGiftWireHold("incomplete"); // Never return a truncated prefix.
}
