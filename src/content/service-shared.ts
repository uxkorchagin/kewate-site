// Service pages «/uslugi/*»: what every page shares (filters, cases, copy) and the page config type.
// The per-page configs live in services.ts and reach the client only for the page being rendered.
// Source: Figma C2TjUAlhjrQHFI741h3UFn, section 293:7158 (desktop 205:309…213:309, mobile 281:309…284:5354).
// Copy is verbatim from the design. Placeholders «[N]», «[Клиент]», «[Ответ: заполнить]» are kept as-is.

import type { IllustrationKind } from "./site";

export type ProjectFilter = "all" | "sites" | "shops" | "apps" | "services" | "graphic" | "marketing" | "brand" | "product";

export const serviceProjectFilters: { id: ProjectFilter; label: string }[] = [
  { id: "all", label: "Все" },
  { id: "sites", label: "Сайты" },
  { id: "shops", label: "Магазины" },
  { id: "apps", label: "Приложения" },
  { id: "services", label: "Сервисы" },
  { id: "graphic", label: "Графдизайн" },
  { id: "marketing", label: "Реклама" },
  { id: "brand", label: "Фирменный стиль" },
  { id: "product", label: "Продуктовый дизайн" },
];

/** long page screenshot that scrolls inside a browser window on hover (296:309) */
export type CaseCover = { kind: "snapshot"; src: string; width: number; height: number };

export type ServiceCase = {
  id: string;
  client: string;
  tags: string;
  title: string;
  filters: ProjectFilter[];
  cover: CaseCover;
};

/**
 * The cases the studio can show right now (full-page screenshots 01–05 from the studio, 944 px wide = 2× the
 * 472 px preview window). Main page and every service page use this list.
 */
const shot = (id: string, height: number): CaseCover => ({ kind: "snapshot", src: `/images/snapshots/${id}.webp`, width: 472, height });

export const serviceCases: ServiceCase[] = [
  {
    id: "irbis",
    client: "ИРБИС КАРАТЭ",
    tags: "Сайт-визитка, дизайн",
    title: "ИРБИС КАРАТЭ. Сайт-визитка для школы каратэ",
    filters: ["sites"],
    cover: shot("irb", 2284),
  },
  {
    id: "dabr",
    client: "DA&BR",
    tags: "Лендинг, дизайн, разработка",
    title: "DA&BR. Лендинг студии разработки мобильных приложений",
    filters: ["sites"],
    cover: shot("dab", 3102),
  },
  {
    id: "russtroj",
    client: "RusStroj",
    tags: "Многостраничный сайт",
    title: "RusStroj. Строительство элитных домов в Сербии",
    filters: ["sites"],
    cover: shot("rus", 2988),
  },
  {
    id: "financebot",
    client: "FinanceBot",
    tags: "Лендинг, дизайн, разработка",
    title: "FinanceBot. Лендинг сервиса финансовой аналитики для бизнеса",
    filters: ["sites"],
    cover: shot("fin", 2904),
  },
  {
    id: "kalashnikov",
    client: "Kalashnikov Marketing",
    tags: "Лендинг, дизайн, разработка",
    title: "Kalashnikov Marketing. Лендинг для маркетингового агентства",
    filters: ["sites"],
    cover: shot("kal", 1782),
  },
];

/** filters that have at least one case — empty topics are not offered */
export const usedProjectFilters = serviceProjectFilters.filter(
  (f) => f.id === "all" || serviceCases.some((c) => c.filters.includes(f.id)),
);

export type Segment = [text: string, accent: boolean];

export type ServicePage = {
  slug: string;
  /** illustration / topic of the page */
  kind: IllustrationKind;
  filter: ProjectFilter;
  /** «Разработка сайтов — цена и сроки | Kewate» (label above the frame) */
  metaTitle: string;
  /** H1 split into white (accent) and grey parts */
  h1: Segment[];
  specs: { label: string; value: string }[];
  demoBanner?: boolean;
  types: {
    title: string;
    cards: { badge?: string; title: string; desc: string; price: string; term: string }[];
  };
  bonus: string;
  /** season note: lead + text */
  season: [string, string];
  audit: { title: string; desc: string; items: string[]; placeholder: string };
  included: { items: string[]; total: string; base: number | null };
  /** add-ons reference the services of the main page */
  addons: { kind: IllustrationKind; pkg: number | null }[];
  steps: { badge: string; title: string; text: string }[];
  plan: {
    caption: string;
    unit: "Д" | "Н";
    count: number;
    today: number;
    /** `from`/`to` are inclusive unit numbers, halves allowed (same format as the main page) */
    stages: { label: string; from: number; to: number; final?: boolean }[];
  };
  faq: { q: string; a: string }[];
};

/** Text shared by all eight pages */
export const serviceCopy = {
  typesEyebrow: "Виды услуги",
  typesLead: "Цену и срок называем до старта. Дополнительные работы делаем только с вашего согласия.",
  slotsEyebrow: "Свободные слоты",
  bonusLead: "Бонус за бронь до пятницы: ",
  includedTitle: "Что входит в стоимость",
  includedLead: "Всё из списка входит в стоимость. Поддержка после запуска тоже включена, без подписок и доплат.",
  addonsTitle: "Часто заказывают вместе",
  addonsLead: "Добавьте к смете, и мы посчитаем всё вместе.",
  processLead: "У каждого этапа есть даты, поэтому вы всегда знаете, что происходит с проектом и что будет дальше.",
  planNote: "Точные сроки называем после брифа",
  faqLead: "Собрали ответы на то, что спрашивают чаще всего перед стартом.",
  contactTitle: "Делаем сайты, сервисы и дизайн, которые приносят заявки",
  footerTitle: ["Проект, который приносит заявки,", "в паре кликов от вас."] as [string, string],
  demo: "Бесплатно сделаем демо, чтобы вы оценили дизайн до старта работ",
};
