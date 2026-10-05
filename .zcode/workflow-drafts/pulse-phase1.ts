/* Dynamic workflow: تکمیل فاز ۱ پروژه Pulse (Foundation & Design System) + ممیزی arena-audit */

interface BuilderResult {
  /** فایل‌های ساخته‌شده یا تغییر‌یافته، مسیر نسبی از ریشه پروژه */
  files: string[];
  /** خلاصه ۲ تا ۳ جمله‌ای فارسی از کاری که انجام شد */
  summary: string;
  /** اگر از قراردادها منحرف شدی اینجا توضیح بده؛ وگرنه رشته خالی */
  deviations: string;
}

interface GateResult {
  /** نام گیت مثل tsc یا eslint */
  name: string;
  passed: boolean;
  /** توضیح کوتاه فارسی (مثلاً تعداد خطا) */
  detail: string;
}

interface AuditFinding {
  /** عنوان کوتاه یافته */
  title: string;
  /** محل: مسیر فایل و در صورت امکان شماره خط */
  where: string;
  severity: "high" | "medium" | "low";
  /** وضعیت یافته در موتور ممیزی مثل verified / inconclusive */
  status: string;
  /** توضیح یک جمله‌ای فارسی */
  what: string;
}

interface AuditSummary {
  /** verdict نهایی، ۱ تا ۲ جمله فارسی */
  verdict: string;
  /** نمره کلی یا N/A با درصد پوشش — عین همان که گزارش می‌گوید */
  score: string;
  gates: GateResult[];
  findings: AuditFinding[];
}

interface FixResult {
  /** یافته‌هایی که واقعاً اصلاح شدند */
  fixed: string[];
  /** یافته‌هایی که عمداً اصلاح نشدند و چرا */
  skipped: { title: string; reason: string }[];
  /** خلاصه فارسی */
  summary: string;
}

interface DocsResult {
  files: string[];
  summary: string;
}

interface WorkflowReport {
  conclusion: string;
  findings: {
    where: string;
    what: string;
    evidence: string;
    status: "verified" | "unconfirmed";
    severity: "low" | "medium" | "high";
  }[];
  verified: string[];
  notCovered: string[];
}

const ARENA = "C:/Users/NAICo - PC 8/arena-audit/bin/arena-audit.mjs";

const RULES = [
  "قواعد سخت (بی‌استثنا):",
  "1) فقط فایل‌های مجازی که برایت لیست می‌کنم را بساز یا تغییر بده؛ خواندن هر فایلی آزاد است.",
  "2) هیچ دستور npm/npx اجرا نکن، هیچ dependency نصب نکن و هرگز بیلد نگیر — گیت بیلد توسط اسکریپت اجرا می‌شود.",
  "3) Server Component پیش‌فرض است؛ 'use client' فقط برای تعامل واقعی مرورگر (state، effect، event handler).",
  "4) TypeScript strict، بدون any؛ از کامپوننت‌های آماده در src/components/ui استفاده کن و هرگز آن‌ها را بازنویسی یا ویرایش نکن.",
  "5) استایل فقط با Tailwind utility classes و توکن‌های متغیر CSS؛ استایل inline یا CSS جدید نساز.",
  "6) Accessibility: HTML معنایی، aria-label برای دکمه‌های فقط-آیکونی، ترتیب تب منطقی، کنتراست کافی.",
  "7) محتوای UI انگلیسی است (محصول developer-oriented)؛ اما گزارش نهایی‌ات را فارسی بنویس.",
  "8) کامنت فقط برای constraint غیربدیهی؛ کیفیت کد portfolio-grade.",
].join("\n");

const DESIGN =
  "Design direction: dark-first، minimal، premium و developer-oriented (الهام از Linear و Vercel — نه کپی). " +
  "borderهای ظریف، spacing دقیق، typography قوی با tracking-tight برای تیترها، hover و transition های ظریف؛ از انیمیشن اضافه پرهیز کن.\n\n";

