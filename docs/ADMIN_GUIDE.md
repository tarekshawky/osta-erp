# OSTA Services — Admin Guide / دليل الإدارة

**English first, Arabic below (القسم العربي في الأسفل).**

---

# English

## 1. What you can manage

| Area (admin menu) | What it does |
|---|---|
| **Website** (Pages, Media, SEO, Menus, Site & Contact, Social, Forms & Leads, Service Areas, Redirects & Sitemap, Integrations, Backup) | The public website content |
| **Dynamic Pricing** | Prices per emirate, discounts, booking types, VAT, visit-fee policy and review |
| **Audit Log** | Who changed what, with before/after |
| **Homepage Sections, Blog, Website Services** | The older content areas (still in use) |

The customer app (login, booking, orders, invoices) is a separate site that reads all of this through the API.

## 2. Roles

An **Admin** can be given a permission role by a **Super Admin** (Employees → edit → *Permission Role*). With no role, an admin has full access (as before).

| Role | Can |
|---|---|
| Owner | Everything, including Integrations and Import |
| Admin | Everything except Integrations |
| Editor | Create/edit pages, manage media |
| SEO | SEO and edit pages |
| Operations | Orders, visit-fee review, leads |
| Viewer | View orders and leads only |

Every change is recorded in **Audit Log**.

## 3. Pages and the page builder (Website → Pages)

1. **New page** → English and Arabic title and a URL (slug). Slugs like `about` or `blog` are reserved by the site.
2. **Add block** (Hero, Services grid, Text, Image + text, FAQ, Statistics, Call to action, Form, Latest blog posts, Homepage sections). Every text has English and Arabic boxes.
3. **Drag ⠿** to reorder. **Hide** keeps a block but removes it from the site. **Duplicate / Delete** as needed. Each block can be shown on desktop, mobile, or both.
4. Work saves automatically as a **draft**; **Save** also records a version in **History** (you can restore any version).
5. **Preview** shows the draft at desktop/tablet/mobile size (link expires in 15 minutes).
6. **Publish** makes it live. **Schedule** publishes at a time you choose. **Unpublish** takes it offline. Nothing reaches visitors until you publish.
7. Renaming a live page's URL creates a permanent redirect automatically.

**Homepage:** Website → Pages → *Create editable homepage* makes a **draft** copy of today's homepage. Preview it, compare, then Publish. Unpublish returns to the built-in homepage at any time.

**Area (local) pages:** Website → Service Areas → *Create page*. Each area page needs its own content: a near-copy of another area page cannot be published.

### WhatsApp chat pop-up (Website → Site & Contact)
A floating WhatsApp button appears on every public page. Pressing it opens a small card (“Chat with us on WhatsApp · Available 24/7”) with a button that starts a chat with your WhatsApp number and pre-filled message. In **Site & Contact → WhatsApp chat pop-up** you can switch it off, edit the title, message and button text in English and Arabic, and choose whether the card opens by itself once after a number of seconds (a visitor who has seen or closed it is left alone for a week).

### The sidebar
The sidebar is grouped into modules: **Dashboard**, **Orders & Bookings**, **HR & Employees**, **Finance & Accounting**, **Reports & Analytics**, **Marketing & Blog**, **Website Management**, **Fleet & Vehicles**, **Inventory & Services** and **System Administration**. Click a module to open its pages; the module and the page you are on stay highlighted and open. A page that belongs to two modules (for example Work Reports) is the same page, shown in both. Use the search box (or **Ctrl/Cmd + K**) to jump to any page. The arrow at the top collapses the sidebar to icons (click a module icon to open it again); the sidebar remembers whether you collapsed it and which modules you opened. On a phone the same menu opens as a drawer. You only see the modules and pages your role allows, and the server checks access on every page too.

### Technical files & AI (Website → Technical Files & AI)
Edit the files served from the root of the website: **robots.txt** (your extra rules; the standard rules and sitemap are added for you), the **AI crawler policy** (allow, block training only, or block all AI crawlers), **llms.txt** (a guide for AI assistants; *Generate from my site* writes a first draft), **ads.txt** and **security.txt** (Owner only). Each file shows its address so you can check it live.

### Header & footer code (Website → Header & Footer Code, and Page Code)
Paste a snippet (tracking tag, pixel, chat widget, verification tag) to be added to the header or the end of the page on **every page**, or on **one page** in *Page Code*. For each box choose when it loads: always, after the visitor allows Analytics cookies, or after they allow Marketing cookies (the default is Analytics). Owner only; changes are recorded in the Audit Log. Only paste code you trust.

### Blog categories (Blog → Categories)
The blog is organised in categories ("sections"). Twenty default categories (English and Arabic) are created for you; add, rename, reorder (▲▼), deactivate or delete as many as you like in **Blog → Categories**. Each has English and Arabic names and descriptions, a slug, SEO title and meta description, and an optional cover image. When you write an article, **choose its category** (required) and optionally tick extra categories under *Also show in*; **+ Create New Category** inside the article form creates one on the spot and selects it. Tick **Featured article** to show it in the blog's Featured section.

