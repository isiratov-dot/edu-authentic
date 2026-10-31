import { getStore } from "@netlify/blobs";
import { timingSafeEqual, randomInt } from "node:crypto";
const json = (o, s = 200) => new Response(JSON.stringify(o), { status: s, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" } });
const same = (a, b) => { const x = Buffer.from(String(a || "")), y = Buffer.from(String(b || "")); return x.length === y.length && timingSafeEqual(x, y); };
const str = (v, max = 200) => String(v ?? "").trim().slice(0, max);
const clean = d => ({ type: d.type === "formation" ? "formation" : "diplome", nom: str(d.nom), naiss: str(d.naiss, 10), lieu: str(d.lieu), titre: str(d.titre, 300), etab: str(d.etab, 300), date: str(d.date, 10), duree: str(d.duree, 60), statut: d.statut === "revoque" ? "revoque" : "valide", motif: str(d.motif, 300) });
export default async (req) => {
  if (req.method !== "POST") return json({ error: "Méthode non autorisée" }, 405);
  const pw = process.env.ADMIN_PASSWORD;
  if (!pw || !same(req.headers.get("x-admin-password"), pw)) return json({ error: "Accès refusé" }, 401);
  let b; try { b = await req.json(); } catch { return json({ error: "Requête invalide" }, 400); }
  const store = getStore("registre");
  const get = k => store.get(k, { type: "json" });
  if (b.action === "list") {
    const { blobs } = await store.list();
    const docs = (await Promise.all(blobs.map(x => get(x.key)))).filter(Boolean).sort((a, c) => a.num.localeCompare(c.num));
    return json({ docs });
  }
  if (b.action === "add") {
    const d = clean(b.doc || {});
    if (!d.nom || !d.naiss || !d.lieu || !d.titre || !d.etab || !d.date) return json({ error: "Champs obligatoires manquants" }, 400);
    const pre = d.type === "diplome" ? "DIP" : "FOR"; let num;
    do { num = `${pre}-${d.date.slice(0, 4)}-${randomInt(1000, 10000)}`; } while (await get(num));
    await store.setJSON(num, { num, ...d });
    return json({ num });
  }
  if (b.action === "import") {
    if (!Array.isArray(b.docs)) return json({ error: "Format invalide" }, 400);
    let count = 0;
    for (const x of b.docs) { const num = str(x.num, 40).toUpperCase(); if (!/^[A-Z0-9-]{4,40}$/.test(num)) continue; await store.setJSON(num, { num, ...clean(x) }); count++; }
    return json({ count });
  }
  const num = str(b.num, 40).toUpperCase();
  const r = await get(num);
  if (!r) return json({ error: "Document introuvable" }, 404);
  if (b.action === "toggle") { r.statut = r.statut === "valide" ? "revoque" : "valide"; r.motif = r.statut === "revoque" ? "Document annulé par l’établissement émetteur." : ""; await store.setJSON(num, r); return json({ ok: true }); }
  if (b.action === "delete") { await store.delete(num); return json({ ok: true }); }
  return json({ error: "Action inconnue" }, 400);
};
