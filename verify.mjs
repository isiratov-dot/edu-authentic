import { getStore } from "@netlify/blobs";
const norm = s => String(s || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/\s+/g, " ").trim();
const json = (o, s = 200) => new Response(JSON.stringify(o), { status: s, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" } });
export default async (req) => {
  if (req.method !== "POST") return json({ error: "Méthode non autorisée" }, 405);
  let b; try { b = await req.json(); } catch { return json({ error: "Requête invalide" }, 400); }
  const num = String(b.num || "").trim().toUpperCase();
  if (!/^[A-Z0-9-]{4,40}$/.test(num)) return json({ status: "notfound" });
  const r = await getStore("registre").get(num, { type: "json" });
  if (!r || r.type !== b.type) return json({ status: "notfound" });
  if (norm(r.nom) !== norm(b.nom) || r.naiss !== b.naiss) return json({ status: "mismatch" });
  const { num: n, type, nom, titre, etab, date, duree, statut, motif } = r;
  return json({ status: "ok", record: { num: n, type, nom, titre, etab, date, duree, statut, motif } });
};