On the website each category has its own page (`/blog/category/<slug>`). A category appears once it has at least one published article, and is offered to search engines (and the sitemap) from 3 articles; smaller ones stay reachable but are kept out of Google so they don't count as thin pages. Deactivating a category hides it and its label (the articles stay). A category with articles can't be deleted: move the articles first or deactivate it. Article addresses (`/blog/<slug>`) never change, and the slugs `category`, `categories` and `page` are reserved.

### Blog posts and service pages use the same blocks
Website content like articles and service pages is built with the same blocks as pages. In **Blog** (new or edit) and **Website Services** (new or edit) scroll to **Article content (blocks)** / **Service page content (blocks)**: press **+ Add block** and choose Hero, Text, Image + text, FAQ, Call to action, Services grid, Latest blog posts, Contact cards or Price calculator. When a post or service has blocks, visitors see the blocks instead of the plain text fields above them (those stay as a fallback and are only required when there are no blocks).

### Page structure (Website → Page Structure)
Pages can be organised as a **tree**: a page can have a parent and sub-pages (for example *Services → AC Repair, AC Cleaning*; *Join Us → Current Vacancies*).
* **Expand / collapse** a parent with the arrow, or use **Expand all / Collapse all** (the choice is remembered in your browser). Search by name or address, or filter by status (a search shows a flat list; clear it to rearrange).
* **Drag ⋮⋮** to reorder. Drag **sideways** to move a page inside the one above (or out again); its sub-pages travel with it. The arrows **↑ ↓ ⇤ ⇥** do the same with the keyboard or on a phone. **Every change is saved at once** to the database (you see “Structure saved”); if something can't be saved (for example a page inside its own sub-page) it is rejected and put back.
* **Parent page** is chosen when you create a page (**+ New page**, or **+ Sub-page** on a row) and can be changed any time in the page builder's settings. A page can be nested up to 6 levels deep.
* Each row shows the status (**Draft / Published / Scheduled**), the address, the SEO score, and has **Edit**, **Preview**, **Publish / Unpublish** and **+ Sub-page**. **Menus ▾** adds or removes the page in any of the navigation menus below.
* **The tree only organises your pages.** Moving a page never changes its address (URL), content, SEO or history, and existing pages simply start at the top level. When a page's address *is* changed (its slug) the old address redirects to the new one automatically, and older redirects are updated so they never chain or loop. When you **delete** a page, its sub-pages move up to its parent and, if the page was live and its parent is live, visitors of the old address are redirected to the parent.

### Navigation menus (Website → Navigation Menus)
Five independent menus; changing one never changes another: **Header** (top bar), **Mobile** (optional: when it has items, phones use it instead of the Header menu), **Services** (a “Services” link column in the footer), **Locations** (a “Locations” column in the footer, replacing the plain list of areas) and **Footer quick links**. Each menu supports two levels, labels in both languages, and show/hide on desktop or mobile. Links to pages that are still drafts are hidden on the website until the page is published.

### Visual text editor (every description, subtitle and main text)
Every multi-line text in the blocks (Hero subtitle, Text, Image + text, FAQ answers, section subtitles, form intro…) and the **Main text** of blog articles and service pages use a visual editor (what you see is what visitors get), in English and Arabic. The toolbar has: Undo / Redo, **Paragraph / Heading 2–4**, **font size**, **line height**, **Bold, Italic, Underline, Strikethrough**, **text colour** and **highlight**, **alignment** (start, centre, end, justify), **bulleted and numbered lists**, **quote**, **link** (choose a page, or type `/page`, `https://…`, `tel:…`, `mailto:…`; tick *Open in a new tab* for a new tab) and **Unlink**, **image** (from the Media library, with an alt text), a **divider line**, **Clear formatting** (Tx) and **`</>` HTML source** (only safe formatting is kept: scripts, unknown tags and unsafe links are removed). There is no practical limit on how much you can write. Pick colours that read well on both the light and the dark site theme.
Text written before this editor existed is shown converted (paragraphs and links keep working) and is left untouched until you edit it. Single-line fields (headings, button labels) and the short description / excerpt of a service or article stay plain text, because they also appear in cards and search results.

### Links inside text (simple text boxes)
Under every multi-line text box in a block (Text, Hero subtitle, FAQ answers…) there is **🔗 Add a link**. Select the words first if you like, press the button, choose a page (or type `/page`, `https://…`, `tel:…`, `mailto:…`) and tick the style: **Bold**, **Thin**, **Underline**. Links open in the **same tab**; tick **Open in a new tab** only when you want a new one. The editor stores the link as `[words](/page){b,u}` (b = bold, t = thin, u = underline, n = new tab); you can also type it by hand. Only site paths, https, tel and mailto addresses are accepted.

## 4. SEO (Website → SEO, and the panel inside the page builder)

* A **score out of 100** and a list of fixes: titles/descriptions (EN + AR), one H1, image text, broken internal links, duplicate titles, thin content.
* A **Google preview**, focus keyword, canonical, social image, and “hide from search engines”.
* An **answer-engine checklist** (direct answer, question headings, FAQ, last-updated date). No tool can guarantee appearing in Google AI or ChatGPT answers.
* Structured data (page, breadcrumbs, FAQ, service, local business) is generated automatically and **checked before publishing**.
* **Redirects & Sitemap** shows exactly what `/sitemap.xml` lists. Pages hidden from search engines are left out.