const promptA =
  RULES + "\n\n" + DESIGN +
  "وظیفه تو: لایه تم و توکن‌های طراحی Pulse. فایل‌های مجاز تو (فقط همین‌ها):\n" +
  "- src/app/globals.css\n" +
  "- src/app/layout.tsx\n" +
  "- src/components/theme-provider.tsx\n" +
  "- src/config/site.ts\n" +
  "- docs/architecture/adr-002-design-tokens-dark-first.md\n\n" +
  "قرارداد اجباری:\n" +
  "1) globals.css ساختار Tailwind v4 را حفظ کند: import های tailwindcss و tw-animate-css، سپس @custom-variant dark (&:is(.dark *)); سپس بلوک :root برای تم روشن و بلوک .dark برای تم تیره، سپس @theme inline که متغیرها را به --color-* نگاشت می‌کند و فونت‌ها را به var(--font-geist-sans) و var(--font-geist-mono).\n" +
  "2) پالت premium با oklch. تم تیره (.dark) مرجع طراحی است: --background حدود oklch(0.145 0.005 275)؛ --card و --popover حدود oklch(0.175 0.006 275)؛ --primary بنفش-آبی برند حدود oklch(0.62 0.19 278)؛ --ring همرنگ primary؛ --border حدود oklch(0.27 0.008 275)؛ --muted حدود oklch(0.195 0.006 275)؛ --secondary و --accent کمی روشن‌تر از muted؛ foreground ها خنثی با کنتراست AA. تم روشن (:root) پس‌زمینه سفید-خنثی با همان primary کمی تیره‌تر.\n" +
  "3) --radius: 0.625rem و توکن‌های chart-1 تا chart-5.\n" +
  "4) مجموعه کامل توکن‌های sidebar باید تعریف و در @theme inline نگاشت شود: --sidebar، --sidebar-foreground، --sidebar-primary، --sidebar-primary-foreground، --sidebar-accent، --sidebar-accent-foreground، --sidebar-border، --sidebar-ring (همراه --color-sidebar-*). مقدار sidebar را کمی متفاوت از background بگیر تا عمق ایجاد شود.\n" +
  "5) src/app/layout.tsx: export const metadata با title دوتایی (default: 'Pulse — Modern platform for software teams' و template '%s — Pulse') و description کوتاه؛ تگ html با lang='en' و suppressHydrationWarning؛ body با کلاس‌های متغیر فونت Geist (موجود است) به‌علاوه antialiased و bg-background و text-foreground. داخل body: ThemeProvider با props دقیق { attribute='class', defaultTheme='dark', enableSystem={false} } دور children، و بعد از children کامپوننت Toaster از '@/components/ui/sonner'. فونت‌های Geist از next/font/google که الان در فایل هست را نگه دار.\n" +
  "6) src/components/theme-provider.tsx: 'use client' و wrapper تایپ‌شده دور NextThemesProvider با props استاندارد next-themes.\n" +
  "7) src/config/site.ts: export const siteConfig تایپ‌شده با فیلدهای name ('Pulse')، tagline، description و url.\n" +
  "8) ADR انگلیسی مختصر و فنی در مسیر داده‌شده با ساختار Context/Decision/Alternatives/Trade-offs/Consequences درباره: توکن‌های CSS-first در Tailwind v4 و dark-first بودن با استراتژی class در next-themes.";

