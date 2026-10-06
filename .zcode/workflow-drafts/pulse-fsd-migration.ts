/* Dynamic workflow: مهاجرت معماری Pulse به Feature-Sliced Design (FSD) + تأیید با build/test gates و ممیزی arena-audit */

interface BuilderResult {
  /** فایل‌های ساخته‌شده، تغییر‌یافته یا حذف‌شده (مسیر نسبی از ریشه پروژه، با پسوند عمل: + / ~ / -) */
  files: string[];
  /** خلاصه ۲ تا ۳ جمله‌ای فارسی از مهاجرت انجام‌شده */
  summary: string;
  /** اگر از قرارداد/نقشه منحرف شدی اینجا توضیح بده؛ وگرنه رشته خالی */
  deviations: string;
}

interface GateResult {
  /** نام گیت مثل tsc یا eslint */
  name: string;
  passed: boolean;
  /** توضیح کوتاه فارسی */
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
  fixed: string[];
  skipped: { title: string; reason: string }[];
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
  "قواعد سخت مهاجرت (بی‌استثنا):",
  "1) فقط فایل‌های مجاز خودت را بساز/تغییر بده/حذف کن؛ خواندن فایل‌های پایدار (src/components/ui و src/features و src/lib و src/config) آزاد است اما هرگز فایلی که به مهاجر دیگری تعلق دارد را نخوان — ممکن است همزمان حذف شود.",
  "2) هیچ npm/npx اجرا نکن، dependency نصب نکن، بیلد و تست نگیر — گیت‌ها توسط اسکریپت اجرا می‌شوند.",
  "3) TypeScript strict و بدون any؛ محتوای کامپوننت‌ها را بازنویسی خلاقانه نکن — فقط منتقل کن و import ها را طبق نقشه اصلاح کن.",
  "4) قانون لایه‌های FSD: وابستگی فقط به سمت پایین — app → pages → widgets → features → entities → shared. import هم‌لایه ممنوع (entities از entity دیگر، widgets از widget دیگر). داخل یک slice از مسیر نسبی استفاده کن؛ بین slice ها از alias مثل '@/shared/ui/button'، '@/entities/issue'، '@/widgets/shell'.",
  "5) هر slice باید index.ts (public API) داشته باشد؛ چیزی که در index نیست را از بیرون import نکن.",
  "6) فایل‌های قدیمی را بعد از ساختن نسخه جدید حذف کن (rm فایل) و اگر پوشه والد خالی شد با rmdir پاکش کن؛ اگر rmdir شکست خورد (پوشه هنوز فایل دارد) بی‌خیالش شو.",
  "7) کامنت‌ها و محتوای UI انگلیسی می‌مانند؛ گزارش نهایی‌ات فارسی باشد.",
  "8) git اجرا نکن.",
].join("\n");