**Keywords.** Under the SEO description in blog articles, service pages and blog categories there are two fields: “Keywords (English)” and “الكلمات المفتاحية (Arabic)”. Type the keywords separated by commas (`,` or `،`) — duplicates and extra spaces are cleaned automatically (up to 30 keywords, each under 80 characters). They are published as the `meta keywords` tag in the visitor’s language. Pages built in the page builder keep their “Focus keyword” and “Other keywords” in the SEO panel.

## 5. Media (Website → Media)

Upload images (JPG, PNG, WebP, GIF, AVIF; up to 10 MB). They are converted to WebP in several sizes. Add alt text (EN + AR). An image used on a live page can't be deleted until replaced; the library shows where each image is used.

## 6. Menus, contact details, social (Website → …)

* **Menus:** five independent menus (Header, Mobile, Services, Locations, Footer); drag to reorder, add dropdown sub-items, show/hide on desktop or mobile. See *Navigation menus* above.
* **Site & Contact:** name, logo, phone, WhatsApp (with a pre-filled message), email, address, hours, header button, footer areas, default language, and the **search-engine indexing** switch. These details are used everywhere.
* **Social links:** shown in the footer and in business data for search engines.

## 7. Forms and leads (Website → Forms & Leads)

Build a form (field types: text, email, phone, long text, dropdown, checkbox), put it on a page with the **Form** block. Leads appear under the form with a status (New / Contacted / Closed / Spam) and a note; **Export CSV** downloads them. Bots are filtered automatically and each visitor is rate-limited. Leads contain personal data: only people with the *leads* permission can see them.

## 8. Integrations (Website → Integrations — Owner only)

Google Tag Manager, GA4, Meta Pixel, Search Console and Bing verification, and the cookie banner. Each card lists what you need. Analytics and marketing scripts load **only after the visitor agrees**. If you use Tag Manager, set GA4 inside it (the direct GA4 ID is ignored then).

## 9. Dynamic Pricing

* **Prices & Services:** type a price in AED per emirate; an empty cell means “not available there”.
* **Discounts:** tiers on the total quantity (one tier applies, never stacked). The preview table uses the same engine as real bookings.
* **Booking Types:** Standard / Priority / Emergency fees, hours, per-service or per-emirate overrides.
* **Tax & Visit Fee:** VAT, and the visit-fee policy (each save publishes a new numbered version).
* **Orders:** the order page shows the exact price breakdown the customer saw, a timeline (mark *Team dispatched*, etc.) and the visit-fee form. A visit fee is allowed only after dispatch and never when the company cancels or the team doesn't show up.
* Changing a price **never** changes existing orders.

**Example: AC Maintenance with Cleaning / Repair / Gas refill / Inspection, or Electrical with Change lights / Internal fault / External fault.** Create one service for the group, add each choice as an option, set a **question** (e.g. “What do you need?”) and an optional **note** under each option (e.g. “Labour only, parts extra”). `scripts/seedServiceOptions.ts` creates both examples, switched off and unpriced.

**Service options.** When the price depends on a choice (a gas refill by weight: ¼ kg, ½ kg, 1 kg), open the service (**Edit**) and add **Options** (English and Arabic names). Then enter each option's price per emirate in **Prices by emirate**: the options appear as ↳ rows under the service. The customer must pick one option, and its price is the unit price (the service itself then has no price of its own). An option with no price in an emirate is not offered there. Orders keep the option's name. **Service note:** the optional note on a service (for example “Repair only, spare parts not included”) is shown to customers next to the service and in the price summary.

## 10. Backup (Website → Backup)

**Download content backup** saves pages (as drafts), site settings, menus, social, forms, areas and redirects. It does **not** include leads, customers, orders or image files. **Import** (Owner only) checks the file first and changes nothing until you confirm; pages always arrive as drafts.

---

## 11. Technical: environment variables

**Admin app (`osta-erp`)**

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | Postgres connection (Neon) |
| `AUTH_SECRET` | Signs admin sessions, preview links and visitor-IP hashes — **set a long random value in production** |
| `CUSTOMER_JWT_SECRET` | Customer login tokens (required in production) |
| `SITE_URL` | Public website address (previews, instant refresh, structured data) |
| `REVALIDATE_SECRET` | Lets the admin refresh the public site instantly (same value on both apps) |
| `CRON_SECRET` | Optional: protects `/api/cron/publish-scheduled` |
| `RESEND_API_KEY`, `ADMIN_NOTIFICATION_EMAIL`, `RESEND_FROM_EMAIL` | Email alerts (signups, bookings, leads). Without them alerts are only logged. Verify a sending domain at Resend to email anyone other than the account owner. |

**Public site (`osta-bookig-users`)**

| Variable | Purpose |
|---|---|
| `NEXT_PUBLIC_API_BASE` | Admin API address, e.g. `https://…/api/v1` |
| `REVALIDATE_SECRET` | Same value as the admin app |

Without `SITE_URL` + `REVALIDATE_SECRET`, edits appear on the site within about a minute (and an unpublish takes about a minute too).