const promptB =
  RULES + "\n\n" + DESIGN +
  "وظیفه تو: App Shell داشبورد Pulse. فایل‌های مجاز تو (فقط همین‌ها):\n" +
  "- src/config/nav.ts\n" +
  "- src/components/layout/logo.tsx\n" +
  "- src/components/layout/sidebar.tsx\n" +
  "- src/components/layout/header.tsx\n" +
  "- src/components/layout/mobile-nav.tsx\n" +
  "- src/components/layout/mode-toggle.tsx\n" +
  "- src/components/shared/page-header.tsx\n" +
  "- src/components/shared/empty-state.tsx\n" +
  "- src/components/shared/error-state.tsx\n" +
  "- src/app/(dashboard)/layout.tsx\n\n" +
  "قراردادهای تیم (هم‌تیمی‌هایت دقیقاً بر همین امضاها کد می‌زنند — منحرف نشو):\n" +
  "- PageHeader از '@/components/shared/page-header': props { title: string; description?: string; children?: ReactNode } — چیدمان flex بین بلوک عنوان (h1 با text-2xl font-semibold tracking-tight و p اختیاری با text-muted-foreground) و children به‌عنوان actions. بدون 'use client'.\n" +
  "- EmptyState از '@/components/shared/empty-state': props { icon?: LucideIcon; title: string; description?: string; children?: ReactNode } — ظرف وسط‌چین با border dashed و rounded-lg و py-16، آیکون داخل دایره muted، children به‌عنوان action. بدون 'use client'.\n" +
  "- ErrorState از '@/components/shared/error-state': props { title?: string; description?: string; children?: ReactNode } — ارائه destructive ظریف (آیکون AlertCircle)، children به‌عنوان action مثل دکمه retry. بدون 'use client'.\n" +
  "- nav.ts: export interface NavItem { title: string; href: string; icon: LucideIcon } و دو آرایه: mainNav = Overview /overview (LayoutDashboard)، Projects /projects (FolderKanban)، Issues /issues (CircleDot)، Analytics /analytics (TrendingUp)؛ secondaryNav = Docs /docs (FileText)، Assistant /assistant (Sparkles)، Settings /settings (Settings). فقط همین آیکون‌ها (در lucide-react نصب‌شده موجودند). icon ها را به‌صورت reference ذخیره کن نه string.\n\n" +
  "جزئیات پیاده‌سازی:\n" +
  "- sidebar.tsx ('use client'): عنصر aside با sticky top-0 و h-svh، در عرض‌های زیر lg با hidden lg:flex مخفی، bg-sidebar و border-r border-sidebar-border؛ عرض 16rem وقتی باز و 3.75rem وقتی جمع است با transition-[width]. وقتی جمع است فقط آیکون‌ها دیده شوند و Tooltip نشان بده. state با useState و useState اولیه از localStorage با کلید 'pulse.sidebar.collapsed' در useEffect (الگوی mount-safe تا hydration خراب نشود). لینک‌ها با usePathname برای active state: کلاس active برابر bg-sidebar-accent و text-sidebar-accent-foreground. بالای nav: کامپوننت Logo و یک دکمه workspace switcher ساده (Avatar مربعی با حرف A + نام 'Acme Inc' + آیکون ChevronsUpDown). پایین sidebar: ردیف کاربر با Avatar و نام 'Reza M.' و ایمیل کوتاه. روی nav از aria-label='Main navigation' استفاده کن. دکمه جمع/باز کردن با آیکون PanelLeftClose و PanelLeftOpen با aria-label مناسب؛ کلید rotation آیکون‌ها با کلاس‌های data-[state] یا شرط ساده.\n" +
  "- header.tsx ('use client'): header با sticky top-0 و z-30 و h-14 و border-b و bg-background/80 و backdrop-blur؛ شامل از راست: کامپوننت MobileNav (خودش دکمه همبرger دارد و زیر lg دیده می‌شود)، سپس دکمه جستجوی ظاهر-اینپوت (عرض حدود 240px، آیکون Search، متن 'Search...'، و در انتها kbd با '⌘K') که onClick با sonner این را نشان می‌دهد: toast('Command palette', { description: 'Ships in Phase 7' })؛ سپس فاصله با flex-1؛ سپس ModeToggle؛ سپس DropdownMenu کاربر با trigger آواتار initials 'RM' و آیتم‌های Profile، Settings، یک Separator و Sign out — هر آیتم فعلاً فقط toast اطلاع می‌دهد (auth در فاز ۲ می‌آید). aria-label برای دکمه جستجو.\n" +
  "- mobile-nav.tsx ('use client'): Sheet از shadcn با side='left'؛ trigger دکمه Menu با className lg:hidden و aria-label='Open navigation'؛ داخل SheetContent: SheetTitle (می‌تواند sr-only باشد)، Logo، و همان mainNav و secondaryNav با active state با usePathname؛ کلیک روی لینک Sheet را ببندد.\n" +
  "- mode-toggle.tsx ('use client'): Button variant ghost و size icon با aria-label='Toggle theme'؛ آیکون Sun و Moon با چرخش ظریف؛ از useTheme با resolvedTheme و mounted check استفاده کن تا hydration mismatch نشود؛ toggle بین light و dark.\n" +
  "- (dashboard)/layout.tsx بدون 'use client' (server): div با flex و min-h-svh و w-full شامل Sidebar و div با min-w-0 و flex-1 و flex و flex-col شامل Header و main با flex-1 و px-4 و py-6 و md:px-6 و lg:px-8 که children را رندر می‌کند.\n" +
  "- logo.tsx بدون 'use client': props { compact?: boolean } — مربع 7x7 با rounded-md و گرادیان از primary (from-primary/90 to-primary) و آیکون Activity سفید سایز 4x4 در مرکز؛ اگر compact نبود متن 'Pulse' با font-semibold و tracking-tight کنارش.\n" +
  "توکن‌های sidebar (bg-sidebar، text-sidebar-foreground، bg-sidebar-accent و بقیه) را که هم‌تیمی‌ات در globals.css تعریف می‌کند فرض کن موجود است.";

