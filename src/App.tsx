import {
  BarChart3,
  CheckCircle2,
  Chrome,
  ClipboardList,
  ExternalLink,
  FileText,
  Gauge,
  Gamepad2,
  Lightbulb,
  ImagePlus,
  Library,
  LogOut,
  Mail,
  Megaphone,
  Pencil,
  Plus,
  Save,
  Search,
  Settings,
  ShieldCheck,
  Trash2,
  UploadCloud,
  Users,
  XCircle,
} from "lucide-react";
import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { isFirebaseAuthReady, signInWithGoogle, signOutGoogle } from "./firebase";
import schoolLogo from "./assets/logo-nguyen-dinh-chieu.png";

type Role = "teacher" | "admin";
type View = "dashboard" | "resources" | "news" | "contribute" | "guides" | "digital" | "admin";
type ResourceStatus = "approved" | "pending" | "rejected";
type ResourceType = "lesson" | "book";

type Teacher = {
  id: string;
  name: string;
  email: string;
  subject: string;
  code: string;
  role: Role;
  active: boolean;
};

type Resource = {
  id: string;
  title: string;
  subject: string;
  type: ResourceType;
  category: string;
  week: string;
  contributor: string;
  driveUrl: string;
  description: string;
  status: ResourceStatus;
  views: number;
  opens: number;
  createdAt: string;
};

type News = {
  id: string;
  title: string;
  summary: string;
  imageUrl: string;
  author: string;
  visible: boolean;
  createdAt: string;
};

type Guide = {
  id: string;
  title: string;
  content: string;
  linkUrl: string;
  linkLabel: string;
  author: string;
  createdAt: string;
};

type DigitalApp = {
  id: string;
  title: string;
  category: "Game học tập" | "AI hỗ trợ" | "Hình học 3D" | "Mô phỏng" | "Công cụ luyện tập";
  subject: string;
  description: string;
  appUrl: string;
  thumbnailUrl: string;
  author: string;
  createdAt: string;
};

type AppData = {
  teachers: Teacher[];
  resources: Resource[];
  news: News[];
  guides: Guide[];
  digitalApps: DigitalApp[];
  visits: number;
};

type CurrentUser = {
  name: string;
  email: string;
  role: Role;
  subject: string;
};

const subjects = [
  "Toán",
  "Tiếng Việt",
  "Khoa học",
  "Lịch sử - Địa lý",
  "Đạo đức",
  "Công nghệ",
  "Tin học",
  "Tiếng Anh",
  "Hoạt động trải nghiệm",
];

const resourceTypes: Record<ResourceType, string> = {
  lesson: "Giáo án PPT",
  book: "Sách tham khảo",
};

const storageKey = "khoi5-library-data";
const sessionKey = "khoi5-library-user";

const today = new Date().toISOString();

const seedData: AppData = {
  visits: 1286,
  teachers: [
    {
      id: "t-admin",
      name: "Quản trị Khối 5",
      email: "admin@khoi5.edu.vn",
      subject: "Quản trị",
      code: "ADMIN-2026",
      role: "admin",
      active: true,
    },
    {
      id: "t-lan",
      name: "Cô Lan",
      email: "lan@khoi5.edu.vn",
      subject: "Toán",
      code: "GV5-LAN-2026",
      role: "teacher",
      active: true,
    },
    {
      id: "t-minh",
      name: "Thầy Minh",
      email: "minh@khoi5.edu.vn",
      subject: "Khoa học",
      code: "GV5-MINH-2026",
      role: "teacher",
      active: true,
    },
  ],
  resources: [
    {
      id: "r-1",
      title: "Toán 5 - Phân số thập phân",
      subject: "Toán",
      type: "lesson",
      category: "Bài giảng",
      week: "Tuần 3",
      contributor: "Cô Lan",
      driveUrl: "https://drive.google.com",
      description: "Slide PPT có câu hỏi nhanh, luyện tập và phần củng cố cuối tiết.",
      status: "approved",
      views: 142,
      opens: 78,
      createdAt: "2026-05-18T08:00:00.000Z",
    },
    {
      id: "r-2",
      title: "Tiếng Việt 5 - Bộ phiếu đọc hiểu học kỳ I",
      subject: "Tiếng Việt",
      type: "book",
      category: "Đề ôn tập",
      week: "Học kỳ I",
      contributor: "Tổ chuyên môn",
      driveUrl: "https://drive.google.com",
      description: "Tuyển tập phiếu đọc hiểu, đáp án và ma trận kỹ năng.",
      status: "approved",
      views: 96,
      opens: 51,
      createdAt: "2026-05-12T08:00:00.000Z",
    },
    {
      id: "r-3",
      title: "Khoa học 5 - Năng lượng mặt trời",
      subject: "Khoa học",
      type: "lesson",
      category: "STEM",
      week: "Tuần 9",
      contributor: "Thầy Minh",
      driveUrl: "https://drive.google.com",
      description: "Bộ slide kèm hoạt động nhóm và phiếu quan sát thí nghiệm.",
      status: "pending",
      views: 28,
      opens: 9,
      createdAt: "2026-06-01T08:00:00.000Z",
    },
  ],
  news: [
    {
      id: "n-1",
      title: "Ngày hội đọc sách Khối 5",
      summary: "",
      imageUrl:
        "https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?auto=format&fit=crop&w=1200&q=80",
      author: "Ban quản trị",
      visible: true,
      createdAt: "2026-06-02T08:00:00.000Z",
    },
    {
      id: "n-2",
      title: "Sinh hoạt chuyên môn",
      summary: "",
      imageUrl:
        "https://images.unsplash.com/photo-1516321497487-e288fb19713f?auto=format&fit=crop&w=1200&q=80",
      author: "Tổ Khối 5",
      visible: true,
      createdAt: "2026-05-27T08:00:00.000Z",
    },
  ],
  guides: [
    {
      id: "g-1",
      title: "Gợi ý dùng AI để soạn câu hỏi đọc hiểu",
      content:
        "Chia sẻ cách viết yêu cầu rõ ràng để AI hỗ trợ tạo câu hỏi theo mức độ nhận biết, thông hiểu và vận dụng. Giáo viên cần đọc lại, chỉnh ngữ liệu và đáp án trước khi sử dụng.",
      linkUrl: "https://chat.openai.com",
      linkLabel: "Mở công cụ AI",
      author: "Ban quản trị",
      createdAt: "2026-06-03T08:00:00.000Z",
    },
  ],
  digitalApps: [
    {
      id: "d-1",
      title: "Khối hộp chữ nhật 3D",
      category: "Hình học 3D",
      subject: "Toán",
      description: "Mô hình trực quan giúp học sinh quan sát đỉnh, cạnh, mặt của hình hộp chữ nhật.",
      appUrl: "https://www.geogebra.org/3d",
      thumbnailUrl:
        "https://images.unsplash.com/photo-1635070041078-e363dbe005cb?auto=format&fit=crop&w=900&q=80",
      author: "Ban quản trị",
      createdAt: "2026-06-04T08:00:00.000Z",
    },
    {
      id: "d-2",
      title: "Trò chơi luyện từ vựng",
      category: "Game học tập",
      subject: "Tiếng Anh",
      description: "Liên kết tới trò chơi luyện nhanh từ vựng, phù hợp hoạt động khởi động tiết học.",
      appUrl: "https://wordwall.net",
      thumbnailUrl:
        "https://images.unsplash.com/photo-1606326608606-aa0b62935f2b?auto=format&fit=crop&w=900&q=80",
      author: "Ban quản trị",
      createdAt: "2026-06-04T08:00:00.000Z",
    },
  ],
};

