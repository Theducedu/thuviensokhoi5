import {
  BarChart3,
  CheckCircle2,
  Chrome,
  ClipboardList,
  Copy,
  ExternalLink,
  FileText,
  Gauge,
  Gamepad2,
  Lightbulb,
  ImagePlus,
  Library,
  LogOut,
  Mail,
  Maximize2,
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
  X,
  XCircle,
  Youtube,
} from "lucide-react";
import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  increment,
  serverTimestamp,
  setDoc,
  updateDoc,
} from "firebase/firestore";
import { currentGoogleEmail, db, getGoogleRedirectUser, isFirebaseAuthReady, signInWithGoogle, signInWithGoogleRedirect, signOutGoogle } from "./firebase";

type Role = "viewer" | "teacher" | "admin";
type View = "help" | "dashboard" | "resources" | "news" | "contribute" | "guides" | "digital" | "admin";
type ResourceStatus = "approved" | "pending" | "rejected";
type ResourceType = "lesson" | "ppt" | "ebook";

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
  imageUrl: string;
  linkUrl: string;
  linkLabel: string;
  videoUrl?: string;
  downloadUrl?: string;
  downloadLabel?: string;
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

type LoginStat = {
  email: string;
  name: string;
  role: Role;
  subject: string;
  count: number;
  lastLoginAt: string;
};

type AppData = {
  teachers: Teacher[];
  resources: Resource[];
  news: News[];
  guides: Guide[];
  digitalApps: DigitalApp[];
  loginStats: LoginStat[];
  visits: number;
};

type SiteStats = {
  visits: number;
  activeUsers: number;
  loginAccounts: number;
};

type ContentKind = "resources" | "news" | "guides" | "digitalApps";

type CurrentUser = {
  name: string;
  email: string;
  role: Role;
  subject: string;
};

type AccessNotificationDraft = {
  mode: "granted" | "revoked";
  recipients: string[];
  subject: string;
  body: string;
};

type BulkAccessResult = {
  added: number;
  skipped: number;
  duplicateEmails: string[];
  invalidLines: string[];
};

