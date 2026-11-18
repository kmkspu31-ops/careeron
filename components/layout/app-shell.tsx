"use client";

import {
  ArrowUpRight,
  Award,
  BookOpen,
  BriefcaseBusiness,
  Building2,
  ChevronDown,
  Compass,
  FileUser,
  House,
  LayoutDashboard,
  LogIn,
  Menu,
  MessageCircle,
  Search,
  Settings,
  Sparkles,
  UserRound,
  X,
  Bell,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { FormEvent, ReactNode, useEffect, useState } from "react";
import { PageTransition } from "@/components/common/page-transition";
import { Modal } from "@/components/common/modal";
import { ThemeToggle } from "@/components/common/theme-toggle";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

const navigation = [
  { label: "홈", href: "/", icon: House },
  { label: "직업 탐색", href: "/occupations", icon: Compass },
  { label: "채용 정보", href: "/jobs", icon: BriefcaseBusiness },
  { label: "기업 정보", href: "/companies", icon: Building2 },
  { label: "자격증", href: "/certificates", icon: Award },
  { label: "AI 진로 상담", href: "/ai/career", icon: Sparkles },
  { label: "AI 취업 도우미", href: "/ai/employment", icon: MessageCircle },
  { label: "학습 관리", href: "/study", icon: BookOpen },
  { label: "포트폴리오", href: "/portfolio", icon: FileUser },
  { label: "커뮤니티", href: "/community", icon: LayoutDashboard },
  { label: "마이페이지", href: "/mypage", icon: UserRound },
];

const pageNames: Record<string, string> = {
  "/": "홈",
  "/occupations": "직업 탐색",
  "/jobs": "채용 정보",
  "/companies": "기업 정보",
  "/certificates": "자격증",
  "/ai/career": "AI 진로 상담",
  "/ai/employment": "AI 취업 도우미",
  "/study": "학습 관리",
  "/portfolio": "포트폴리오",
  "/community": "커뮤니티",
  "/mypage": "마이페이지",
  "/login": "로그인",
  "/search": "통합 검색",
};

function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}

function SidebarLink({ href, label, icon: Icon, active }: { href: string; label: string; icon: LucideIcon; active: boolean }) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`group flex h-10 items-center gap-3 rounded-lg px-3 text-[13px] font-medium transition ${
        active
          ? "bg-blue-50 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300"
          : "text-muted hover:bg-[var(--surface-subtle)] hover:text-[var(--foreground)]"
      }`}
    >
      <Icon size={17} strokeWidth={active ? 2.2 : 1.8} />
      {label}
    </Link>
  );
}

function Sidebar() {
  const pathname = usePathname();
  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-[var(--border)] bg-[var(--surface)] px-4 py-5 lg:flex">
      <Link href="/" className="mb-8 flex items-center gap-3 px-2" aria-label="CAREERON 홈">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600 text-lg font-bold text-white">C</span>
        <span className="text-[17px] font-extrabold tracking-tight">CAREERON</span>
      </Link>
      <nav aria-label="주요 메뉴" className="thin-scrollbar flex-1 space-y-1 overflow-y-auto">
        {navigation.map((item) => (
          <SidebarLink key={item.href} {...item} active={isActive(pathname, item.href)} />
        ))}
      </nav>
      <div className="mt-4 border-t border-[var(--border)] pt-4">
        <Link href="/mypage" className="flex h-10 items-center gap-3 rounded-lg px-3 text-[13px] font-medium text-muted transition hover:bg-[var(--surface-subtle)]">
          <Settings size={17} /> 설정
        </Link>
        <div className="flex items-center justify-between px-3 py-2">
          <span className="text-[13px] font-medium text-muted">테마</span>
          <ThemeToggle />
        </div>
        <Link href="/login" className="mt-2 flex h-10 items-center gap-3 rounded-lg px-3 text-[13px] font-semibold text-blue-700 transition hover:bg-blue-50 dark:text-blue-300 dark:hover:bg-blue-500/10">
          <LogIn size={17} /> 로그인 및 회원가입
        </Link>
      </div>
    </aside>
  );
}