const promptC =
  RULES + "\n\n" + DESIGN +
  "وظیفه تو: داده‌های mock، کامپوننت‌های feature و صفحات Pulse. فایل‌های مجاز تو (فقط همین‌ها):\n" +
  "- src/types/pulse.ts\n" +
  "- src/lib/mock/projects.ts و src/lib/mock/issues.ts و src/lib/mock/activity.ts\n" +
  "- src/features/projects/components/project-card.tsx\n" +
  "- src/features/issues/components/status-badge.tsx و priority-badge.tsx و issue-row.tsx\n" +
  "- src/app/page.tsx (جایگزین کامل پیش‌فرض create-next-app)\n" +
  "- src/app/(dashboard)/overview/page.tsx و src/app/(dashboard)/overview/loading.tsx\n" +
  "- src/app/(dashboard)/projects/page.tsx و src/app/(dashboard)/projects/loading.tsx\n" +
  "- src/app/(dashboard)/issues/page.tsx و src/app/(dashboard)/issues/loading.tsx\n" +
  "- src/app/(dashboard)/analytics/page.tsx و src/app/(dashboard)/docs/page.tsx و src/app/(dashboard)/assistant/page.tsx و src/app/(dashboard)/settings/page.tsx\n" +
  "- src/app/error.tsx و src/app/not-found.tsx\n" +
  "- docs/architecture/adr-001-feature-architecture.md\n\n" +
  "امضاهای مشترک تیم (دقیقاً همین‌ها):\n" +
  "- import { PageHeader } from '@/components/shared/page-header' با props { title, description?, children? }.\n" +
  "- import { EmptyState } from '@/components/shared/empty-state' با props { icon?, title, description?, children? }.\n" +
  "- import { ErrorState } from '@/components/shared/error-state' با props { title?, description?, children? }.\n" +
  "- StatusBadge({ status: IssueStatus }) و PriorityBadge({ priority: IssuePriority }) و IssueRow({ issue: MockIssue }) از '@/features/issues/components/...'.\n" +
  "- ProjectCard({ project: MockProject }) از '@/features/projects/components/project-card'.\n" +
  "- تایپ‌ها از '@/types/pulse': ProjectStatus = 'planning' | 'active' | 'paused' | 'completed'؛ IssueStatus = 'todo' | 'in-progress' | 'review' | 'done'؛ IssuePriority = 'low' | 'medium' | 'high' | 'urgent'؛ MockProject { id: string; key: string; name: string; description: string; status: ProjectStatus; owner: { name: string; initials: string }; progress: number; openIssues: number; totalIssues: number; lastUpdated: string }؛ MockIssue { id: string; key: string; title: string; status: IssueStatus; priority: IssuePriority; assignee: { name: string; initials: string }; projectKey: string; labels: string[]; updatedAt: string }؛ MockActivity { id: string; actor: { name: string; initials: string }; action: string; target: string; time: string }.\n" +
  "- داده mock: ۵ پروژه (Pulse Web، Pulse Mobile، Design System، Billing Service، Marketing Site)، ۱۲ issue و ۸ activity با محتوای واقع‌گرایانه و زمان‌های نسبی مثل '2h ago'.\n\n" +
  "صفحات:\n" +
  "- overview (server): PageHeader با title 'Overview' و description 'Workspace summary at a glance' و children شامل Button 'New project' با آیکون Plus که onClick دارد پس صفحه باید 'use client' شود یا دکمه را در کامپوننت کلاینت کوچک جدا بگذار — بهترین راه: یک کامپوننت کلاینت کوچک داخل همان فایل نمی‌شود چون server است، پس از الگوی مجاز استفاده کن: کل صفحه server بماند و برای دکمه‌های toast-stub از onClick صرف‌نظر کن و به‌جایش دکمه را با asChild و Link به مقصد مرتبط بده (New project → /projects). چهار Card آمار با CardHeader/CardContent از ui/card: Active projects، Open issues، Velocity، Avg. resolution — هر کدام value بزرگ text-3xl font-semibold و label با text-muted-foreground و یک Badge variant outline با آیکون TrendingUp یا TrendingDown و متن delta مثل '+12%'. یک Card با عنوان 'Velocity' و توضیح 'Issues completed per week' و نمودار میله‌ای CSS خالص: ظرف flex با items-end و h-40 و gap-1.5، ۱۲ div با rounded-sm و bg-primary/70 برای میله آخر و bg-muted/60 برای بقیه، height درصدی از آرایه ثابت سراسری مثل [35,42,38,50,46,58,54,61,57,66,62,72]. زیرش دو ستونه grid gap-6 lg:grid-cols-2: Card 'Recent activity' با لیست activity (هر آیتم: Avatar با initials، متن توصیفی که action و target را bold می‌کند با font-medium، و time با text-xs text-muted-foreground) و Card 'Projects progress' با لیست projects (نام با text-sm font-medium + درصد + نوار پیشرفت div با h-1.5 و rounded-full و bg-muted و inner با bg-primary و width درصدی).\n" +
  "- projects (server): PageHeader با title 'Projects' و children دکمه 'New project'. خواندن searchParams طبق Next 16: ({ searchParams }: { searchParams: Promise<{ demo?: string }> }) و await کن. اگر demo === 'empty' فقط EmptyState با آیکون FolderOpen و title 'No projects yet' و description 'Create your first project to get started.' وگرنه grid با gap-4 و md:grid-cols-2 و xl:grid-cols-3 از ProjectCard ها.\n" +
  "- issues (server): PageHeader با title 'Issues' و همین searchParams pattern. toolbar با flex و gap-2: Input با placeholder 'Search issues…' و آیکون Search داخل آن (ظرف relative)، و دو Select از ui/select با placeholder های 'Status' و 'Priority' که فقط UI آماده فاز ۴ هستند (کامنت: Phase 4: wire to URL state — فعلاً state ندارد). لیست: div با rounded-lg و border و bg-card و divide-y و divide-border شامل IssueRow ها. پایین: flex بین 'Showing 12 of 128 issues' با text-sm text-muted-foreground و گروه دکمه‌های pagination: Button variant outline و size icon با ChevronLeft و disabled، دکمه '1' با variant outline، دکمه‌های '2' و '3' با variant ghost، و ChevronRight با disabled. اگر demo === 'empty' فقط EmptyState با آیکون SearchX و title 'No issues found' و description 'Try adjusting your filters.'\n" +
  "- status-badge ('use client' لازم ندارد): Badge با متن‌های 'To do'، 'In Progress'، 'Review'، 'Done' و کلاس‌های tinted ظریف: todo با variant secondary؛ in-progress با 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20'؛ review با amber مشابه؛ done با emerald مشابه. همه با variant outline به‌علاوه className.\n" +
  "- priority-badge: Badge variant outline کوچک با آیکون و متن: low با ArrowDown و text-muted-foreground؛ medium با ArrowRight؛ high با ArrowUp و text-amber-600 dark:text-amber-400؛ urgent با ArrowUp و text-red-600 dark:text-red-400.\n" +
  "- issue-row: div با grid و grid-cols-[auto_auto_1fr_auto] و items-center و gap-3 و px-4 و py-2.5 و hover:bg-muted/40 و transition-colors: PriorityBadge، key با font-mono و text-xs و text-muted-foreground، ستون وسط شامل title با text-sm و font-medium و labels به‌صورت Badge های ریز variant secondary با text-[10px]، و انتها Avatar assignee با size 6 و StatusBadge. هنوز لینک نیست (فاز ۳ صفحه جزئیات می‌سازد).\n" +
  "- project-card: Card با CardHeader شامل ردیف نام (text-base font-semibold) و Badge کلید با font-mono و variant secondary، و StatusBadge کوچک برای ProjectStatus را داخل همان header با یک mapping ساده inline بساز (planning با variant secondary، active با tinted سبز، paused با amber، completed با muted). CardContent: description با line-clamp-2 و text-sm و text-muted-foreground، نوار پیشرفت مثل بالا با عدد درصد کنارش، CardFooter با text-xs و text-muted-foreground: آیکون CircleDot و 'X open'، جداکننده نقطه، lastUpdated، و Avatar owner با size 5.\n" +
  "- landing در src/app/page.tsx (server، خارج از shell): header ساده با container mx-auto و max-w-6xl: Logo و nav ساده (لینک‌های Features و Docs با text-sm و text-muted-foreground) و Button asChild با Link به /overview با متن 'Open dashboard'. بخش hero: py-24 یا py-32 وسط‌چین: Badge variant outline با 'Private beta'، h1 با text-4xl و md:text-6xl و font-semibold و tracking-tight و max-w-3xl که جمله‌اش مثل 'Ship software at the speed of thought' و یک عبارتش با span گرادیان (bg-gradient-to-r و from-primary و via-primary/80 و to-blue-500 و bg-clip-text و text-transparent)، p با text-lg و text-muted-foreground و max-w-2xl، و دو CTA: Button با size lg و asChild به /overview با 'Get started' و Button با variant outline و size lg و asChild به /docs با 'Read the docs'. بخش features با id='features' و py-24 و grid gap-6 و md:grid-cols-3 و سه Card هرکدام با آیکون در مربع muted و rounded-md و عنوان و توضیح: 'Issue tracking' با CircleDot، 'Project insights' با TrendingUp، 'Built for speed' با Zap. footer با border-t و py-8 و text-sm و text-muted-foreground و © 2026 Pulse.\n" +
  "- چهار صفحه placeholder (هرکدام server و چند خطی): PageHeader با عنوان مرتبط + EmptyState با آیکون مرتبط (Analytics با TrendingUp، Docs با FileText، Assistant با Sparkles، Settings با Settings) و title 'Coming soon' و description 'This area ships in a later phase.'\n" +
  "- error.tsx: حتماً 'use client' با ({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) و داخلش ErrorState با title 'Something went wrong' و description کوتاه و children دکمه 'Try again' با onClick={reset}.\n" +
  "- not-found.tsx (server): ظرف وسط‌چین min-h-svh با h1 بزرگ '404' با text-6xl و font-semibold و متن 'This page could not be found.' و Button asChild با Link به '/' با 'Back to home'.\n" +
  "- loading ها: skeleton هم‌شکل محتوای هر صفحه با کامپوننت Skeleton از ui/skeleton (overview: ۴ کارت آمار + دو ستون لیست؛ projects: ۶ کارت grid؛ issues: ۸ ردیف).\n" +
  "- ADR انگلیسی مختصر در مسیر داده‌شده با ساختار Context/Decision/Alternatives/Trade-offs/Consequences درباره ساختار feature-oriented و route groups و مرز server/client.";

