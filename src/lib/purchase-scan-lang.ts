"use client";

import { useEffect, useState } from "react";

/**
 * Scoped Hindi/Hinglish/English toggle for just the bill-scan screens — not
 * a global i18n framework (the rest of the app has no i18n infra at all;
 * building one for the whole product is a much larger, separate change).
 * Defaults to Hinglish, matching the rest of this app's own copy style.
 */
export type PurchaseLang = "hinglish" | "hindi" | "english";
const STORAGE_KEY = "bhojsetu_purchase_lang";

const DICT = {
  scanTitle: { hinglish: "Bill scan karo", hindi: "बिल स्कैन करो", english: "Scan a bill" },
  takePhoto: { hinglish: "Photo kheecho", hindi: "फ़ोटो खींचो", english: "Take a photo" },
  chooseFromGallery: { hinglish: "Gallery se chuno", hindi: "गैलरी से चुनो", english: "Choose from gallery" },
  addAnotherPage: { hinglish: "Aur page", hindi: "और पेज", english: "Add another page" },
  scanNow: { hinglish: "Scan karo", hindi: "स्कैन करो", english: "Scan bill" },
  cancel: { hinglish: "Cancel karo", hindi: "रद्द करो", english: "Cancel" },
  uploaded: { hinglish: "Upload ho gaya", hindi: "अपलोड हो गया", english: "Uploaded" },
  reading: { hinglish: "Bill padh rahe hain…", hindi: "बिल पढ़ रहे हैं…", english: "Reading the bill…" },
  matching: { hinglish: "Stock se match kar rahe hain…", hindi: "स्टॉक से मिला रहे हैं…", english: "Matching against your stock…" },
  offlineQueued: {
    hinglish: "Internet nahi hai — internet aane par padh lenge.",
    hindi: "इंटरनेट नहीं है — इंटरनेट आने पर पढ़ लेंगे।",
    english: "You're offline — we'll read this once you're back online.",
  },
  billOk: { hinglish: "Sahi mile", hindi: "सही मिले", english: "Matched" },
  needsCheck: { hinglish: "Check karo", hindi: "चेक करो", english: "Needs check" },
  newItem: { hinglish: "Naya item", hindi: "नया आइटम", english: "New item" },
  onBill: { hinglish: "Bill par:", hindi: "बिल पर:", english: "On bill:" },
  quantity: { hinglish: "Quantity", hindi: "मात्रा", english: "Quantity" },
  rate: { hinglish: "Rate", hindi: "दर", english: "Rate" },
  change: { hinglish: "Badlo", hindi: "बदलो", english: "Change" },
  createNewItem: { hinglish: "Naya item banao", hindi: "नया आइटम बनाओ", english: "Create new item" },
  matchExisting: { hinglish: "Purane se jodo", hindi: "पुराने से जोड़ो", english: "Match to existing" },
  skipThisTime: { hinglish: "Is baar skip karo", hindi: "इस बार छोड़ो", english: "Skip this time" },
  addMissingItem: { hinglish: "Item jo chhoot gaya, khud jodo", hindi: "छूटा हुआ आइटम खुद जोड़ो", english: "Add a missing item" },
  totalMismatch: { hinglish: "Total match nahi kar raha", hindi: "टोटल मेल नहीं खा रहा", english: "Total doesn't match" },
  addExtraCharge: { hinglish: "+ Extra charge jodo", hindi: "+ अतिरिक्त चार्ज जोड़ो", english: "+ Add extra charge" },
  saveAndConfirm: { hinglish: "Sahi hai, Save karo", hindi: "सही है, सेव करो", english: "Confirm & save" },
  items: { hinglish: "items", hindi: "आइटम", english: "items" },
  pendingHelper: { hinglish: "abhi bhi baaki hai", hindi: "अभी भी बाकी है", english: "still need attention" },
  duplicateBill: {
    hinglish: "Yeh bill pehle se add hai — phir bhi save karna hai?",
    hindi: "यह बिल पहले से जुड़ा है — फिर भी सेव करें?",
    english: "This bill looks already added — save anyway?",
  },
  saveAnyway: { hinglish: "Phir bhi save karo", hindi: "फिर भी सेव करो", english: "Save anyway" },
  savedTitle: { hinglish: "Stock update ho gaya!", hindi: "स्टॉक अपडेट हो गया!", english: "Stock updated!" },
  alertsCleared: { hinglish: "Low-stock alert clear ho gaye:", hindi: "लो-स्टॉक अलर्ट साफ़ हो गए:", english: "Low-stock alerts cleared:" },
  viewStock: { hinglish: "Stock dekho", hindi: "स्टॉक देखो", english: "View stock" },
  scanAnother: { hinglish: "Ek aur bill scan karo", hindi: "एक और बिल स्कैन करो", english: "Scan another bill" },
  undo: { hinglish: "Undo karo", hindi: "पूर्ववत करो", english: "Undo" },
  undoing: { hinglish: "Undo ho raha hai…", hindi: "पूर्ववत हो रहा है…", english: "Undoing…" },
  undoDone: { hinglish: "Purchase undo ho gaya.", hindi: "खरीद पूर्ववत हो गई।", english: "Purchase undone." },
  retake: { hinglish: "Dobara photo lo", hindi: "फिर से फ़ोटो लो", english: "Retake photo" },
  supplierName: { hinglish: "Supplier ka naam", hindi: "सप्लायर का नाम", english: "Supplier name" },
  billNumber: { hinglish: "Bill number", hindi: "बिल नंबर", english: "Bill number" },
  billDate: { hinglish: "Bill ki tareekh", hindi: "बिल की तारीख", english: "Bill date" },
  unit: { hinglish: "Unit", hindi: "यूनिट", english: "Unit" },
  category: { hinglish: "Category", hindi: "श्रेणी", english: "Category" },
  minStockLevel: { hinglish: "Minimum stock level", hindi: "न्यूनतम स्टॉक स्तर", english: "Minimum stock level" },
  save: { hinglish: "Save karo", hindi: "सेव करो", english: "Save" },
} as const;

export type PurchaseLangKey = keyof typeof DICT;

export function usePurchaseLang(): [PurchaseLang, (l: PurchaseLang) => void, (key: PurchaseLangKey) => string] {
  const [lang, setLangState] = useState<PurchaseLang>("hinglish");

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      // One-time hydration from an external store (localStorage) on mount —
      // window isn't available during SSR, so this can't be a lazy useState
      // initializer instead. Intentional exception to the "no setState in
      // effect" rule, not a derived-state anti-pattern (same exception
      // src/lib/cart.tsx already takes for the same reason).
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (saved === "hindi" || saved === "english" || saved === "hinglish") setLangState(saved);
    } catch {
      // Private-browsing/blocked storage — Hinglish default is fine.
    }
  }, []);

  function setLang(l: PurchaseLang) {
    setLangState(l);
    try {
      window.localStorage.setItem(STORAGE_KEY, l);
    } catch {
      // Not durable, but the in-memory state still switches for this visit.
    }
  }

  function t(key: PurchaseLangKey): string {
    return DICT[key][lang];
  }

  return [lang, setLang, t];
}
