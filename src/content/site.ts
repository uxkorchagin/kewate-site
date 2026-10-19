// All copy comes from the Figma file C2TjUAlhjrQHFI741h3UFn (181:764 / 194:309 / 200:309 / 232:312).
// Placeholders like «[N]» are kept verbatim — they are waiting for studio content.

export const contacts = {
  email: "main@kewate.ru",
  phone: "+7 985 012-34-07",
  phoneHref: "tel:+79850123407",
  // TODO(content): real social links are not in the design
  telegram: "https://t.me/",
  vk: "https://vk.com/",
  behance: "https://www.behance.net/",
};

export const legal = {
  owner: "ИП Ковальчук Николай Олегович",
  inn: "ИНН 780162899261",
  ogrnip: "ОГРНИП 326508100133012",
};

export const nav = [
  { id: "projects", label: "Проекты", href: "#projects" },
  { id: "prices", label: "Цены", href: "#services" },
  { id: "about", label: "О студии", href: "#about" },
  { id: "contacts", label: "Контакты", href: "#contacts" },
] as const;

export const clients = [
  "DA&BR",
  "RusStroj",
  "Kalashnikov Marketing",
  "Manuspect",
  "ИРБИС КАРАТЭ",
  "Ремянники парк",
  "Кленкор",
  "Горнево Парк",
];

export const tagRows = [
  ["Сайты", "Магазины", "Приложения"],
  ["Сервисы", "UX/UI", "Брендинг"],
  ["Реклама", "Метрика", "SEO"],
];

export const review = {
  label: "Отзыв клиента",
  duration: "0:42",
  quote: "«Заказали сайт и остались довольны — продолжаем работать»",
  author: "Павел Калашников, DA&BR",
  poster: "/images/pavel.jpg",
  // round «video note» 400×400, 0:42; moov moved to the front with scripts/faststart.mjs
  video: "/video/review.mp4" as string | null,
  // the card plays the same file silently on hover (preload none — nothing loads until then)
  preview: "/video/review.mp4" as string | null,
  // TODO(content): no captions yet — drop a .vtt here (WCAG 1.2.2)
  subtitles: null as string | null,
};

export type ServiceCategory = "dev" | "design" | "marketing";
export type IllustrationKind =
  | "sites"
  | "shops"
  | "apps"
  | "services"
  | "graphic"
  | "marketing"
  | "brand"
  | "product";

export const serviceCategories: { id: "all" | ServiceCategory; label: string; count: number }[] = [
  { id: "all", label: "Все услуги", count: 8 },
  { id: "dev", label: "Разработка", count: 4 },
  { id: "design", label: "Дизайн", count: 3 },
  { id: "marketing", label: "Маркетинг", count: 1 },
];

export const services: {
  id: IllustrationKind;
  title: string;
  desc: string;
  price: string;
  href: string;
  category: ServiceCategory;
}[] = [
  {
    id: "sites",
    title: "Разработка сайтов",
    desc: "Лендинги, сайты-визитки, многостраничные",
    price: "от 60 000 ₽",
    href: "/uslugi/razrabotka-saytov",
    category: "dev",
  },
  {
    id: "shops",
    title: "Интернет-магазины",
    desc: "Каталог, корзина, оплата, интеграции",
    price: "от [N] ₽",
    href: "/uslugi/razrabotka-internet-magazinov",
    category: "dev",
  },
  {
    id: "apps",
    title: "Разработка приложений",
    desc: "iOS, Android и desktop",
    price: "от [N] ₽",
    href: "/uslugi/razrabotka-prilozheniy",
    category: "dev",
  },
  {
    id: "services",
    title: "Разработка сервисов",
    desc: "Веб-сервисы, личные кабинеты, CRM, боты",
    price: "от [N] ₽",
    href: "/uslugi/razrabotka-servisov",
    category: "dev",
  },
  {
    id: "graphic",
    title: "Графический дизайн",
    desc: "Баннеры, презентации, полиграфия, соцсети",
    price: "от [N] ₽",
    href: "/uslugi/graficheskiy-dizayn",
    category: "design",
  },
  {
    id: "marketing",
    title: "Маркетинговые кампании",
    desc: "Яндекс Директ, ВК таргет, Метрика",
    price: "от [N] ₽",
    href: "/uslugi/marketingovye-kampanii",
    category: "marketing",
  },
  {
    id: "brand",
    title: "Фирменный стиль",
    desc: "Логотип, айдентика, брендбук",
    price: "от [N] ₽",
    href: "/uslugi/firmennyy-stil",
    category: "design",
  },
  {
    id: "product",
    title: "Продуктовый дизайн",
    desc: "UX/UI: исследования, прототипы, UI-kit",
    price: "от [N] ₽",
    href: "/uslugi/produktovyy-dizayn",
    category: "design",
  },
];

export const megaMenuGroups: { id: ServiceCategory; label: string; items: IllustrationKind[] }[] = [
  { id: "dev", label: "Разработка", items: ["sites", "shops", "apps", "services"] },
  { id: "design", label: "Дизайн", items: ["graphic", "brand", "product"] },
  { id: "marketing", label: "Маркетинг", items: ["marketing"] },
];

export const checklist = [
  "Первый экран: понятно ли, что вы предлагаете",
  "Структура: на какие вопросы клиента нет ответа",
  "Форма заявки: где люди бросают её",
  "Скорость и версия для телефона",
  "Метрика: считаются ли заявки вообще",
];

export const methods = [
  {
    title: "Исследуем рынок",
    text: "Анализируем конкурентов и потребности аудитории, чтобы сайт попадал в их запросы.",
  },
  {
    title: "Транслируем ценности бизнеса",
    text: "Отталкиваемся от целей бизнеса и философии бренда, делаем дизайн под фирменный стиль.",
  },
  {
    title: "Работаем без конструкторов",
    text: "Чистый код: сайт быстрее, лучше оптимизирован, и в нём можно изменить что угодно.",
  },
];

/** Stage bars of the 14-day plan. `from`/`to` are inclusive day numbers, half days allowed. */
export const timeline = {
  days: 14,
  today: 10,
  stages: [
    { label: "Исследование рынка", from: 1, to: 2, days: "Д1–2" },
    { label: "Дизайн", from: 2, to: 6, days: "Д2–6" },
    { label: "Утверждение и правки", from: 6, to: 8, days: "Д6–8" },
    { label: "Разработка", from: 8, to: 12, days: "Д8–12" },
    { label: "Утверждение и правки", from: 11, to: 12.5, days: "Д11–13" },
    { label: "Настройка SEO", from: 13, to: 14, days: "Д13–14" },
    { label: "Настройка сайта", from: 13, to: 14, days: "Д13–14" },
    { label: "Сдача проекта", from: 14, to: 14, days: "Д14–14", final: true },
  ],
};