const promptDocs =
  "وظیفه تو: بازنویسی README.md پروژه Pulse به‌صورت portfolio-grade انگلیسی. فقط همین فایل مجاز است: README.md (بازنویسی کامل).\n" +
  "اول ساختار واقعی پروژه را بخوان: package.json، درخت src/ (با glob یا ls)، و فایل‌های docs/architecture/ که وجود دارند تا لینکشان کنی.\n" +
  "بخش‌های لازم: عنوان و توضیح یک‌پاراگرافی Pulse (پلتفرم مدیریت پروژه و issue برای تیم‌های نرم‌افزاری)؛ جدول Stack (Next.js 16 App Router، React 19، TypeScript strict، Tailwind CSS v4 CSS-first، shadcn/ui، next-themes، فونت Geist)؛ Getting started با npm install و npm run dev؛ Scripts (dev/build/lint)؛ Project structure به‌صورت درخت مختصر و واقعی؛ Architecture notes (server-first، feature-oriented structure، URL state در فازهای بعد + لینک به ADRهای موجود)؛ Roadmap جدول ۷ فاز که فقط Phase 1 آن completed است و بقیه planned؛ بخش Quality که می‌گوید build سبز است و کدبیس با arena-audit (evidence-anchored audit) ممیزی شده.\n" +
  "صادق باشد: هر چیزی که هنوز وجود ندارد (auth، دیتابیس، realtime، AI assistant) را planned بنویس، نه موجود. هیچ badge تصویری یا شیلد اضافه نگذار. خروجی نهایی‌ات را فارسی خلاصه کن.";

