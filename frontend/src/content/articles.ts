/**
 * News and events published by the hotel.
 *
 * Both entries below are built from public reporting on the property (the
 * rehabilitation programme and the heritage listing of Fernand Pouillon's
 * hotels). The `publishedAt` dates are editorial placeholders — set them to the
 * dates the hotel actually wants to show before launch.
 */

import type { Localized } from './hotel';

export type ArticleContent = {
  slug: string;
  title: Localized;
  excerpt: Localized;
  body: Localized;
  publishedAt: string;
  cover: string;
};

export const articles: ArticleContent[] = [
  {
    slug: 'rehabilitation-hotel-el-mehri',
    title: {
      fr: "L'hôtel El Mehri rouvre après une réhabilitation complète",
      ar: 'فندق المهري يعيد فتح أبوابه بعد إعادة تأهيل شاملة',
    },
    excerpt: {
      fr: "Un programme de 350 millions de dinars a porté la capacité de l'établissement à 81 chambres et 180 lits.",
      ar: 'برنامج بقيمة 350 مليون دينار رفع طاقة استيعاب المؤسسة إلى 81 غرفة و180 سريراً.',
    },
    body: {
      fr: "L'hôtel El Mehri, propriété de la chaîne El Aurassi et l'une des principales structures hôtelières du Sud algérien, a fait l'objet d'une réhabilitation complète financée à hauteur de 350 millions de dinars.\n\nLes travaux ont porté la capacité de l'établissement de 50 à 81 chambres, soit 180 lits dont 78 chambres doubles. Ils ont également livré un nouvel espace de réception et un nouveau restaurant, une cafétéria de 40 places, deux salles de conférence de 60 places chacune, un sauna et une piscine entièrement rénovée.\n\nLes réseaux d'eau potable et d'assainissement ont été repris, et les aménagements extérieurs — jardin et kheima traditionnelle — remis en état.",
      ar: 'فندق المهري، المملوك لسلسلة الأوراسي وأحد أهم الهياكل الفندقية في الجنوب الجزائري، خضع لعملية إعادة تأهيل شاملة بغلاف مالي قدره 350 مليون دينار.\n\nرفعت الأشغال طاقة استيعاب المؤسسة من 50 إلى 81 غرفة، أي 180 سريراً منها 78 غرفة مزدوجة. كما أنجزت فضاء استقبال جديداً ومطعماً جديداً وكافيتيريا بـ40 مقعداً وقاعتي مؤتمرات بستين مقعداً لكل واحدة وساونا ومسبحاً مجدَّداً بالكامل.\n\nوأُعيد تأهيل شبكات المياه الصالحة للشرب والصرف الصحي، كما رُمِّمت التهيئات الخارجية من حديقة وخيمة تقليدية.',
    },
    publishedAt: '2026-07-20',
    cover: '/images/blog/rehabilitation.jpg',
  },
  {
    slug: 'patrimoine-national-fernand-pouillon',
    title: {
      fr: 'El Mehri classé au patrimoine national',
      ar: 'المهري مصنَّف ضمن التراث الوطني',
    },
    excerpt: {
      fr: "La commission nationale des biens culturels a classé cinq hôtels de l'architecte Fernand Pouillon, dont El Mehri.",
      ar: 'صنّفت اللجنة الوطنية للممتلكات الثقافية خمسة فنادق للمهندس فرنان بويون، من بينها المهري.',
    },
    body: {
      fr: "La commission nationale des biens culturels a décidé de classer au patrimoine national cinq hôtels conçus par l'architecte Fernand Pouillon, parmi lesquels l'hôtel El Mehri de Ouargla.\n\nPouillon a réalisé quelque 300 projets dans 48 villes algériennes. Ses hôtels sahariens sont étudiés pour leur réponse au climat : orientation, épaisseur des murs, patios et circulation de l'air y tiennent lieu de climatisation avant l'heure.\n\nSéjourner à El Mehri, c'est loger dans une pièce de cette histoire architecturale, au centre de Ouargla.",
      ar: 'قررت اللجنة الوطنية للممتلكات الثقافية تصنيف خمسة فنادق من تصميم المهندس فرنان بويون ضمن التراث الوطني، من بينها فندق المهري بورقلة.\n\nأنجز بويون نحو 300 مشروع في 48 مدينة جزائرية. وتُدرَس فنادقه الصحراوية لاستجابتها للمناخ: التوجيه وسماكة الجدران والأفنية وحركة الهواء تقوم فيها مقام التكييف قبل أوانه.\n\nالإقامة في المهري هي إقامة داخل قطعة من هذا التاريخ المعماري، في قلب ورقلة.',
    },
    publishedAt: '2026-07-20',
    cover: '/images/blog/patrimoine.jpg',
  },
];

export function getArticle(slug: string): ArticleContent | undefined {
  return articles.find((article) => article.slug === slug);
}
