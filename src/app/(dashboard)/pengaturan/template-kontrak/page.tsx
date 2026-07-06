"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { PageHeader, Card, CardBody, Button } from "@/components/ui";
import { Eye, RotateCcw, Save, Copy } from "lucide-react";
import {
  BA_PLACEHOLDERS,
  CONTRACT_PLACEHOLDERS,
  DEFAULT_BA_TEMPLATE,
  DEFAULT_CONTRACT_TEMPLATE,
  type PlaceholderInfo,
} from "@/lib/contract-template";
import { cn } from "@/lib/utils";

type TabType = "contract" | "ba";

export default function TemplateKontrakPage() {
  const [tab, setTab] = useState<TabType>("contract");
  const [contractTemplate, setContractTemplate] = useState("");
  const [baTemplate, setBaTemplate] = useState("");
  const [savedContract, setSavedContract] = useState("");
  const [savedBa, setSavedBa] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const [message, setMessage] = useState("");
  const [previewHtml, setPreviewHtml] = useState("");
  const [showPreview, setShowPreview] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((data) => {
        const p = data.profile;
        const ct = p?.contractTemplate?.trim() || DEFAULT_CONTRACT_TEMPLATE;
        const bt = p?.inventoryBaTemplate?.trim() || DEFAULT_BA_TEMPLATE;
        setContractTemplate(ct);
        setBaTemplate(bt);
        setSavedContract(ct);
        setSavedBa(bt);
      })
      .finally(() => setLoading(false));
  }, []);

  const currentTemplate = tab === "contract" ? contractTemplate : baTemplate;
  const placeholders = tab === "contract" ? CONTRACT_PLACEHOLDERS : BA_PLACEHOLDERS;
  const isDirty = tab === "contract"
    ? contractTemplate !== savedContract
    : baTemplate !== savedBa;

  const groupedPlaceholders = useMemo(() => {
    const groups = new Map<string, PlaceholderInfo[]>();
    for (const p of placeholders) {
      const list = groups.get(p.group) || [];
      list.push(p);
      groups.set(p.group, list);
    }
    return Array.from(groups.entries());
  }, [placeholders]);

  const setCurrentTemplate = useCallback((value: string) => {
    if (tab === "contract") setContractTemplate(value);
    else setBaTemplate(value);
  }, [tab]);

  const insertPlaceholder = (key: string) => {
    const token = `{{${key}}}`;
    const el = textareaRef.current;
    if (!el) {
      setCurrentTemplate(currentTemplate + token);
      return;
    }
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const next = currentTemplate.slice(0, start) + token + currentTemplate.slice(end);
    setCurrentTemplate(next);
    setTimeout(() => {
      el.focus();
      el.setSelectionRange(start + token.length, start + token.length);
    }, 0);
  };

  const handleReset = () => {
    if (!confirm("Kembalikan template ke default bawaan sistem?")) return;
    if (tab === "contract") setContractTemplate(DEFAULT_CONTRACT_TEMPLATE);
    else setBaTemplate(DEFAULT_BA_TEMPLATE);
    setMessage("Template direset ke default (belum disimpan)");
  };

  const handlePreview = async () => {
    setPreviewing(true);
    setMessage("");
    try {
      const res = await fetch("/api/settings/contract-preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: tab === "contract" ? "contract" : "ba",
          template: currentTemplate,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage(data.error || "Gagal membuat preview");
        return;
      }
      setPreviewHtml(data.html);
      setShowPreview(true);
    } catch {
      setMessage("Gagal membuat preview");
    } finally {
      setPreviewing(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage("");
    const res = await fetch("/api/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        section: "contract_template",
        contractTemplate: contractTemplate.trim() || null,
        inventoryBaTemplate: baTemplate.trim() || null,
      }),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) {
      setMessage(data.error || "Gagal menyimpan");
      return;
    }
    const ct = data.contractTemplate?.trim() || DEFAULT_CONTRACT_TEMPLATE;
    const bt = data.inventoryBaTemplate?.trim() || DEFAULT_BA_TEMPLATE;
    setContractTemplate(ct);
    setBaTemplate(bt);
    setSavedContract(ct);
    setSavedBa(bt);
    setMessage("Template berhasil disimpan");
  };

  const copyPlaceholder = async (key: string) => {
    await navigator.clipboard.writeText(`{{${key}}}`);
    setMessage(`Disalin: {{${key}}}`);
  };

  if (loading) {
    return (
      <div className="p-6">
        <p className="text-slate-500">Memuat template...</p>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 max-w-7xl">
      <PageHeader
        title="Template Kontrak (Mail Merge)"
        description="Kustomisasi surat perjanjian dan BA inventaris. Gunakan placeholder {{nama_field}} yang akan diisi otomatis dari data penghuni."
      />

      <div className="flex gap-2 mb-4">
        {([
          { key: "contract" as TabType, label: "Surat Perjanjian" },
          { key: "ba" as TabType, label: "BA Inventaris" },
        ]).map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={cn(
              "px-4 py-2 rounded-lg text-sm font-semibold border transition-colors",
              tab === key
                ? "bg-teal-600 text-white border-teal-600"
                : "bg-white text-slate-600 border-slate-200 hover:border-teal-300"
            )}
          >
            {label}
          </button>
        ))}
        {isDirty && (
          <span className="self-center text-xs text-amber-600 font-medium ml-2">● Belum disimpan</span>
        )}
      </div>

      {message && (
        <div
          className={cn(
            "mb-4 px-4 py-3 rounded text-sm border",
            message.includes("Gagal")
              ? "bg-red-50 text-red-700 border-red-200"
              : "bg-green-50 text-green-700 border-green-200"
          )}
        >
          {message}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <CardBody>
            <p className="text-xs text-slate-500 mb-3">
              Edit isi dokumen HTML. Tag yang didukung: <code className="bg-slate-100 px-1 rounded">&lt;h1&gt;</code>,{" "}
              <code className="bg-slate-100 px-1 rounded">&lt;p&gt;</code>,{" "}
              <code className="bg-slate-100 px-1 rounded">&lt;table&gt;</code>,{" "}
              <code className="bg-slate-100 px-1 rounded">&lt;ol&gt;</code>,{" "}
              <code className="bg-slate-100 px-1 rounded">class=&quot;page-break&quot;</code> untuk halaman baru.
            </p>
            <textarea
              ref={textareaRef}
              value={currentTemplate}
              onChange={(e) => setCurrentTemplate(e.target.value)}
              rows={28}
              spellCheck={false}
              className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 font-mono text-xs leading-relaxed resize-y focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
            <div className="flex flex-wrap gap-2 mt-4">
              <Button onClick={handleSave} disabled={saving}>
                <Save className="w-4 h-4" />
                {saving ? "Menyimpan..." : "Simpan Template"}
              </Button>
              <Button variant="secondary" onClick={handlePreview} disabled={previewing}>
                <Eye className="w-4 h-4" />
                {previewing ? "Memuat..." : "Preview"}
              </Button>
              <Button variant="ghost" onClick={handleReset}>
                <RotateCcw className="w-4 h-4" /> Reset Default
              </Button>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardBody>
            <h3 className="font-semibold text-slate-800 mb-2">Placeholder Mail Merge</h3>
            <p className="text-xs text-slate-500 mb-4">
              Klik untuk sisipkan ke template, atau ikon salin untuk copy.
            </p>
            <div className="space-y-4 max-h-[600px] overflow-y-auto pr-1">
              {groupedPlaceholders.map(([group, items]) => (
                <div key={group}>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-2">{group}</p>
                  <div className="space-y-1">
                    {items.map((p) => (
                      <div key={p.key} className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => insertPlaceholder(p.key)}
                          className="flex-1 text-left text-xs px-2 py-1.5 rounded bg-slate-50 hover:bg-teal-50 border border-slate-100 hover:border-teal-200 transition-colors"
                        >
                          <code className="text-teal-700">{`{{${p.key}}}`}</code>
                          <span className="block text-slate-500 mt-0.5">{p.label}</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => copyPlaceholder(p.key)}
                          className="p-1.5 text-slate-400 hover:text-slate-600"
                          title="Salin"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </CardBody>
        </Card>
      </div>

      {showPreview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between px-4 py-3 border-b">
              <h3 className="font-bold">Preview (data contoh)</h3>
              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  className="!py-1.5 !text-xs"
                  onClick={() => {
                    const w = window.open("", "_blank");
                    if (w) {
                      w.document.write(previewHtml);
                      w.document.close();
                      w.print();
                    }
                  }}
                >
                  Cetak
                </Button>
                <Button variant="ghost" onClick={() => setShowPreview(false)}>Tutup</Button>
              </div>
            </div>
            <iframe
              title="Preview kontrak"
              srcDoc={previewHtml}
              className="flex-1 w-full min-h-[70vh] border-0"
            />
          </div>
        </div>
      )}
    </div>
  );
}