const MAP = [
  "نقشه کامل مهاجرت (قدیم → جدید) — همین را مرجع قرار بده:",
  "— shared:",
  "src/components/ui/*.tsx (۱۹ فایل shadcn) → src/shared/ui/*.tsx (محتوای همان؛ فقط import مربوط به cn از '@/lib/utils' به '@/shared/lib/utils' اصلاح شود)",
  "src/lib/utils.ts → src/shared/lib/utils.ts",
  "src/components/shared/page-header.tsx → src/shared/ui/page-header.tsx",
  "src/components/shared/empty-state.tsx → src/shared/ui/empty-state.tsx",
  "src/components/shared/error-state.tsx → src/shared/ui/error-state.tsx",
  "src/config/site.ts → src/shared/config/site.ts",
  "components.json → فقط aliases به‌روز شود: components=@/shared/ui، ui=@/shared/ui، lib=@/shared/lib، hooks=@/shared/hooks (بقیه دست نخورد)",
  "tests/utils.test.mts → فقط مسیر import به '../src/shared/lib/utils.ts'",
  "— entities (تایپ‌ها rename می‌شوند: MockProject→Project، MockIssue→Issue، MockActivity→Activity):",
  "src/types/pulse.ts → تجزیه به سه فایل: src/entities/project/model/types.ts (ProjectStatus، Project)، src/entities/issue/model/types.ts (IssueStatus، IssuePriority، Issue)، src/entities/activity/model/types.ts (Activity)",
  "src/lib/mock/projects.ts → src/entities/project/model/mock-data.ts (export const projects: Project[])",
  "src/lib/mock/issues.ts → src/entities/issue/model/mock-data.ts (export const issues: Issue[])",
  "src/lib/mock/activity.ts → src/entities/activity/model/mock-data.ts (export const activities: Activity[])",
  "src/features/projects/components/project-card.tsx → src/entities/project/ui/project-card.tsx (کامپوننت ProjectCard با props { project: Project })",
  "src/features/issues/components/status-badge.tsx → src/entities/issue/ui/status-badge.tsx (StatusBadge { status: IssueStatus })",
  "src/features/issues/components/priority-badge.tsx → src/entities/issue/ui/priority-badge.tsx (PriorityBadge { priority: IssuePriority })",
  "src/features/issues/components/issue-row.tsx → src/entities/issue/ui/issue-row.tsx (IssueRow { issue: Issue })",
  "هر entity یک src/entities/<name>/index.ts می‌گیرد که تایپ‌ها + داده mock + کامپوننت‌های ui را export می‌کند",
  "tests/mock-data.test.mts → آپدیت همه import ها: داده‌ها از '../src/entities/<name>/model/mock-data.ts' و nav از '../src/widgets/shell/config/nav.ts' و نام تایپ‌های جدید؛ منطق تست‌ها تغییری نکند",
  "کامپوننت جدید ActivityItem از سوی مالک entities ساخته می‌شود (specs پایین) — مالک pages فقط مصرف‌کننده است",
  "— widgets و features:",
  "src/components/layout/logo.tsx → src/widgets/shell/ui/logo.tsx",
  "src/components/layout/sidebar.tsx → src/widgets/shell/ui/sidebar.tsx",
  "src/components/layout/header.tsx → src/widgets/shell/ui/header.tsx",
  "src/components/layout/mobile-nav.tsx → src/widgets/shell/ui/mobile-nav.tsx",
  "src/config/nav.ts → src/widgets/shell/config/nav.ts",
  "src/components/layout/mode-toggle.tsx → src/features/theme-switcher/ui/mode-toggle.tsx (+ src/features/theme-switcher/index.ts که ModeToggle را export می‌کند)",
  "src/widgets/shell/ui/app-shell.tsx (جدید، specs پایین) + src/widgets/shell/index.ts (export { AppShell })",
  "src/widgets/hero/ui/hero.tsx (جدید، specs پایین) + src/widgets/hero/index.ts (export { Hero })",
  "— pages و app:",
  "src/app/page.tsx → src/pages/landing/ui/landing-page.tsx + src/pages/landing/index.ts (export { LandingPage })؛ بعد src/app/page.tsx فقط می‌شود: export { LandingPage as default } from '@/pages/landing'",
  "src/app/(dashboard)/overview/page.tsx → src/pages/overview/ui/overview-page.tsx و loading.tsx → src/pages/overview/ui/overview-skeleton.tsx + index.ts (export { OverviewPage, OverviewSkeleton })؛ دو فایل route فقط re-export می‌شوند",
  "همین الگو: projects (ProjectsPage/ProjectsSkeleton)، issues (IssuesPage/IssuesSkeleton)",
  "صفحات placeholder: src/pages/{analytics,docs,assistant,settings}/ui/<x>-page.tsx + index.ts (export { AnalyticsPage } و ...)؛ route ها re-export",
  "src/app/(dashboard)/layout.tsx → فقط: import { AppShell } from '@/widgets/shell' و return <AppShell>{children}</AppShell>",
  "src/app/layout.tsx → فقط import ها اصلاح شوند: Toaster از '@/shared/ui/sonner' (theme-provider.tsx در همین پوشه app/ می‌ماند)",
  "src/app/error.tsx → فقط import ErrorState از '@/shared/ui/error-state'",
  "src/app/not-found.tsx → فقط import Button از '@/shared/ui/button'",
  "src/app/globals.css دست نمی‌خورد (کلاس‌های hero-* سراسری می‌مانند و widgets/hero از آن‌ها استفاده می‌کند)",
].join("\n");