## 12. Technical: deploy and first-time setup

1. Set the environment variables above on both Vercel projects.
2. Apply the schema (additive, safe to repeat): `npx prisma db push` in `osta-erp`.
3. Run the seeds once (all are safe to repeat, none overwrites your edits):
   ```
   npx tsx scripts/seedPricing.ts     # emirates, AC tiers, booking types, VAT, visit-fee policy (sets NO prices)
   npx tsx scripts/seedRoles.ts       # the six permission roles
   npx tsx scripts/seedSite.ts        # site settings + header/footer exactly as they are today
   npx tsx scripts/seedAreas.ts       # one service area per emirate
   ```
4. In admin: enter prices (Dynamic Pricing), fill Site & Contact, then optionally *Create editable homepage* and publish it.
5. Until prices exist the booking page keeps using the original request form.

## 13. Technical: database backup and restore

* **Neon (recommended):** use point-in-time restore / branching in the Neon console. Create a branch before risky changes; restore to any moment within your plan's history window.
* **Manual copy:** `pg_dump "$DATABASE_URL" -Fc -f osta-$(date +%F).dump` and restore with `pg_restore -d <new-database-url> osta-….dump`. Keep dumps somewhere private: they contain customer data.
* **Content only:** Website → Backup (JSON). Uploaded images live in the database, so a database backup includes them.
* Test a restore on a branch/copy before you need it.

## 14. Technical: tests and checks

```
npm test            # unit tests (pricing, rules, SEO, forms, backup, links)
npx tsc --noEmit    # types
npm run lint
npm run build
```

---

# العربية

## ١. ما الذي يمكنك إدارته

| القسم | وظيفته |
|---|---|
| **الموقع** (الصفحات، الوسائط، السيو، القوائم، الموقع والتواصل، التواصل الاجتماعي، النماذج والعملاء المحتملون، مناطق الخدمة، التحويلات وخريطة الموقع، التكاملات، النسخ الاحتياطي) | محتوى الموقع العام |
| **التسعير الديناميكي** | أسعار كل إمارة، الخصومات، أنواع الحجز، الضريبة، سياسة رسوم الزيارة ومراجعتها |
| **سجل التدقيق** | من غيّر ماذا ومتى، مع القيمة قبل وبعد |
| **أقسام الرئيسية، المدونة، خدمات الموقع** | أقسام المحتوى الأقدم (ما زالت تعمل) |

تطبيق العملاء (الدخول والحجز والطلبات والفواتير) موقع منفصل يقرأ كل هذا عبر الـ API.

## ٢. الأدوار

يمكن للمدير العام (Super Admin) منح **دور صلاحيات** لأي مدير: الموظفون ← تعديل ← *Permission Role*. بدون دور يبقى للمدير صلاحية كاملة كما كان.

| الدور | يستطيع |
|---|---|
| المالك | كل شيء بما فيه التكاملات والاستيراد |
| مدير | كل شيء عدا التكاملات |
| محرر | إنشاء وتعديل الصفحات وإدارة الوسائط |
| سيو | السيو وتعديل الصفحات |
| العمليات | الطلبات ومراجعة رسوم الزيارة والعملاء المحتملون |
| مشاهد | عرض الطلبات والعملاء المحتملين فقط |

كل تغيير يُسجَّل في **سجل التدقيق**.

## ٣. الصفحات ومنشئ الصفحات (الموقع ← الصفحات)

١. **صفحة جديدة** ← العنوان بالعربية والإنجليزية ورابط الصفحة (slug). بعض الروابط مثل `about` و`blog` محجوزة للموقع.
٢. **إضافة بلوك** (الواجهة، شبكة الخدمات، نص، صورة ونص، الأسئلة الشائعة، إحصائيات، دعوة لاتخاذ إجراء، نموذج، أحدث المقالات، أقسام الرئيسية). كل نص له خانة بالعربية وأخرى بالإنجليزية.
٣. **اسحب ⠿** لإعادة الترتيب. **إخفاء** يُبقي البلوك لكن يزيله من الموقع. يمكن النسخ أو الحذف. ويمكن إظهار كل بلوك على الكمبيوتر أو الجوال أو كليهما.
٤. يُحفظ العمل تلقائياً كـ **مسودة**؛ زر **حفظ** يسجّل أيضاً نسخة في **السجل** ويمكنك استعادة أي نسخة.
٥. **معاينة** تعرض المسودة بحجم الكمبيوتر أو التابلت أو الجوال (الرابط ينتهي بعد ١٥ دقيقة).
٦. **نشر** يجعل الصفحة مباشرة. **جدولة** تنشرها في الوقت الذي تختاره. **إلغاء النشر** يُنزلها من الموقع. لا يصل أي شيء للزوار قبل النشر.
٧. تغيير رابط صفحة منشورة ينشئ تحويلاً دائماً (301) تلقائياً.

**الصفحة الرئيسية:** الموقع ← الصفحات ← *Create editable homepage* تنشئ **مسودة** نسخة من الرئيسية الحالية. عاينها وقارنها ثم انشرها. وإلغاء النشر يعيدك للصفحة الرئيسية المدمجة في أي وقت.

