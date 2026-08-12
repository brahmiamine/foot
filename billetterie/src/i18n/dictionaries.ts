export const dictionaries = {
  fr: {
    "language.label": "Langue du site", "site.title": "Billetterie", "site.description": "Achetez vos billets pour les matchs de votre club",
    "common.allMatches": "← Tous les matchs", "common.dateTbc": "Date à confirmer", "common.vs": "vs", "common.reference": "Réf.",
    "home.subtitle": "Achetez vos billets pour les prochains matchs — tous clubs confondus.", "home.empty": "Aucune vente de billets n’est ouverte pour le moment.",
    "match.noOffers": "Aucune catégorie de billet n’est ouverte pour ce match.", "match.remaining": "{count} place(s) restante(s)",
    "match.homeOnly": "réservé aux supporters du club recevant", "match.awayOnly": "réservé aux supporters du club visiteur", "match.login": "Se connecter pour acheter",
    "purchase.saleClosed": "Vente non ouverte pour cette catégorie.", "purchase.soldOut": "Complet.", "purchase.homeConfirmation": "Je confirme être supporter du club recevant pour cette catégorie.", "purchase.awayConfirmation": "Je confirme être supporter du club visiteur pour cette catégorie.", "purchase.buy": "Acheter — {price}", "purchase.unexpected": "Réponse inattendue du serveur (lien de paiement manquant).", "purchase.failed": "Achat impossible.",
    "tickets.title": "Mes billets", "tickets.empty": "Vous n’avez encore acheté aucun billet.", "status.pending": "En attente", "status.paid": "Payé", "status.cancelled": "Annulé", "status.used": "Utilisé",
    "payment.invalid": "Lien de retour invalide", "payment.confirmed": "Paiement confirmé", "payment.available": "Vos billets sont disponibles dans « Mes billets ».", "payment.failed": "Paiement échoué ou annulé", "payment.released": "Votre réservation a été libérée. Vous pouvez retenter l’achat depuis la page du match.", "payment.checking": "Paiement en cours de vérification", "payment.wait": "Le statut définitif peut prendre quelques instants. Consultez « Mes billets » dans peu de temps.", "payment.viewTickets": "Voir mes billets",
    "admin.title": "Signal d’audience", "admin.description": "Billets dont l’audience déclarée ne correspond pas aux affiliations SSO de l’acheteur. Ce signal de modération ne bloque pas l’achat ; examinez le cas puis marquez-le comme traité.", "admin.home": "Domicile", "admin.away": "Visiteurs", "admin.public": "Public", "admin.empty": "Aucun signal en attente.", "admin.failed": "Échec du traitement.", "admin.audience": "Audience déclarée :", "admin.boughtOn": "acheté le", "admin.dismiss": "Marquer traité",
    "team.home": "Équipe à domicile", "team.away": "Équipe visiteuse"
  },
  ar: {
    "language.label": "لغة الموقع", "site.title": "التذاكر", "site.description": "اشتر تذاكر مباريات ناديك",
    "common.allMatches": "جميع المباريات →", "common.dateTbc": "سيتم تحديد الموعد", "common.vs": "ضد", "common.reference": "المرجع",
    "home.subtitle": "اشتر تذاكر المباريات القادمة لجميع الأندية.", "home.empty": "لا توجد مبيعات تذاكر مفتوحة حاليا.",
    "match.noOffers": "لا توجد فئة تذاكر مفتوحة لهذه المباراة.", "match.remaining": "الأماكن المتبقية: {count}",
    "match.homeOnly": "مخصصة لجماهير الفريق المضيف", "match.awayOnly": "مخصصة لجماهير الفريق الضيف", "match.login": "سجّل الدخول للشراء",
    "purchase.saleClosed": "البيع غير مفتوح لهذه الفئة.", "purchase.soldOut": "نفدت التذاكر.", "purchase.homeConfirmation": "أؤكد أنني من جماهير الفريق المضيف لهذه الفئة.", "purchase.awayConfirmation": "أؤكد أنني من جماهير الفريق الضيف لهذه الفئة.", "purchase.buy": "شراء — {price}", "purchase.unexpected": "استجابة غير متوقعة من الخادم (رابط الدفع مفقود).", "purchase.failed": "تعذر الشراء.",
    "tickets.title": "تذاكري", "tickets.empty": "لم تشتر أي تذكرة بعد.", "status.pending": "في الانتظار", "status.paid": "مدفوع", "status.cancelled": "ملغى", "status.used": "مستعمل",
    "payment.invalid": "رابط العودة غير صالح", "payment.confirmed": "تم تأكيد الدفع", "payment.available": "تذاكرك متوفرة في «تذاكري».", "payment.failed": "فشل الدفع أو تم إلغاؤه", "payment.released": "تم تحرير حجزك. يمكنك إعادة محاولة الشراء من صفحة المباراة.", "payment.checking": "جار التحقق من الدفع", "payment.wait": "قد يستغرق تحديد الحالة النهائية بعض الوقت. راجع «تذاكري» بعد قليل.", "payment.viewTickets": "عرض تذاكري",
    "admin.title": "تنبيه الجمهور", "admin.description": "تذاكر لا يتطابق فيها الجمهور المصرح به مع انتماءات المشتري في نظام الدخول الموحد. لا يمنع تنبيه الإشراف عملية الشراء؛ راجع الحالة ثم علّمها كمعالجة.", "admin.home": "المضيف", "admin.away": "الزوار", "admin.public": "العموم", "admin.empty": "لا توجد تنبيهات معلقة.", "admin.failed": "فشلت المعالجة.", "admin.audience": "الجمهور المصرح به:", "admin.boughtOn": "تم الشراء في", "admin.dismiss": "تعليم كمعالج",
    "team.home": "الفريق المضيف", "team.away": "الفريق الضيف"
  }
} as const;
export type TranslationKey = keyof typeof dictionaries.fr;
export type TranslationValues = Record<string, string | number>;
export function translate(locale: keyof typeof dictionaries, key: TranslationKey, values?: TranslationValues): string {
  let message: string = dictionaries[locale][key] ?? dictionaries.fr[key];
  for (const [name, value] of Object.entries(values ?? {})) message = message.replaceAll(`{${name}}`, String(value));
  return message;
}