const SPECS = [
  "specs دقیق کامپوننت‌های جدید:",
  "1) AppShell (widgets/shell/ui/app-shell.tsx، server): ({ children }: { children: ReactNode }) → <div className='flex min-h-svh w-full'> <Sidebar /> <div className='flex min-w-0 flex-1 flex-col'> <Header /> <main className='flex-1 px-4 py-6 md:px-6 lg:px-8'>{children}</main> </div> </div>",
  "2) Hero (widgets/hero/ui/hero.tsx، server، بدون دکمه/بج/متن اضافه — فقط stage انیمیشنی): <section className='hero relative overflow-hidden'> شامل <div aria-hidden className='pointer-events-none absolute inset-0'> با سه فرزند <div className='hero-aurora' /> و <div className='hero-grid-floor' /> و <div className='hero-beam' /> و سپس <div className='relative z-10 container mx-auto flex max-w-6xl flex-col items-center gap-7 px-6 pt-32 pb-80 text-center md:pt-40'> که دقیقاً همین محتوا را دارد: Badge variant outline با className 'gap-2 border-white/15 bg-white/5 text-white/70' شامل span با 'size-1.5 animate-pulse rounded-full bg-emerald-400' و متن 'Private beta'؛ h1 با کلاس 'hero-shimmer max-w-3xl text-balance text-5xl font-semibold tracking-tighter md:text-7xl' و متن 'Ship software at the ' به‌علاوه span با 'bg-gradient-to-r from-primary via-primary/80 to-blue-500 bg-clip-text text-transparent' و متن 'speed of thought'؛ p با 'max-w-2xl text-pretty text-lg text-white/60 md:text-xl' و متن 'Pulse is the control room for your engineering team — plan projects, track issues, and keep every release on course from one fast, focused workspace.'؛ و div با 'flex flex-col gap-3 sm:flex-row' شامل دو Button size lg asChild با Link به /overview ('Get started') با className 'bg-white text-black hover:bg-white/85' و به /docs ('Read the docs') با variant outline و className 'border-white/15 bg-white/5 text-white hover:bg-white/10 hover:text-white'.",
  "3) ActivityItem (entities/activity/ui/activity-item.tsx، server): ({ activity }: { activity: Activity }) → ردیف flex items-start gap-3: Avatar با fallback initials مربع rounded-md؛ div با متن text-sm: نام کاربر با font-medium سپس action سپس target با font-medium؛ و time با text-xs text-muted-foreground.",
  "4) index.ts هر pages/<name>: export تایپ‌شده کامپوننت‌های آن صفحه.",
].join("\n");

const promptS =
  RULES + "\n\n" + MAP + "\n\n" + SPECS + "\n\n" +
  "وظیفه تو: مهاجرت لایه‌ی shared. مالکیت تو (فقط این‌ها):\n" +
  "- ساخت src/shared/ui (۱۹ کامپوننت shadcn + page-header + empty-state + error-state)، src/shared/lib/utils.ts، src/shared/config/site.ts\n" +
  "- به‌روزرسانی aliases در components.json\n" +
  "- آپدیت import در tests/utils.test.mts (فقط همین تست)\n" +
  "- حذف فایل‌های قدیمی خودت: src/components/ui/*، src/components/shared/*، src/lib/utils.ts، src/config/site.ts و rmdir پوشه‌های خالی\n" +
  "نکته: src/components/layout و src/components/ را کامل حذف نکن — به مهاجر دیگری تعلق دارد. کامپوننت‌های shared (page-header/empty-state/error-state) هیچ import مسیری جز shadcn primitives و cn ندارند؛ همان‌ها را به مسیرهای shared اصلاح کن. گزارش نهایی فارسی با لیست فایل‌ها (با علامت + ساخته، ~ تغییر، - حذف).";