**صفحات المناطق (السيو المحلي):** الموقع ← مناطق الخدمة ← *Create page*. كل صفحة منطقة تحتاج محتوى خاصاً بها؛ ولا يمكن نشر صفحة تكاد تكون نسخة من صفحة منطقة أخرى.

### الشريط الجانبي
يُقسَّم الشريط الجانبي إلى وحدات: **لوحة التحكم**، **الطلبات والحجوزات**، **الموارد البشرية والموظفون**، **المالية والمحاسبة**، **التقارير والتحليلات**، **التسويق والمدونة**، **إدارة الموقع**، **الأسطول والمركبات**، **المخزون والخدمات**، و**إدارة النظام**. اضغط على الوحدة لفتح صفحاتها؛ وتبقى الوحدة والصفحة الحالية مظللتين ومفتوحتين. الصفحة التي تتبع وحدتين (مثل Work Reports) هي نفس الصفحة وتظهر في الاثنتين. استخدم مربع البحث (أو **Ctrl/Cmd + K**) للانتقال إلى أي صفحة. السهم في الأعلى يطوي الشريط إلى أيقونات (اضغط أيقونة الوحدة لفتحه مجدداً)، ويتذكر الشريط حالة الطي والوحدات التي فتحتها. على الهاتف تُفتح نفس القائمة كدرج. لا ترى إلا الوحدات والصفحات التي يسمح بها دورك، ويتحقق الخادم من الصلاحية في كل صفحة أيضاً.

### الملفات التقنية والذكاء الاصطناعي (الموقع ← Technical Files & AI)
عدّل الملفات التي تُقدَّم من جذر الموقع: **robots.txt** (قواعدك الإضافية؛ وتُضاف القواعد القياسية وخريطة الموقع تلقائياً)، و**سياسة زواحف الذكاء الاصطناعي** (السماح، أو منع التدريب فقط، أو منع الكل)، و**llms.txt** (دليل لمساعدي الذكاء الاصطناعي؛ والزر *Generate from my site* يكتب مسودة أولى)، و**ads.txt** و**security.txt** (للمالك فقط). يعرض كل ملف عنوانه لتتحقق منه مباشرة.

### كود الهيدر والفوتر (الموقع ← Header & Footer Code وPage Code)
الصق مقتطفاً (وسم تتبع، أو بكسل، أو أداة دردشة، أو وسم تحقق) لإضافته إلى الهيدر أو نهاية الصفحة في **كل الصفحات**، أو في **صفحة واحدة** من *Page Code*. لكل مربع اختر وقت التحميل: دائماً، أو بعد سماح الزائر بملفات التحليلات، أو بعد سماحه بملفات التسويق (الافتراضي التحليلات). للمالك فقط، وتُسجَّل التغييرات في سجل التدقيق. لا تلصق إلا كوداً تثق به.

### أقسام المدونة (المدونة ← الأقسام)
تُنظَّم المدونة في أقسام. تم إنشاء عشرين قسماً افتراضياً (بالعربية والإنجليزية)، ويمكنك إضافة أي عدد من الأقسام أو تعديل أسمائها أو إعادة ترتيبها (▲▼) أو إيقافها أو حذفها من **Blog → Categories**. لكل قسم اسم ووصف بالعربية والإنجليزية، ورابط (slug)، وعنوان ووصف للسيو، وصورة غلاف اختيارية. عند كتابة مقال **اختر قسمه** (إلزامي) ويمكنك تحديد أقسام إضافية تحت *Also show in*؛ والخيار **+ Create New Category** داخل نموذج المقال ينشئ قسماً فوراً ويختاره. فعّل **Featured article** ليظهر المقال في قسم المقالات المميزة.

لكل قسم صفحة على الموقع (`/blog/category/<slug>`). يظهر القسم عندما يحتوي على مقال منشور واحد على الأقل، ويُعرَض لمحركات البحث (وخريطة الموقع) من 3 مقالات؛ أما الأقسام الأصغر فتبقى متاحة للزوار لكن خارج جوجل حتى لا تُعدّ صفحات ضعيفة. إيقاف القسم يخفيه ويخفي وسمه (وتبقى المقالات). لا يمكن حذف قسم فيه مقالات: انقل المقالات أولاً أو أوقف القسم. روابط المقالات (`/blog/<slug>`) لا تتغير، والكلمات `category` و`categories` و`page` محجوزة.

### المقالات وصفحات الخدمات تستخدم نفس الأقسام
تُبنى المقالات وصفحات الخدمات بنفس أقسام الصفحات. في **المدونة** (جديد أو تعديل) و**خدمات الموقع** (جديد أو تعديل) انزل إلى **Article content (blocks)** / **Service page content (blocks)**: اضغط **+ Add block** واختر Hero أو Text أو Image + text أو FAQ أو Call to action أو Services grid أو Latest blog posts أو Contact cards أو Price calculator. عندما يحتوي المقال أو الخدمة على أقسام يرى الزوار الأقسام بدلاً من حقول النص العادي أعلاها (وتبقى تلك الحقول احتياطية ولا تكون مطلوبة إلا عند عدم وجود أقسام).

