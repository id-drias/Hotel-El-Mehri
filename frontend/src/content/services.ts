/** Restaurant, cafeteria, kheima, pool and the two conference rooms. */

import type { Localized } from './hotel';

export type ServiceCategory = 'restaurant' | 'tea_room' | 'wellness' | 'events';

export type ServiceContent = {
  slug: string;
  category: ServiceCategory;
  name: Localized;
  kicker: Localized;
  description: Localized;
  images: string[];
};

export const services: ServiceContent[] = [
  {
    slug: 'restaurant-gastronomique',
    category: 'restaurant',
    name: { fr: 'Le Restaurant', ar: 'المطعم' },
    kicker: { fr: 'Table gastronomique — 60 couverts', ar: 'مائدة راقية — 60 مقعداً' },
    description: {
      fr: 'Refait à neuf lors de la réhabilitation, le restaurant gastronomique accueille soixante convives autour des spécialités locales et nationales, du petit déjeuner au dîner.',
      ar: 'أُعيد تجهيزه بالكامل خلال أشغال إعادة التأهيل، يستقبل المطعم الراقي ستين ضيفاً حول الأطباق المحلية والوطنية، من الفطور إلى العشاء.',
    },
    images: ['/images/dining/restaurant-1.jpg', '/images/dining/restaurant-2.jpg'],
  },
  {
    slug: 'cafeteria',
    category: 'tea_room',
    name: { fr: 'La Cafétéria', ar: 'الكافيتيريا' },
    kicker: { fr: 'Salon de thé — 40 places', ar: 'صالون شاي — 40 مقعداً' },
    description: {
      fr: "Quarante places sous les voûtes blanches de Pouillon : boissons chaudes et fraîches, jus, thé et pâtisseries, à toute heure de la journée.",
      ar: 'أربعون مقعداً تحت أقبية بويون البيضاء: مشروبات ساخنة وباردة وعصائر وشاي وحلويات، في أي وقت من اليوم.',
    },
    images: [
      '/images/dining/cafeteria-1.jpg',
      '/images/dining/cafeteria-2.jpg',
      '/images/dining/cafeteria-3.jpg',
      '/images/dining/cafeteria-4.jpg',
      '/images/dining/cafeteria-5.jpg',
    ],
  },
  {
    slug: 'kheima',
    category: 'restaurant',
    name: { fr: 'La Kheima', ar: 'الخيمة' },
    kicker: { fr: 'Tente traditionnelle au jardin', ar: 'خيمة تقليدية في الحديقة' },
    description: {
      fr: "Dressée dans le jardin de l'hôtel, la kheima traditionnelle prolonge les soirées sahariennes : thé, veillées et réceptions sous la toile.",
      ar: 'منصوبة في حديقة الفندق، تمدّ الخيمة التقليدية السهرات الصحراوية: شاي وأمسيات واستقبالات تحت الخيمة.',
    },
    images: ['/images/dining/kheima-1.jpg', '/images/dining/kheima-2.jpg'],
  },
  {
    slug: 'piscine-sauna',
    category: 'wellness',
    name: { fr: 'Piscine et sauna', ar: 'المسبح والساونا' },
    kicker: { fr: 'Loisirs et bien-être', ar: 'الترفيه والاستجمام' },
    description: {
      fr: "Une piscine extérieure entièrement rénovée, bordée de palmiers et gratuite pour les résidents, et un sauna installé lors des travaux de réhabilitation.",
      ar: 'مسبح خارجي مجدَّد بالكامل تحيط به النخيل ومجاني للنزلاء، وساونا رُكِّبت خلال أشغال إعادة التأهيل.',
    },
    images: ['/images/wellness/piscine-1.jpg', '/images/wellness/sauna-1.jpg'],
  },
  {
    slug: 'seminaires',
    category: 'events',
    name: { fr: 'Séminaires et réunions', ar: 'الندوات والاجتماعات' },
    kicker: { fr: 'Événementiel', ar: 'المناسبات' },
    description: {
      fr: 'Deux salles de conférence de soixante places chacune, au centre-ville et à une minute du siège de la wilaya : le format des séminaires, des formations et des réunions professionnelles.',
      ar: 'قاعتا مؤتمرات بستين مقعداً لكل واحدة، في وسط المدينة وعلى بعد دقيقة من مقر الولاية: الإطار المناسب للندوات والتكوين والاجتماعات المهنية.',
    },
    images: [
      '/images/events/salle-conference-1.jpg',
      '/images/events/salle-conference-2.jpg',
    ],
  },
];

export type EventHallContent = {
  slug: string;
  name: Localized;
  description: Localized;
  capacity: number | null;
  image: string;
};

export const eventHalls: EventHallContent[] = [
  {
    slug: 'salle-conference-1',
    name: { fr: 'Salle de conférence I', ar: 'قاعة المؤتمرات الأولى' },
    description: {
      fr: 'Soixante places pour vos séminaires, conférences et présentations.',
      ar: 'ستون مقعداً لندواتكم ومؤتمراتكم وعروضكم.',
    },
    capacity: 60,
    image: '/images/events/salle-conference-1.jpg',
  },
  {
    slug: 'salle-conference-2',
    name: { fr: 'Salle de conférence II', ar: 'قاعة المؤتمرات الثانية' },
    description: {
      fr: 'Une seconde salle de soixante places, mobilisable en parallèle ou en atelier.',
      ar: 'قاعة ثانية بستين مقعداً، يمكن استعمالها بالتوازي أو كورشة عمل.',
    },
    capacity: 60,
    image: '/images/events/salle-conference-2.jpg',
  },
  {
    slug: 'kheima-reception',
    name: { fr: 'La Kheima', ar: 'الخيمة' },
    description: {
      fr: 'La tente traditionnelle du jardin, pour les réceptions et les soirées en plein air.',
      ar: 'الخيمة التقليدية في الحديقة، للاستقبالات والسهرات في الهواء الطلق.',
    },
    capacity: null,
    image: '/images/dining/kheima-1.jpg',
  },
];

export function getServicesByCategory(category: ServiceCategory): ServiceContent[] {
  return services.filter((service) => service.category === category);
}