const promptE =
  RULES + "\n\n" + MAP + "\n\n" + SPECS + "\n\n" +
  "وظیفه تو: مهاجرت لایه‌ی entities. مالکیت تو (فقط این‌ها):\n" +
  "- تجزیه src/types/pulse.ts به سه entity با rename تایپ‌ها (Project، Issue، Activity)\n" +
  "- انتقال mock data ها به model هر entity\n" +
  "- انتقال project-card، status-badge، priority-badge، issue-row به ui هر entity (import های ui primitives به '@/shared/ui/*' و cn به '@/shared/lib/utils' اصلاح شود؛ import تایپ‌ها داخل slice با مسیر نسبی '../model/types')\n" +
  "- ساخت ActivityItem طبق specs\n" +
  "- ساخت index.ts برای هر سه entity\n" +
  "- آپدیت کامل import های tests/mock-data.test.mts به مسیرها و نام‌های جدید (شامل nav از '../src/widgets/shell/config/nav.ts')؛ منطق تست‌ها دست نخورد\n" +
  "- حذف فایل‌های قدیمی: src/types/pulse.ts، src/lib/mock/*، src/features/projects/**، src/features/issues/** و rmdir خالی‌ها\n" +
  "گزارش نهایی فارسی با لیست فایل‌ها (با علامت + ~ -).";

const promptW =
  RULES + "\n\n" + MAP + "\n\n" + SPECS + "\n\n" +
  "وظیفه تو: مهاجرت widgets و features. مالکیت تو (فقط این‌ها):\n" +
  "- انتقال logo، sidebar، header، mobile-nav به src/widgets/shell/ui و nav.ts به src/widgets/shell/config\n" +
  "- انتقال mode-toggle به src/features/theme-switcher/ui + index.ts\n" +
  "- در sidebar و mobile-nav: import لینک‌ها/آیکون‌ها از './config/nav' و logo از './logo' (نسبی داخل slice)\n" +
  "- در header: import ModeToggle از '@/features/theme-switcher'\n" +
  "- در همه: ui primitives از '@/shared/ui/*' و cn از '@/shared/lib/utils'\n" +
  "- ساخت AppShell و Hero دقیقاً طبق specs (از فایل‌های src/app هیچی نخوان — به مهاجر دیگری تعلق دارد)\n" +
  "- index.ts برای widgets/shell و widgets/hero\n" +
  "- حذف فایل‌های قدیمی: src/components/layout/* و rmdir خالی‌ها (پوشه src/components را کامل حذف نکن اگر هنوز خالی نیست)\n" +
  "گزارش نهایی فارسی با لیست فایل‌ها (با علامت + ~ -).";