### هيكل الصفحات (الموقع ← Page Structure)
يمكن تنظيم الصفحات على شكل **شجرة**: لكل صفحة صفحة أم وصفحات فرعية (مثل *الخدمات ← صيانة المكيفات، تنظيف المكيفات*؛ *انضم إلينا ← الوظائف المتاحة*).
* **افتح / اطوِ** الصفحة الأم بالسهم، أو استخدم **Expand all / Collapse all** (يُحفظ اختيارك في المتصفح). ابحث بالاسم أو العنوان أو صفِّ بالحالة (البحث يعرض قائمة مسطحة؛ امسحه لإعادة الترتيب).
* **اسحب ⋮⋮** لإعادة الترتيب. اسحب **جانباً** لوضع الصفحة داخل الصفحة التي فوقها (أو إخراجها)؛ وتنتقل معها صفحاتها الفرعية. الأسهم **↑ ↓ ⇤ ⇥** تفعل نفس الشيء بلوحة المفاتيح أو على الجوال. **كل تغيير يُحفظ فوراً** في قاعدة البيانات (تظهر رسالة “Structure saved”)؛ وإن تعذّر الحفظ (مثل وضع صفحة داخل صفحتها الفرعية) يُرفض ويعود كما كان.
* **الصفحة الأم** تُختار عند إنشاء الصفحة (**+ New page** أو **+ Sub-page** على الصف) ويمكن تغييرها في أي وقت من إعدادات منشئ الصفحات. أقصى عمق للتداخل 6 مستويات.
* كل صف يعرض الحالة (**Draft / Published / Scheduled**) والعنوان ودرجة السيو، وفيه **Edit** و**Preview** و**Publish / Unpublish** و**+ Sub-page**. زر **Menus ▾** يضيف الصفحة أو يزيلها من أي قائمة تنقل من القوائم أدناه.
* **الشجرة تنظّم صفحاتك فقط.** نقل الصفحة لا يغيّر عنوانها (الرابط) ولا محتواها ولا السيو ولا سجل نسخها، والصفحات الحالية تبدأ في المستوى الأعلى. وعند تغيير عنوان الصفحة (slug) يُحوَّل العنوان القديم تلقائياً إلى الجديد، وتُحدَّث التحويلات القديمة فلا تتسلسل ولا تدور. وعند **حذف** صفحة تنتقل صفحاتها الفرعية إلى أمها، وإذا كانت الصفحة منشورة وأمها منشورة يُحوَّل زوار العنوان القديم إلى الأم.

### قوائم التنقل (الموقع ← Navigation Menus)
خمس قوائم مستقلة؛ تغيير أي واحدة لا يغيّر الأخرى: **Header** (الشريط العلوي)، **Mobile** (اختيارية: إن كان فيها عناصر يستخدمها الجوال بدل قائمة Header)، **Services** (عمود روابط «الخدمات» في الفوتر)، **Locations** (عمود «المواقع» في الفوتر بدل قائمة المناطق النصية)، و**Footer quick links** (الروابط السريعة). كل قائمة بمستويين وتسميات بالعربية والإنجليزية وإظهار/إخفاء للكمبيوتر أو الجوال. روابط الصفحات التي ما زالت مسودة تُخفى من الموقع حتى تُنشر الصفحة.

### محرر النصوص المرئي (كل الأوصاف والعناوين الفرعية والنص الرئيسي)
كل نص متعدد الأسطر في البلوكات (عنوان فرعي البطل، النص، صورة + نص، إجابات الأسئلة، عناوين الأقسام الفرعية، مقدمة النموذج…) و**النص الرئيسي** للمقالات وصفحات الخدمات تُكتب في محرر مرئي (ما تراه هو ما يراه الزائر) بالإنجليزية والعربية. شريط الأدوات فيه: تراجع/إعادة، **فقرة / عنوان 2–4**، **حجم الخط**، **ارتفاع السطر**، **عريض ومائل وتسطير وشطب**، **لون النص** و**التمييز**، **المحاذاة** (البداية، الوسط، النهاية، ضبط)، **قوائم نقطية ورقمية**، **اقتباس**، **رابط** (اختر صفحة أو اكتب `/page` أو `https://…` أو `tel:…` أو `mailto:…`؛ فعّل *Open in a new tab* لتبويب جديد) و**Unlink**، **صورة** (من مكتبة الوسائط مع نص بديل)، **خط فاصل**، **مسح التنسيق** (Tx)، و**`</>` كود HTML** (يبقى التنسيق الآمن فقط: تُحذف السكربتات والوسوم غير المعروفة والروابط غير الآمنة). لا يوجد حد عملي لطول الكتابة. اختر ألواناً تظهر جيداً على الوضعين الفاتح والداكن.
النصوص القديمة تظهر محوَّلة (الفقرات والروابط تعمل) وتبقى كما هي حتى تعدّلها. الحقول ذات السطر الواحد (العناوين وأسماء الأزرار) والوصف القصير للخدمة أو مقتطف المقال تبقى نصاً عادياً لأنها تظهر أيضاً في البطاقات ونتائج البحث.