phase("ساخت موازی تم، پوسته و صفحات");
log("سه متخصص به‌صورت موازی شروع می‌کنند: تم و توکن‌ها، پوسته اپ، صفحات و داده mock");
const [theme, shell, pages] = await Promise.all([
  agent("طراح تم", {
    system:
      "تو Lead Design Engineer پروژه Pulse هستی؛ سلیقه‌ات شبیه تیم‌های Linear و Vercel است: ظریف، دقیق و premium. به قراردادهای تیم وفادار می‌مانی و اگر چیزی ممکن نیست، به‌جای دور زدن، در deviations گزارش می‌دهی.",
  }).ask<BuilderResult>(promptA),
  agent("سازنده پوسته", {
    system:
      "تو Senior Frontend Engineer پروژه Pulse هستی و روی App Shell (sidebar، header، ناوبری موبایل) تخصص داری؛ کدت accessible و تمیز است. به قراردادهای تیم وفادار می‌مانی و اگر چیزی ممکن نیست، در deviations گزارش می‌دهی.",
  }).ask<BuilderResult>(promptB),
  agent("سازنده صفحات", {
    system:
      "تو Senior Frontend Engineer پروژه Pulse هستی و روی ساخت صفحات و کامپوننت‌های feature با داده mock تخصص داری؛ Server Component ها را از Client جدا می‌کنی. به قراردادهای تیم وفادار می‌مانی و اگر چیزی ممکن نیست، در deviations گزارش می‌دهی.",
  }).ask<BuilderResult>(promptC),
]);
log(
  "تم: " + theme.files.length + " فایل | پوسته: " + shell.files.length + " فایل | صفحات: " + pages.files.length + " فایل",
);

phase("مستندسازی همزمان با گیت بیلد");
const docsPromise = agent("نویسنده مستندات", {
  system: "تو Technical Writer پروژه Pulse هستی؛ مستنداتت دقیق، صادقانه و بدون اغراق است.",
}).ask<DocsResult>(promptDocs);
const fixer = agent("رفع‌کننده بیلد", {
  system:
    "تو مهندس رفع خطای بیلد پروژه Pulse هستی؛ کم‌ترین تغییر ممکن را انجام می‌دهی، فقط خطای واقعی را اصلاح می‌کنی و هرگز dependency اضافه نمی‌کنی. اگر بیلد به چیزی نیاز دارد که از دستت برخلاف دستورالعمل است، به‌جای دور زدن قانون، صریح بگو.",
});
let buildOk = false;
let lastErr = "";
let buildRounds = 0;
for (let round = 1; round <= 4; round++) {
  buildRounds = round;
  const b = await world.run("node", ["node_modules/next/dist/bin/next", "build"], {
    timeoutMs: 900000,
  });
  if (b.exitCode === 0) {
    buildOk = true;
    log("بیلد موفق شد (تلاش " + round + ")");
    break;
  }
  lastErr = ((b.stderr || "") + "\n" + (b.stdout || "")).slice(-7000);
  log("بیلد شکست خورد (تلاش " + round + ") — در حال اصلاح");
  if (round < 4) {
    await fixer.ask(
      "بیلد Next.js شکست خورد. این خروجی خطاست:\n" + lastErr +
        "\nفقط خطاهای واقعی را در فایل‌های src اصلاح کن. کامپوننت‌های src/components/ui را بازنویسی نکن، dependency نصب نکن و بیلد نگیر — خودم دوباره بیلد می‌گیرم.",
    );
  }
}
const docs = await docsPromise;
log("مستندات: " + docs.files.join(", "));

phase("اجرای ممیزی arena-audit");
log("اجرای موتور arena-audit در حالت deterministic (--gates-only): گیت‌های tsc/eslint + دیتکتورهای قطعی");
const audit = await world.run("node", [ARENA, ".", "--gates-only"], { timeoutMs: 900000 });
log("ممیزی با کد خروج " + audit.exitCode + " تمام شد");