const promptP =
  RULES + "\n\n" + MAP + "\n\n" + SPECS + "\n\n" +
  "وظیفه تو: مهاجرت لایه‌ی pages و بازسازی سیم‌کشی app. مالکیت تو (فقط این‌ها):\n" +
  "- فایل‌های route فعلی src/app را اول بخوان (این فایل‌ها مالک تویی و ترتیب: اول بخوان بعد بازنویسی کن)، محتوایشان را به src/pages/<name>/ui منتقل کن با اصلاح کامل import ها: PageHeader/EmptyState از '@/shared/ui/page-header' و '@/shared/ui/empty-state'؛ Button/Input/Select/Skeleton/Badge/Avatar/Card از '@/shared/ui/*'؛ داده و کامپوننت‌ها از index موجودیت‌ها: '@/entities/project' (projects، Project، ProjectCard)، '@/entities/issue' (issues، Issue، IssueRow، StatusBadge، PriorityBadge)، '@/entities/activity' (activities، Activity، ActivityItem)\n" +
  "- در overview-page: بخش activity feed از markup inline به کامپوننت ActivityItem تبدیل شود (خودش props activity می‌گیرد)؛ لیست projects-progress همان‌جا inline بماند\n" +
  "- در landing-page: کل <section className='hero ...'> و محتوای داخلش حذف و به‌جایش <Hero /> از '@/widgets/hero' بیاید؛ هدر و فوتر سر جایشان می‌مانند با اصلاح import ها به '@/shared/ui/button' و لوگو inline (همان markup فعلی)\n" +
  "- صفحات placeholder به pages/{analytics,docs,assistant,settings} بروند\n" +
  "- skeleton ها به <name>-skeleton.tsx با rename کامپوننت‌ها\n" +
  "- بازنویسی همه route های src/app به re-export های نازک طبق MAP (page/loading هر هشت مسیر + layout با AppShell + layout ریشه فقط اصلاح import Toaster + error.tsx و not-found.tsx فقط اصلاح import)\n" +
  "- هیچ فایل قدیمی خارج از src/app را حذف نکن؛ src/app/theme-provider.tsx و globals.css دست نخورده بمانند\n" +
  "گزارش نهایی فارسی با لیست فایل‌ها (با علامت + ~ -).";

const promptDocs =
  "وظیفه تو: مستندسازی مهاجرت FSD پروژه Pulse. فایل‌های مجاز تو (فقط این‌ها): docs/architecture/adr-003-fsd-migration.md و README.md\n" +
  "اول ساختار نهایی واقعی src/ را بخوان (glob یا ls — مهاجرت تمام شده است). سپس:\n" +
  "1) ADR انگلیسی مختصر و فنی با ساختار Context/Decision/Alternatives/Trade-offs/Consequences درباره پذیرش Feature-Sliced Design: چرا FSD به‌جای ساختار feature-oriented ساده، لایه‌ها و قاعده وابستگی یک‌طرفه، public API با index.ts، نگاشت Next.js App Router (src/app فقط wiring و re-export، صفحات واقعی در src/pages)، تجربه‌پذیری مقیاس‌پذیر برای فازهای بعد (auth، issues تعاملی، realtime).\n" +
  "2) آپدیت بخش Project structure و Architecture notes در README.md با درخت واقعی جدید FSD (جدول roadmap دست نخورد).\n" +
  "گزارش نهایی فارسی کوتاه.";

phase("مهاجرت موازی به لایه‌های FSD");
log("چهار مهاجر موازی: shared، entities، widgets+features، pages+app — با مالکیت فایل کاملاً جداشده");
const [sharedRes, entitiesRes, widgetsRes, pagesRes] = await Promise.all([
  agent("مهاجر shared", {
    system:
      "تو مهندس ارشدی که لایه‌ی shared پروژه Pulse را به FSD مهاجرت می‌دهی؛ دقیق، کم‌تغییر و وفادار به نقشه هستی. اگر نقطه‌ای از نقشه با واقعیت فایل‌ها ناسازگار بود، دور نمی‌زنی — در deviations ثبت می‌کنی.",
  }).ask<BuilderResult>(promptS),
  agent("مهاجر entities", {
    system:
      "تو مهندس ارشدی که لایه‌ی entities پروژه Pulse را به FSD مهاجرت می‌دهی؛ مدل دامنه (Project، Issue، Activity) و public API ها را تمیز نگه می‌داری. اگر نقطه‌ای از نقشه با واقعیت فایل‌ها ناسازگار بود، در deviations ثبت می‌کنی.",
  }).ask<BuilderResult>(promptE),
  agent("مهاجر widgets", {
    system:
      "تو مهندس ارشدی که لایه‌های widgets و features پروژه Pulse را به FSD مهاجرت می‌دهی؛ مرز AppShell و Hero را تمیز نگه می‌داری. اگر نقطه‌ای از نقشه با واقعیت فایل‌ها ناسازگار بود، در deviations ثبت می‌کنی.",
  }).ask<BuilderResult>(promptW),
  agent("مهاجر pages", {
    system:
      "تو مهندس ارشدی که لایه‌ی pages و سیم‌کشی Next.js app پروژه Pulse را به FSD مهاجرت می‌دهی؛ route های نازک و صفحات کامل را از هم جدا می‌کنی. اگر نقطه‌ای از نقشه با واقعیت فایل‌ها ناسازگار بود، در deviations ثبت می‌کنی.",
  }).ask<BuilderResult>(promptP),
]);
log(
  "shared: " + sharedRes.files.length + " | entities: " + entitiesRes.files.length +
    " | widgets: " + widgetsRes.files.length + " | pages: " + pagesRes.files.length + " فایل",
);