function SearchDialog({ close }: { close: () => void }) {
  const router = useRouter();
  const [query, setQuery] = useState("");

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (query.trim()) router.push(`/search?q=${encodeURIComponent(query.trim())}`);
    close();
  }

  return (
    <Modal open onClose={close} title="통합 검색">
      <form onSubmit={submit} className="flex items-center gap-3">
        <Search size={20} className="text-muted" />
        <input autoFocus value={query} onChange={(event) => setQuery(event.target.value)} className="h-11 flex-1 bg-transparent outline-none" placeholder="무엇을 찾고 계신가요?" aria-label="검색어" />
        <button type="submit" className="rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-700">검색</button>
      </form>
      <div className="mt-3 border-t border-[var(--border)] pt-3 text-xs text-muted">직업, 채용공고, 기업, 자격증을 한 번에 검색합니다.</div>
    </Modal>
  );
}

function Header({ title }: { title: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const [searchOpen, setSearchOpen] = useState(false);
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [signedInEmail, setSignedInEmail] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    if (!supabase) return;
    void supabase.auth.getUser().then(({ data }) => setSignedInEmail(data.user?.email ?? null));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSignedInEmail(session?.user.email ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  async function signOut() {
    const supabase = createSupabaseBrowserClient();
    if (!supabase) return;
    const { error } = await supabase.auth.signOut();
    if (error) return;
    setProfileOpen(false);
    setSignedInEmail(null);
    router.refresh();
  }

  useEffect(() => {
    function handleShortcut(event: KeyboardEvent) {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setSearchOpen(true);
      }
    }
    window.addEventListener("keydown", handleShortcut);
    return () => window.removeEventListener("keydown", handleShortcut);
  }, []);

  return (
    <>
      <header className="sticky top-0 z-20 flex h-[68px] items-center justify-between border-b border-[var(--border)] bg-[var(--surface)]/95 px-4 backdrop-blur md:px-8">
        <div className="flex min-w-0 items-center gap-3">
          <button className="rounded-lg p-2 text-muted hover:bg-[var(--surface-subtle)] lg:hidden" onClick={() => setMobileMenuOpen(!mobileMenuOpen)} aria-label={mobileMenuOpen ? "메뉴 닫기" : "메뉴 열기"}>
            {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
          <h1 className="truncate text-base font-bold">{title}</h1>
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          <button onClick={() => setSearchOpen(true)} className="flex h-10 w-10 items-center justify-center gap-2 rounded-lg border border-[var(--border)] text-left text-xs text-muted transition hover:bg-[var(--surface-subtle)] md:w-60 md:justify-start md:px-3" aria-label="통합 검색 열기">
            <Search size={16} /><span className="hidden flex-1 md:block">통합 검색</span><kbd className="hidden rounded border border-[var(--border)] px-1.5 py-0.5 text-[10px] md:block">⌘ K</kbd>
          </button>
          <div className="relative">
            <button onClick={() => { setNotificationOpen(!notificationOpen); setProfileOpen(false); }} className="relative flex h-10 w-10 items-center justify-center rounded-lg text-muted transition hover:bg-[var(--surface-subtle)]" aria-label="알림">
              <Bell size={18} /><span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-blue-600 ring-2 ring-[var(--surface)]" />
            </button>
            {notificationOpen && <div className="app-surface absolute right-0 top-12 z-30 w-72 rounded-xl p-4 shadow-lg"><div className="mb-2 flex items-center justify-between font-semibold">알림 <span className="text-xs font-normal text-muted">최근</span></div><p className="text-sm text-muted">새로운 알림이 없습니다.</p></div>}
          </div>
          <div className="relative">
            <button onClick={() => { setProfileOpen(!profileOpen); setNotificationOpen(false); }} className="flex items-center gap-2 rounded-lg p-1.5 transition hover:bg-[var(--surface-subtle)]" aria-label="프로필 메뉴">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-sm font-bold text-blue-700 dark:bg-blue-500/20 dark:text-blue-300">C</span>
              <span className="hidden text-left sm:block"><span className="block text-xs font-semibold">{signedInEmail ? "회원 계정" : "커리어 메이트"}</span><span className="block max-w-36 truncate text-[10px] text-muted">{signedInEmail ?? "게스트"}</span></span>
              <ChevronDown size={14} className="hidden text-muted sm:block" />
            </button>
            {profileOpen && <div className="app-surface absolute right-0 top-12 z-30 w-52 rounded-xl p-2 shadow-lg"><Link href="/mypage" onClick={() => setProfileOpen(false)} className="block rounded-lg px-3 py-2 text-sm hover:bg-[var(--surface-subtle)]">마이페이지</Link>{signedInEmail ? <button type="button" onClick={() => void signOut()} className="block w-full rounded-lg px-3 py-2 text-left text-sm text-red-600 hover:bg-[var(--surface-subtle)]">로그아웃</button> : <><Link href="/login" onClick={() => setProfileOpen(false)} className="block rounded-lg px-3 py-2 text-sm hover:bg-[var(--surface-subtle)]">로그인</Link><Link href="/signup" onClick={() => setProfileOpen(false)} className="block rounded-lg px-3 py-2 text-sm hover:bg-[var(--surface-subtle)]">회원가입</Link></>}</div>}
          </div>
        </div>
      </header>
      {searchOpen && <SearchDialog close={() => setSearchOpen(false)} />}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-40 bg-slate-950/40 lg:hidden" onMouseDown={() => setMobileMenuOpen(false)}>
          <aside className="flex h-full w-[min(84vw,320px)] flex-col bg-[var(--surface)] p-4 shadow-xl" onMouseDown={(event) => event.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between"><Link href="/" onClick={() => setMobileMenuOpen(false)} className="font-extrabold">CAREERON</Link><button onClick={() => setMobileMenuOpen(false)} aria-label="메뉴 닫기"><X size={20} /></button></div>
            <nav className="thin-scrollbar flex-1 space-y-1 overflow-auto">{navigation.map((item) => <div key={item.href} onClick={() => setMobileMenuOpen(false)}><SidebarLink {...item} active={isActive(pathname, item.href)} /></div>)}</nav>
            <div className="mt-3 flex items-center justify-between border-t border-[var(--border)] pt-4"><span className="text-sm text-muted">테마 전환</span><ThemeToggle /></div>
            <Link href="/login" onClick={() => setMobileMenuOpen(false)} className="mt-3 flex h-10 items-center justify-center gap-2 rounded-lg bg-blue-600 text-sm font-semibold text-white"><LogIn size={16} /> 로그인</Link>
          </aside>
        </div>
      )}
    </>
  );
}

function MobileNavigation() {
  const pathname = usePathname();
  const links = navigation.filter((item) => ["/", "/occupations", "/jobs", "/ai/career", "/mypage"].includes(item.href));
  return (
    <nav aria-label="모바일 하단 메뉴" className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t border-[var(--border)] bg-[var(--surface)] px-1 pb-[env(safe-area-inset-bottom)] pt-2 lg:hidden">
      {links.map(({ label, href, icon: Icon }) => (
        <Link key={href} href={href} aria-current={isActive(pathname, href) ? "page" : undefined} className={`flex flex-col items-center gap-1 py-1 text-[10px] font-medium ${isActive(pathname, href) ? "text-blue-600 dark:text-blue-300" : "text-muted"}`}>
          <Icon size={19} /><span>{label === "직업 탐색" ? "직업" : label === "AI 진로 상담" ? "AI 상담" : label === "마이페이지" ? "MY" : label}</span>
        </Link>
      ))}
    </nav>
  );
}

function Footer() {
  return <footer className="mx-auto flex max-w-[1440px] flex-wrap items-center justify-between gap-2 px-6 pb-6 text-xs text-muted md:px-10"><span>© 2026 CAREERON. Discover your next step.</span><span className="flex items-center gap-1">CAREERON은 진로 탐색을 돕는 서비스입니다 <ArrowUpRight size={13} /></span></footer>;
}

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const title = Object.entries(pageNames).find(([path]) => path === pathname)?.[1]
    ?? Object.entries(pageNames).filter(([path]) => path !== "/" && pathname.startsWith(`${path}/`)).sort(([first], [second]) => second.length - first.length)[0]?.[1]
    ?? (pathname.startsWith("/ai/") ? "AI 커리어 도구" : "CAREERON");

  return (
    <>
      <Sidebar />
      <div className="page-shell">
        <Header title={title} />
        <main><PageTransition>{children}</PageTransition></main>
        <Footer />
      </div>
      <MobileNavigation />
    </>
  );
}