### الروابط داخل النص (مربعات النص البسيطة)
تحت كل مربع نص متعدد الأسطر في أي قسم (النص، عنوان فرعي البطل، إجابات الأسئلة الشائعة…) يوجد زر **🔗 Add a link**. حدّد الكلمات أولاً إن أردت، اضغط الزر، اختر صفحة (أو اكتب `/page` أو `https://…` أو `tel:…` أو `mailto:…`) وحدد النمط: **عريض** أو **رفيع** أو **تسطير**. تُفتح الروابط في **نفس التبويب**؛ فعّل **Open in a new tab** فقط عندما تريد تبويباً جديداً. يُخزَّن الرابط بصيغة `[الكلمات](/page){b,u}` (b عريض، t رفيع، u تسطير، n تبويب جديد) ويمكنك كتابته يدوياً. تُقبل فقط عناوين مسارات الموقع وhttps وtel وmailto.

## ٤. السيو (الموقع ← السيو، واللوحة داخل منشئ الصفحات)

* **درجة من ١٠٠** وقائمة تحسينات: العناوين والأوصاف (عربي + إنجليزي)، عنوان رئيسي واحد، نص الصور، الروابط الداخلية المكسورة، العناوين المكررة، المحتوى الضعيف.
* **معاينة جوجل** وكلمة مفتاحية رئيسية والرابط الأساسي وصورة المشاركة وخيار «إخفاء عن محركات البحث».
* **قائمة محركات الإجابة** (إجابة مباشرة، عناوين على شكل أسئلة، أسئلة شائعة، تاريخ آخر تحديث). لا توجد أداة تضمن الظهور في إجابات جوجل بالذكاء الاصطناعي أو ChatGPT.
* البيانات المنظمة (الصفحة، مسار التنقل، الأسئلة الشائعة، الخدمة، النشاط المحلي) **تُنشأ تلقائياً وتُفحص قبل النشر**.
* **التحويلات وخريطة الموقع** تعرض بدقة ما يظهر في `/sitemap.xml`. الصفحات المخفية عن محركات البحث لا تظهر فيها.

**الكلمات المفتاحية.** تحت وصف السيو في نماذج المقالات وصفحات الخدمات وأقسام المدونة يوجد حقلان: «Keywords (English)» و«الكلمات المفتاحية (Arabic)». اكتب الكلمات مفصولة بفاصلة (, أو ،) — يُنظَّف التكرار والمسافات تلقائياً (حد أقصى ٣٠ كلمة، وكل كلمة أقل من ٨٠ حرفاً). تظهر في وسم `meta keywords` بلغة الزائر. صفحات منشئ الصفحات لها «Focus keyword» و«Other keywords» داخل لوحة السيو.

## ٥. الوسائط (الموقع ← الوسائط)

ارفع الصور (JPG وPNG وWebP وGIF وAVIF حتى ١٠ ميغابايت). تُحوَّل تلقائياً إلى WebP بعدة أحجام. أضف النص البديل (عربي + إنجليزي). لا يمكن حذف صورة مستخدمة في صفحة مباشرة قبل استبدالها، والمكتبة تعرض أين تُستخدم كل صورة.

## ٦. القوائم وبيانات التواصل والتواصل الاجتماعي

* **القوائم:** خمس قوائم مستقلة (Header وMobile وServices وLocations وFooter)؛ اسحب لإعادة الترتيب، أضف عناصر فرعية منسدلة، أظهر/أخفِ حسب الكمبيوتر أو الجوال. راجع *قوائم التنقل* أعلاه.
* **الموقع والتواصل:** الاسم والشعار والهاتف وواتساب (مع رسالة جاهزة) والبريد والعنوان وساعات العمل وزر الهيدر ومناطق الفوتر واللغة الافتراضية ومفتاح **السماح بالفهرسة**. تُستخدم هذه البيانات في كل مكان.
* **التواصل الاجتماعي:** يظهر في الفوتر وفي بيانات النشاط لمحركات البحث.

## ٧. النماذج والعملاء المحتملون (الموقع ← النماذج والعملاء)

أنشئ نموذجاً (حقول: نص، بريد، هاتف، نص طويل، قائمة، خانة اختيار) وضعه في أي صفحة ببلوك **النموذج**. تظهر الطلبات تحت النموذج مع حالة (جديد / تم التواصل / مغلق / مزعج) وملاحظة، وزر **Export CSV** ينزّلها. تُفلتر الروبوتات تلقائياً ويُحدَّد عدد المحاولات لكل زائر. الطلبات تحتوي بيانات شخصية: يراها فقط من لديه صلاحية *leads*.

## ٨. التكاملات (الموقع ← التكاملات — للمالك فقط)

Google Tag Manager وGA4 وبكسل ميتا وتحقق Search Console وBing ولافتة ملفات الارتباط. كل بطاقة توضح ما تحتاجه. تُحمَّل أدوات التحليل والتسويق **فقط بعد موافقة الزائر**. إن استخدمت Tag Manager فاضبط GA4 داخله (يُتجاهل معرّف GA4 المباشر حينها).

## ٩. التسعير الديناميكي