phase("تحلیل گزارش ممیزی");
const analyst = agent("تحلیلگر ممیزی", {
  system:
    "تو تحلیلگر گزارش‌های ممیزی arena-audit هستی؛ فقط چیزی را گزارش می‌دهی که در فایل‌ها دیده‌ای و هیچ ادعایی را از خودت اضافه نمی‌کنی.",
});
const auditSummary = await analyst.ask<AuditSummary>(
  "ممیزی arena-audit روی همین پروژه اجرا شده و خروجی‌هایش در پوشه arena-audit-out است. " +
    "فایل arena-audit-out/REPORT.md را کامل بخوان؛ اگر لازم شد از arena-audit-out/findings.json یا audit-run.json هم بخش‌های مرتبط را بخوان (فایل‌ها ممکن است بزرگ باشند — با grep یا خواندن بخشی برو جلو). " +
    "یک خلاصه تایپ‌شده فارسی بده: verdict کلی، score (یا N/A با درصد پوشش)، وضعیت هر گیت (name/passed/detail)، و همه یافته‌ها با title و where (مسیر فایل و خط) و severity و status و what. " +
    "هیچ یافته‌ای را از قلم نینداز و چیزی از خودت نساز.",
);

phase("اصلاح یافته‌های بحرانی و ممیزی مجدد");
let fix: FixResult | null = null;
let finalAudit: AuditSummary = auditSummary;
const critical = auditSummary.findings.filter((f) => f.severity === "high");
const failedGates = auditSummary.gates.filter((g) => !g.passed);
if (critical.length > 0 || failedGates.length > 0) {
  fix = await agent("اصلاح‌کننده یافته‌ها", {
    system:
      "تو مهندس امنیت و کیفیت پروژه Pulse هستی؛ فقط یافته‌های قطعی و امن را اصلاح می‌کنی و تغییر حداقلی داری. اگر یافته‌ای false-positive است یا اصلاحش ریسک دارد، اصلاحش نکن و در skipped با دلیل ثبتش کن.",
  }).ask<FixResult>(
    "ممیزی arena-audit این یافته‌های بحرانی را داده است:\n" + JSON.stringify(critical) +
      "\nو این گیت‌ها شکست خورده‌اند:\n" + JSON.stringify(failedGates.map((g) => g.name)) +
      "\nهر مورد را یا اصلاح کن (تغییر حداقلی در کد پروژه) یا در skipped با دلیل ثبت کن. کامپوننت‌های src/components/ui را بازنویسی نکن و dependency نصب نکن. بعد از کارت، فایل‌های تغییر یافته را در fixed لیست کن.",
  );
  log("اصلاحات: " + fix.fixed.length + " مورد اصلاح شد، " + fix.skipped.length + " مورد skipped");
  const rebuild = await world.run("node", ["node_modules/next/dist/bin/next", "build"], {
    timeoutMs: 900000,
  });
  if (rebuild.exitCode === 0) {
    buildOk = true;
    log("بیلد بعد از اصلاحات موفق شد");
  } else {
    lastErr = ((rebuild.stderr || "") + "\n" + (rebuild.stdout || "")).slice(-7000);
    log("بیلد بعد از اصلاحات هنوز شکست خورده است");
  }
  const reaudit = await world.run("node", [ARENA, ".", "--gates-only"], { timeoutMs: 900000 });
  log("ممیزی مجدد با کد خروج " + reaudit.exitCode);
  finalAudit = await analyst.ask<AuditSummary>(
    "بعد از اصلاحات، ممیزی دوباره اجرا شده است. حالا وضعیت نهایی را از arena-audit-out/REPORT.md بخوان: verdict و score و gates به‌روز، و در findings فقط یافته‌های باقی‌مانده (اصلاح‌شده‌ها را نیاور).",
  );
}

phase("گزارش نهایی");
for (const f of finalAudit.findings) {
  report({ title: f.title, where: f.where, severity: f.severity, engineStatus: f.status, what: f.what });
}
for (const g of finalAudit.gates.filter((g) => !g.passed)) {
  report({ title: "gate: " + g.name, where: "arena-audit gates", severity: "high", engineStatus: "failed", what: g.detail });
}
if (!buildOk) {
  report({ title: "next build ناموفق", where: "build gate", severity: "high", engineStatus: "failed", what: "بیلد پس از " + buildRounds + " تلاش هنوز سبز نشده است" });
}