const scheduleSubjectLabel = "Lịch báo giảng";
const allSubjectsLabel = "Tất cả các môn";
const subjects = [
  scheduleSubjectLabel,
  allSubjectsLabel,
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
const ebookSubjectLabel = "Sách điện tử các môn";
const dashboardSubjectCards = [...subjects, ebookSubjectLabel];

const resourceTypes: Record<ResourceType, string> = {
  lesson: "Giáo án",
  ppt: "PPT",
  ebook: "Sách điện tử",
};

const digitalCategories: DigitalApp["category"][] = [
  "Game học tập",
  "AI hỗ trợ",
  "Hình học 3D",
  "Mô phỏng",
  "Công cụ luyện tập",
];

const storageKey = "khoi5-library-data";
const sessionKey = "khoi5-library-user";
const googlePendingViewKey = "khoi5-google-pending-view";
const deletedDefaultsStorageKey = "khoi5-deleted-defaults";
const primaryAdminEmail = "nguyenduc91ltk@gmail.com";
const defaultGuideThumbnail =
  "https://images.unsplash.com/photo-1677442136019-21780ecad995?auto=format&fit=crop&w=1200&q=80";
const instructionVideoUrl = "https://youtu.be/_DMVHRe_JQQ";
const instructionVideoEmbedUrl = "https://www.youtube.com/embed/_DMVHRe_JQQ";

function getYouTubeVideoId(url: string) {
  if (!url.trim()) return "";

  try {
    const parsedUrl = new URL(url);
    const hostname = parsedUrl.hostname.replace(/^www\./, "");

    if (hostname === "youtu.be") {
      return parsedUrl.pathname.split("/").filter(Boolean)[0] || "";
    }

    if (hostname === "youtube.com" || hostname === "m.youtube.com" || hostname === "youtube-nocookie.com") {
      if (parsedUrl.pathname.startsWith("/embed/")) return parsedUrl.pathname.split("/")[2] || "";
      if (parsedUrl.pathname.startsWith("/shorts/")) return parsedUrl.pathname.split("/")[2] || "";
      return parsedUrl.searchParams.get("v") || "";
    }
  } catch {
    return "";
  }

  return "";
}

function getYouTubeEmbedUrl(url: string) {
  const videoId = getYouTubeVideoId(url);
  return videoId ? `https://www.youtube.com/embed/${videoId}` : "";
}

function normalizeResourceType(type: unknown): ResourceType {
  if (type === "ebook" || type === "book") return "ebook";
  return type === "ppt" ? "ppt" : "lesson";
}

function isEbookResource(resource: Resource) {
  if (resource.type === "ebook") return true;
  const searchable = `${resource.title} ${resource.category} ${resource.description}`.toLowerCase();
  return searchable.includes("sách điện tử") || searchable.includes("ebook") || searchable.includes("e-book");
}

function isMobileBrowser() {
  return /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
}

function isEmbeddedBrowser() {
  return /FBAN|FBAV|Instagram|Line|MicroMessenger|Zalo|TikTok|wv/i.test(navigator.userAgent);
}

function isView(value: string | null): value is View {
  return value === "help" || value === "dashboard" || value === "resources" || value === "news" || value === "contribute" || value === "guides" || value === "digital" || value === "admin";
}

function errorCode(error: unknown) {
  return typeof error === "object" && error && "code" in error ? String((error as { code?: unknown }).code) : "";
}

function errorMessage(error: unknown) {
  return typeof error === "object" && error && "message" in error ? String((error as { message?: unknown }).message) : String(error);
}

function shouldRetryGoogleWithRedirect(error: unknown) {
  const code = errorCode(error);
  return code === "auth/popup-blocked" || code === "auth/web-storage-unsupported" || code === "auth/operation-not-supported-in-this-environment";
}

function googleLoginErrorMessage(error: unknown) {
  const code = errorCode(error);
  const currentDomain = typeof window === "undefined" ? "domain hiện tại" : window.location.hostname;

  switch (code) {
    case "auth/unauthorized-domain":
      return `Firebase chưa cấp quyền cho domain ${currentDomain}. Vào Firebase Console > Authentication > Settings > Authorized domains, thêm ${currentDomain} rồi thử lại.`;
    case "auth/operation-not-allowed":
      return "Firebase Auth chưa bật nhà cung cấp Google. Vào Firebase Console > Authentication > Sign-in method và bật Google.";
    case "auth/popup-blocked":
      return "Trình duyệt đã chặn cửa sổ đăng nhập Google. App sẽ thử chuyển sang chế độ chuyển trang, hoặc bạn hãy cho phép popup rồi bấm lại.";
    case "auth/popup-closed-by-user":
    case "auth/cancelled-popup-request":
      return "Cửa sổ đăng nhập Google đã bị đóng trước khi hoàn tất. Vui lòng bấm đăng nhập lại.";
    case "auth/invalid-api-key":
    case "auth/app-deleted":
    case "auth/invalid-app-credential":
      return "Cấu hình Firebase trên Vercel chưa đúng. Kiểm tra lại VITE_FIREBASE_API_KEY, VITE_FIREBASE_AUTH_DOMAIN, VITE_FIREBASE_PROJECT_ID và VITE_FIREBASE_APP_ID.";
    case "auth/network-request-failed":
      return "Không kết nối được tới Google/Firebase. Kiểm tra mạng rồi thử lại.";
    default:
      return code
        ? `Không đăng nhập Google được. Mã lỗi Firebase: ${code}. ${errorMessage(error)}`
        : "Không đăng nhập Google được. Kiểm tra Firebase Auth, domain đã cấp quyền, hoặc mở web bằng Safari/Chrome.";
  }
}

const today = new Date().toISOString();

const seedData: AppData = {
  visits: 0,
  loginStats: [],
  teachers: [
    {
      id: "t-admin",
      name: "Quản trị Khối 5",
      email: primaryAdminEmail,
      subject: "Quản trị",
      code: "",
      role: "admin",
      active: true,
    },
    {
      id: "t-lan",
      name: "Cô Lan",
      email: "lan@khoi5.edu.vn",
      subject: "Toán",
      code: "",
      role: "teacher",
      active: true,
    },
    {
      id: "t-minh",
      name: "Thầy Minh",
      email: "minh@khoi5.edu.vn",
      subject: "Khoa học",
      code: "",
      role: "teacher",
      active: true,
    },
  ],
  resources: [
    {
      id: "r-1",
      title: "Toán 5 - Phân số thập phân",
      subject: "Toán",
      type: "ppt",
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
      type: "lesson",
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
      type: "ppt",
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
      id: "g-2",
      title: "Video AI dễ thương khởi động đầu giờ",
      content:
        "Video giúp tạo không khí vui nhộn đầu giờ học với các nhân vật AI dễ thương, nhạc sôi nổi. Giáo viên có thể tải về để dùng khi khởi động tiết học.",
      imageUrl: "https://images.unsplash.com/photo-1617042375876-a13e36732a04?auto=format&fit=crop&w=1200&q=80",
      linkUrl: "https://drive.google.com/drive/folders/1mqKYoE7h90gFlC5yKK3Hg1Rc8zVPQgJL",
      linkLabel: "Tải về",
      downloadUrl: "https://drive.google.com/drive/folders/1mqKYoE7h90gFlC5yKK3Hg1Rc8zVPQgJL",
      downloadLabel: "Tải về",
      author: "Nguyễn Đức",
      createdAt: "2026-06-05T08:00:00.000Z",
    },
    {
      id: "g-1",
      title: "Gợi ý dùng AI để soạn câu hỏi đọc hiểu",
      content:
        "Chia sẻ cách viết yêu cầu rõ ràng để AI hỗ trợ tạo câu hỏi theo mức độ nhận biết, thông hiểu và vận dụng. Giáo viên cần đọc lại, chỉnh ngữ liệu và đáp án trước khi sử dụng.",
      imageUrl: defaultGuideThumbnail,
      linkUrl: "https://chat.openai.com",
      linkLabel: "Mở công cụ AI",
      author: "Ban quản trị",
      createdAt: "2026-06-03T08:00:00.000Z",
    },
  ],
  digitalApps: [
    {
      id: "d-3",
      title: "Kho hình học 3D",
      category: "Hình học 3D",
      subject: allSubjectsLabel,
      description: "Kho mô hình hình học 3D trực quan, hỗ trợ học sinh quan sát và tương tác với các khối hình.",
      appUrl: "/hinh-hoc-3d/index.html",
      thumbnailUrl: "/hinh-hoc-3d/images/nenhinh3d.jpg",
      author: "Ban quản trị",
      createdAt: "2026-06-04T08:00:00.000Z",
    },
    {
      id: "d-4",
      title: "Bản đồ số Việt Nam",
      category: "Mô phỏng",
      subject: "Lịch sử - Địa lý",
      description: "Bản đồ tương tác 34 tỉnh thành Việt Nam sau sáp nhập, hỗ trợ khám phá thông tin địa phương.",
      appUrl: "https://giaoviencn.io.vn/bandoso/vietnam-map-new.html",
      thumbnailUrl: "/banner-dashboard.jpg",
      author: "Ban quản trị",
      createdAt: "2026-06-05T08:00:00.000Z",
    },
    {
      id: "d-5",
      title: "Vòng xoay ngôi sao",
      category: "Game học tập",
      subject: allSubjectsLabel,
      description: "Công cụ chọn học sinh ngẫu nhiên bằng vòng xoay ngôi sao, tạo không khí hào hứng khi gọi tên hoặc chia lượt tham gia.",
      appUrl: "/Vong-xoay-ngoi-sao/ngoisao.html",
      thumbnailUrl: "/banner-dashboard.jpg",
      author: "Ban quản trị",
      createdAt: "2026-06-05T09:00:00.000Z",
    },
    {
      id: "d-6",
      title: "Nhận xét Thông tư 27",
      category: "AI hỗ trợ",
      subject: allSubjectsLabel,
      description: "Công cụ hỗ trợ tạo và quản lý nhận xét học sinh theo Thông tư 27, có kho câu nhận xét và chế độ AI.",
      appUrl: "/nhan-xet-tt27/index.html",
      thumbnailUrl: "/banner-dashboard.jpg",
      author: "Ban quản trị",
      createdAt: "2026-06-05T09:05:00.000Z",
    },
  ],
};

const titleUpdates: Record<string, string> = {
  "Phân số thập phân - Bài giảng tương tác": "Toán 5 - Phân số thập phân",
  "Ôn tập đọc hiểu cuối học kỳ I": "Tiếng Việt 5 - Bộ phiếu đọc hiểu học kỳ I",
  "Năng lượng mặt trời và ứng dụng": "Khoa học 5 - Năng lượng mặt trời",
};

const removedDefaultDigitalAppIds = new Set(["d-1", "d-2"]);
const removedDefaultGuideIds = new Set(["g-1"]);
const contentCollections: Record<ContentKind, string> = {
  resources: "resources",
  news: "news",
  guides: "guides",
  digitalApps: "digitalApps",
};
const defaultContentIds: Record<ContentKind, Set<string>> = {
  resources: new Set(seedData.resources.map((item) => item.id)),
  news: new Set(seedData.news.map((item) => item.id)),
  guides: new Set(seedData.guides.map((item) => item.id)),
  digitalApps: new Set(seedData.digitalApps.map((item) => item.id)),
};

function deletedDefaultKey(kind: ContentKind, id: string) {
  return `${kind}:${id}`;
}

function deletedDefaultDocId(kind: ContentKind, id: string) {
  return `${kind}_${id}`;
}

function loadLocalDeletedDefaultKeys() {
  try {
    const raw = localStorage.getItem(deletedDefaultsStorageKey);
    return new Set(raw ? (JSON.parse(raw) as string[]) : []);
  } catch {
    return new Set<string>();
  }
}

function rememberLocalDeletedDefault(kind: ContentKind, id: string) {
  const deletedKeys = loadLocalDeletedDefaultKeys();
  deletedKeys.add(deletedDefaultKey(kind, id));
  localStorage.setItem(deletedDefaultsStorageKey, JSON.stringify(Array.from(deletedKeys)));
}

function filterDeletedDefaults<T extends { id: string }>(kind: ContentKind, items: T[], deletedKeys: Set<string>) {
  return items.filter((item) => !deletedKeys.has(deletedDefaultKey(kind, item.id)));
}

function mergeRemoteWithDefaults<T extends { id: string }>(
  kind: ContentKind,
  defaults: T[],
  remoteItems: T[],
  deletedKeys: Set<string>,
  currentItems: T[] = [],
) {
  const merged = new Map<string, T>();

  remoteItems.forEach((item) => merged.set(item.id, item));
  currentItems.forEach((item) => {
    if (!merged.has(item.id)) merged.set(item.id, item);
  });
  defaults.forEach((item) => {
    if (!merged.has(item.id)) merged.set(item.id, item);
  });

  return filterDeletedDefaults(kind, Array.from(merged.values()), deletedKeys);
}

function normalizeData(data: AppData): AppData {
  const localDeletedKeys = loadLocalDeletedDefaultKeys();
  const teachers = (data.teachers ?? seedData.teachers).map((teacher) =>
    teacher.id === "t-admin" || teacher.email.toLowerCase() === "admin@khoi5.edu.vn"
      ? {
          ...teacher,
          name: "Quản trị Khối 5",
          email: primaryAdminEmail,
          subject: "Quản trị",
          code: "",
          role: "admin" as Role,
          active: true,
        }
      : { ...teacher, code: teacher.code ?? "" },
  );

  const hasPrimaryAdmin = teachers.some((teacher) => teacher.email.toLowerCase() === primaryAdminEmail);
  const normalizedTeachers = hasPrimaryAdmin
    ? teachers
    : [
        {
          id: "t-admin",
          name: "Quản trị Khối 5",
          email: primaryAdminEmail,
          subject: "Quản trị",
          code: "",
          role: "admin" as Role,
          active: true,
        },
        ...teachers,
      ];
  const savedDigitalApps = (data.digitalApps ?? seedData.digitalApps).filter((app) => !removedDefaultDigitalAppIds.has(app.id));
  const savedDigitalAppIds = new Set(savedDigitalApps.map((app) => app.id));
  const digitalApps = [...savedDigitalApps, ...seedData.digitalApps.filter((app) => !savedDigitalAppIds.has(app.id))]
    .filter((app) => !removedDefaultDigitalAppIds.has(app.id))
    .filter((app) => !localDeletedKeys.has(deletedDefaultKey("digitalApps", app.id)))
    .map((app) => (app.id === "d-3" ? { ...app, thumbnailUrl: "/hinh-hoc-3d/images/nenhinh3d.jpg" } : app));
  const savedGuides = (data.guides ?? seedData.guides)
    .filter((guide) => !removedDefaultGuideIds.has(guide.id))
    .map((guide) => ({
      ...guide,
      imageUrl: guide.imageUrl ?? "",
      videoUrl: guide.videoUrl ?? "",
      downloadUrl: guide.downloadUrl ?? "",
      downloadLabel: guide.downloadLabel ?? "",
    }));
  const savedGuideIds = new Set(savedGuides.map((guide) => guide.id));
  const guides = filterDeletedDefaults(
    "guides",
    [...savedGuides, ...seedData.guides.filter((guide) => !savedGuideIds.has(guide.id) && !removedDefaultGuideIds.has(guide.id))],
    localDeletedKeys,
  );

  return {
    ...data,
    teachers: normalizedTeachers,
    loginStats: data.loginStats ?? [],
    news: filterDeletedDefaults("news", data.news ?? seedData.news, localDeletedKeys),
    guides,
    digitalApps,
    resources: filterDeletedDefaults(
      "resources",
      data.resources.map((resource) => ({
        ...resource,
        type: normalizeResourceType(resource.type),
        title: titleUpdates[resource.title] ?? resource.title,
      })),
      localDeletedKeys,
    ),
  };
}

function loadData(): AppData {
  const raw = localStorage.getItem(storageKey);
  if (!raw) return normalizeData(seedData);

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

function emailDocId(email: string) {
  return email.trim().toLowerCase();
}

const emailPattern = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i;

function cleanBulkNamePart(value: string) {
  return value
    .replace(emailPattern, "")
    .replace(/[<>()"']/g, " ")
    .replace(/[,;\t|]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function parseBulkTeachers(raw: string, subject: string, role: Role, existingTeachers: Teacher[]) {
  const seenEmails = new Set<string>();
  const existingEmails = new Set(existingTeachers.map((teacher) => teacher.email.toLowerCase()));
  const invalidLines: string[] = [];
  const duplicateEmails: string[] = [];
  const teachers: Teacher[] = [];
  let skipped = 0;

  const markDuplicate = (email: string) => {
    skipped += 1;
    if (!duplicateEmails.includes(email)) duplicateEmails.push(email);
  };

  raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .forEach((line) => {
      const match = line.match(emailPattern);
      if (!match || match.index === undefined) {
        invalidLines.push(line);
        return;
      }

      const email = match[0].toLowerCase();
      if (existingEmails.has(email)) {
        markDuplicate(email);
        return;
      }

      if (seenEmails.has(email)) {
        markDuplicate(email);
        return;
      }
      seenEmails.add(email);

      const beforeEmail = cleanBulkNamePart(line.slice(0, match.index));
      const afterEmail = cleanBulkNamePart(line.slice(match.index + match[0].length));
      const name = beforeEmail || afterEmail || email.split("@")[0];

      teachers.push({
        id: createId("t"),
        name,
        email,
        subject: subject || allSubjectsLabel,
        code: "",
        role,
        active: true,
      });
    });

  return { teachers, invalidLines, duplicateEmails, skipped };
}

function buildAccessNotificationDraft(mode: AccessNotificationDraft["mode"], teachers: Teacher[]): AccessNotificationDraft {
  const recipients = teachers.map((teacher) => teacher.email);
  const subject =
    mode === "granted"
      ? "Thông báo cấp quyền truy cập Thư viện số Khối 5"
      : "Thông báo thu hồi quyền truy cập Thư viện số Khối 5";
  const body =
    mode === "granted"
      ? `Thầy cô đã được cấp quyền truy cập Thư viện số Khối 5.

Vui lòng đăng nhập bằng đúng tài khoản Gmail được cấp quyền để tải tài liệu và đóng góp tài liệu vào thư viện.`
      : `Quyền truy cập Thư viện số Khối 5 của tài khoản này đã được thu hồi.

Nếu thầy cô cần mở lại quyền truy cập, vui lòng liên hệ quản trị viên.`;

  return { mode, recipients, subject, body };
}

function gmailComposeUrl(draft: AccessNotificationDraft) {
  const params = new URLSearchParams({
    view: "cm",
    fs: "1",
    to: draft.recipients.join(","),
    su: draft.subject,
    body: draft.body,
  });
  return `https://mail.google.com/mail/?${params.toString()}`;
}

function toIsoDate(value: unknown) {
  if (typeof value === "string") return value;
  if (value && typeof (value as { toDate?: () => Date }).toDate === "function") {
    return (value as { toDate: () => Date }).toDate().toISOString();
  }
  return new Date().toISOString();
}

function subjectClass(subject: string) {
  if (subject.includes(scheduleSubjectLabel)) return "subject-schedule";
  if (subject.includes("Sách điện tử")) return "subject-ebook";
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

const maxNewsImageBytes = 700 * 1024;

function imageFileToCompressedDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const image = new Image();
    const reader = new FileReader();

    reader.onerror = () => reject(reader.error);
    reader.onload = () => {
      image.onload = () => {
        const maxSide = 1400;
        const scale = Math.min(1, maxSide / Math.max(image.width, image.height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.max(1, Math.round(image.width * scale));
        canvas.height = Math.max(1, Math.round(image.height * scale));

        const context = canvas.getContext("2d");
        if (!context) {
          reject(new Error("Không thể xử lý ảnh trên trình duyệt này."));
          return;
        }

        context.drawImage(image, 0, 0, canvas.width, canvas.height);

        for (const quality of [0.82, 0.72, 0.62, 0.52, 0.42]) {
          const dataUrl = canvas.toDataURL("image/jpeg", quality);
          if (dataUrl.length <= maxNewsImageBytes) {
            resolve(dataUrl);
            return;
          }
        }

        reject(new Error("Ảnh vẫn quá lớn sau khi nén. Vui lòng chọn ảnh nhỏ hơn hoặc dán link ảnh online."));
      };
      image.onerror = () => reject(new Error("Không đọc được file ảnh."));
      image.src = String(reader.result);
    };

    reader.readAsDataURL(file);
  });
}

export default function App() {
  const [data, setData] = useState<AppData>(() => loadData());
  const [user, setUser] = useState<CurrentUser | null>(() => loadUser());
  const [view, setView] = useState<View>("dashboard");
  const [loginError, setLoginError] = useState("");
  const [googleAuthMessage, setGoogleAuthMessage] = useState("");
  const [isGoogleSigningIn, setIsGoogleSigningIn] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [pendingView, setPendingView] = useState<View | null>(null);
  const [query, setQuery] = useState("");
  const [subjectFilter, setSubjectFilter] = useState("Tất cả");
  const [typeFilter, setTypeFilter] = useState<"all" | ResourceType>("all");
  const [editingResourceId, setEditingResourceId] = useState<string | null>(null);
  const [editingNewsId, setEditingNewsId] = useState<string | null>(null);
  const [editingGuideId, setEditingGuideId] = useState<string | null>(null);
  const [editingDigitalAppId, setEditingDigitalAppId] = useState<string | null>(null);
  const [selectedNews, setSelectedNews] = useState<News | null>(null);
  const [bulkAccessResult, setBulkAccessResult] = useState<BulkAccessResult | null>(null);
  const [accessNotificationDraft, setAccessNotificationDraft] = useState<AccessNotificationDraft | null>(null);
  const [siteStats, setSiteStats] = useState<SiteStats>({
    visits: data.visits,
    activeUsers: data.teachers.filter((teacher) => teacher.active).length,
    loginAccounts: data.loginStats.length,
  });

  useHoverSound(true);

  const setAndSaveData = (next: AppData) => {
    const normalized = normalizeData(next);
    setData(normalized);
    localStorage.setItem(storageKey, JSON.stringify(normalized));
  };

  const updateAndSaveData = (updater: (current: AppData) => AppData) => {
    setData((current) => {
      const next = normalizeData(updater(current));
      localStorage.setItem(storageKey, JSON.stringify(next));
      return next;
    });
  };

  const approvedResources = data.resources.filter((item) => item.status === "approved");
  const pendingResources = data.resources.filter((item) => item.status === "pending");
  const visibleNews = data.news.filter((item) => item.visible);

  const refreshSiteStats = async () => {
    if (!db) return;

    const snapshot = await getDoc(doc(db, "siteStats", "summary"));
    if (!snapshot.exists()) return;

    const item = snapshot.data();
    setSiteStats({
      visits: Number(item.visits || 0),
      activeUsers: Number(item.activeUsers || 0),
      loginAccounts: Number(item.loginAccounts || 0),
    });
  };

  const refreshRemoteAccessData = async () => {
    if (!db) return;

    const [teacherDocs, loginDocs] = await Promise.all([
      getDocs(collection(db, "authorizedUsers")),
      getDocs(collection(db, "loginStats")),
    ]);

    const remoteTeachers = teacherDocs.docs.map((snapshot) => {
      const item = snapshot.data();
      return {
        id: String(item.id || snapshot.id),
        name: String(item.name || item.email || ""),
        email: String(item.email || snapshot.id).toLowerCase(),
        subject: String(item.subject || "Chưa phân môn"),
        code: "",
        role: item.role === "admin" ? "admin" : "teacher",
        active: item.active !== false,
      } satisfies Teacher;
    });

    const remoteLoginStats = loginDocs.docs.map((snapshot) => {
      const item = snapshot.data();
      return {
        email: String(item.email || snapshot.id).toLowerCase(),
        name: String(item.name || item.email || snapshot.id),
        role: item.role === "admin" ? "admin" : item.role === "teacher" ? "teacher" : "viewer",
        subject: String(item.subject || "Người xem"),
        count: Number(item.count || 1),
        lastLoginAt: toIsoDate(item.lastLoginAt),
      } satisfies LoginStat;
    });
    const nextSiteStats: SiteStats = {
      visits: siteStats.visits,
      activeUsers: remoteTeachers.filter((teacher) => teacher.active).length,
      loginAccounts: remoteLoginStats.length,
    };

    await setDoc(
      doc(db, "siteStats", "summary"),
      {
        activeUsers: nextSiteStats.activeUsers,
        loginAccounts: nextSiteStats.loginAccounts,
        updatedAt: serverTimestamp(),
      },
      { merge: true },
    );
    setSiteStats((current) => ({
      ...current,
      activeUsers: nextSiteStats.activeUsers,
      loginAccounts: nextSiteStats.loginAccounts,
    }));

    updateAndSaveData((current) => ({
      ...current,
      teachers: remoteTeachers.length ? remoteTeachers : current.teachers,
      loginStats: remoteLoginStats,
    }));
  };

  const updateLocalLoginStats = (nextUser: CurrentUser) => {
    const now = new Date().toISOString();

    updateAndSaveData((current) => {
      const existing = current.loginStats.find(
        (item) => item.email.toLowerCase() === nextUser.email.toLowerCase(),
      );
      const nextStat: LoginStat = {
        email: nextUser.email.toLowerCase(),
        name: nextUser.name,
        role: nextUser.role,
        subject: nextUser.subject,
        count: (existing?.count ?? 0) + 1,
        lastLoginAt: now,
      };

      return {
        ...current,
        visits: current.visits + 1,
        loginStats: existing
          ? current.loginStats.map((item) =>
              item.email.toLowerCase() === nextUser.email.toLowerCase() ? nextStat : item,
            )
          : [nextStat, ...current.loginStats],
      };
    });
  };

  const recordRemoteLogin = async (nextUser: CurrentUser) => {
    if (!db) return;

    const loginRef = doc(db, "loginStats", emailDocId(nextUser.email));
    const existingLogin = await getDoc(loginRef).catch(() => null);

    await setDoc(
      loginRef,
      {
        email: nextUser.email.toLowerCase(),
        name: nextUser.name,
        role: nextUser.role,
        subject: nextUser.subject,
        count: increment(1),
        lastLoginAt: serverTimestamp(),
      },
      { merge: true },
    );

    await setDoc(
      doc(db, "siteStats", "summary"),
      {
        visits: increment(1),
        loginAccounts: existingLogin?.exists() ? increment(0) : increment(1),
        updatedAt: serverTimestamp(),
      },
      { merge: true },
    );
    await refreshSiteStats();
  };

  const refreshRemoteContentData = async () => {
    if (!db) return;

    const [resourceDocs, newsDocs, guideDocs, digitalDocs, deletedDocs] = await Promise.all([
      getDocs(collection(db, contentCollections.resources)),
      getDocs(collection(db, contentCollections.news)),
      getDocs(collection(db, contentCollections.guides)),
      getDocs(collection(db, contentCollections.digitalApps)),
      getDocs(collection(db, "deletedDefaults")),
    ]);
    const deletedKeys = new Set(
      deletedDocs.docs.map((snapshot) => {
        const item = snapshot.data();
        return deletedDefaultKey(String(item.kind || "") as ContentKind, String(item.id || ""));
      }),
    );
    loadLocalDeletedDefaultKeys().forEach((key) => deletedKeys.add(key));
    const remoteResources = resourceDocs.docs
      .map((snapshot) => {
        const item = snapshot.data();
        return {
          id: String(item.id || snapshot.id),
          title: String(item.title || ""),
          subject: String(item.subject || allSubjectsLabel),
          type: normalizeResourceType(item.type),
          category: String(item.category || "Tài liệu"),
          week: String(item.week || ""),
          contributor: String(item.contributor || "Ban quản trị"),
          driveUrl: String(item.driveUrl || ""),
          description: String(item.description || ""),
          status: item.status === "pending" || item.status === "rejected" ? item.status : "approved",
          views: Number(item.views || 0),
          opens: Number(item.opens || 0),
          createdAt: toIsoDate(item.createdAt),
        } satisfies Resource;
      })
      .filter((item) => item.title && item.driveUrl);
    const remoteNews = newsDocs.docs
      .map((snapshot) => {
        const item = snapshot.data();
        return {
          id: String(item.id || snapshot.id),
          title: String(item.title || ""),
          summary: String(item.summary || ""),
          imageUrl: String(item.imageUrl || ""),
          author: String(item.author || "Ban quản trị"),
          visible: item.visible !== false,
          createdAt: toIsoDate(item.createdAt),
        } satisfies News;
      })
      .filter((item) => item.title && item.imageUrl);
    const remoteGuides = guideDocs.docs
      .map((snapshot) => {
        const item = snapshot.data();
        return {
          id: String(item.id || snapshot.id),
          title: String(item.title || ""),
          content: String(item.content || ""),
          imageUrl: String(item.imageUrl || ""),
          linkUrl: String(item.linkUrl || ""),
          linkLabel: String(item.linkLabel || "Mở liên kết"),
          videoUrl: String(item.videoUrl || ""),
          downloadUrl: String(item.downloadUrl || ""),
          downloadLabel: String(item.downloadLabel || ""),
          author: String(item.author || "Ban quản trị"),
          createdAt: toIsoDate(item.createdAt),
        } satisfies Guide;
      })
      .filter((item) => item.title && item.content && !removedDefaultGuideIds.has(item.id));
    const remoteDigitalApps = digitalDocs.docs
      .map((snapshot) => {
        const item = snapshot.data();
        return {
          id: String(item.id || snapshot.id),
          title: String(item.title || ""),
          category: String(item.category || "Hình học 3D") as DigitalApp["category"],
          subject: String(item.subject || allSubjectsLabel),
          description: String(item.description || ""),
          appUrl: String(item.appUrl || ""),
          thumbnailUrl: String(item.thumbnailUrl || ""),
          author: String(item.author || "Ban quản trị"),
          createdAt: toIsoDate(item.createdAt),
        } satisfies DigitalApp;
      })
      .filter((app) => app.title && app.appUrl && !removedDefaultDigitalAppIds.has(app.id));

    updateAndSaveData((current) => ({
      ...current,
      resources: mergeRemoteWithDefaults("resources", seedData.resources, remoteResources, deletedKeys),
      news: mergeRemoteWithDefaults("news", seedData.news, remoteNews, deletedKeys),
      guides: mergeRemoteWithDefaults(
        "guides",
        seedData.guides.filter((guide) => !removedDefaultGuideIds.has(guide.id)),
        remoteGuides,
        deletedKeys,
      ),
      digitalApps: mergeRemoteWithDefaults("digitalApps", seedData.digitalApps, remoteDigitalApps, deletedKeys),
    }));
  };

  useEffect(() => {
    if (user?.role !== "admin") return;
    void refreshRemoteAccessData().catch(() => {
      setLoginError("");
    });
  }, [user?.role]);

  useEffect(() => {
    if (!user) return;
    void refreshSiteStats().catch(() => {
      setLoginError("");
    });
  }, [user?.email]);

  useEffect(() => {
    if (!user) return;
    void refreshRemoteContentData().catch(() => {
      setLoginError("");
    });
  }, [user?.email]);

  useEffect(() => {
    if (!user) return;
    if (user.role === "viewer") return;

    const teacher = data.teachers.find(
      (item) => item.email.toLowerCase() === user.email.toLowerCase() && item.active,
    );

    if (!teacher) {
      setUser(null);
      localStorage.removeItem(sessionKey);
      if (view === "admin") setView("dashboard");
      return;
    }

    if (teacher.role !== user.role || teacher.name !== user.name || teacher.subject !== user.subject) {
      const nextUser: CurrentUser = {
        name: teacher.name,
        email: teacher.email,
        role: teacher.role,
        subject: teacher.subject,
      };
      setUser(nextUser);
      localStorage.setItem(sessionKey, JSON.stringify(nextUser));
    }
  }, [data.teachers, user, view]);

  const stats = useMemo(() => {
    const opens = data.resources.reduce((sum, item) => sum + item.opens, 0);
    return {
      visits: siteStats.visits,
      resources: approvedResources.length,
      pending: pendingResources.length,
      teachers: siteStats.activeUsers || data.teachers.filter((teacher) => teacher.active).length,
      loginAccounts: siteStats.loginAccounts || data.loginStats.length,
      opens,
    };
  }, [
    approvedResources.length,
    data.loginStats.length,
    data.resources,
    data.teachers,
    pendingResources.length,
    siteStats.activeUsers,
    siteStats.loginAccounts,
    siteStats.visits,
  ]);

  const ebookResources = approvedResources.filter(isEbookResource);
  const filteredResources = approvedResources.filter((item) => {
    const matchesQuery = `${item.title} ${item.subject} ${item.category} ${item.week} ${item.description} ${item.contributor}`
      .toLowerCase()
      .includes(query.toLowerCase());
    const matchesSubject =
      subjectFilter === "Tất cả" || subjectFilter === allSubjectsLabel || item.subject === subjectFilter;
    const matchesType = typeFilter === "all" || item.type === typeFilter;
    return matchesQuery && matchesSubject && matchesType;
  });

  const logout = () => {
    setUser(null);
    localStorage.removeItem(sessionKey);
    void signOutGoogle();
    setView("dashboard");
  };

  const completeGoogleLogin = async (googleUser: { email: string; displayName: string }) => {
    if (!googleUser.email) {
      setLoginError("Tài khoản Google chưa trả về email. Vui lòng thử tài khoản khác.");
      return;
    }

    const googleEmail = googleUser.email.toLowerCase();
    let authorizedUser = data.teachers.find(
      (item) => item.email.toLowerCase() === googleUser.email.toLowerCase() && item.active,
    );

    if (db) {
      try {
        if (googleEmail === primaryAdminEmail) {
          authorizedUser = {
            id: "t-admin",
            name: "Quản trị Khối 5",
            email: primaryAdminEmail,
            subject: "Quản trị",
            code: "",
            role: "admin",
            active: true,
          };
          await setDoc(
            doc(db, "authorizedUsers", emailDocId(primaryAdminEmail)),
            {
              ...authorizedUser,
              updatedAt: serverTimestamp(),
            },
            { merge: true },
          );
        } else {
          const accessSnapshot = await getDoc(doc(db, "authorizedUsers", emailDocId(googleEmail)));
          if (accessSnapshot.exists()) {
            const item = accessSnapshot.data();
            if (item.active !== false) {
              authorizedUser = {
                id: String(item.id || accessSnapshot.id),
                name: String(item.name || googleUser.displayName || googleEmail),
                email: String(item.email || googleEmail).toLowerCase(),
                subject: String(item.subject || "Chưa phân môn"),
                code: "",
                role: item.role === "admin" ? "admin" : "teacher",
                active: true,
              };
            } else {
              authorizedUser = undefined;
            }
          }
        }
      } catch {
        // Fallback to local data if Firestore is not enabled yet.
      }
    }

    const nextUser: CurrentUser = {
      name: authorizedUser?.name || googleUser.displayName || googleEmail,
      email: authorizedUser?.email || googleEmail,
      role: authorizedUser?.role || "viewer",
      subject: authorizedUser?.subject || "Người xem",
    };
    const storedPendingView = sessionStorage.getItem(googlePendingViewKey);
    const nextPendingView = pendingView ?? (isView(storedPendingView) ? storedPendingView : null);

    if (authorizedUser) {
      updateAndSaveData((current) => ({
        ...current,
        teachers: current.teachers.some((teacher) => teacher.email.toLowerCase() === googleEmail)
          ? current.teachers.map((teacher) =>
              teacher.email.toLowerCase() === googleEmail ? { ...authorizedUser, active: true } : teacher,
            )
          : [{ ...authorizedUser, active: true }, ...current.teachers],
      }));
    }

    updateLocalLoginStats(nextUser);
    void recordRemoteLogin(nextUser).then(() => {
      if (nextUser.role === "admin") void refreshRemoteAccessData();
    });
    setUser(nextUser);
    localStorage.setItem(sessionKey, JSON.stringify(nextUser));
    sessionStorage.removeItem(googlePendingViewKey);
    setLoginError("");
    setGoogleAuthMessage("");
    setShowAuthModal(false);
    if (nextPendingView && (nextPendingView !== "contribute" || nextUser.role !== "viewer")) {
      setView(nextPendingView);
      setPendingView(null);
    }
  };

  const loginWithGoogle = async () => {
    setLoginError("");
    setGoogleAuthMessage("");

    if (!isFirebaseAuthReady) {
      setLoginError("Chưa cấu hình Firebase Google Auth. Vui lòng kiểm tra biến môi trường trên Vercel.");
      return;
    }

    if (isEmbeddedBrowser()) {
      setLoginError("Google chặn đăng nhập trong trình duyệt nhúng của Zalo/Facebook/Messenger. Vui lòng bấm dấu ba chấm rồi chọn mở bằng Safari hoặc Chrome.");
      return;
    }

    try {
      setIsGoogleSigningIn(true);
      if (isMobileBrowser()) {
        if (pendingView) sessionStorage.setItem(googlePendingViewKey, pendingView);
        await signInWithGoogleRedirect();
        return;
      }

      const googleUser = await signInWithGoogle();
      await completeGoogleLogin(googleUser);
    } catch (error) {
      console.error("Google login failed:", error);
      setLoginError(googleLoginErrorMessage(error));

      if (shouldRetryGoogleWithRedirect(error)) {
        try {
          if (pendingView) sessionStorage.setItem(googlePendingViewKey, pendingView);
          await signInWithGoogleRedirect();
        } catch (redirectError) {
          console.error("Google redirect login failed:", redirectError);
          setLoginError(googleLoginErrorMessage(redirectError));
        }
      }
    } finally {
      setIsGoogleSigningIn(false);
    }
  };

  useEffect(() => {
    if (!isFirebaseAuthReady) return;

    let cancelled = false;
    void getGoogleRedirectUser()
      .then(async (googleUser) => {
        if (!googleUser || cancelled) return;
        setIsGoogleSigningIn(true);
        await completeGoogleLogin(googleUser);
      })
      .catch((error) => {
        console.error("Google redirect result failed:", error);
        if (!cancelled) {
          setLoginError(googleLoginErrorMessage(error));
        }
      })
      .finally(() => {
        if (!cancelled) setIsGoogleSigningIn(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const hasStaffAccess = user?.role === "teacher" || user?.role === "admin";

  const requireGoogleAccess = (nextView?: View) => {
    if (user) return true;
    setPendingView(nextView ?? null);
    setShowAuthModal(true);
    return false;
  };

  const requireStaffAccess = (nextView?: View) => {
    if (!requireGoogleAccess(nextView)) return false;
    if (hasStaffAccess) return true;
    setLoginError(
      `Gmail ${user?.email ?? "này"} chỉ có quyền xem. Vui lòng liên hệ admin để được cấp quyền tải tài liệu hoặc đóng góp tài liệu vào thư viện.`,
    );
    setPendingView(nextView ?? null);
    setShowAuthModal(true);
    return false;
  };

  const markDeletedDefault = async (kind: ContentKind, id: string) => {
    if (!defaultContentIds[kind].has(id)) return;

    rememberLocalDeletedDefault(kind, id);
    if (!db) return;

    await setDoc(
      doc(db, "deletedDefaults", deletedDefaultDocId(kind, id)),
      {
        kind,
        id,
        deletedBy: user?.email ?? "",
        deletedAt: serverTimestamp(),
      },
      { merge: true },
    );
  };

  const persistContentItem = async (kind: ContentKind, item: Resource | News | Guide | DigitalApp) => {
    if (!db) return;

    await setDoc(
      doc(db, contentCollections[kind], item.id),
      {
        ...item,
        updatedAt: serverTimestamp(),
      },
      { merge: true },
    );
  };

  const deleteContentItem = async (kind: ContentKind, id: string) => {
    await markDeletedDefault(kind, id);
    if (db) {
      await deleteDoc(doc(db, contentCollections[kind], id));
    }
  };

  const removeContentItem = async (kind: ContentKind, id: string, nextData: AppData, label: string) => {
    try {
      await deleteContentItem(kind, id);
      setAndSaveData(nextData);
    } catch (error) {
      console.error(`Không xóa được ${label}:`, error);
      if (defaultContentIds[kind].has(id)) {
        window.alert(`Chưa xóa được ${label} khỏi hệ thống chung nên chưa ẩn ở máy này. Vui lòng kiểm tra Firestore Rules đã Publish và đăng nhập đúng tài khoản admin.`);
        return;
      }
      window.alert(`Chưa xóa được ${label}. Vui lòng kiểm tra Firestore Rules hoặc đăng nhập đúng tài khoản admin.`);
    }
  };

  const updateResource = (id: string, patch: Partial<Resource>) => {
    const nextResource = data.resources.find((item) => item.id === id);
    if (!nextResource) return;
    const updatedResource = { ...nextResource, ...patch };

    setAndSaveData({
      ...data,
      resources: data.resources.map((item) => (item.id === id ? updatedResource : item)),
    });
    void persistContentItem("resources", updatedResource);
  };

  const deleteResource = async (id: string) => {
    await removeContentItem(
      "resources",
      id,
      {
        ...data,
        resources: data.resources.filter((item) => item.id !== id),
      },
      "tài liệu",
    );
  };

  const saveResourceEdit = (event: FormEvent<HTMLFormElement>, id: string) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    updateResource(id, {
      title: String(form.get("title") || ""),
      subject: String(form.get("subject") || allSubjectsLabel),
      type: normalizeResourceType(form.get("type")),
      category: String(form.get("category") || "Tài liệu"),
      week: String(form.get("week") || ""),
      driveUrl: String(form.get("driveUrl") || ""),
      description: String(form.get("description") || ""),
    });
    setEditingResourceId(null);
  };

  const openResource = (resource: Resource) => {
    if (!requireStaffAccess()) return;

    updateResource(resource.id, {
      views: resource.views + 1,
      opens: resource.opens + 1,
    });
    window.open(resource.driveUrl, "_blank", "noopener,noreferrer");
  };

  const addResource = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!requireStaffAccess("contribute")) return;
    if (!user) return;

    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const next: Resource = {
      id: createId("r"),
      title: String(form.get("title") || ""),
      subject: String(form.get("subject") || allSubjectsLabel),
      type: normalizeResourceType(form.get("type")),
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
    void persistContentItem("resources", next);
    formElement.reset();
    setView(user.role === "admin" ? "admin" : "resources");
  };

  const addAdminResource = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!user || user.role !== "admin") return;
    const firebaseEmail = currentGoogleEmail();
    if (firebaseEmail !== primaryAdminEmail) {
      setLoginError("Phiên đăng nhập Firebase chưa đúng admin. Vui lòng đăng xuất rồi đăng nhập lại bằng Gmail nguyenduc91ltk@gmail.com.");
      setShowAuthModal(true);
      return;
    }

    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const next: Resource = {
      id: createId("r"),
      title: String(form.get("title") || "Tài liệu mới"),
      subject: String(form.get("subject") || allSubjectsLabel),
      type: normalizeResourceType(form.get("type")),
      category: String(form.get("category") || "Tài liệu"),
      week: String(form.get("week") || ""),
      contributor: user.name,
      driveUrl: String(form.get("driveUrl") || ""),
      description: String(form.get("description") || "Admin sẽ cập nhật mô tả sau."),
      status: "approved",
      views: 0,
      opens: 0,
      createdAt: new Date().toISOString(),
    };

    try {
      await persistContentItem("resources", next);
      setAndSaveData({ ...data, resources: [next, ...data.resources] });
      formElement.reset();
    } catch (error) {
      console.error("Không thêm được tài liệu thư viện:", error);
      const code = errorCode(error);
      const message = errorMessage(error);
      window.alert(`Chưa thêm được tài liệu vào thư viện.

Firebase Auth email: ${firebaseEmail || "(chưa có)"}
App đang hiển thị email: ${user.email}
Mã lỗi Firebase: ${code || "(không có)"}
Chi tiết: ${message}

Nếu mã lỗi là permission-denied, hãy kiểm tra Firestore Rules đã Publish và email admin trong Rules đúng là ${primaryAdminEmail}.`);
    }
  };

  const addTeacher = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const role = form.get("role") as Role;
    const email = String(form.get("email") || "").trim().toLowerCase();
    const existingTeacher = data.teachers.find((teacher) => teacher.email.toLowerCase() === email);
    if (existingTeacher) {
      setBulkAccessResult({
        added: 0,
        skipped: 1,
        duplicateEmails: [email],
        invalidLines: [],
      });
      setAccessNotificationDraft(null);
      window.alert(`Email ${email} đã được thêm trước đó, nên hệ thống không thêm lại.`);
      return;
    }

    const next: Teacher = {
      id: createId("t"),
      name: String(form.get("name") || ""),
      email,
      subject: String(form.get("subject") || allSubjectsLabel),
      code: "",
      role,
      active: true,
    };

    setAndSaveData({
      ...data,
      teachers: [next, ...data.teachers],
    });

    if (db) {
      await setDoc(
        doc(db, "authorizedUsers", emailDocId(email)),
        {
          ...next,
          updatedAt: serverTimestamp(),
        },
        { merge: true },
      );
    }

    setBulkAccessResult(null);
    setAccessNotificationDraft(buildAccessNotificationDraft("granted", [next]));
    formElement.reset();
  };

  const addBulkTeachers = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const rawList = String(form.get("bulkTeachers") || "");
    const subject = String(form.get("subject") || allSubjectsLabel);
    const role = form.get("role") as Role;
    const parsed = parseBulkTeachers(rawList, subject, role, data.teachers);

    if (parsed.teachers.length === 0) {
      setBulkAccessResult({
        added: 0,
        skipped: parsed.skipped,
        duplicateEmails: parsed.duplicateEmails,
        invalidLines: parsed.invalidLines,
      });
      setAccessNotificationDraft(null);
      return;
    }

    const firestore = db;
    if (firestore) {
      await Promise.all(
        parsed.teachers.map((teacher) =>
          setDoc(
            doc(firestore, "authorizedUsers", emailDocId(teacher.email)),
            {
              ...teacher,
              updatedAt: serverTimestamp(),
            },
            { merge: true },
          ),
        ),
      );
    }

    setAndSaveData({
      ...data,
      teachers: [...parsed.teachers, ...data.teachers],
    });
    setBulkAccessResult({
      added: parsed.teachers.length,
      skipped: parsed.skipped,
      duplicateEmails: parsed.duplicateEmails,
      invalidLines: parsed.invalidLines,
    });
    setAccessNotificationDraft(buildAccessNotificationDraft("granted", parsed.teachers));
    formElement.reset();
  };

  const updateTeacherAccess = async (teacher: Teacher, active: boolean) => {
    const nextTeacher = { ...teacher, active };

    try {
      if (db) {
        await setDoc(
          doc(db, "authorizedUsers", emailDocId(teacher.email)),
          {
            ...nextTeacher,
            updatedAt: serverTimestamp(),
          },
          { merge: true },
        );
      }

      setAndSaveData({
        ...data,
        teachers: data.teachers.map((item) => (item.id === teacher.id ? nextTeacher : item)),
      });
      setAccessNotificationDraft(buildAccessNotificationDraft(active ? "granted" : "revoked", [nextTeacher]));
    } catch (error) {
      console.error("Không cập nhật được quyền truy cập:", error);
      window.alert(`Chưa cập nhật được quyền truy cập cho ${teacher.email}.

Mã lỗi Firebase: ${errorCode(error) || "(không có)"}
Chi tiết: ${errorMessage(error)}`);
    }
  };

  const deleteTeacher = async (teacher: Teacher) => {
    if (teacher.email.toLowerCase() === primaryAdminEmail) return;

    setAndSaveData({
      ...data,
      teachers: data.teachers.filter((item) => item.id !== teacher.id),
    });

    if (db) {
      await deleteDoc(doc(db, "authorizedUsers", emailDocId(teacher.email)));
    }
    setAccessNotificationDraft(buildAccessNotificationDraft("revoked", [teacher]));
  };

  const copyAccessNotification = async (kind: "recipients" | "message") => {
    if (!accessNotificationDraft) return;
    const text =
      kind === "recipients"
        ? accessNotificationDraft.recipients.join(", ")
        : `Người nhận: ${accessNotificationDraft.recipients.join(", ")}
Tiêu đề: ${accessNotificationDraft.subject}

${accessNotificationDraft.body}`;

    try {
      await navigator.clipboard.writeText(text);
      window.alert(kind === "recipients" ? "Đã copy danh sách email." : "Đã copy nội dung thông báo.");
    } catch {
      window.prompt("Copy nội dung dưới đây:", text);
    }
  };

  const addNews = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!user || user.role !== "admin") return;
    if (!db) {
      window.alert("Chưa kết nối được Firestore nên ảnh không thể lưu cho giáo viên xem. Vui lòng kiểm tra cấu hình Firebase.");
      return;
    }

    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const imageFile = form.get("imageFile");
    let imageUrl = "";

    try {
      imageUrl = imageFile instanceof File && imageFile.size > 0
        ? await imageFileToCompressedDataUrl(imageFile)
        : String(form.get("imageUrl") || "");
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "Không xử lý được ảnh. Vui lòng thử ảnh khác.");
      return;
    }

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

    try {
      await persistContentItem("news", next);
      setAndSaveData({ ...data, news: [next, ...data.news] });
      formElement.reset();
    } catch (error) {
      console.error("Không lưu được ảnh hoạt động lên Firestore:", error);
      window.alert("Ảnh chưa đồng bộ được lên hệ thống chung. Vui lòng kiểm tra Rules, tài khoản admin, hoặc dùng ảnh nhỏ hơn/link ảnh online.");
    }
  };

  const addNewsContribution = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!requireStaffAccess("news")) return;
    if (!user) return;
    if (!db) {
      window.alert("Chưa kết nối được Firestore nên ảnh không thể gửi cho admin duyệt. Vui lòng thử lại sau.");
      return;
    }

    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const imageFile = form.get("imageFile");
    let imageUrl = "";

    try {
      imageUrl = imageFile instanceof File && imageFile.size > 0
        ? await imageFileToCompressedDataUrl(imageFile)
        : String(form.get("imageUrl") || "").trim();
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "Không xử lý được ảnh. Vui lòng thử ảnh khác.");
      return;
    }

    if (!imageUrl) {
      window.alert("Vui lòng chọn ảnh hoặc dán link ảnh.");
      return;
    }

    const next: News = {
      id: createId("n"),
      title: String(form.get("title") || "Ảnh hoạt động Khối 5"),
      summary: "",
      imageUrl,
      author: user.name,
      visible: user.role === "admin",
      createdAt: new Date().toISOString(),
    };

    try {
      await persistContentItem("news", next);
      setAndSaveData({ ...data, news: [next, ...data.news] });
      formElement.reset();
      window.alert(user.role === "admin" ? "Đã thêm ảnh vào album." : "Ảnh đã gửi lên, đang chờ admin duyệt.");
    } catch (error) {
      console.error("Không gửi được ảnh hoạt động:", error);
      window.alert("Chưa gửi được ảnh. Vui lòng kiểm tra Firestore Rules đã cho giáo viên tạo ảnh chờ duyệt, hoặc dùng ảnh nhỏ hơn/link ảnh online.");
    }
  };

  const deleteNews = async (id: string) => {
    await removeContentItem(
      "news",
      id,
      {
        ...data,
        news: data.news.filter((item) => item.id !== id),
      },
      "ảnh hoạt động",
    );
  };

  const toggleNewsVisibility = (item: News) => {
    const updatedNews = { ...item, visible: !item.visible };

    setAndSaveData({
      ...data,
      news: data.news.map((newsItem) => (newsItem.id === item.id ? updatedNews : newsItem)),
    });
    void persistContentItem("news", updatedNews);
  };

  const saveNewsEdit = async (event: FormEvent<HTMLFormElement>, id: string) => {
    event.preventDefault();
    const existingNews = data.news.find((item) => item.id === id);
    if (!existingNews) return;

    const form = new FormData(event.currentTarget);
    const imageFile = form.get("imageFile");
    let imageUrl = String(form.get("imageUrl") || "").trim() || existingNews.imageUrl;

    try {
      if (imageFile instanceof File && imageFile.size > 0) {
        imageUrl = await imageFileToCompressedDataUrl(imageFile);
      }
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "Không xử lý được ảnh. Vui lòng thử ảnh khác.");
      return;
    }

    const updatedNews: News = {
      ...existingNews,
      title: String(form.get("title") || existingNews.title),
      imageUrl,
      visible: String(form.get("visible") || "true") === "true",
    };

    try {
      await persistContentItem("news", updatedNews);
      setAndSaveData({
        ...data,
        news: data.news.map((item) => (item.id === id ? updatedNews : item)),
      });
      setEditingNewsId(null);
    } catch {
      window.alert("Chưa lưu được thay đổi ảnh hoạt động lên hệ thống chung. Vui lòng thử lại.");
    }
  };

  const addGuide = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!user || user.role !== "admin") return;

    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const imageFile = form.get("imageFile");
    let imageUrl = "";

    try {
      imageUrl = imageFile instanceof File && imageFile.size > 0
        ? await imageFileToCompressedDataUrl(imageFile)
        : String(form.get("imageUrl") || "");
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "Không xử lý được ảnh thumbnail. Vui lòng thử ảnh khác.");
      return;
    }

    const videoUrl = String(form.get("videoUrl") || "").trim();
    const downloadUrl = String(form.get("downloadUrl") || "").trim();
    const linkUrl = String(form.get("linkUrl") || "").trim() || videoUrl || downloadUrl;
    const linkLabel = String(form.get("linkLabel") || "").trim() || (videoUrl ? "Xem Demo" : downloadUrl ? "Tải về" : "Mở liên kết");

    const next: Guide = {
      id: createId("g"),
      title: String(form.get("title") || ""),
      content: String(form.get("content") || ""),
      imageUrl,
      linkUrl,
      linkLabel,
      videoUrl,
      downloadUrl,
      downloadLabel: String(form.get("downloadLabel") || "").trim() || "Tải về",
      author: user.name,
      createdAt: new Date().toISOString(),
    };

    try {
      await persistContentItem("guides", next);
      setAndSaveData({ ...data, guides: [next, ...data.guides] });
      formElement.reset();
    } catch {
      window.alert("Bài chưa đồng bộ được lên hệ thống chung. Vui lòng dùng ảnh nhỏ hơn hoặc dán link ảnh online.");
    }
  };

  const deleteGuide = async (id: string) => {
    await removeContentItem(
      "guides",
      id,
      {
        ...data,
        guides: data.guides.filter((item) => item.id !== id),
      },
      "bài CNTT-AI",
    );
  };

  const saveGuideEdit = async (event: FormEvent<HTMLFormElement>, id: string) => {
    event.preventDefault();
    const existingGuide = data.guides.find((item) => item.id === id);
    if (!existingGuide) return;

    const form = new FormData(event.currentTarget);
    const imageFile = form.get("imageFile");
    let imageUrl = String(form.get("imageUrl") || "").trim() || existingGuide.imageUrl;

    try {
      if (imageFile instanceof File && imageFile.size > 0) {
        imageUrl = await imageFileToCompressedDataUrl(imageFile);
      }
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "Không xử lý được ảnh thumbnail. Vui lòng thử ảnh khác.");
      return;
    }

    const videoUrl = String(form.get("videoUrl") || "").trim();
    const downloadUrl = String(form.get("downloadUrl") || "").trim();
    const linkUrl = String(form.get("linkUrl") || "").trim() || videoUrl || downloadUrl;
    const linkLabel = String(form.get("linkLabel") || "").trim() || (videoUrl ? "Xem Demo" : downloadUrl ? "Tải về" : "Mở liên kết");

    const updatedGuide: Guide = {
      ...existingGuide,
      title: String(form.get("title") || ""),
      content: String(form.get("content") || ""),
      imageUrl,
      linkUrl,
      linkLabel,
      videoUrl,
      downloadUrl,
      downloadLabel: String(form.get("downloadLabel") || "").trim() || "Tải về",
    };

    try {
      await persistContentItem("guides", updatedGuide);
      setAndSaveData({
        ...data,
        guides: data.guides.map((item) => (item.id === id ? updatedGuide : item)),
      });
      setEditingGuideId(null);
    } catch {
      window.alert("Chưa lưu được thay đổi bài CNTT-AI lên hệ thống chung. Vui lòng thử lại.");
    }
  };

  const addDigitalApp = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!user || user.role !== "admin") return;

    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const next: DigitalApp = {
      id: createId("d"),
      title: String(form.get("title") || ""),
      category: form.get("category") as DigitalApp["category"],
      subject: String(form.get("subject") || allSubjectsLabel),
      description: String(form.get("description") || ""),
      appUrl: String(form.get("appUrl") || ""),
      thumbnailUrl: String(form.get("thumbnailUrl") || ""),
      author: user.name,
      createdAt: new Date().toISOString(),
    };

    setAndSaveData({ ...data, digitalApps: [next, ...data.digitalApps] });
    await persistContentItem("digitalApps", next);
    formElement.reset();
  };

  const deleteDigitalApp = async (id: string) => {
    await removeContentItem(
      "digitalApps",
      id,
      {
        ...data,
        digitalApps: data.digitalApps.filter((item) => item.id !== id),
      },
      "công cụ số",
    );
  };

  const saveDigitalAppEdit = async (event: FormEvent<HTMLFormElement>, id: string) => {
    event.preventDefault();
    const existingApp = data.digitalApps.find((item) => item.id === id);
    if (!existingApp) return;

    const form = new FormData(event.currentTarget);
    const updatedApp: DigitalApp = {
      ...existingApp,
      title: String(form.get("title") || ""),
      category: form.get("category") as DigitalApp["category"],
      subject: String(form.get("subject") || allSubjectsLabel),
      description: String(form.get("description") || ""),
      appUrl: String(form.get("appUrl") || ""),
      thumbnailUrl: String(form.get("thumbnailUrl") || ""),
    };

    try {
      await persistContentItem("digitalApps", updatedApp);
      setAndSaveData({
        ...data,
        digitalApps: data.digitalApps.map((item) => (item.id === id ? updatedApp : item)),
      });
      setEditingDigitalAppId(null);
    } catch {
      window.alert("Chưa lưu được thay đổi công cụ số lên hệ thống chung. Vui lòng thử lại.");
    }
  };

  const navItems: Array<{ id: View; label: string; icon: typeof Gauge; adminOnly?: boolean; publicAccess?: boolean; variant?: "youtube" }> = [
    { id: "help", label: "Xem HD sử dụng", icon: Youtube, publicAccess: true, variant: "youtube" },
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
        <div className="brand-row sidebar-brand">
          <div className="brand-mark">
            <Library size={24} aria-hidden="true" />
          </div>
          <div className="brand-copy">
            <strong className="brand-title" aria-label="Thư viện số Khối 5">
              <span className="brand-title-main">Thư viện số</span>
              <span className="brand-title-grade">Khối 5</span>
            </strong>
            <span className="brand-subtitle">Kho học liệu mở</span>
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
                  className={`${view === item.id ? "active" : ""} ${item.variant === "youtube" ? "youtube-nav" : ""}`.trim()}
                  onClick={() => {
                    if (!item.publicAccess && !requireGoogleAccess(item.id)) return;
                    if (item.id === "contribute" && !requireStaffAccess("contribute")) return;
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
            <span>{user.role === "admin" ? "Admin" : user.role === "teacher" ? user.subject : "Người xem"}</span>
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
              <span>Cần cấp quyền để tải/đóng góp</span>
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
              {view === "help" && "Hướng dẫn sử dụng"}
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

        {view === "help" && (
          <section className="help-video-page">
            <article className="guide-featured-video help-video-card">
              <iframe
                className="guide-local-video"
                src={instructionVideoEmbedUrl}
                title="Video hướng dẫn sử dụng thư viện số"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
              />
              <div className="guide-card-head">
                <span className="guide-icon video-icon">
                  <Youtube size={22} />
                </span>
                <div>
                  <strong>Video hướng dẫn sử dụng thư viện số</strong>
                  <span>Giáo viên xem nhanh trước khi khai thác tài liệu</span>
                </div>
              </div>
              <div className="card-footer">
                <span>Nhúng từ YouTube</span>
                <button className="text-button" onClick={() => window.open(instructionVideoUrl, "_blank", "noopener,noreferrer")}>
                  Xem trên YouTube
                  <ExternalLink size={16} />
                </button>
              </div>
            </article>
          </section>
        )}

        {view === "dashboard" && (
          <div className="page-stack">
            <section className="visual-hero cover-hero" aria-label="Bìa thư viện số Khối 5">
              <img src="/banner-dashboard.jpg" alt="Thư viện số Khối 5" />
            </section>

            <section className="dashboard-stats-strip">
              <Metric icon={BarChart3} label="Lượt truy cập" value={stats.visits.toLocaleString("vi-VN")} />
              <Metric icon={FileText} label="Tài liệu duyệt" value={String(stats.resources)} />
              <Metric icon={ClipboardList} label="Chờ duyệt" value={String(stats.pending)} />
              <Metric icon={Users} label="Tài khoản active" value={String(stats.teachers)} />
              <Metric icon={ShieldCheck} label="Gmail đăng nhập" value={String(stats.loginAccounts)} />
            </section>

            <section className="subject-focus content-band">
              <div className="section-heading">
                <div>
                  <span className="eyebrow">Kho học liệu theo môn</span>
                  <h3>Môn học</h3>
                </div>
                <button
                  className="text-button"
                  onClick={() => {
                    if (!requireGoogleAccess("resources")) return;
                    setQuery("");
                    setSubjectFilter("Tất cả");
                    setTypeFilter("all");
                    setView("resources");
                  }}
                >
                  Mở thư viện
                  <ExternalLink size={16} />
                </button>
              </div>
              <div className="subject-strip featured-subjects">
                {dashboardSubjectCards.map((subject) => {
                  const count =
                    subject === allSubjectsLabel
                      ? approvedResources.length
                      : subject === ebookSubjectLabel
                        ? ebookResources.length
                      : approvedResources.filter((item) => item.subject === subject).length;
                  return (
                    <button
                      key={subject}
                      className={subjectClass(subject)}
                      onClick={() => {
                        if (!requireGoogleAccess("resources")) return;
                        setTypeFilter("all");
                        if (subject === ebookSubjectLabel) {
                          setSubjectFilter("Tất cả");
                          setQuery("sách điện tử");
                        } else {
                          setQuery("");
                          setSubjectFilter(subject === allSubjectsLabel ? "Tất cả" : subject);
                        }
                        setView("resources");
                      }}
                    >
                      <span>{subject}</span>
                      <small>{count} tài liệu</small>
                      <strong>{count}</strong>
                    </button>
                  );
                })}
              </div>
            </section>

            <section className="dashboard-overview">
              <div className="content-band">
                <div className="section-heading">
                  <h3>Tài liệu mới</h3>
                  <button
                    className="text-button"
                    onClick={() => {
                      if (!requireGoogleAccess("resources")) return;
                      setView("resources");
                    }}
                  >
                    Xem kho
                    <ExternalLink size={16} />
                  </button>
                </div>
                <div className="compact-list">
                  {approvedResources.slice(0, 4).map((item) => (
                    <button key={item.id} className="compact-item" onClick={() => openResource(item)}>
                      <span className={`subject-dot ${subjectClass(item.subject)}`}>{item.subject.slice(0, 1)}</span>
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

              <div className="dashboard-side">
                <section className="content-band">
                  <div className="section-heading">
                    <h3>Ảnh hoạt động mới</h3>
                    <button
                      className="text-button"
                      onClick={() => {
                        if (!requireGoogleAccess("news")) return;
                        setView("news");
                      }}
                    >
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
                </section>
              </div>
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
                  Giáo án
                </button>
                <button className={typeFilter === "ppt" ? "selected" : ""} onClick={() => setTypeFilter("ppt")}>
                  PPT
                </button>
                <button className={typeFilter === "ebook" ? "selected" : ""} onClick={() => setTypeFilter("ebook")}>
                  Sách điện tử
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
            {hasStaffAccess && (
              <form className="editor-form compact" onSubmit={addNewsContribution}>
                <div className="section-heading">
                  <h3>{user?.role === "admin" ? "Thêm ảnh hoạt động" : "Gửi ảnh hoạt động"}</h3>
                  <span className="pill">{user?.role === "admin" ? "Hiển thị ngay" : "Chờ admin duyệt"}</span>
                </div>
                <input name="title" placeholder="Chú thích ảnh, ví dụ: Ngày hội đọc sách" />
                <div className="form-grid">
                  <input name="imageFile" type="file" accept="image/*" />
                  <input name="imageUrl" type="url" placeholder="Hoặc dán link ảnh" />
                </div>
                <button className="primary-button" type="submit">
                  <ImagePlus size={18} />
                  {user?.role === "admin" ? "Thêm ảnh" : "Gửi ảnh chờ duyệt"}
                </button>
              </form>
            )}
            <section className="news-grid">
              {visibleNews.map((item) => (
                <article className="news-card" key={item.id}>
                  <div className="news-card-media">
                    <img src={item.imageUrl} alt={item.title} />
                    <button className="image-zoom-button" type="button" onClick={() => setSelectedNews(item)} title="Xem ảnh lớn">
                      <Maximize2 size={18} />
                    </button>
                  </div>
                  <div className="news-card-body">
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
                  <select name="subject" defaultValue={!user || user.subject === "Quản trị" ? allSubjectsLabel : user.subject}>
                    {subjects.map((subject) => (
                      <option key={subject}>{subject}</option>
                    ))}
                  </select>
                </label>
                <label>
                  Loại
                  <select name="type" defaultValue="lesson">
                    <option value="lesson">Giáo án</option>
                    <option value="ppt">PPT</option>
                    <option value="ebook">Sách điện tử</option>
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
                    Ảnh thumbnail
                    <input name="imageFile" type="file" accept="image/*" />
                  </label>
                  <label>
                    Link ảnh thumbnail
                    <input name="imageUrl" type="url" placeholder="Hoặc dán link ảnh" />
                  </label>
                </div>
                <div className="form-grid">
                  <label>
                    Link YouTube demo
                    <input name="videoUrl" type="url" placeholder="https://youtube.com/watch?v=..." />
                  </label>
                  <label>
                    Link Drive tải về
                    <input name="downloadUrl" type="url" placeholder="https://drive.google.com/..." />
                  </label>
                </div>
                <label>
                  Tên nút tải
                  <input name="downloadLabel" placeholder="Ví dụ: Tải về" />
                </label>
                <button className="primary-button" type="submit">
                  <Plus size={18} />
                  Đăng bài
                </button>
              </form>
            )}

            <div className="guide-list">
              <article className="guide-featured-video">
                <iframe
                  className="guide-local-video"
                  src={instructionVideoEmbedUrl}
                  title="Video hướng dẫn sử dụng thư viện số"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                />
                <div className="guide-card-head">
                  <span className="guide-icon video-icon">
                    <Youtube size={20} />
                  </span>
                  <div>
                    <strong>Video hướng dẫn sử dụng thư viện số</strong>
                    <span>Dành cho giáo viên Khối 5</span>
                  </div>
                </div>
                <div className="card-footer">
                  <span>Video nội bộ, xem trực tiếp trên web</span>
                  <div className="review-actions">
                    <button className="text-button" onClick={() => window.open(instructionVideoUrl, "_blank", "noopener,noreferrer")}>
                      Mở tab riêng
                      <ExternalLink size={16} />
                    </button>
                  </div>
                </div>
              </article>
              {data.guides.length === 0 ? (
                <EmptyState title="Chưa có bài cẩm nang" text="Các bài chia sẻ CNTT-AI sẽ xuất hiện tại đây." />
              ) : (
                data.guides.map((guide) => {
                  const guideVideoUrl = guide.videoUrl || (getYouTubeEmbedUrl(guide.linkUrl) ? guide.linkUrl : "");
                  const guideEmbedUrl = getYouTubeEmbedUrl(guideVideoUrl);
                  const guideDownloadUrl = guide.downloadUrl || (!guideEmbedUrl ? guide.linkUrl : "");
                  const guideDownloadLabel = guide.downloadLabel || guide.linkLabel || "Tải về";

                  return (
                  <article className={`guide-card ${editingGuideId === guide.id ? "editing" : ""}`} key={guide.id}>
                    {editingGuideId === guide.id ? (
                      <form className="resource-edit-form" onSubmit={(event) => saveGuideEdit(event, guide.id)}>
                        <label>
                          Tiêu đề
                          <input name="title" defaultValue={guide.title} required />
                        </label>
                        <label>
                          Nội dung chia sẻ
                          <textarea name="content" defaultValue={guide.content} rows={7} required />
                        </label>
                        <div className="form-grid">
                          <label>
                            Ảnh thumbnail mới
                            <input name="imageFile" type="file" accept="image/*" />
                          </label>
                          <label>
                            Link ảnh mới
                            <input name="imageUrl" type="url" placeholder="Để trống nếu giữ ảnh hiện tại" />
                          </label>
                        </div>
                        <div className="form-grid">
                          <label>
                            Link YouTube demo
                            <input name="videoUrl" type="url" defaultValue={guide.videoUrl || (getYouTubeEmbedUrl(guide.linkUrl) ? guide.linkUrl : "")} placeholder="https://youtube.com/watch?v=..." />
                          </label>
                          <label>
                            Link Drive tải về
                            <input name="downloadUrl" type="url" defaultValue={guideDownloadUrl} placeholder="https://drive.google.com/..." />
                          </label>
                        </div>
                        <label>
                          Tên nút tải
                          <input name="downloadLabel" defaultValue={guideDownloadLabel} placeholder="Ví dụ: Tải về" />
                        </label>
                        <div className="review-actions">
                          <button className="success-button" type="submit">
                            <Save size={17} />
                            Lưu
                          </button>
                          <button className="text-button" type="button" onClick={() => setEditingGuideId(null)}>
                            Hủy
                          </button>
                        </div>
                      </form>
                    ) : (
                      <>
                        {guideEmbedUrl ? (
                          <iframe
                            className="guide-video-frame"
                            src={guideEmbedUrl}
                            title={guide.title}
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                            allowFullScreen
                          />
                        ) : (
                          <img className="guide-card-thumbnail" src={guide.imageUrl || defaultGuideThumbnail} alt={guide.title} />
                        )}
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
                          {guideVideoUrl || guideDownloadUrl ? (
                            <div className="review-actions">
                              {guideVideoUrl && (
                                <button className="text-button" onClick={() => window.open(guideVideoUrl, "_blank", "noopener,noreferrer")}>
                                  Xem Demo
                                  <ExternalLink size={16} />
                                </button>
                              )}
                              {guideDownloadUrl && (
                                <button className="text-button" onClick={() => window.open(guideDownloadUrl, "_blank", "noopener,noreferrer")}>
                                  {guideDownloadLabel}
                                  <ExternalLink size={16} />
                                </button>
                              )}
                            </div>
                          ) : (
                            <span>Không có link đính kèm</span>
                          )}
                          {user?.role === "admin" && (
                            <div className="review-actions">
                              <button className="icon-button" onClick={() => setEditingGuideId(guide.id)} title="Sửa bài">
                                <Pencil size={18} />
                              </button>
                              <button className="icon-button danger-icon" onClick={() => void deleteGuide(guide.id)} title="Xóa bài">
                                <Trash2 size={18} />
                              </button>
                            </div>
                          )}
                        </div>
                      </>
                    )}
                  </article>
                  );
                })
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
                      {digitalCategories.map((category) => (
                        <option key={category}>{category}</option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Môn
                    <select name="subject" defaultValue={allSubjectsLabel}>
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
                    <article className={`digital-card ${subjectClass(app.subject)} ${editingDigitalAppId === app.id ? "editing" : ""}`} key={app.id}>
                      {editingDigitalAppId === app.id ? (
                        <form className="resource-edit-form digital-edit-form" onSubmit={(event) => saveDigitalAppEdit(event, app.id)}>
                          <label>
                            Tên ứng dụng
                            <input name="title" defaultValue={app.title} required />
                          </label>
                          <div className="form-grid">
                            <label>
                              Nhóm
                              <select name="category" defaultValue={app.category}>
                                {digitalCategories.map((category) => (
                                  <option key={category}>{category}</option>
                                ))}
                              </select>
                            </label>
                            <label>
                              Môn
                              <select name="subject" defaultValue={app.subject}>
                                {subjects.map((subject) => (
                                  <option key={subject}>{subject}</option>
                                ))}
                              </select>
                            </label>
                          </div>
                          <label>
                            Mô tả
                            <textarea name="description" defaultValue={app.description} rows={4} required />
                          </label>
                          <label>
                            Link mở ứng dụng
                            <input name="appUrl" type="url" defaultValue={app.appUrl} required />
                          </label>
                          <label>
                            Link ảnh đại diện
                            <input name="thumbnailUrl" type="url" defaultValue={app.thumbnailUrl} />
                          </label>
                          <div className="review-actions">
                            <button className="success-button" type="submit">
                              <Save size={17} />
                              Lưu
                            </button>
                            <button className="text-button" type="button" onClick={() => setEditingDigitalAppId(null)}>
                              Hủy
                            </button>
                          </div>
                        </form>
                      ) : (
                        <>
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
                                <button className="primary-button small" onClick={() => {
                                  window.location.href = app.appUrl;
                                }}>
                                  <ExternalLink size={17} />
                                  Mở
                                </button>
                                {user?.role === "admin" && (
                                  <>
                                    <button className="icon-button" onClick={() => setEditingDigitalAppId(app.id)} title="Sửa ứng dụng">
                                      <Pencil size={18} />
                                    </button>
                                    <button className="icon-button danger-icon" onClick={() => void deleteDigitalApp(app.id)} title="Xóa ứng dụng">
                                      <Trash2 size={18} />
                                    </button>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                        </>
                      )}
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
                    <article key={item.id} className={`review-item ${editingResourceId === item.id ? "editing" : ""}`}>
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
                              <option value="lesson">Giáo án</option>
                              <option value="ppt">PPT</option>
                              <option value="ebook">Sách điện tử</option>
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
                            <button className="icon-button" onClick={() => setEditingResourceId(item.id)} title="Sửa tài liệu">
                              <Pencil size={18} />
                            </button>
                            <button className="icon-button danger-icon" onClick={() => void deleteResource(item.id)} title="Xóa tài liệu">
                              <Trash2 size={18} />
                            </button>
                          </div>
                        </>
                      )}
                    </article>
                  ))}
                </div>
              </div>

              <div className="admin-panel">
                <div className="section-heading">
                  <h3>Thêm tài liệu thư viện</h3>
                  <span className="pill">Đã duyệt</span>
                </div>
                <form className="editor-form compact" onSubmit={addAdminResource}>
                  <input name="title" required placeholder="Tên tài liệu" />
                  <div className="form-grid">
                    <select name="subject" defaultValue={allSubjectsLabel}>
                      {subjects.map((subject) => (
                        <option key={subject}>{subject}</option>
                      ))}
                    </select>
                    <select name="type" defaultValue="lesson">
                      <option value="lesson">Giáo án</option>
                      <option value="ppt">PPT</option>
                      <option value="ebook">Sách điện tử</option>
                    </select>
                  </div>
                  <div className="form-grid">
                    <input name="category" placeholder="Nhóm tài liệu" />
                    <input name="week" placeholder="Tuần/Học kỳ" />
                  </div>
                  <input name="driveUrl" type="url" required placeholder="Link Google Drive" />
                  <textarea name="description" rows={3} placeholder="Mô tả, ghi chú..." />
                  <button className="primary-button" type="submit">
                    <Plus size={18} />
                    Thêm vào thư viện
                  </button>
                </form>
              </div>

              <div className="admin-panel">
                <div className="section-heading">
                  <h3>Cấp quyền email</h3>
                  <span className="pill">Đơn lẻ</span>
                </div>
                <form className="editor-form compact" onSubmit={addTeacher}>
                  <input name="name" required placeholder="Họ tên" />
                  <input name="email" required type="email" placeholder="Email Gmail" />
                  <div className="form-grid">
                    <select name="subject" defaultValue={allSubjectsLabel}>
                      {subjects.map((subject) => (
                        <option key={subject}>{subject}</option>
                      ))}
                    </select>
                    <select name="role" defaultValue="teacher">
                      <option value="teacher">Giáo viên</option>
                      <option value="admin">Admin</option>
                    </select>
                  </div>
                  <button className="primary-button" type="submit">
                    <Plus size={18} />
                    Thêm email
                  </button>
                </form>
                <div className="bulk-access-block">
                  <div className="section-heading secondary-heading">
                    <h3>Thêm hàng loạt</h3>
                    <span className="pill">Copy dán</span>
                  </div>
                  <form className="editor-form compact" onSubmit={addBulkTeachers}>
                    <textarea
                      name="bulkTeachers"
                      rows={7}
                      required
                      placeholder={`Nguyễn Văn A, nguyenvana@gmail.com
Trần Thị B<TAB>tranthib@gmail.com
leminhc@gmail.com, Lê Minh C`}
                    />
                    <div className="form-grid">
                      <select name="subject" defaultValue={allSubjectsLabel}>
                        {subjects.map((subject) => (
                          <option key={subject}>{subject}</option>
                        ))}
                      </select>
                      <select name="role" defaultValue="teacher">
                        <option value="teacher">Giáo viên</option>
                        <option value="admin">Admin</option>
                      </select>
                    </div>
                    <button className="primary-button" type="submit">
                      <ClipboardList size={18} />
                      Cấp quyền hàng loạt
                    </button>
                  </form>
                  {bulkAccessResult && (
                    <div className={`auth-note ${bulkAccessResult.invalidLines.length > 0 || bulkAccessResult.duplicateEmails.length > 0 ? "" : "success"}`}>
                      Đã thêm {bulkAccessResult.added}, bỏ qua {bulkAccessResult.skipped} email đã có hoặc bị lặp trong danh sách.
                      {bulkAccessResult.duplicateEmails.length > 0 && (
                        <span> Email đã thêm rồi: {bulkAccessResult.duplicateEmails.slice(0, 8).join(", ")}</span>
                      )}
                      {bulkAccessResult.invalidLines.length > 0 && (
                        <span> Dòng chưa đọc được email: {bulkAccessResult.invalidLines.slice(0, 3).join(" | ")}</span>
                      )}
                    </div>
                  )}
                </div>
                {accessNotificationDraft && (
                  <div className="access-notice-draft">
                    <div className="section-heading">
                      <h3>Thông báo quyền truy cập</h3>
                      <span className="pill">{accessNotificationDraft.mode === "granted" ? "Cấp quyền" : "Thu hồi"}</span>
                    </div>
                    <p>
                      Bản nháp cho {accessNotificationDraft.recipients.length} người nhận. Admin có thể copy hoặc mở Gmail để gửi.
                    </p>
                    <label>
                      Người nhận
                      <textarea rows={2} readOnly value={accessNotificationDraft.recipients.join(", ")} />
                    </label>
                    <label>
                      Nội dung
                      <textarea
                        rows={5}
                        readOnly
                        value={`${accessNotificationDraft.subject}\n\n${accessNotificationDraft.body}`}
                      />
                    </label>
                    <div className="review-actions">
                      <button type="button" className="text-button" onClick={() => void copyAccessNotification("recipients")}>
                        <Copy size={17} />
                        Copy email
                      </button>
                      <button type="button" className="text-button" onClick={() => void copyAccessNotification("message")}>
                        <Copy size={17} />
                        Copy nội dung
                      </button>
                      <button
                        type="button"
                        className="success-button"
                        onClick={() => window.open(gmailComposeUrl(accessNotificationDraft), "_blank", "noopener,noreferrer")}
                      >
                        <Mail size={17} />
                        Mở Gmail
                      </button>
                    </div>
                  </div>
                )}
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
                        <th>Quyền</th>
                        <th>Truy cập</th>
                        <th>Thao tác</th>
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
                          <td>{teacher.role === "admin" ? "Admin" : "GV"}</td>
                          <td>
                            <button
                              className={`switch ${teacher.active ? "on" : ""}`}
                              onClick={() => void updateTeacherAccess(teacher, !teacher.active)}
                              title={teacher.active ? "Thu hồi truy cập" : "Cấp lại truy cập"}
                            >
                              <span />
                            </button>
                          </td>
                          <td>
                            <button
                              className="icon-button danger-icon"
                              onClick={() => void deleteTeacher(teacher)}
                              title="Xóa email"
                              disabled={teacher.email.toLowerCase() === primaryAdminEmail}
                            >
                              <Trash2 size={18} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="section-heading secondary-heading">
                  <h3>Gmail đã đăng nhập</h3>
                  <span className="pill">{data.loginStats.length}</span>
                </div>
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Tài khoản Google</th>
                        <th>Quyền</th>
                        <th>Số lần</th>
                        <th>Lần gần nhất</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[...data.loginStats]
                        .sort((a, b) => new Date(b.lastLoginAt).getTime() - new Date(a.lastLoginAt).getTime())
                        .map((item) => (
                          <tr key={item.email}>
                            <td>
                              <strong>{item.name}</strong>
                              <span>{item.email}</span>
                            </td>
                            <td>
                              {item.role === "admin" ? "Admin" : item.role === "teacher" ? "GV" : "Người xem"}
                            </td>
                            <td>{item.count}</td>
                            <td>{formatDate(item.lastLoginAt)}</td>
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
                    <article key={item.id} className={editingNewsId === item.id ? "editing" : ""}>
                      {editingNewsId === item.id ? (
                        <form className="resource-edit-form" onSubmit={(event) => saveNewsEdit(event, item.id)}>
                          <label>
                            Chú thích ảnh
                            <input name="title" defaultValue={item.title} required />
                          </label>
                          <div className="form-grid">
                            <label>
                              Ảnh mới
                              <input name="imageFile" type="file" accept="image/*" />
                            </label>
                            <label>
                              Link ảnh mới
                              <input name="imageUrl" type="url" placeholder="Để trống nếu giữ ảnh hiện tại" />
                            </label>
                          </div>
                          <label>
                            Trạng thái
                            <select name="visible" defaultValue={item.visible ? "true" : "false"}>
                              <option value="true">Đang hiện</option>
                              <option value="false">Đã ẩn</option>
                            </select>
                          </label>
                          <div className="review-actions">
                            <button className="success-button" type="submit">
                              <Save size={17} />
                              Lưu
                            </button>
                            <button className="text-button" type="button" onClick={() => setEditingNewsId(null)}>
                              Hủy
                            </button>
                          </div>
                        </form>
                      ) : (
                        <>
                          <img src={item.imageUrl} alt="" />
                          <div>
                            <strong>{item.title}</strong>
                            <span>{item.visible ? "Đang hiện" : "Đã ẩn"}</span>
                          </div>
                          <button className="icon-button" onClick={() => setEditingNewsId(item.id)} title="Sửa ảnh">
                            <Pencil size={18} />
                          </button>
                          <button className="icon-button danger-icon" onClick={() => void deleteNews(item.id)} title="Xóa ảnh">
                            <Trash2 size={18} />
                          </button>
                          <button
                            className="icon-button"
                            onClick={() => toggleNewsVisibility(item)}
                            title={item.visible ? "Ẩn tin" : "Hiện tin"}
                          >
                            {item.visible ? <XCircle size={18} /> : <CheckCircle2 size={18} />}
                          </button>
                        </>
                      )}
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
                            <option value="lesson">Giáo án</option>
                            <option value="ppt">PPT</option>
                            <option value="ebook">Sách điện tử</option>
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
                        <button className="icon-button danger-icon" onClick={() => void deleteResource(item.id)} title="Xóa">
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
      {selectedNews && (
        <div className="image-lightbox" role="dialog" aria-modal="true" aria-label={selectedNews.title} onClick={() => setSelectedNews(null)}>
          <section className="image-lightbox-panel" onClick={(event) => event.stopPropagation()}>
            <button className="lightbox-close" type="button" onClick={() => setSelectedNews(null)} title="Đóng">
              <X size={22} />
            </button>
            <img src={selectedNews.imageUrl} alt={selectedNews.title} />
            <div>
              <strong>{selectedNews.title}</strong>
              <span>
                {formatDate(selectedNews.createdAt)} · {selectedNews.author}
              </span>
            </div>
          </section>
        </div>
      )}
      {showAuthModal && (
        <div className="auth-modal-backdrop" role="dialog" aria-modal="true" aria-label="Đăng nhập Google">
          <section className="auth-modal">
            <div className="brand-row">
              <div className="brand-mark">
                <Library size={24} aria-hidden="true" />
              </div>
              <div>
                <strong>{user ? "Chưa được cấp quyền tải" : "Đăng nhập Google"}</strong>
                <span>
                  {user
                    ? "Tài khoản này đang chỉ có quyền xem nội dung."
                    : "Đăng nhập để xem và ghi nhận thống kê truy cập"}
                </span>
              </div>
            </div>
            {!user && (
              <button
                className="google-button"
                type="button"
                onClick={loginWithGoogle}
                disabled={isGoogleSigningIn}
              >
                <Chrome size={18} />
                {isGoogleSigningIn ? "Đang mở Google..." : "Đăng nhập bằng Google"}
              </button>
            )}
            {!user && (
              <p className="auth-note">
                Trên điện thoại, hãy mở web bằng Safari hoặc Chrome. Google không cho đăng nhập trong trình duyệt nhúng của Zalo/Facebook/Messenger.
              </p>
            )}
            {googleAuthMessage && <p className="auth-note success">{googleAuthMessage}</p>}
            {loginError && <p className="form-error">{loginError}</p>}
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