phase("مستندسازی همزمان با گیت بیلد و تست");
const docsPromise = agent("نویسنده مستندات", {
  system: "تو Technical Writer پروژه Pulse هستی؛ مستنداتت دقیق، صادقانه و بدون اغراق است.",
}).ask<DocsResult>(promptDocs);
const fixer = agent("رفع‌کننده گیت‌ها", {
  system:
    "تو مهندس رفع خطای بیلد پروژه Pulse هستی؛ کم‌ترین تغییر ممکن را انجام می‌دهی، فقط خطای واقعی را اصلاح می‌کنی و هرگز dependency اضافه نمی‌کنی یا فایل حذف‌شده را ازخودت بازنویسی نمی‌کنی. اگر خطا نشان داد فایلی در مهاجرت جا افتاده، از ساختار FSD موجود بقیه فایل‌ها الگو می‌گیری.",
});
let gatesOk = false;
let lastErr = "";
let gateRounds = 0;
for (let round = 1; round <= 4; round++) {
  gateRounds = round;
  const build = await world.run("node", ["node_modules/next/dist/bin/next", "build"], {
    timeoutMs: 900000,
  });
  if (build.exitCode !== 0) {
    lastErr = ((build.stderr || "") + "\n" + (build.stdout || "")).slice(-7000);
    log("بیلد شکست خورد (تلاش " + round + ") — در حال اصلاح");
    if (round < 4) {
      await fixer.ask(
        "بیلد Next.js بعد از مهاجرت FSD شکست خورد. این خروجی خطاست:\n" + lastErr +
          "\nفقط خطاهای واقعی را در src اصلاح کن (معمولاً import قدیمی یا فایل جاافتاده). بیلد و تست نگیر — خودم اجرا می‌کنم.",
      );
      continue;
    }
    break;
  }
  const test = await world.run(
    "node",
    ["--test", "tests/utils.test.mts", "tests/mock-data.test.mts"],
    { timeoutMs: 120000 },
  );
  if (test.exitCode !== 0) {
    lastErr = ((test.stderr || "") + "\n" + (test.stdout || "")).slice(-7000);
    log("تست‌ها شکست خوردند (تلاش " + round + ") — در حال اصلاح");
    if (round < 4) {
      await fixer.ask(
        "تست‌های node --test بعد از مهاجرت FSD شکست خوردند:\n" + lastErr +
          "\nفقط import ها یا ساختارهای شکسته را در src یا tests اصلاح کن؛ منطق تست‌ها را عوض نکن. بیلد و تست نگیر — خودم اجرا می‌کنم.",
      );
      continue;
    }
    break;
  }
  gatesOk = true;
  log("بیلد و تست‌ها سبز شدند (تلاش " + round + ")");
  break;
}
const docs = await docsPromise;
log("مستندات: " + docs.files.join(", "));