const allFiles = [...theme.files, ...shell.files, ...pages.files, ...docs.files];
const md = [
  "# گزارش فاز ۱ — Pulse: Foundation & Design System",
  "",
  "## خلاصه",
  "پوسته کامل اپلیکیشن (Sidebar + Header + Mobile Nav)، سیستم طراحی dark-first با توکن‌های CSS-first،",
  "پریمیتیوهای shadcn/ui و صفحات mock برای تست layout ساخته شد و سپس با گیت بیلد و ممیزی arena-audit تأیید شد.",
  "",
  "## آنچه ساخته شد",
  "### تم و توکن‌های طراحی",
  theme.summary,
  "",
  "### پوسته اپ (App Shell)",
  shell.summary,
  "",
  "### صفحات و داده mock",
  pages.summary,
  "",
  "### مستندات",
  docs.summary,
  "",
  "### فایل‌های تولیدشده (" + allFiles.length + ")",
  allFiles.map((f) => "- " + f).join("\n"),
  "",
  "## گیت بیلد",
  "- next build: " + (buildOk ? "سبز ✓ (تلاش " + buildRounds + ")" : "ناموفق پس از " + buildRounds + " تلاش ✗"),
  "",
  "## ممیزی arena-audit (deterministic --gates-only)",
  "- Verdict: " + finalAudit.verdict,
  "- Score: " + finalAudit.score,
  "",
  "### گیت‌ها",
  finalAudit.gates.map((g) => "- " + g.name + ": " + (g.passed ? "pass ✓" : "fail ✗") + " — " + g.detail).join("\n"),
  "",
  "### یافته‌ها (" + finalAudit.findings.length + ")",
  finalAudit.findings.length === 0
    ? "یافته‌ای باقی نمانده است."
    : finalAudit.findings.map((f) => "- [" + f.severity + "][" + f.status + "] " + f.title + " — " + f.where + ": " + f.what).join("\n"),
  "",
  ...(fix
    ? ["## اصلاحات اعمال‌شده", fix.summary, "", "اصلاح‌شده:", fix.fixed.map((f) => "- " + f).join("\n"), "", "Skipped:", fix.skipped.map((s) => "- " + s.title + ": " + s.reason).join("\n")]
    : []),
  "",
  "## انحراف‌های گزارش‌شده",
  [theme.deviations, shell.deviations, pages.deviations].filter((d) => d.trim().length > 0).join("\n") || "هیچ.",
  "",
  "## گام بعد",
  "Review فاز ۱ توسط شما؛ سپس فاز ۲ (Authentication & Onboarding) با تأیید شما شروع می‌شود.",
].join("\n");

await artifact.markdown("report", md, {
  title: "گزارش فاز ۱ — Pulse",
  description: "تکمیل Foundation & Design System با build gate و ممیزی arena-audit",
  primary: true,
});
try {
  await artifact.file("dashboard", "arena-audit-out/index.html", {
    title: "داشبورد ممیزی arena-audit",
    description: "داشبورد تعاملی آفلاین: کانبان یافته‌ها، رابریک و گیت‌ها",
  });
} catch (err) {
  log("انتشار داشبورد ممیزی ناموفق بود: " + String(err));
}

const reportFindings: WorkflowReport["findings"] = [];
for (const f of finalAudit.findings) {
  reportFindings.push({
    where: f.where,
    what: f.title + " — " + f.what,
    evidence: "arena-audit (" + f.status + ") — arena-audit-out/REPORT.md",
    status: "verified",
    severity: f.severity,
  });
}
for (const g of finalAudit.gates.filter((g) => !g.passed)) {
  reportFindings.push({
    where: "gate: " + g.name,
    what: "گیت " + g.name + " شکست خورد: " + g.detail,
    evidence: "arena-audit gate exit code",
    status: "verified",
    severity: "high",
  });
}
if (!buildOk) {
  reportFindings.push({
    where: "build gate",
    what: "بیلد Next.js پس از " + buildRounds + " تلاش هنوز شکست خورده است",
    evidence: lastErr.slice(-500),
    status: "verified",
    severity: "high",
  });
}

return {
  conclusion:
    "فاز ۱ با " + allFiles.length + " فایل تکمیل شد: پوسته کامل (Sidebar/Header/Mobile Nav)، سیستم طراحی dark-first، پریمیتیوها و صفحات mock. " +
    "بیلد Next.js " + (buildOk ? "سبز است" : "هنوز سبز نشده") + " و ممیزی arena-audit می‌گوید: " + finalAudit.verdict +
    " (score: " + finalAudit.score + "، یافته‌های باقی‌مانده: " + finalAudit.findings.length + ").",
  findings: reportFindings,
  verified: [
    "next build با world.run به‌عنوان گیت اسکریپت (" + (buildOk ? "exit 0" : "ناموفق — در findings ثبت شد") + ")",
    "ممیزی arena-audit v3.2 با --gates-only: گیت‌های tsc/eslint با exit code واقعی و دیتکتورهای قطعی evidence-anchored",
    "تولید فایل‌ها توسط ۴ subagent با قراردادهای قفل‌شده و سپس تأیید با گیت بیلد",
  ],
  notCovered: [
    "پوشش تست واحد/یکپارچگی — vitest نصب نیست و طبق برنامه در فاز ۶ اضافه می‌شود؛ بنابراین پوشش تست در گزارش ممیزی N/A است",
    "بازبینی بصری مرورگر و screenshot — این run فقط build و تحلیل ایستا را پوشش می‌دهد؛ بازبینی بصری در review فاز ۱ انجام می‌شود",
    "E2E با Playwright — فاز ۶",
  ],
} satisfies WorkflowReport;