* **الأسعار والخدمات:** اكتب السعر بالدرهم لكل إمارة؛ الخانة الفارغة تعني «غير متاحة هناك».
* **الخصومات:** شرائح على إجمالي الكمية (تُطبَّق شريحة واحدة ولا تتراكم). جدول المعاينة يستخدم نفس محرك الحجز الحقيقي.
* **أنواع الحجز:** رسوم عادي / أولوية / طارئ والساعات واستثناءات لكل خدمة أو إمارة.
* **الضريبة ورسوم الزيارة:** ضريبة القيمة المضافة وسياسة رسوم الزيارة (كل حفظ ينشر نسخة جديدة مرقّمة).
* **الطلبات:** صفحة الطلب تعرض تفصيل السعر كما رآه العميل، وخطاً زمنياً (سجّل *وصول الفريق* وغيره) ونموذج رسوم الزيارة. لا تُفرض رسوم الزيارة إلا بعد تحرك الفريق، ولا تُفرض أبداً إذا ألغت الشركة أو لم يحضر الفريق.
* تغيير السعر **لا يغيّر** الطلبات السابقة أبداً.

## ١٠. النسخ الاحتياطي (الموقع ← النسخ الاحتياطي)

**Download content backup** يحفظ الصفحات (كمسودات) وإعدادات الموقع والقوائم والتواصل الاجتماعي والنماذج والمناطق والتحويلات. **لا** يشمل العملاء المحتملين ولا العملاء ولا الطلبات ولا ملفات الصور. **الاستيراد** (للمالك فقط) يفحص الملف أولاً ولا يغيّر شيئاً حتى تؤكد؛ والصفحات تصل دائماً كمسودات.

---

## ١١. تقني: متغيرات البيئة

**تطبيق الإدارة (`osta-erp`)**

| المتغير | الغرض |
|---|---|
| `DATABASE_URL` | اتصال قاعدة البيانات (Neon) |
| `AUTH_SECRET` | يوقّع جلسات الإدارة وروابط المعاينة وبصمات عناوين IP — **اضبط قيمة عشوائية طويلة في الإنتاج** |
| `CUSTOMER_JWT_SECRET` | رموز دخول العملاء (مطلوب في الإنتاج) |
| `SITE_URL` | عنوان الموقع العام (المعاينة والتحديث الفوري والبيانات المنظمة) |
| `REVALIDATE_SECRET` | يتيح للإدارة تحديث الموقع فوراً (نفس القيمة في التطبيقين) |
| `CRON_SECRET` | اختياري: يحمي `/api/cron/publish-scheduled` |
| `RESEND_API_KEY` و`ADMIN_NOTIFICATION_EMAIL` و`RESEND_FROM_EMAIL` | تنبيهات البريد (التسجيل والحجز والعملاء المحتملون). بدونها تُسجَّل التنبيهات فقط. وللإرسال لغير مالك حساب Resend يجب توثيق نطاق. |

**الموقع العام (`osta-bookig-users`)**

| المتغير | الغرض |
|---|---|
| `NEXT_PUBLIC_API_BASE` | عنوان API الإدارة، مثل `https://…/api/v1` |
| `REVALIDATE_SECRET` | نفس قيمة تطبيق الإدارة |

بدون `SITE_URL` و`REVALIDATE_SECRET` تظهر التعديلات في الموقع خلال دقيقة تقريباً (وإلغاء النشر كذلك).

## ١٢. تقني: النشر والإعداد الأول

١. اضبط متغيرات البيئة أعلاه في مشروعَي Vercel.
٢. طبّق المخطط (إضافات فقط ويمكن تكراره): `npx prisma db push` في `osta-erp`.
٣. شغّل البيانات الأولية مرة واحدة (آمنة للتكرار ولا تمسح تعديلاتك):
   ```
   npx tsx scripts/seedPricing.ts     # الإمارات وشرائح التكييف وأنواع الحجز والضريبة وسياسة رسوم الزيارة (بدون أسعار)
   npx tsx scripts/seedRoles.ts       # أدوار الصلاحيات الستة
   npx tsx scripts/seedSite.ts        # إعدادات الموقع والهيدر والفوتر كما هي الآن
   npx tsx scripts/seedAreas.ts       # منطقة خدمة لكل إمارة
   ```
٤. من الإدارة: أدخل الأسعار (التسعير الديناميكي) واملأ «الموقع والتواصل»، ثم اختيارياً أنشئ الصفحة الرئيسية القابلة للتعديل وانشرها.
٥. حتى تُدخل الأسعار تبقى صفحة الحجز تستخدم نموذج الطلب الأصلي.

## ١٣. تقني: النسخ الاحتياطي لقاعدة البيانات واستعادتها

* **Neon (الموصى به):** استخدم الاستعادة لنقطة زمنية والتفرعات من لوحة Neon. أنشئ فرعاً قبل أي تغيير حساس.
* **نسخة يدوية:** `pg_dump "$DATABASE_URL" -Fc -f osta-$(date +%F).dump` والاستعادة بـ `pg_restore -d <رابط-قاعدة-جديدة> osta-….dump`. احفظ الملفات في مكان خاص فهي تحتوي بيانات العملاء.
* **المحتوى فقط:** الموقع ← النسخ الاحتياطي (JSON). الصور مخزنة في قاعدة البيانات فنسخة القاعدة تشملها.
* جرّب الاستعادة على فرع أو نسخة قبل أن تحتاجها.