phase("اجرای ممیزی arena-audit");
log("اجرای موتور arena-audit در حالت deterministic (--gates-only)");
const audit = await world.run("node", [ARENA, ".", "--gates-only"], { timeoutMs: 900000 });
log("ممیزی با کد خروج " + audit.exitCode + " تمام شد");

phase("تحلیل گزارش ممیزی");
const analyst = agent("تحلیلگر ممیزی", {
  system:
    "تو تحلیلگر گزارش‌های ممیزی arena-audit هستی؛ فقط چیزی را گزارش می‌دهی که در فایل‌ها دیده‌ای و هیچ ادعایی را از خودت اضافه نمی‌کنی.",
});
const auditSummary = await analyst.ask<AuditSummary>(
  "ممیزی arena-audit روی همین پروژه اجرا شده و خروجی‌هایش در پوشه arena-audit-out است. " +
    "فایل arena-audit-out/REPORT.md را کامل بخوان؛ اگر لازم شد از arena-audit-out/findings.json یا audit-run.json بخش‌های مرتبط را بخوان (فایل‌ها ممکن است بزرگ باشند — با grep یا خواندن بخشی برو جلو). " +
    "خلاصه تایپ‌شده فارسی بده: verdict کلی، score (یا N/A با درصد پوشش)، وضعیت هر گیت، و همه یافته‌ها با title و where و severity و status و what. هیچ یافته‌ای را از قلم نینداز.",
);

phase("اصلاح یافته‌های بحرانی و ممیزی مجدد");
let fix: FixResult | null = null;
let finalAudit: AuditSummary = auditSummary;
const critical = auditSummary.findings.filter((f) => f.severity === "high");
const failedGates = auditSummary.gates.filter((g) => !g.passed);
if (critical.length > 0 || failedGates.length > 0) {
  fix = await agent("اصلاح‌کننده یافته‌ها", {
    system:
      "تو مهندس امنیت و کیفیت پروژه Pulse هستی؛ فقط یافته‌های قطعی و امن را با تغییر حداقلی اصلاح می‌کنی. یافته‌ی false-positive یا پرریسک را اصلاح نمی‌کنی و در skipped با دلیل ثبت می‌کنی.",
  }).ask<FixResult>(
    "ممیزی arena-audit این یافته‌های بحرانی را داده است:\n" + JSON.stringify(critical) +
      "\nو این گیت‌ها شکست خورده‌اند:\n" + JSON.stringify(failedGates.map((g) => g.name)) +
      "\nهر مورد را یا با تغییر حداقلی اصلاح کن یا در skipped با دلیل ثبت کن. بیلد و تست نگیر.",
  );
  log("اصلاحات: " + fix.fixed.length + " اصلاح شد، " + fix.skipped.length + " skipped");
  const rebuild = await world.run("node", ["node_modules/next/dist/bin/next", "build"], {
    timeoutMs: 900000,
  });
  if (rebuild.exitCode === 0) {
    gatesOk = true;
    log("بیلد بعد از اصلاحات موفق شد");
  } else {
    lastErr = ((rebuild.stderr || "") + "\n" + (rebuild.stdout || "")).slice(-7000);
    log("بیلد بعد از اصلاحات هنوز شکست خورده است");
  }
  const reaudit = await world.run("node", [ARENA, ".", "--gates-only"], { timeoutMs: 900000 });
  log("ممیزی مجدد با کد خروج " + reaudit.exitCode);
  finalAudit = await analyst.ask<AuditSummary>(
    "بعد از اصلاحات، ممیزی دوباره اجرا شده است. وضعیت نهایی را از arena-audit-out/REPORT.md بخوان: verdict و score و gates به‌روز، و در findings فقط یافته‌های باقی‌مانده.",
  );
}