const titleUpdates: Record<string, string> = {
  "Phân số thập phân - Bài giảng tương tác": "Toán 5 - Phân số thập phân",
  "Ôn tập đọc hiểu cuối học kỳ I": "Tiếng Việt 5 - Bộ phiếu đọc hiểu học kỳ I",
  "Năng lượng mặt trời và ứng dụng": "Khoa học 5 - Năng lượng mặt trời",
};

function normalizeData(data: AppData): AppData {
  return {
    ...data,
    guides: data.guides ?? seedData.guides,
    digitalApps: data.digitalApps ?? seedData.digitalApps,
    resources: data.resources.map((resource) => ({
      ...resource,
      title: titleUpdates[resource.title] ?? resource.title,
    })),
  };
}

function loadData(): AppData {
  const raw = localStorage.getItem(storageKey);
  if (!raw) return seedData;

  try {
    const normalized = normalizeData(JSON.parse(raw) as AppData);
    localStorage.setItem(storageKey, JSON.stringify(normalized));
    return normalized;
  } catch {
    return seedData;
  }
}

function loadUser(): CurrentUser | null {
  const raw = localStorage.getItem(sessionKey);
  if (!raw) return null;

  try {
    return JSON.parse(raw) as CurrentUser;
  } catch {
    return null;
  }
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(value));
}

function createId(prefix: string) {
  return `${prefix}-${crypto.randomUUID()}`;
}

function subjectClass(subject: string) {
  if (subject.includes("Toán")) return "subject-math";
  if (subject.includes("Tiếng Việt")) return "subject-vietnamese";
  if (subject.includes("Khoa học")) return "subject-science";
  if (subject.includes("Lịch sử")) return "subject-history";
  if (subject.includes("Đạo đức")) return "subject-civics";
  if (subject.includes("Công nghệ")) return "subject-tech";
  if (subject.includes("Tin học")) return "subject-it";
  if (subject.includes("Tiếng Anh")) return "subject-english";
  return "subject-experience";
}

function StatusBadge({ status }: { status: ResourceStatus }) {
  const label = {
    approved: "Đã duyệt",
    pending: "Chờ duyệt",
    rejected: "Từ chối",
  }[status];

  return <span className={`status ${status}`}>{label}</span>;
}

function EmptyState({ title, text }: { title: string; text: string }) {
  return (
    <div className="empty-state">
      <Library size={34} />
      <strong>{title}</strong>
      <span>{text}</span>
    </div>
  );
}

function useHoverSound(enabled: boolean) {
  const audioContextRef = useRef<AudioContext | null>(null);
  const lastTargetRef = useRef<Element | null>(null);
  const lastPlayedAtRef = useRef(0);

  useEffect(() => {
    if (!enabled) return;

    const AudioContextCtor =
      window.AudioContext ||
      (window as Window & typeof globalThis & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextCtor) return;

    const interactiveSelector =
      "button, .resource-card, .metric, .compact-item, .compact-news, .subject-strip button, .news-card, .guide-card, .digital-card";

    const getInteractiveTarget = (event: Event) =>
      event.target instanceof Element ? event.target.closest(interactiveSelector) : null;

    const ensureContext = () => {
      if (!audioContextRef.current) {
        audioContextRef.current = new AudioContextCtor();
      }
      return audioContextRef.current;
    };

    const play = (kind: "hover" | "click") => {
      const context = ensureContext();
      if (!context || context.state !== "running") return;

      const now = performance.now();
      if (now - lastPlayedAtRef.current < (kind === "hover" ? 80 : 35)) return;
      lastPlayedAtRef.current = now;

      const oscillator = context.createOscillator();
      const gain = context.createGain();
      const start = context.currentTime;

      oscillator.type = kind === "hover" ? "sine" : "triangle";
      oscillator.frequency.setValueAtTime(kind === "hover" ? 660 : 420, start);
      oscillator.frequency.exponentialRampToValueAtTime(kind === "hover" ? 980 : 720, start + 0.045);
      gain.gain.setValueAtTime(0.0001, context.currentTime);
      gain.gain.exponentialRampToValueAtTime(kind === "hover" ? 0.045 : 0.075, start + 0.008);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + (kind === "hover" ? 0.075 : 0.105));
      oscillator.connect(gain);
      gain.connect(context.destination);
      oscillator.start();
      oscillator.stop(start + (kind === "hover" ? 0.08 : 0.11));
    };

    const unlock = () => {
      const context = ensureContext();
      void context.resume();
    };

    const onPointerDown = (event: PointerEvent) => {
      const target = getInteractiveTarget(event);
      const context = ensureContext();
      void context.resume().then(() => {
        if (target) play("click");
      });
    };

    const onPointerOver = (event: PointerEvent) => {
      const target = getInteractiveTarget(event);

      if (!target || target === lastTargetRef.current) return;
      lastTargetRef.current = target;
      play("hover");
    };

    document.addEventListener("pointerdown", onPointerDown, { passive: true });
    window.addEventListener("keydown", unlock);
    document.addEventListener("pointerover", onPointerOver);

    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("keydown", unlock);
      document.removeEventListener("pointerover", onPointerOver);
    };
  }, [enabled]);
}

function fileToDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

export default function App() {
  const [data, setData] = useState<AppData>(() => loadData());
  const [user, setUser] = useState<CurrentUser | null>(() => loadUser());
  const [view, setView] = useState<View>("dashboard");
  const [loginEmail, setLoginEmail] = useState("admin@khoi5.edu.vn");
  const [loginCode, setLoginCode] = useState("ADMIN-2026");
  const [loginError, setLoginError] = useState("");
  const [verifiedGoogleEmail, setVerifiedGoogleEmail] = useState("");
  const [googleAuthMessage, setGoogleAuthMessage] = useState("");
  const [isGoogleSigningIn, setIsGoogleSigningIn] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [pendingView, setPendingView] = useState<View | null>(null);
  const [query, setQuery] = useState("");
  const [subjectFilter, setSubjectFilter] = useState("Tất cả");
  const [typeFilter, setTypeFilter] = useState<"all" | ResourceType>("all");
  const [editingResourceId, setEditingResourceId] = useState<string | null>(null);

  useHoverSound(true);

  const setAndSaveData = (next: AppData) => {
    setData(next);
    localStorage.setItem(storageKey, JSON.stringify(next));
  };

  const approvedResources = data.resources.filter((item) => item.status === "approved");
  const pendingResources = data.resources.filter((item) => item.status === "pending");
  const visibleNews = data.news.filter((item) => item.visible);

  const stats = useMemo(() => {
    const opens = data.resources.reduce((sum, item) => sum + item.opens, 0);
    return {
      visits: data.visits,
      resources: approvedResources.length,
      pending: pendingResources.length,
      teachers: data.teachers.filter((teacher) => teacher.active).length,
      opens,
    };
  }, [approvedResources.length, data.resources, data.teachers, data.visits, pendingResources.length]);

  const filteredResources = approvedResources.filter((item) => {
    const matchesQuery = `${item.title} ${item.description} ${item.contributor}`
      .toLowerCase()
      .includes(query.toLowerCase());
    const matchesSubject = subjectFilter === "Tất cả" || item.subject === subjectFilter;
    const matchesType = typeFilter === "all" || item.type === typeFilter;
    return matchesQuery && matchesSubject && matchesType;
  });

  const login = (event: FormEvent) => {
    event.preventDefault();
    const typedEmail = loginEmail.trim().toLowerCase();

    if (isFirebaseAuthReady && !verifiedGoogleEmail) {
      setLoginError("Vui lòng bấm Đăng nhập Google trước, sau đó nhập mã giáo viên.");
      return;
    }

    if (verifiedGoogleEmail && typedEmail !== verifiedGoogleEmail.toLowerCase()) {
      setLoginError("Email trong ô nhập chưa khớp với tài khoản Google vừa xác minh.");
      return;
    }

    const teacher = data.teachers.find(
      (item) =>
        item.email.toLowerCase() === typedEmail &&
        item.code === loginCode.trim() &&
        item.active,
    );

    if (!teacher) {
      setLoginError("Email hoặc mã giáo viên chưa đúng.");
      return;
    }

    const nextUser: CurrentUser = {
      name: teacher.name,
      email: teacher.email,
      role: teacher.role,
      subject: teacher.subject,
    };

    const nextData = { ...data, visits: data.visits + 1 };
    setAndSaveData(nextData);
    setUser(nextUser);
    localStorage.setItem(sessionKey, JSON.stringify(nextUser));
    setLoginError("");
    setGoogleAuthMessage("");
    setVerifiedGoogleEmail("");
    setShowAuthModal(false);
    if (pendingView) {
      setView(pendingView);
      setPendingView(null);
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem(sessionKey);
    void signOutGoogle();
    setView("dashboard");
  };

  const loginWithGoogle = async () => {
    setLoginError("");
    setGoogleAuthMessage("");

    if (!isFirebaseAuthReady) {
      setLoginError("Chưa cấu hình Firebase Google Auth. Hiện có thể dùng email + mã demo để xem thử.");
      return;
    }

    try {
      setIsGoogleSigningIn(true);
      const googleUser = await signInWithGoogle();

      if (!googleUser.email) {
        setLoginError("Tài khoản Google chưa trả về email. Vui lòng thử tài khoản khác.");
        return;
      }

      setLoginEmail(googleUser.email);
      setVerifiedGoogleEmail(googleUser.email);
      setGoogleAuthMessage(`Đã xác minh Google: ${googleUser.email}`);
    } catch {
      setLoginError("Không đăng nhập Google được. Kiểm tra Firebase Auth và domain đã cấp quyền.");
    } finally {
      setIsGoogleSigningIn(false);
    }
  };

  const requireTeacherAccess = (nextView?: View) => {
    if (user) return true;
    setPendingView(nextView ?? null);
    setShowAuthModal(true);
    return false;
  };

  const updateResource = (id: string, patch: Partial<Resource>) => {
    setAndSaveData({
      ...data,
      resources: data.resources.map((item) => (item.id === id ? { ...item, ...patch } : item)),
    });
  };

  const deleteResource = (id: string) => {
    setAndSaveData({
      ...data,
      resources: data.resources.filter((item) => item.id !== id),
    });
  };

  const saveResourceEdit = (event: FormEvent<HTMLFormElement>, id: string) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    updateResource(id, {
      title: String(form.get("title") || ""),
      subject: String(form.get("subject") || subjects[0]),
      type: form.get("type") as ResourceType,
      category: String(form.get("category") || "Tài liệu"),
      week: String(form.get("week") || ""),
      driveUrl: String(form.get("driveUrl") || ""),
      description: String(form.get("description") || ""),
    });
    setEditingResourceId(null);
  };

  const openResource = (resource: Resource) => {
    if (!requireTeacherAccess()) return;

    updateResource(resource.id, {
      views: resource.views + 1,
      opens: resource.opens + 1,
    });
    window.open(resource.driveUrl, "_blank", "noopener,noreferrer");
  };

  const addResource = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!user) {
      setShowAuthModal(true);
      return;
    }

    const form = new FormData(event.currentTarget);
    const next: Resource = {
      id: createId("r"),
      title: String(form.get("title") || ""),
      subject: String(form.get("subject") || subjects[0]),
      type: form.get("type") as ResourceType,
      category: String(form.get("category") || "Tài liệu"),
      week: String(form.get("week") || ""),
      contributor: user.name,
      driveUrl: String(form.get("driveUrl") || ""),
      description: String(form.get("description") || ""),
      status: "pending",
      views: 0,
      opens: 0,
      createdAt: today,
    };

    setAndSaveData({ ...data, resources: [next, ...data.resources] });
    event.currentTarget.reset();
    setView(user.role === "admin" ? "admin" : "resources");
  };

  const addTeacher = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const role = form.get("role") as Role;
    const next: Teacher = {
      id: createId("t"),
      name: String(form.get("name") || ""),
      email: String(form.get("email") || ""),
      subject: String(form.get("subject") || subjects[0]),
      code: String(form.get("code") || ""),
      role,
      active: true,
    };

    setAndSaveData({ ...data, teachers: [next, ...data.teachers] });
    event.currentTarget.reset();
  };

  const addNews = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!user) return;

    const form = new FormData(event.currentTarget);
    const imageFile = form.get("imageFile");
    const imageUrl = imageFile instanceof File && imageFile.size > 0
      ? await fileToDataUrl(imageFile)
      : String(form.get("imageUrl") || "");

    if (!imageUrl) return;

    const next: News = {
      id: createId("n"),
      title: String(form.get("title") || "Ảnh hoạt động Khối 5"),
      summary: "",
      imageUrl,
      author: user.name,
      visible: true,
      createdAt: new Date().toISOString(),
    };

    setAndSaveData({ ...data, news: [next, ...data.news] });
    event.currentTarget.reset();
  };

  const deleteNews = (id: string) => {
    setAndSaveData({
      ...data,
      news: data.news.filter((item) => item.id !== id),
    });
  };

  const addGuide = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!user || user.role !== "admin") return;

    const form = new FormData(event.currentTarget);
    const next: Guide = {
      id: createId("g"),
      title: String(form.get("title") || ""),
      content: String(form.get("content") || ""),
      linkUrl: String(form.get("linkUrl") || ""),
      linkLabel: String(form.get("linkLabel") || "Mở liên kết"),
      author: user.name,
      createdAt: new Date().toISOString(),
    };

    setAndSaveData({ ...data, guides: [next, ...data.guides] });
    event.currentTarget.reset();
  };

  const deleteGuide = (id: string) => {
    setAndSaveData({
      ...data,
      guides: data.guides.filter((item) => item.id !== id),
    });
  };

  const addDigitalApp = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!user || user.role !== "admin") return;

    const form = new FormData(event.currentTarget);
    const next: DigitalApp = {
      id: createId("d"),
      title: String(form.get("title") || ""),
      category: form.get("category") as DigitalApp["category"],
      subject: String(form.get("subject") || subjects[0]),
      description: String(form.get("description") || ""),
      appUrl: String(form.get("appUrl") || ""),
      thumbnailUrl: String(form.get("thumbnailUrl") || ""),
      author: user.name,
      createdAt: new Date().toISOString(),
    };

    setAndSaveData({ ...data, digitalApps: [next, ...data.digitalApps] });
    event.currentTarget.reset();
  };

  const deleteDigitalApp = (id: string) => {
    setAndSaveData({
      ...data,
      digitalApps: data.digitalApps.filter((item) => item.id !== id),
    });
  };

  if (!user && false) {
    return (
      <main className="login-shell">
        <section className="login-hero">
          <div className="login-copy">
            <div className="school-lockup">
              <img src={schoolLogo} alt="Logo Trường Tiểu học Nguyễn Đình Chiểu" />
              <span className="eyebrow">Trường Tiểu học Nguyễn Đình Chiểu</span>
            </div>
            <h1>Thư viện số Khối 5</h1>
            <p>Kho giáo án, sách tham khảo và album ảnh hoạt động dành cho giáo viên.</p>
          </div>
        </section>
        <section className="login-panel" aria-label="Đăng nhập">
          <div className="brand-row">
            <div className="brand-mark">
              <img src={schoolLogo} alt="Logo Trường Tiểu học Nguyễn Đình Chiểu" />
            </div>
            <div>
              <strong>Trường Nguyễn Đình Chiểu</strong>
              <span>Cổng tài nguyên Khối 5</span>
            </div>
          </div>
          <form onSubmit={login} className="login-form">
            <label>
              Email Gmail
              <input
                type="email"
                value={loginEmail}
                onChange={(event) => {
                  setLoginEmail(event.target.value);
                  setVerifiedGoogleEmail("");
                  setGoogleAuthMessage("");
                }}
                placeholder="ten@truong.edu.vn"
                required
              />
            </label>
            <label>
              Mã giáo viên
              <input
                type="password"
                value={loginCode}
                onChange={(event) => setLoginCode(event.target.value)}
                placeholder="GV5-..."
                required
              />
            </label>
            {loginError && <p className="form-error">{loginError}</p>}
            <button
              className="google-button"
              type="button"
              onClick={loginWithGoogle}
              disabled={isGoogleSigningIn}
            >
              <Chrome size={18} />
              {isGoogleSigningIn ? "Đang mở Google..." : "Đăng nhập bằng Google"}
            </button>
            {googleAuthMessage && <p className="auth-note success">{googleAuthMessage}</p>}
            <button className="primary-button" type="submit">
              <Mail size={18} />
              Xác thực mã
            </button>
          </form>
          <div className="demo-access">
            <span>Demo admin: admin@khoi5.edu.vn / ADMIN-2026</span>
            <span>Demo GV: lan@khoi5.edu.vn / GV5-LAN-2026</span>
          </div>
        </section>
      </main>
    );
  }

  const navItems: Array<{ id: View; label: string; icon: typeof Gauge; adminOnly?: boolean }> = [
    { id: "dashboard", label: "Tổng quan", icon: Gauge },
    { id: "resources", label: "Thư viện", icon: Library },
    { id: "news", label: "Ảnh hoạt động", icon: Megaphone },
    { id: "contribute", label: "Đóng góp", icon: UploadCloud },
    { id: "guides", label: "CNTT-AI", icon: Lightbulb },
    { id: "digital", label: "Không gian số", icon: Gamepad2 },
    { id: "admin", label: "Quản trị", icon: Settings, adminOnly: true },
  ];

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <div className="brand-row">
          <div className="brand-mark">
            <img src={schoolLogo} alt="Logo Trường Tiểu học Nguyễn Đình Chiểu" />
          </div>
          <div>
            <strong>Thư viện số Khối 5</strong>
            <span>Nguyễn Đình Chiểu</span>
          </div>
        </div>
        <nav>
          {navItems
            .filter((item) => !item.adminOnly || user?.role === "admin")
            .map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  className={view === item.id ? "active" : ""}
                  onClick={() => {
                    if (item.id === "contribute" && !requireTeacherAccess("contribute")) return;
                    setView(item.id);
                  }}
                  title={item.label}
                >
                  <Icon size={19} />
                  <span>{item.label}</span>
                </button>
              );
            })}
        </nav>
        {user ? (
          <div className="user-card">
          <span className="avatar">{user.name.slice(0, 1).toUpperCase()}</span>
          <div>
            <strong>{user.name}</strong>
            <span>{user.role === "admin" ? "Admin" : user.subject}</span>
          </div>
          <button onClick={logout} className="icon-button" title="Đăng xuất">
            <LogOut size={18} />
          </button>
          </div>
        ) : (
          <div className="user-card guest-card">
            <span className="avatar">K</span>
            <div>
              <strong>Khách xem</strong>
              <span>Cần mã để tải/đóng góp</span>
            </div>
            <button onClick={() => setShowAuthModal(true)} className="icon-button" title="Đăng nhập Google">
              <Chrome size={18} />
            </button>
          </div>
        )}
      </aside>

      <section className="workspace">
        <header className="topbar">
          <div>
            <span className="eyebrow">Năm học 2026-2027</span>
            <h2>
              {view === "dashboard" && "Tổng quan thư viện"}
              {view === "resources" && "Kho tài liệu"}
              {view === "news" && "Ảnh hoạt động"}
              {view === "contribute" && "Gửi tài liệu"}
              {view === "guides" && "Cẩm nang CNTT-AI"}
              {view === "digital" && "Không gian số"}
              {view === "admin" && "Bảng quản trị"}
            </h2>
          </div>
          <div className="topbar-actions">
            <span className="pill">
              <ShieldCheck size={16} />
              {user ? (user.role === "admin" ? "Toàn quyền" : "Giáo viên") : "Khách xem"}
            </span>
            {!user && (
              <button className="primary-button small" onClick={() => setShowAuthModal(true)}>
                <Chrome size={17} />
                Đăng nhập Google
              </button>
            )}
          </div>
        </header>

        {view === "dashboard" && (
          <div className="page-stack">
            <section className="visual-hero cover-hero" aria-label="Bìa thư viện số Khối 5">
              <img src="/banner-dashboard.jpg" alt="Thư viện số Khối 5 - TH Nguyễn Đình Chiểu" />
            </section>

            <section className="metrics-grid">
              <Metric icon={BarChart3} label="Lượt truy cập" value={stats.visits.toLocaleString("vi-VN")} />
              <Metric icon={FileText} label="Tài liệu duyệt" value={String(stats.resources)} />
              <Metric icon={ClipboardList} label="Chờ duyệt" value={String(stats.pending)} />
              <Metric icon={Users} label="Tài khoản active" value={String(stats.teachers)} />
            </section>

            <section className="content-band split">
              <div>
                <div className="section-heading">
                  <h3>Tài liệu mới</h3>
                  <button className="text-button" onClick={() => setView("resources")}>
                    Xem kho
                    <ExternalLink size={16} />
                  </button>
                </div>
                <div className="compact-list">
                  {approvedResources.slice(0, 4).map((item) => (
                    <button key={item.id} className="compact-item" onClick={() => openResource(item)}>
                      <span className="subject-dot">{item.subject.slice(0, 1)}</span>
                      <span>
                        <strong>{item.title}</strong>
                        <small>
                          {item.subject} · {resourceTypes[item.type]} · {formatDate(item.createdAt)}
                        </small>
                      </span>
                      <ExternalLink size={17} />
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <div className="section-heading">
                  <h3>Ảnh hoạt động mới</h3>
                  <button className="text-button" onClick={() => setView("news")}>
                    Xem ảnh
                    <ExternalLink size={16} />
                  </button>
                </div>
                <div className="compact-list">
                  {visibleNews.slice(0, 3).map((item) => (
                    <article key={item.id} className="compact-news">
                      <img src={item.imageUrl} alt="" />
                      <div>
                        <strong>{item.title}</strong>
                        <small>{formatDate(item.createdAt)} · {item.author}</small>
                      </div>
                    </article>
                  ))}
                </div>
              </div>
            </section>

            <section className="subject-strip">
              {subjects.map((subject) => {
                const count = approvedResources.filter((item) => item.subject === subject).length;
                return (
                  <button
                    key={subject}
                    className={subjectClass(subject)}
                    onClick={() => {
                      setSubjectFilter(subject);
                      setView("resources");
                    }}
                  >
                    <span>{subject}</span>
                    <strong>{count}</strong>
                  </button>
                );
              })}
            </section>
          </div>
        )}

        {view === "resources" && (
          <div className="page-stack">
            <section className="toolbar">
              <div className="search-box">
                <Search size={18} />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Tìm tài liệu, giáo viên, mô tả..."
                />
              </div>
              <select value={subjectFilter} onChange={(event) => setSubjectFilter(event.target.value)}>
                <option>Tất cả</option>
                {subjects.map((subject) => (
                  <option key={subject}>{subject}</option>
                ))}
              </select>
              <div className="segmented">
                <button className={typeFilter === "all" ? "selected" : ""} onClick={() => setTypeFilter("all")}>
                  Tất cả
                </button>
                <button
                  className={typeFilter === "lesson" ? "selected" : ""}
                  onClick={() => setTypeFilter("lesson")}
                >
                  PPT
                </button>
                <button className={typeFilter === "book" ? "selected" : ""} onClick={() => setTypeFilter("book")}>
                  Sách
                </button>
              </div>
            </section>

            {filteredResources.length === 0 ? (
              <EmptyState title="Chưa có tài liệu phù hợp" text="Thay đổi bộ lọc hoặc gửi tài liệu mới để admin duyệt." />
            ) : (
              <section className="resource-grid">
                {filteredResources.map((item) => (
                  <article className={`resource-card ${subjectClass(item.subject)}`} key={item.id}>
                    <div className="resource-head">
                      <span className="resource-type">{resourceTypes[item.type]}</span>
                      <StatusBadge status={item.status} />
                    </div>
                    <h3>{item.title}</h3>
                    <p>{item.description}</p>
                    <div className="resource-meta">
                      <span>{item.subject}</span>
                      <span>{item.week}</span>
                      <span>{item.contributor}</span>
                    </div>
                    <div className="card-footer">
                      <span>
                        {item.views} xem · {item.opens} mở
                      </span>
                      <button onClick={() => openResource(item)} className="primary-button small">
                        <ExternalLink size={17} />
                        Mở Drive
                      </button>
                    </div>
                  </article>
                ))}
              </section>
            )}
          </div>
        )}

        {view === "news" && (
          <div className="page-stack">
            <section className="gallery-intro">
              <div>
                <span className="eyebrow">Album Khối 5</span>
                <h3>Kho ảnh hoạt động</h3>
              </div>
              <span className="pill">{visibleNews.length} ảnh đang hiển thị</span>
            </section>
            <section className="news-grid">
              {visibleNews.map((item) => (
                <article className="news-card" key={item.id}>
                  <img src={item.imageUrl} alt={item.title} />
                  <div>
                    <span>{formatDate(item.createdAt)} · {item.author}</span>
                    <h3>{item.title}</h3>
                  </div>
                </article>
              ))}
            </section>
          </div>
        )}

        {view === "contribute" && (
          <section className="form-layout">
            <form className="editor-form" onSubmit={addResource}>
              <div className="section-heading">
                <h3>Thông tin tài liệu</h3>
                <span className="pill">Chờ admin duyệt</span>
              </div>
              <label>
                Tên tài liệu
                <input name="title" required placeholder="Ví dụ: Bài giảng diện tích hình thang" />
              </label>
              <div className="form-grid">
                <label>
                  Môn
                  <select name="subject" defaultValue={!user || user.subject === "Quản trị" ? subjects[0] : user.subject}>
                    {subjects.map((subject) => (
                      <option key={subject}>{subject}</option>
                    ))}
                  </select>
                </label>
                <label>
                  Loại
                  <select name="type" defaultValue="lesson">
                    <option value="lesson">Giáo án PPT</option>
                    <option value="book">Sách tham khảo</option>
                  </select>
                </label>
              </div>
              <div className="form-grid">
                <label>
                  Nhóm tài liệu
                  <input name="category" placeholder="Bài giảng, đề ôn tập, STEM..." />
                </label>
                <label>
                  Tuần/Học kỳ
                  <input name="week" placeholder="Tuần 12" />
                </label>
              </div>
              <label>
                Link Google Drive
                <input name="driveUrl" type="url" required placeholder="https://drive.google.com/..." />
              </label>
              <label>
                Mô tả ngắn
                <textarea name="description" rows={4} required placeholder="Nội dung, cách dùng, lưu ý kiểm duyệt..." />
              </label>
              <button className="primary-button" type="submit">
                <UploadCloud size={18} />
                Gửi duyệt
              </button>
            </form>
          </section>
        )}

        {view === "guides" && (
          <section className={user?.role === "admin" ? "guide-layout" : "guide-layout viewer-only"}>
            {user?.role === "admin" && (
              <form className="editor-form guide-form" onSubmit={addGuide}>
                <div className="section-heading">
                  <h3>Viết bài chia sẻ</h3>
                  <span className="pill">Admin</span>
                </div>
                <label>
                  Tiêu đề
                  <input name="title" required placeholder="Ví dụ: 5 cách dùng AI khi soạn giáo án" />
                </label>
                <label>
                  Nội dung chia sẻ
                  <textarea
                    name="content"
                    rows={8}
                    required
                    placeholder="Viết kinh nghiệm, hướng dẫn thao tác, lưu ý khi dùng CNTT/AI..."
                  />
                </label>
                <div className="form-grid">
                  <label>
                    Tên link
                    <input name="linkLabel" placeholder="Ví dụ: Xem video hướng dẫn" />
                  </label>
                  <label>
                    Link đính kèm
                    <input name="linkUrl" type="url" placeholder="https://..." />
                  </label>
                </div>
                <button className="primary-button" type="submit">
                  <Plus size={18} />
                  Đăng bài
                </button>
              </form>
            )}

            <div className="guide-list">
              {data.guides.length === 0 ? (
                <EmptyState title="Chưa có bài cẩm nang" text="Các bài chia sẻ CNTT-AI sẽ xuất hiện tại đây." />
              ) : (
                data.guides.map((guide) => (
                  <article className="guide-card" key={guide.id}>
                    <div className="guide-card-head">
                      <span className="guide-icon">
                        <Lightbulb size={20} />
                      </span>
                      <div>
                        <strong>{guide.title}</strong>
                        <span>
                          {formatDate(guide.createdAt)} · {guide.author}
                        </span>
                      </div>
                    </div>
                    <p>{guide.content}</p>
                    <div className="card-footer">
                      {guide.linkUrl ? (
                        <button className="text-button" onClick={() => window.open(guide.linkUrl, "_blank", "noopener,noreferrer")}>
                          {guide.linkLabel || "Mở liên kết"}
                          <ExternalLink size={16} />
                        </button>
                      ) : (
                        <span>Không có link đính kèm</span>
                      )}
                      {user?.role === "admin" && (
                        <button className="icon-button danger-icon" onClick={() => deleteGuide(guide.id)} title="Xóa bài">
                          <Trash2 size={18} />
                        </button>
                      )}
                    </div>
                  </article>
                ))
              )}
            </div>
          </section>
        )}

        {view === "digital" && (
          <section className={user?.role === "admin" ? "digital-layout" : "digital-layout viewer-only"}>
            {user?.role === "admin" && (
              <form className="editor-form digital-form" onSubmit={addDigitalApp}>
                <div className="section-heading">
                  <h3>Thêm ứng dụng</h3>
                  <span className="pill">Admin</span>
                </div>
                <label>
                  Tên ứng dụng
                  <input name="title" required placeholder="Ví dụ: Trò chơi ôn tập phân số" />
                </label>
                <div className="form-grid">
                  <label>
                    Nhóm
                    <select name="category" defaultValue="Game học tập">
                      <option>Game học tập</option>
                      <option>AI hỗ trợ</option>
                      <option>Hình học 3D</option>
                      <option>Mô phỏng</option>
                      <option>Công cụ luyện tập</option>
                    </select>
                  </label>
                  <label>
                    Môn
                    <select name="subject" defaultValue={subjects[0]}>
                      {subjects.map((subject) => (
                        <option key={subject}>{subject}</option>
                      ))}
                    </select>
                  </label>
                </div>
                <label>
                  Mô tả
                  <textarea name="description" rows={4} required placeholder="Ứng dụng dùng để làm gì, phù hợp hoạt động nào..." />
                </label>
                <label>
                  Link mở ứng dụng
                  <input name="appUrl" type="url" required placeholder="https://..." />
                </label>
                <label>
                  Link ảnh đại diện
                  <input name="thumbnailUrl" type="url" placeholder="https://..." />
                </label>
                <button className="primary-button" type="submit">
                  <Plus size={18} />
                  Thêm vào kho
                </button>
              </form>
            )}

            <div className="digital-content">
              <section className="digital-intro">
                <div>
                  <span className="eyebrow">Trải nghiệm học tập số</span>
                  <h3>Game, AI, 3D và mô phỏng</h3>
                </div>
                <span className="pill">{data.digitalApps.length} ứng dụng</span>
              </section>

              {data.digitalApps.length === 0 ? (
                <EmptyState title="Chưa có ứng dụng" text="Các game, công cụ AI và mô phỏng 3D sẽ xuất hiện tại đây." />
              ) : (
                <section className="digital-grid">
                  {data.digitalApps.map((app) => (
                    <article className={`digital-card ${subjectClass(app.subject)}`} key={app.id}>
                      <img src={app.thumbnailUrl || "/banner-dashboard.jpg"} alt={app.title} />
                      <div className="digital-card-body">
                        <div className="resource-head">
                          <span className="resource-type">{app.category}</span>
                          <span className="status approved">{app.subject}</span>
                        </div>
                        <h3>{app.title}</h3>
                        <p>{app.description}</p>
                        <div className="card-footer">
                          <span>
                            {formatDate(app.createdAt)} · {app.author}
                          </span>
                          <div className="review-actions">
                            <button className="primary-button small" onClick={() => window.open(app.appUrl, "_blank", "noopener,noreferrer")}>
                              <ExternalLink size={17} />
                              Mở
                            </button>
                            {user?.role === "admin" && (
                              <button className="icon-button danger-icon" onClick={() => deleteDigitalApp(app.id)} title="Xóa ứng dụng">
                                <Trash2 size={18} />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </article>
                  ))}
                </section>
              )}
            </div>
          </section>
        )}

        {view === "admin" && user?.role === "admin" && (
          <div className="page-stack">
            <section className="admin-grid">
              <div className="admin-panel">
                <div className="section-heading">
                  <h3>Tài liệu chờ duyệt</h3>
                  <span className="pill">{pendingResources.length}</span>
                </div>
                <div className="admin-list">
                  {pendingResources.length === 0 && (
                    <EmptyState title="Không có tài liệu chờ duyệt" text="Các tài liệu mới sẽ xuất hiện tại đây." />
                  )}
                  {pendingResources.map((item) => (
                    <article key={item.id} className="review-item">
                      <div>
                        <strong>{item.title}</strong>
                        <span>
                          {item.subject} · {item.contributor} · {formatDate(item.createdAt)}
                        </span>
                        <p>{item.description}</p>
                      </div>
                      <div className="review-actions">
                        <button
                          className="success-button"
                          onClick={() => updateResource(item.id, { status: "approved" })}
                        >
                          <CheckCircle2 size={17} />
                          Duyệt
                        </button>
                        <button className="danger-button" onClick={() => updateResource(item.id, { status: "rejected" })}>
                          <XCircle size={17} />
                          Từ chối
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
              </div>

              <div className="admin-panel">
                <div className="section-heading">
                  <h3>Thêm giáo viên</h3>
                </div>
                <form className="editor-form compact" onSubmit={addTeacher}>
                  <input name="name" required placeholder="Họ tên" />
                  <input name="email" required type="email" placeholder="Email Gmail" />
                  <div className="form-grid">
                    <select name="subject" defaultValue={subjects[0]}>
                      {subjects.map((subject) => (
                        <option key={subject}>{subject}</option>
                      ))}
                    </select>
                    <select name="role" defaultValue="teacher">
                      <option value="teacher">Giáo viên</option>
                      <option value="admin">Admin</option>
                    </select>
                  </div>
                  <input name="code" required placeholder="Mã truy cập" />
                  <button className="primary-button" type="submit">
                    <Plus size={18} />
                    Cấp mã
                  </button>
                </form>
              </div>
            </section>

            <section className="admin-grid">
              <div className="admin-panel">
                <div className="section-heading">
                  <h3>Tài khoản</h3>
                </div>
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Giáo viên</th>
                        <th>Môn</th>
                        <th>Mã</th>
                        <th>Quyền</th>
                        <th>TT</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.teachers.map((teacher) => (
                        <tr key={teacher.id}>
                          <td>
                            <strong>{teacher.name}</strong>
                            <span>{teacher.email}</span>
                          </td>
                          <td>{teacher.subject}</td>
                          <td>{teacher.code}</td>
                          <td>{teacher.role === "admin" ? "Admin" : "GV"}</td>
                          <td>
                            <button
                              className={`switch ${teacher.active ? "on" : ""}`}
                              onClick={() =>
                                setAndSaveData({
                                  ...data,
                                  teachers: data.teachers.map((item) =>
                                    item.id === teacher.id ? { ...item, active: !item.active } : item,
                                  ),
                                })
                              }
                              title={teacher.active ? "Đang hoạt động" : "Đã khóa"}
                            >
                              <span />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="admin-panel">
                <div className="section-heading">
                  <h3>Ảnh hoạt động</h3>
                </div>
                <form className="editor-form compact" onSubmit={addNews}>
                  <input name="title" placeholder="Chú thích ảnh, ví dụ: Ngày hội đọc sách" />
                  <input name="imageFile" type="file" accept="image/*" />
                  <input name="imageUrl" type="url" placeholder="Hoặc dán link ảnh" />
                  <button className="primary-button" type="submit">
                    <ImagePlus size={18} />
                    Thêm ảnh
                  </button>
                </form>
                <div className="admin-list news-admin">
                  {data.news.map((item) => (
                    <article key={item.id}>
                      <img src={item.imageUrl} alt="" />
                      <div>
                        <strong>{item.title}</strong>
                        <span>{item.visible ? "Đang hiện" : "Đã ẩn"}</span>
                      </div>
                      <button className="icon-button danger-icon" onClick={() => deleteNews(item.id)} title="Xóa ảnh">
                        <Trash2 size={18} />
                      </button>
                      <button
                        className="icon-button"
                        onClick={() =>
                          setAndSaveData({
                            ...data,
                            news: data.news.map((newsItem) =>
                              newsItem.id === item.id ? { ...newsItem, visible: !newsItem.visible } : newsItem,
                            ),
                          })
                        }
                        title={item.visible ? "Ẩn tin" : "Hiện tin"}
                      >
                        {item.visible ? <XCircle size={18} /> : <CheckCircle2 size={18} />}
                      </button>
                    </article>
                  ))}
                </div>
              </div>
            </section>

            <section className="admin-panel">
              <div className="section-heading">
                <h3>Tất cả tài liệu</h3>
              </div>
              <div className="admin-list">
                {data.resources.map((item) => (
                  <article
                    key={item.id}
                    className={`review-item ${editingResourceId === item.id ? "editing" : ""}`}
                  >
                    {editingResourceId === item.id ? (
                      <form className="resource-edit-form" onSubmit={(event) => saveResourceEdit(event, item.id)}>
                        <input name="title" defaultValue={item.title} required aria-label="Tên tài liệu" />
                        <div className="form-grid">
                          <select name="subject" defaultValue={item.subject} aria-label="Môn">
                            {subjects.map((subject) => (
                              <option key={subject}>{subject}</option>
                            ))}
                          </select>
                          <select name="type" defaultValue={item.type} aria-label="Loại tài liệu">
                            <option value="lesson">Giáo án PPT</option>
                            <option value="book">Sách tham khảo</option>
                          </select>
                        </div>
                        <div className="form-grid">
                          <input name="category" defaultValue={item.category} placeholder="Nhóm tài liệu" />
                          <input name="week" defaultValue={item.week} placeholder="Tuần/Học kỳ" />
                        </div>
                        <input name="driveUrl" defaultValue={item.driveUrl} type="url" required aria-label="Link Drive" />
                        <textarea name="description" defaultValue={item.description} rows={3} required />
                        <div className="review-actions">
                          <button className="success-button" type="submit">
                            <Save size={17} />
                            Lưu
                          </button>
                          <button className="text-button" type="button" onClick={() => setEditingResourceId(null)}>
                            Hủy
                          </button>
                        </div>
                      </form>
                    ) : (
                      <>
                        <div>
                          <strong>{item.title}</strong>
                          <span>
                            {item.subject} · {resourceTypes[item.type]} · {item.contributor}
                          </span>
                        </div>
                        <StatusBadge status={item.status} />
                        <button className="icon-button" onClick={() => setEditingResourceId(item.id)} title="Sửa">
                          <Pencil size={18} />
                        </button>
                        <button className="icon-button danger-icon" onClick={() => deleteResource(item.id)} title="Xóa">
                          <Trash2 size={18} />
                        </button>
                      </>
                    )}
                  </article>
                ))}
              </div>
            </section>
          </div>
        )}
      </section>
      {showAuthModal && (
        <div className="auth-modal-backdrop" role="dialog" aria-modal="true" aria-label="Đăng nhập Google">
          <section className="auth-modal">
            <div className="brand-row">
              <div className="brand-mark">
                <img src={schoolLogo} alt="Logo Trường Tiểu học Nguyễn Đình Chiểu" />
              </div>
              <div>
                <strong>Đăng nhập Google</strong>
                <span>Xác minh Gmail rồi nhập mã giáo viên do admin cấp</span>
              </div>
            </div>
            <button
              className="google-button"
              type="button"
              onClick={loginWithGoogle}
              disabled={isGoogleSigningIn}
            >
              <Chrome size={18} />
              {isGoogleSigningIn ? "Đang mở Google..." : "Đăng nhập bằng Google"}
            </button>
            {googleAuthMessage && <p className="auth-note success">{googleAuthMessage}</p>}
            <form onSubmit={login} className="login-form">
              <label>
                Email Gmail
                <input
                  type="email"
                  value={loginEmail}
                  onChange={(event) => {
                    setLoginEmail(event.target.value);
                    setVerifiedGoogleEmail("");
                    setGoogleAuthMessage("");
                  }}
                  placeholder="ten@truong.edu.vn"
                  readOnly={Boolean(verifiedGoogleEmail)}
                  required
                />
              </label>
              <label>
                Mã giáo viên
                <input
                  type="password"
                  value={loginCode}
                  onChange={(event) => setLoginCode(event.target.value)}
                  placeholder="GV5-..."
                  required
                />
              </label>
              {loginError && <p className="form-error">{loginError}</p>}
              <div className="auth-actions">
                <button className="primary-button" type="submit">
                  <Mail size={18} />
                  Xác thực mã
                </button>
                <button
                  className="text-button"
                  type="button"
                  onClick={() => {
                    setShowAuthModal(false);
                    setPendingView(null);
                    setLoginError("");
                  }}
                >
                  Để sau
                </button>
              </div>
            </form>
            <div className="demo-access">
              <span>Demo admin: admin@khoi5.edu.vn / ADMIN-2026</span>
              <span>Demo GV: lan@khoi5.edu.vn / GV5-LAN-2026</span>
            </div>
          </section>
        </div>
      )}
    </main>
  );
}

function Metric({ icon: Icon, label, value }: { icon: typeof BarChart3; label: string; value: string }) {
  return (
    <article className="metric">
      <span>
        <Icon size={22} />
      </span>
      <div>
        <strong>{value}</strong>
        <small>{label}</small>
      </div>
    </article>
  );
}

