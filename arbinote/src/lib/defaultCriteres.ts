import { CritereDefinition } from "@/types";

export const defaultCritereDefinitions: CritereDefinition[] = [
  {
    id: "fairplay",
    categorie: "arbitre",
    label_fr: "Fair-play",
    label_en: "Fair-play",
    label_ar: "اللعب النظيف",
    description_fr: "Évalue l'impartialité et la gestion des contacts.",
    description_ar: "تقييم الحياد وطريقة إدارة الاحتكاكات.",
  },
  {
    id: "decisions",
    categorie: "arbitre",
    label_fr: "Décisions",
    label_en: "Decisions",
    label_ar: "القرارات",
    description_fr: "Justesse des cartons et cohérence disciplinaire.",
    description_ar: "مدى صحة الإنذارات والانسجام في القرارات الانضباطية.",
  },
  {
    id: "var_qualite",
    categorie: "var",
    label_fr: "VAR",
    label_en: "VAR",
    label_ar: "استخدام تقنية الفار",
    description_fr: "Analyse la qualité des interventions VAR et la rapidité.",
    description_ar: "تحليل جودة تدخلات الفار وسرعة اتخاذ القرار.",
  },
  {
    id: "assistant_collaboration",
    categorie: "assistant",
    label_fr: "Assistants",
    label_en: "Assistants",
    label_ar: "عمل الحكام المساعدين",
    description_fr: "Précision des hors-jeu et cohérence avec le central.",
    description_ar: "دقّة التسلل والانسجام مع الحكم الرئيسي.",
  },
];