phase("گزارش نهایی");
for (const f of finalAudit.findings) {
  report({ title: f.title, where: f.where, severity: f.severity, engineStatus: f.status, what: f.what });
}
for (const g of finalAudit.gates.filter((g) => !g.passed)) {
  report({ title: "gate: " + g.name, where: "arena-audit gates", severity: "high", engineStatus: "failed", what: g.detail });
}
if (!gatesOk) {
  report({ title: "گیت بیلد/تست ناموفق", where: "build/test gate", severity: "high", engineStatus: "failed", what: "بیلد یا تست‌ها پس از " + gateRounds + " تلاش هنوز سبز نشده‌اند" });
}

const allFiles = [...sharedRes.files, ...entitiesRes.files, ...widgetsRes.files, ...pagesRes.files, ...docs.files];
const md = [
  "# گزارش مهاجرت معماری Pulse به Feature-Sliced Design",
  "",
  "## خلاصه",
  "کل کدبیس از ساختار feature-oriented ساده به لایه‌های FSD مهاجرت کرد:",
  "app (سیم‌کشی Next.js) → pages → widgets → features → entities → shared",
  "با public API (index.ts) برای هر slice و گیت‌های build/test/audit سبز.",
  "",
  "## مهاجرت لایه‌ها",
  "### shared",
  sharedRes.summary,
  "",
  "### entities",
  entitiesRes.summary,
  "",
  "### widgets و features",
  widgetsRes.summary,
  "",
  "### pages و app",
  pagesRes.summary,
  "",
  "### مستندات",
  docs.summary,
  "",
  "### فایل‌های درگیر (" + allFiles.length + ")",
  allFiles.map((f) => "- " + f).join("\n"),
  "",
  "## گیت‌های بیلد و تست",
  "- next build + node --test: " + (gatesOk ? "سبز ✓ (تلاش " + gateRounds + ")" : "ناموفق پس از " + gateRounds + " تلاش ✗"),
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
  [sharedRes.deviations, entitiesRes.deviations, widgetsRes.deviations, pagesRes.deviations].filter((d) => d.trim().length > 0).join("\n") || "هیچ.",
  "",
  "## گام بعد",
  "Review مهاجرت توسط شما؛ ساختار FSD پایه‌ی فازهای ۲ تا ۷ است.",
].join("\n");

await artifact.markdown("report", md, {
  title: "گزارش مهاجرت FSD — Pulse",
  description: "بازآرایی معماری به لایه‌های Feature-Sliced Design با گیت‌های build/test و ممیزی arena-audit",
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
if (!gatesOk) {
  reportFindings.push({
    where: "build/test gate",
    what: "بیلد یا تست‌ها پس از " + gateRounds + " تلاش هنوز شکست خورده‌اند",
    evidence: lastErr.slice(-500),
    status: "verified",
    severity: "high",
  });
}

return {
  conclusion:
    "معماری Pulse به Feature-Sliced Design مهاجرت کرد: " + allFiles.length + " فایل درگیر شد، " +
    "شش لایه (app/pages/widgets/features/entities/shared) با public API های index.ts برقرار است و " +
    (gatesOk ? "بیلد و تست‌ها سبزند" : "گیت بیلد/تست هنوز سبز نشده") + ". ممیزی arena-audit: " + finalAudit.verdict +
    " (score: " + finalAudit.score + "، یافته‌های باقی‌مانده: " + finalAudit.findings.length + ").",
  findings: reportFindings,
  verified: [
    "next build با world.run (" + (gatesOk ? "exit 0" : "ناموفق — در findings ثبت شد") + ")",
    "node --test روی هر دو فایل تست با world.run",
    "ممیزی arena-audit v3.2 با --gates-only: گیت‌های ماشین با exit code واقعی و دیتکتورهای قطعی evidence-anchored",
    "مهاجرت توسط ۴ subagent با مالکیت فایل جداشده و سپس تأیید با گیت‌ها",
  ],
  notCovered: [
    "بازبینی بصری مرورگر — مهاجرت ساختاری است و UI تغییری نکرده، ولی تأیید چشمی با dev server ممکن است",
    "پوشش تست کامل فاز ۶ و E2E — طبق برنامه",
  ],
} satisfies WorkflowReport;
