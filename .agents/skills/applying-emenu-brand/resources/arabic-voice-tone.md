# e-Menu Arabic Voice, Tone & Copywriting Standards

RTL Arabic (`lang="ar" dir="rtl"`) copy rules for **حلويات عبمبر الزروق**.

## 1. Official Brand Naming

| Surface | Full Title | Short / PWA Title |
| --- | --- | --- |
| **Shop 1 (Main Sweets)** | `منيو حلويات عبمبر الزروق` | `عبمبر الزروق` |
| **Shop 2 (Dry Pastries)** | `قسم النواشف - حلويات عبمبر الزروق` | `قسم النواشف` |
| **Admin Back-Office** | `لوحة إدارة عبمبر الزروق` | `إدارة الزروق` |

## 2. Punctuation, Ellipsis & Currency

- **Typographic Ellipsis Only:** Always use the Unicode ellipsis `…` (`U+2026`) in loading labels, search prompts, and placeholders. Never write ASCII `...`.
- **Currency Standard:** Always suffix prices, totals, balances, and salary amounts with `د.ل` (Libyan Dinar) separated by a space (e.g., `25 د.ل`).
- **Tabular Figures:** Apply `.text-mono` (`font-variant-numeric: tabular-nums`) to changing prices, cart totals, KPI counters, table numbers, and invoice summaries so columns do not jitter on updates.

## 3. Form Placeholders & Labels

- **No Imperative Verb Prefixes:** Never begin placeholders with `"اكتب…"` or `"أدخل…"`. Use direct noun phrases or concise format examples:
  - Good: `'تاريخ الاستلام…'`, `'الاسم الكامل للموظف…'`, `'بحث في الأصناف…'`, `'وصف اختياري للنسخة الاحتياطية…'`, `'09x-xxxxxxx…'`
  - Avoid: `'اكتب اسمك هنا...'`, `'أدخل رقم الهاتف...'`
- **Accessible Interactive Labels:** Every icon-only `<button>` must include a descriptive Arabic `aria-label` (e.g., `aria-label="إغلاق النافذة"`, `aria-label="اختيار تاريخ الاستلام"`). Every modal container with `role="dialog"` needs `aria-modal="true"` and `aria-label` or `aria-labelledby`.

## 4. RTL Directionality & Date Controls

- **Embedded LTR Tokens:** Apply `dir="ltr"` with `.text-mono` on ISO dates (`YYYY-MM-DD`), phone numbers (`09x-xxxxxxx`), and numeric codes inside RTL layouts so digits and hyphens never reverse visually.
- **RTL Calendar Navigation (`RtlDatePicker.vue`):**
  - "Previous Month" (`الشهر السابق`) goes backward in time and uses a right-pointing chevron (`points="9 18 15 12 9 6"`).
  - "Next Month" (`الشهر التالي`) goes forward in time and uses a left-pointing chevron (`points="15 18 9 12 15 6"`).

## 5. Clean Arabic Error & Status Copy

- **Friendly, Actionable Tone:** Write concise, respectful Arabic messages telling the user what happened and what to try next without technical jargon.
- **Zero Internal Leakage:** Never expose English `err.message` strings, stack traces, MongoDB/PocketBase URLs, S3 bucket names, or helper script paths in UI alerts or API JSON responses (`{ error, message }`).
- **Consistent Timeout & Network Copy:**
  - Timeouts (`AbortError`): `"انتهت مهلة الاتصال بالخادم، يرجى المحاولة مرة أخرى"`
  - Network/Offline: `"تعذر الاتصال بالخادم، تأكد من اتصال الإنترنت"`
  - Unexpected Server Error (`5xx`): `"حدث خطأ غير متوقع في الخادم، يرجى المحاولة لاحقاً"`
