export type Locale =
  | "en" | "ar" | "fr" | "es" | "de" | "it" | "pt" | "tr" | "ur" | "fa";

export const LOCALE_COOKIE = "mxh_locale";
export const LOCALES: Locale[] = ["en", "ar", "fr", "es", "de", "it", "pt", "tr", "ur", "fa"];
export const DEFAULT_LOCALE: Locale = "en";

export const LOCALE_LABELS: Record<Locale, string> = {
  en: "English",
  ar: "العربية",
  fr: "Français",
  es: "Español",
  de: "Deutsch",
  it: "Italiano",
  pt: "Português",
  tr: "Türkçe",
  ur: "اردو",
  fa: "فارسی",
};

const RTL_LOCALES: Locale[] = ["ar", "ur", "fa"];
export function isRtl(locale: Locale): boolean {
  return RTL_LOCALES.includes(locale);
}

// Maps a UI locale to the Language code used for AI exam generation.
export function localeToExamLanguage(locale: Locale): string {
  return locale;
}

export type FeatureItem = { emoji: string; title: string; body: string };
export type RegionItem = { region: string; takeaway: string };
export type StepItem = { title: string; body: string };
export type PlanCopy = { label: string; description: string; features: string[] };

import type { Plan } from "@/generated/prisma/client";

export type Translations = {
  nav: {
    plans: string;
    dashboard: string;
    generate: string;
    signin: string;
    signup: string;
    signout: string;
    languageMenuLabel: string;
  };
  footer: string;
  whatsapp: string;
  home: {
    badge: string;
    title: string;
    subtitle: string;
    ctaStart: string;
    ctaPlans: string;
    trustLine: string;
    whyH: string;
    whySub: string;
    features: FeatureItem[];
    howH: string;
    howSub: string;
    steps: StepItem[];
    formatsH: string;
    formatsSub: string;
    formatsAll: string;
    regions: RegionItem[];
    specialtiesH: string;
    specialtiesSub: string;
    finalH: string;
    finalSub: string;
    finalCreate: string;
    finalCompare: string;
  };
  homeExtra: {
    trustBadges: string[];
    demoLabel: string;
    demoQuestion: string;
    demoOptionA: string;
    demoOptionB: string;
    demoOptionC: string;
    demoOptionD: string;
    demoCorrect: string;
    demoExplanation: string;
    testimonialsH: string;
    testimonialsSub: string;
    testimonials: { quote: string; author: string; role: string }[];
    specialtiesSearch: string;
    specialtiesNoResults: string;
  };
  signup: {
    title: string;
    subtitle: string;
    name: string;
    email: string;
    password: string;
    passwordHint: string;
    submit: string;
    submitLoading: string;
    haveAccount: string;
    signin: string;
  };
  login: {
    title: string;
    email: string;
    password: string;
    submit: string;
    submitLoading: string;
    noAccount: string;
    signup: string;
  };
  plans: {
    title: string;
    subtitle: string;
    current: string;
    signUp: string;
    upgrade: string;
    goDashboard: string;
    badgePopular: string;
    badgeValue: string;
    perMonth: string;
    currencyShort: string;
    free: string;
    perPlan: Record<Plan, PlanCopy>;
  };
  dashboard: {
    welcome: string;
    planSuffix: string;
    freeTrial: string;
    activeUntil: string;
    generateNew: string;
    examsThisMonth: string;
    remaining: string;
    examsCreated: string;
    completedShort: string;
    averageScore: string;
    acrossCompleted: string;
    recentExams: string;
    noExams: string;
    generateFirst: string;
    status: { generating: string; ready: string; inProgress: string; completed: string; failed: string };
    guideHeadings: Record<Plan, string>;
    guideTips: Record<Plan, string[]>;
  };
  banner: {
    dismiss: string;
    perPlan: Record<"FREE" | "BASIC" | "PRO", { title: string; body: string; cta: string }>;
  };
  newExam: {
    pageTitle: string;
    remainingLine: string;
    bySpecialty: string;
    byExam: string;
    specialty: string;
    topic: string;
    topicPlaceholder: string;
    exam: string;
    specialtyOptional: string;
    topicOptional: string;
    topicOptionalPlaceholder: string;
    any: string;
    difficulty: string;
    difficulties: { BEGINNER: string; STUDENT: string; INTERN: string; RESIDENT: string; SPECIALIST: string; CONSULTANT: string; BOARD: string };
    mode: string;
    modePractice: string;
    modeExam: string;
    questionsMax: string;
    timeLimit: string;
    timeLimitPlaceholder: string;
    questionLanguage: string;
    languageHint: string;
    generate: string;
    generateLoading: string;
    disclaimer: string;
  };
  account: {
    title: string;
    manageLink: string;
    yourPlan: string;
    status: string;
    statusActive: string;
    statusCancelled: string;
    statusExpired: string;
    statusFree: string;
    startedOn: string;
    expiresOn: string;
    daysRemaining: string;
    cancelledNotice: string;
    renew: string;
    cancel: string;
    cancelConfirm: string;
    cancelConfirmImmediate: string;
    reactivate: string;
    upgradeOptions: string;
    noUpgrades: string;
    freeUpgradeNote: string;
    paymentHistory: string;
    paymentEmpty: string;
    colDate: string;
    colPlan: string;
    colAmount: string;
    colStatus: string;
    paidStatus: string;
    pendingStatus: string;
    failedStatus: string;
    backToDashboard: string;
  };
};

const FEATURE_KEYS = [
  { emoji: "🧠", k: "f1" },
  { emoji: "🌐", k: "f2" },
  { emoji: "🎯", k: "f3" },
  { emoji: "⏱️", k: "f4" },
  { emoji: "📊", k: "f5" },
  { emoji: "🔒", k: "f6" },
] as const;

function feats(t: Record<string, { title: string; body: string }>): FeatureItem[] {
  return FEATURE_KEYS.map((f) => ({ emoji: f.emoji, title: t[f.k].title, body: t[f.k].body }));
}

const en = {
  nav: {
    plans: "Plans", dashboard: "Dashboard", generate: "Generate exam",
    signin: "Sign in", signup: "Start free", signout: "Sign out",
    languageMenuLabel: "Change language",
  },
  footer: "MedExam Hub is for medical education only. Always verify clinical decisions against authoritative sources.",
  whatsapp: "Chat on WhatsApp",
  home: {
    badge: "Built for doctors, residents & medical students",
    title: "Pass your next exam faster.",
    subtitle: "Stop wasting time on low-yield content. AI-generated, exam-level MCQs for USMLE, MRCS, MRCP, Egyptian Fellowship, Prometric and more — in 10 languages, at any difficulty, with explanations and learning points.",
    ctaStart: "Start your first AI exam in 30 seconds — Free",
    ctaPlans: "See plans from {price} EGP/mo",
    trustLine: "41 exam formats · 10 languages · 7 difficulty levels · 20+ specialties",
    whyH: "Why MedExam Hub",
    whySub: "Built around the way doctors actually study — and what makes them pass.",
    features: feats({
      f1: { title: "Never run out of high-yield questions", body: "Generate exam-level MCQs on any topic, at any difficulty. Tailored to your specialty and the gaps in your prep." },
      f2: { title: "Study in your mother tongue", body: "10 languages including Arabic, Urdu, Persian, Turkish. Universal medical acronyms (ECG, NSTEMI, NICE) stay in standard form." },
      f3: { title: "Feels like the real exam", body: "USMLE feels USMLE. MRCS Part B feels OSCE. Egyptian Fellowship feels Egyptian Fellowship. Walk into your exam knowing the format." },
      f4: { title: "Train under exam pressure", body: "Practice mode for learning. Exam mode adds a timer to simulate the real thing — so the day of the real test isn't your first one." },
      f5: { title: "See exactly where you're weak", body: "Score history, accuracy by topic, and recommendations. Stop wasting hours on what you already know." },
      f6: { title: "Your data stays yours", body: "Your study history is private. Payments processed by Paymob — we never see your card number." },
    }),
    howH: "How it works",
    howSub: "From signup to graded results in under five minutes.",
    steps: [
      { title: "Pick your exam", body: "Choose by specialty (Diabetic Foot, Cardiology, Surgery…) or by exam format (USMLE, MRCS, Egyptian Fellowship, Prometric…). Set difficulty and language." },
      { title: "Generate the MCQs", body: "The AI writes 1–100 questions tailored to your inputs. Each comes with one correct answer, plausible distractors, an explanation and a learning point." },
      { title: "Take the exam, see results", body: "Practice mode for learning, exam mode for simulation. Submit to get a per-question review and your score on the dashboard." },
    ],
    formatsH: "Built for the exams you take",
    formatsSub: "From international boards to regional licensing exams.",
    formatsAll: "{count} exam formats covered. Browse all →",
    regions: [
      { region: "USA", takeaway: "USMLE Step 1 / 2 CK / 3" },
      { region: "UK Royal Colleges", takeaway: "MRCP, MRCS, MRCOG, MRCPCH, FRCS, PLAB" },
      { region: "European Boards (UEMS)", takeaway: "EBSQ, FEBVS, EDAIC, EBC, EBO" },
      { region: "Middle East / Gulf", takeaway: "Prometric (Saudi/UAE/Qatar/Oman/Bahrain), DHA, DOH" },
      { region: "Egypt", takeaway: "Egyptian Fellowship, Board, Diploma, Master's, MD" },
    ],
    specialtiesH: "Specialties covered",
    specialtiesSub: "Pick from {count} medical specialties or add your own topic.",
    finalH: "Ready to study smarter?",
    finalSub: "Try the Free trial today — 1 exam, no card. Upgrade when you're ready for more.",
    finalCreate: "Create free account",
    finalCompare: "Compare plans",
  },
  signup: {
    title: "Create your account",
    subtitle: "Start with the free plan. 1 AI exam per month, no card required.",
    name: "Name", email: "Email", password: "Password",
    passwordHint: "At least 8 characters.",
    submit: "Create account", submitLoading: "Creating account…",
    haveAccount: "Already have an account?", signin: "Sign in",
  },
  login: {
    title: "Sign in",
    email: "Email", password: "Password",
    submit: "Sign in", submitLoading: "Signing in…",
    noAccount: "Need an account?", signup: "Sign up",
  },
  plans: {
    title: "Choose your plan",
    subtitle: "Free trial, then upgrade as your study volume grows.",
    current: "Current plan", signUp: "Sign up", upgrade: "Upgrade",
    goDashboard: "Go to dashboard",
    badgePopular: "Most popular", badgeValue: "Best value",
    perMonth: "/month", currencyShort: "EGP", free: "Free",
    perPlan: {
      FREE: { label: "Free", description: "A 1-exam trial each month — get a feel for the AI before upgrading.",
        features: ["1 AI exam per month (trial)", "Up to 10 questions per exam", "Generate by specialty or by exam type", "Practice & exam modes"] },
      BASIC: { label: "Basic", description: "For regular practice and medical students.",
        features: ["Everything in Free", "15 AI exams per month", "Up to 25 questions per exam", "Exam history"] },
      PRO: { label: "Pro", description: "For exam candidates who need volume and file-based questions.",
        features: ["Everything in Basic", "50 AI exams per month (up to 1,500 questions)", "Up to 30 questions per exam", "Upload up to 2 files / month (coming soon)"] },
      PREMIUM: { label: "Premium", description: "For specialists, consultants, and educators.",
        features: ["Everything in Pro", "100 AI exams per month (up to 4,000 questions)", "Up to 40 questions per exam", "Upload up to 10 files / month (coming soon)", "Advanced analytics (coming soon)"] },
    },
  },
};

const ar = {
  nav: { plans: "الخطط", dashboard: "لوحة التحكم", generate: "إنشاء امتحان", signin: "تسجيل الدخول", signup: "ابدأ مجانًا", signout: "تسجيل الخروج", languageMenuLabel: "تغيير اللغة" },
  footer: "MedExam Hub لأغراض التعليم الطبي فقط. تحقّق دائمًا من القرارات السريرية من المصادر الموثوقة.",
  whatsapp: "الدردشة عبر واتساب",
  home: {
    badge: "مصمم للأطباء والمقيمين وطلاب الطب",
    title: "اجتز امتحانك القادم بسرعة أكبر.",
    subtitle: "توقّف عن إضاعة الوقت في محتوى منخفض الجدوى. أسئلة اختيار من متعدد بمستوى الامتحان مولّدة بالذكاء الاصطناعي لـ USMLE وMRCS وMRCP والزمالة المصرية والبروميتريك وغيرها — بعشر لغات، وبأي مستوى صعوبة، مع شروح ونقاط تعلم.",
    ctaStart: "ابدأ امتحانك الأول بالذكاء الاصطناعي خلال 30 ثانية — مجانًا",
    ctaPlans: "اطّلع على الخطط من {price} ج.م. شهريًا",
    trustLine: "41 صيغة امتحان · 10 لغات · 7 مستويات صعوبة · أكثر من 20 تخصصًا",
    whyH: "لماذا MedExam Hub", whySub: "مصمَّم للطريقة التي يدرس بها الأطباء فعليًا — وما يجعلهم ينجحون.",
    features: feats({
      f1: { title: "لن تنفد منك أسئلة عالية الجدوى أبدًا", body: "أنشئ أسئلة بمستوى الامتحان حول أي موضوع وبأي مستوى صعوبة. مخصصة لتخصصك ونقاط ضعفك." },
      f2: { title: "ادرس بلغتك الأم", body: "10 لغات تشمل العربية والأردية والفارسية والتركية. تظل الاختصارات الطبية الدولية (ECG، NSTEMI، NICE) بصيغتها القياسية." },
      f3: { title: "تشعر كأنه الامتحان الحقيقي", body: "USMLE بأسلوب USMLE، وMRCS Part B بأسلوب OSCE، والزمالة المصرية بأسلوبها. ادخل امتحانك وأنت تعرف الصيغة." },
      f4: { title: "تدرّب تحت ضغط الامتحان", body: "وضع التدريب للتعلم. وضع الامتحان يضيف مؤقتًا لمحاكاة الواقع — حتى لا يكون يوم الامتحان الحقيقي هو أول مرة." },
      f5: { title: "اعرف بالضبط أين أنت ضعيف", body: "سجل الدرجات، الدقة حسب الموضوع، وتوصيات. توقّف عن إضاعة الساعات فيما تعرفه بالفعل." },
      f6: { title: "بياناتك تبقى لك", body: "سجل دراستك خاص. تتم معالجة الدفع عبر Paymob — لا نرى رقم بطاقتك أبدًا." },
    }),
    howH: "كيف يعمل", howSub: "من التسجيل إلى النتيجة في أقل من خمس دقائق.",
    steps: [
      { title: "اختر امتحانك", body: "اختر حسب التخصص أو حسب صيغة الامتحان (USMLE، MRCS، الزمالة المصرية، Prometric…). حدد الصعوبة واللغة." },
      { title: "أنشئ الأسئلة", body: "يكتب الذكاء الاصطناعي من 1 إلى 100 سؤال مخصص لمدخلاتك. كل سؤال يتضمن إجابة صحيحة وبدائل وشرحًا ونقطة تعلم." },
      { title: "ادخل الامتحان وشاهد النتيجة", body: "وضع تدريب للتعلم ووضع امتحان للمحاكاة. أرسل لتحصل على مراجعة سؤال بسؤال ودرجتك." },
    ],
    formatsH: "مصمَّم للامتحانات التي تخوضها", formatsSub: "من المجالس الدولية إلى امتحانات الترخيص الإقليمية.",
    formatsAll: "أكثر من {count} صيغة امتحان مدعومة. تصفح الكل ←",
    regions: [
      { region: "الولايات المتحدة", takeaway: "USMLE Step 1 / 2 CK / 3" },
      { region: "كليات بريطانيا الملكية", takeaway: "MRCP, MRCS, MRCOG, MRCPCH, FRCS, PLAB" },
      { region: "المجالس الأوروبية (UEMS)", takeaway: "EBSQ, FEBVS, EDAIC, EBC, EBO" },
      { region: "الشرق الأوسط والخليج", takeaway: "Prometric (السعودية / الإمارات / قطر / عُمان / البحرين)، DHA، DOH" },
      { region: "مصر", takeaway: "الزمالة المصرية، البورد، الدبلومة، الماجستير، الدكتوراه" },
    ],
    specialtiesH: "التخصصات المدعومة", specialtiesSub: "اختر من {count} تخصصًا طبيًا أو أضف موضوعك الخاص.",
    finalH: "مستعد لتدرس بذكاء أكبر؟", finalSub: "جرّب النسخة المجانية اليوم — امتحان واحد بدون بطاقة. ارقِ خطتك عندما تحتاج المزيد.",
    finalCreate: "أنشئ حسابًا مجانيًا", finalCompare: "قارن الخطط",
  },
  signup: { title: "أنشئ حسابك", subtitle: "ابدأ بالخطة المجانية. امتحان واحد شهريًا بالذكاء الاصطناعي بدون بطاقة.",
    name: "الاسم", email: "البريد الإلكتروني", password: "كلمة المرور", passwordHint: "على الأقل 8 أحرف.",
    submit: "أنشئ الحساب", submitLoading: "جارٍ إنشاء الحساب…", haveAccount: "لديك حساب بالفعل؟", signin: "تسجيل الدخول" },
  login: { title: "تسجيل الدخول", email: "البريد الإلكتروني", password: "كلمة المرور",
    submit: "تسجيل الدخول", submitLoading: "جارٍ تسجيل الدخول…", noAccount: "ليس لديك حساب؟", signup: "سجّل الآن" },
  plans: { title: "اختر خطتك", subtitle: "تجربة مجانية، ثم ارقَ مع زيادة حجم دراستك.",
    current: "الخطة الحالية", signUp: "سجّل الآن", upgrade: "ترقية", goDashboard: "اذهب إلى لوحة التحكم",
    badgePopular: "الأكثر شيوعًا", badgeValue: "الأفضل قيمةً", perMonth: "/شهر", currencyShort: "ج.م.", free: "مجاني",
    perPlan: {
      FREE: { label: "مجاني", description: "تجربة لامتحان واحد شهريًا قبل الترقية.",
        features: ["امتحان واحد شهريًا (تجربة)", "حتى 10 أسئلة لكل امتحان", "إنشاء حسب التخصص أو نوع الامتحان", "وضع تدريب ووضع امتحان"] },
      BASIC: { label: "أساسي", description: "للتدريب المنتظم وطلاب الطب.",
        features: ["كل ما في الخطة المجانية", "15 امتحانًا شهريًا", "حتى 25 سؤالاً لكل امتحان", "سجل الامتحانات"] },
      PRO: { label: "احترافي", description: "للمرشحين للامتحانات الذين يحتاجون إلى حجم وأسئلة من ملفات.",
        features: ["كل ما في الخطة الأساسية", "50 امتحانًا شهريًا (حتى 1,500 سؤال)", "حتى 30 سؤالاً لكل امتحان", "رفع حتى ملفين شهريًا (قريبًا)"] },
      PREMIUM: { label: "متميز", description: "للأخصائيين والاستشاريين والمعلمين.",
        features: ["كل ما في الخطة الاحترافية", "100 امتحان شهريًا (حتى 4,000 سؤال)", "حتى 40 سؤالاً لكل امتحان", "رفع حتى 10 ملفات شهريًا (قريبًا)", "تحليلات متقدمة (قريبًا)"] },
    },
  },
};

const fr = {
  nav: { plans: "Tarifs", dashboard: "Tableau de bord", generate: "Créer un examen", signin: "Connexion", signup: "Démarrer", signout: "Déconnexion", languageMenuLabel: "Changer de langue" },
  footer: "MedExam Hub est destiné à la formation médicale uniquement. Vérifiez toujours les décisions cliniques auprès de sources autorisées.",
  whatsapp: "Discuter sur WhatsApp",
  home: {
    badge: "Conçu pour les médecins, internes et étudiants en médecine",
    title: "Apprentissage médical et examens intelligents, propulsés par l'IA",
    subtitle: "Générez des QCM cliniques pour USMLE, MRCS, MRCP, Fellowship égyptien, Prometric et plus — en 10 langues, à n'importe quel niveau, avec explications et points clés.",
    ctaStart: "Commencer gratuitement — 1 examen, sans carte",
    ctaPlans: "Voir les forfaits à partir de {price} EGP/mois",
    trustLine: "41 formats d'examens · 10 langues · 7 niveaux de difficulté · 20+ spécialités",
    whyH: "Pourquoi MedExam Hub", whySub: "Conçu pour la façon dont les médecins étudient vraiment.",
    features: feats({
      f1: { title: "Générateur d'IA adaptatif", body: "Choisissez une spécialité ou un examen, le niveau et le nombre. L'IA rédige des QCM avec une seule bonne réponse, des distracteurs plausibles et des explications détaillées." },
      f2: { title: "Pratiquez dans votre langue", body: "Générez des questions en 10 langues. Les acronymes médicaux universels (ECG, NSTEMI, NICE) restent sous leur forme standard." },
      f3: { title: "Adapté à votre examen réel", body: "USMLE ressemble à USMLE. MRCS Part B ressemble à un OSCE. Le Fellowship égyptien ressemble au Fellowship égyptien. L'IA s'adapte à chaque format." },
      f4: { title: "Mode entraînement ou examen", body: "Le mode entraînement affiche les réponses au fur et à mesure. Le mode examen les masque et lance un chronomètre." },
      f5: { title: "Suivez vos progrès", body: "Score moyen, historique des examens et suggestions sur les points faibles révèlent ce qu'il faut réviser." },
      f6: { title: "Privé et sécurisé", body: "Vos données d'étude vous appartiennent. Paiements traités par Paymob — nous ne voyons jamais votre carte." },
    }),
    howH: "Comment ça marche", howSub: "De l'inscription aux résultats en moins de cinq minutes.",
    steps: [
      { title: "Choisissez votre examen", body: "Par spécialité ou par format d'examen. Définissez le niveau de difficulté et la langue." },
      { title: "Générez les QCM", body: "L'IA rédige 1 à 100 questions adaptées à vos critères, avec une réponse correcte, des distracteurs, une explication et un point clé." },
      { title: "Passez l'examen, voyez les résultats", body: "Mode entraînement pour apprendre, mode examen pour simuler. Soumettez pour obtenir une revue détaillée et votre note." },
    ],
    formatsH: "Conçu pour les examens que vous passez", formatsSub: "Des conseils internationaux aux examens de licence régionaux.",
    formatsAll: "{count} formats d'examens couverts. Tout parcourir →",
    regions: [
      { region: "États-Unis", takeaway: "USMLE Step 1 / 2 CK / 3" },
      { region: "Royal Colleges (Royaume-Uni)", takeaway: "MRCP, MRCS, MRCOG, MRCPCH, FRCS, PLAB" },
      { region: "Conseils européens (UEMS)", takeaway: "EBSQ, FEBVS, EDAIC, EBC, EBO" },
      { region: "Moyen-Orient / Golfe", takeaway: "Prometric (Arabie/EAU/Qatar/Oman/Bahreïn), DHA, DOH" },
      { region: "Égypte", takeaway: "Fellowship égyptien, Board, Diplôme, Master, MD" },
    ],
    specialtiesH: "Spécialités couvertes", specialtiesSub: "Choisissez parmi {count} spécialités médicales ou ajoutez votre propre sujet.",
    finalH: "Prêt à étudier plus intelligemment ?", finalSub: "Essayez gratuitement aujourd'hui — 1 examen, sans carte. Mettez à niveau quand vous êtes prêt.",
    finalCreate: "Créer un compte gratuit", finalCompare: "Comparer les forfaits",
  },
  signup: { title: "Créer votre compte", subtitle: "Commencez avec le forfait gratuit. 1 examen IA par mois, sans carte requise.",
    name: "Nom", email: "E-mail", password: "Mot de passe", passwordHint: "Au moins 8 caractères.",
    submit: "Créer le compte", submitLoading: "Création du compte…", haveAccount: "Vous avez déjà un compte ?", signin: "Connexion" },
  login: { title: "Connexion", email: "E-mail", password: "Mot de passe",
    submit: "Se connecter", submitLoading: "Connexion…", noAccount: "Besoin d'un compte ?", signup: "S'inscrire" },
  plans: { title: "Choisissez votre forfait", subtitle: "Essai gratuit, puis passez à un forfait supérieur selon vos besoins.",
    current: "Forfait actuel", signUp: "S'inscrire", upgrade: "Mettre à niveau", goDashboard: "Aller au tableau de bord",
    badgePopular: "Le plus populaire", badgeValue: "Meilleur rapport", perMonth: "/mois", currencyShort: "EGP", free: "Gratuit",
    perPlan: {
      FREE: { label: "Gratuit", description: "Un essai d'1 examen par mois — découvrez l'IA avant de passer à un forfait payant.",
        features: ["1 examen IA par mois (essai)", "Jusqu'à 10 questions par examen", "Par spécialité ou par type d'examen", "Modes entraînement & examen"] },
      BASIC: { label: "Basique", description: "Pour la pratique régulière et les étudiants en médecine.",
        features: ["Tout ce qui est inclus dans Gratuit", "15 examens IA par mois", "Jusqu'à 25 questions par examen", "Historique des examens"] },
      PRO: { label: "Pro", description: "Pour les candidats qui ont besoin de volume et de questions à partir de fichiers.",
        features: ["Tout ce qui est inclus dans Basique", "50 examens IA par mois (jusqu'à 1 500 questions)", "Jusqu'à 30 questions par examen", "Téléverser jusqu'à 2 fichiers / mois (bientôt)"] },
      PREMIUM: { label: "Premium", description: "Pour les spécialistes, consultants et formateurs.",
        features: ["Tout ce qui est inclus dans Pro", "100 examens IA par mois (jusqu'à 4 000 questions)", "Jusqu'à 40 questions par examen", "Téléverser jusqu'à 10 fichiers / mois (bientôt)", "Analyses avancées (bientôt)"] },
    },
  },
};

const es = {
  nav: { plans: "Planes", dashboard: "Panel", generate: "Crear examen", signin: "Iniciar sesión", signup: "Empezar gratis", signout: "Cerrar sesión", languageMenuLabel: "Cambiar idioma" },
  footer: "MedExam Hub es solo para educación médica. Verifique siempre las decisiones clínicas con fuentes autorizadas.",
  whatsapp: "Chatear por WhatsApp",
  home: {
    badge: "Diseñado para médicos, residentes y estudiantes de medicina",
    title: "Aprendizaje médico y exámenes inteligentes, impulsados por IA",
    subtitle: "Genera preguntas tipo MCQ clínicas para USMLE, MRCS, MRCP, Fellowship Egipcio, Prometric y más — en 10 idiomas, con cualquier dificultad, con explicaciones y puntos clave.",
    ctaStart: "Empieza gratis — 1 examen, sin tarjeta",
    ctaPlans: "Ver planes desde {price} EGP/mes",
    trustLine: "41 formatos de examen · 10 idiomas · 7 niveles · 20+ especialidades",
    whyH: "Por qué MedExam Hub", whySub: "Diseñado para cómo los médicos realmente estudian.",
    features: feats({
      f1: { title: "Generador de IA adaptable", body: "Elige una especialidad o examen, el nivel y la cantidad. La IA escribe MCQ con una sola respuesta correcta, distractores plausibles y explicaciones detalladas." },
      f2: { title: "Practica en tu idioma", body: "Genera preguntas en 10 idiomas. Los acrónimos médicos universales (ECG, NSTEMI, NICE) permanecen en su forma estándar." },
      f3: { title: "Coincide con tu examen real", body: "USMLE se siente como USMLE. MRCS Part B como un OSCE. El Fellowship Egipcio como el Fellowship Egipcio. La IA se adapta a cada formato." },
      f4: { title: "Modo práctica o examen", body: "El modo práctica muestra respuestas mientras avanzas. El modo examen las oculta y activa un cronómetro." },
      f5: { title: "Sigue tu progreso", body: "Puntaje promedio, historial de exámenes y sugerencias de áreas débiles revelan qué repasar." },
      f6: { title: "Privado y seguro", body: "Tus datos de estudio son tuyos. Pagos procesados por Paymob — nunca vemos tu tarjeta." },
    }),
    howH: "Cómo funciona", howSub: "Del registro a los resultados en menos de cinco minutos.",
    steps: [
      { title: "Elige tu examen", body: "Por especialidad o por formato de examen. Configura dificultad e idioma." },
      { title: "Genera las preguntas", body: "La IA crea de 1 a 100 preguntas adaptadas a ti, con respuesta correcta, distractores, explicación y punto de aprendizaje." },
      { title: "Toma el examen, ve resultados", body: "Modo práctica para aprender, modo examen para simular. Envía para una revisión por pregunta y tu calificación." },
    ],
    formatsH: "Diseñado para los exámenes que tomas", formatsSub: "De juntas internacionales a exámenes de licencia regionales.",
    formatsAll: "{count} formatos de examen cubiertos. Ver todo →",
    regions: [
      { region: "EE. UU.", takeaway: "USMLE Step 1 / 2 CK / 3" },
      { region: "Royal Colleges (Reino Unido)", takeaway: "MRCP, MRCS, MRCOG, MRCPCH, FRCS, PLAB" },
      { region: "Juntas Europeas (UEMS)", takeaway: "EBSQ, FEBVS, EDAIC, EBC, EBO" },
      { region: "Medio Oriente / Golfo", takeaway: "Prometric (Arabia/EAU/Qatar/Omán/Baréin), DHA, DOH" },
      { region: "Egipto", takeaway: "Fellowship Egipcio, Board, Diploma, Maestría, MD" },
    ],
    specialtiesH: "Especialidades cubiertas", specialtiesSub: "Elige entre {count} especialidades médicas o agrega tu propio tema.",
    finalH: "¿Listo para estudiar mejor?", finalSub: "Prueba el plan gratuito hoy — 1 examen, sin tarjeta. Mejora cuando estés listo.",
    finalCreate: "Crear cuenta gratis", finalCompare: "Comparar planes",
  },
  signup: { title: "Crea tu cuenta", subtitle: "Empieza con el plan gratuito. 1 examen IA al mes, sin tarjeta.",
    name: "Nombre", email: "Correo", password: "Contraseña", passwordHint: "Al menos 8 caracteres.",
    submit: "Crear cuenta", submitLoading: "Creando cuenta…", haveAccount: "¿Ya tienes una cuenta?", signin: "Iniciar sesión" },
  login: { title: "Iniciar sesión", email: "Correo", password: "Contraseña",
    submit: "Iniciar sesión", submitLoading: "Iniciando sesión…", noAccount: "¿Necesitas una cuenta?", signup: "Regístrate" },
  plans: { title: "Elige tu plan", subtitle: "Prueba gratuita, luego mejora a medida que crece tu volumen de estudio.",
    current: "Plan actual", signUp: "Registrarse", upgrade: "Mejorar", goDashboard: "Ir al panel",
    badgePopular: "Más popular", badgeValue: "Mejor valor", perMonth: "/mes", currencyShort: "EGP", free: "Gratis",
    perPlan: {
      FREE: { label: "Gratis", description: "1 examen de prueba al mes — conoce la IA antes de mejorar.",
        features: ["1 examen IA al mes (prueba)", "Hasta 10 preguntas por examen", "Por especialidad o tipo de examen", "Modos práctica y examen"] },
      BASIC: { label: "Básico", description: "Para práctica regular y estudiantes de medicina.",
        features: ["Todo lo de Gratis", "15 exámenes IA al mes", "Hasta 25 preguntas por examen", "Historial de exámenes"] },
      PRO: { label: "Pro", description: "Para candidatos a exámenes que necesitan volumen y preguntas desde archivos.",
        features: ["Todo lo de Básico", "50 exámenes IA al mes (hasta 1,500 preguntas)", "Hasta 30 preguntas por examen", "Subir hasta 2 archivos / mes (próximamente)"] },
      PREMIUM: { label: "Premium", description: "Para especialistas, consultores y educadores.",
        features: ["Todo lo de Pro", "100 exámenes IA al mes (hasta 4,000 preguntas)", "Hasta 40 preguntas por examen", "Subir hasta 10 archivos / mes (próximamente)", "Analítica avanzada (próximamente)"] },
    },
  },
};

const de = {
  nav: { plans: "Tarife", dashboard: "Dashboard", generate: "Prüfung erstellen", signin: "Anmelden", signup: "Kostenlos starten", signout: "Abmelden", languageMenuLabel: "Sprache ändern" },
  footer: "MedExam Hub dient ausschließlich der medizinischen Ausbildung. Klinische Entscheidungen stets mit autorisierten Quellen prüfen.",
  whatsapp: "Auf WhatsApp chatten",
  home: {
    badge: "Für Ärzte, Assistenzärzte und Medizinstudenten",
    title: "Medizinisches Lernen und smartere Prüfungen — KI-gestützt",
    subtitle: "Erstellen Sie klinische MCQs für USMLE, MRCS, MRCP, Egyptian Fellowship, Prometric und mehr — in 10 Sprachen, jedem Schwierigkeitsgrad, mit Erklärungen und Lernpunkten.",
    ctaStart: "Kostenlos starten — 1 Prüfung, keine Kreditkarte",
    ctaPlans: "Tarife ab {price} EGP/Monat",
    trustLine: "41 Prüfungsformate · 10 Sprachen · 7 Schwierigkeitsstufen · 20+ Fachgebiete",
    whyH: "Warum MedExam Hub", whySub: "Entwickelt für die Art, wie Ärzte tatsächlich lernen.",
    features: feats({
      f1: { title: "Adaptiver KI-Fragengenerator", body: "Fachgebiet oder Prüfung wählen, Schwierigkeit und Anzahl festlegen. Die KI schreibt Single-Best-Answer-MCQs mit plausiblen Distraktoren und ausführlichen Erklärungen." },
      f2: { title: "Übe in deiner Sprache", body: "Fragen in 10 Sprachen erzeugen. Universelle medizinische Kürzel (ECG, NSTEMI, NICE) bleiben in Standardform." },
      f3: { title: "Passt zu deiner echten Prüfung", body: "USMLE wirkt wie USMLE. MRCS Part B wie ein OSCE. Die KI passt sich jedem Format an." },
      f4: { title: "Übungs- oder Prüfungsmodus", body: "Im Übungsmodus werden Antworten direkt gezeigt. Im Prüfungsmodus mit Timer wie in der echten Prüfung." },
      f5: { title: "Verfolge deinen Fortschritt", body: "Durchschnittsnote, Prüfungsverlauf und Schwachstellenvorschläge zeigen, was zu wiederholen ist." },
      f6: { title: "Privat & sicher", body: "Deine Lerndaten gehören dir. Zahlungen über Paymob — wir sehen deine Karte nie." },
    }),
    howH: "So funktioniert's", howSub: "Von der Anmeldung bis zum Ergebnis in unter fünf Minuten.",
    steps: [
      { title: "Wähle deine Prüfung", body: "Nach Fachgebiet oder Prüfungsformat. Schwierigkeit und Sprache festlegen." },
      { title: "Erzeuge die Fragen", body: "Die KI schreibt 1–100 maßgeschneiderte Fragen — je mit korrekter Antwort, Distraktoren, Erklärung und Lernpunkt." },
      { title: "Prüfung schreiben, Ergebnisse sehen", body: "Übungsmodus zum Lernen, Prüfungsmodus zur Simulation. Absenden und detaillierte Auswertung erhalten." },
    ],
    formatsH: "Für die Prüfungen, die du schreibst", formatsSub: "Von internationalen Boards bis zu regionalen Lizenzprüfungen.",
    formatsAll: "{count} Prüfungsformate abgedeckt. Alle anzeigen →",
    regions: [
      { region: "USA", takeaway: "USMLE Step 1 / 2 CK / 3" },
      { region: "UK Royal Colleges", takeaway: "MRCP, MRCS, MRCOG, MRCPCH, FRCS, PLAB" },
      { region: "Europäische Boards (UEMS)", takeaway: "EBSQ, FEBVS, EDAIC, EBC, EBO" },
      { region: "Naher Osten / Golf", takeaway: "Prometric (Saudi/UAE/Katar/Oman/Bahrain), DHA, DOH" },
      { region: "Ägypten", takeaway: "Egyptian Fellowship, Board, Diplom, Master, MD" },
    ],
    specialtiesH: "Abgedeckte Fachgebiete", specialtiesSub: "Wähle aus {count} medizinischen Fachgebieten oder gib dein eigenes Thema an.",
    finalH: "Bereit, smarter zu lernen?", finalSub: "Heute kostenlos testen — 1 Prüfung, keine Karte. Upgrade wann du willst.",
    finalCreate: "Kostenloses Konto erstellen", finalCompare: "Tarife vergleichen",
  },
  signup: { title: "Konto erstellen", subtitle: "Starte mit dem kostenlosen Tarif. 1 KI-Prüfung pro Monat, keine Karte nötig.",
    name: "Name", email: "E-Mail", password: "Passwort", passwordHint: "Mindestens 8 Zeichen.",
    submit: "Konto erstellen", submitLoading: "Konto wird erstellt…", haveAccount: "Schon ein Konto?", signin: "Anmelden" },
  login: { title: "Anmelden", email: "E-Mail", password: "Passwort",
    submit: "Anmelden", submitLoading: "Anmeldung läuft…", noAccount: "Noch kein Konto?", signup: "Registrieren" },
  plans: { title: "Tarif wählen", subtitle: "Kostenlos testen, später passend zum Lernumfang upgraden.",
    current: "Aktueller Tarif", signUp: "Registrieren", upgrade: "Upgrade", goDashboard: "Zum Dashboard",
    badgePopular: "Am beliebtesten", badgeValue: "Bestes Angebot", perMonth: "/Monat", currencyShort: "EGP", free: "Kostenlos",
    perPlan: {
      FREE: { label: "Kostenlos", description: "Eine Prüfung pro Monat — die KI testen, bevor du upgradest.",
        features: ["1 KI-Prüfung pro Monat (Test)", "Bis zu 10 Fragen pro Prüfung", "Nach Fachgebiet oder Prüfungsformat", "Übungs- und Prüfungsmodus"] },
      BASIC: { label: "Basic", description: "Für regelmäßiges Üben und Medizinstudenten.",
        features: ["Alles aus Kostenlos", "15 KI-Prüfungen pro Monat", "Bis zu 25 Fragen pro Prüfung", "Prüfungsverlauf"] },
      PRO: { label: "Pro", description: "Für Prüfungskandidaten mit hohem Volumen und Datei-Fragen.",
        features: ["Alles aus Basic", "50 KI-Prüfungen pro Monat (bis 1.500 Fragen)", "Bis zu 30 Fragen pro Prüfung", "Bis zu 2 Datei-Uploads / Monat (bald)"] },
      PREMIUM: { label: "Premium", description: "Für Fachärzte, Consultants und Lehrende.",
        features: ["Alles aus Pro", "100 KI-Prüfungen pro Monat (bis 4.000 Fragen)", "Bis zu 40 Fragen pro Prüfung", "Bis zu 10 Datei-Uploads / Monat (bald)", "Erweiterte Analytik (bald)"] },
    },
  },
};

const it = {
  nav: { plans: "Piani", dashboard: "Dashboard", generate: "Genera esame", signin: "Accedi", signup: "Inizia gratis", signout: "Esci", languageMenuLabel: "Cambia lingua" },
  footer: "MedExam Hub è solo per la formazione medica. Verifica sempre le decisioni cliniche con fonti autorevoli.",
  whatsapp: "Chatta su WhatsApp",
  home: {
    badge: "Pensato per medici, specializzandi e studenti di medicina",
    title: "Apprendimento medico ed esami più intelligenti, con l'IA",
    subtitle: "Genera MCQ cliniche per USMLE, MRCS, MRCP, Fellowship Egiziano, Prometric e altro — in 10 lingue, a qualsiasi difficoltà, con spiegazioni e punti chiave.",
    ctaStart: "Inizia gratis — 1 esame, senza carta",
    ctaPlans: "Vedi piani da {price} EGP/mese",
    trustLine: "41 formati d'esame · 10 lingue · 7 livelli · 20+ specialità",
    whyH: "Perché MedExam Hub", whySub: "Pensato per come i medici studiano davvero.",
    features: feats({
      f1: { title: "Generatore IA adattivo", body: "Scegli specialità o esame, difficoltà e numero. L'IA scrive MCQ con una sola risposta corretta, distrattori plausibili e spiegazioni dettagliate." },
      f2: { title: "Esercitati nella tua lingua", body: "Genera domande in 10 lingue. Gli acronimi medici universali (ECG, NSTEMI, NICE) restano nella forma standard." },
      f3: { title: "Si adatta al tuo esame reale", body: "USMLE sembra USMLE. MRCS Part B sembra un OSCE. Il Fellowship Egiziano sembra il Fellowship Egiziano." },
      f4: { title: "Modalità pratica o esame", body: "In modalità pratica vedi le risposte mentre rispondi. In modalità esame restano nascoste e parte un timer." },
      f5: { title: "Monitora i progressi", body: "Punteggio medio, cronologia degli esami e suggerimenti sulle aree deboli mostrano cosa ripassare." },
      f6: { title: "Privato e sicuro", body: "I tuoi dati di studio sono tuoi. Pagamenti gestiti da Paymob — non vediamo mai la tua carta." },
    }),
    howH: "Come funziona", howSub: "Dalla registrazione ai risultati in meno di cinque minuti.",
    steps: [
      { title: "Scegli l'esame", body: "Per specialità o per formato d'esame. Imposta difficoltà e lingua." },
      { title: "Genera le domande", body: "L'IA scrive 1–100 domande personalizzate, con risposta corretta, distrattori, spiegazione e punto chiave." },
      { title: "Sostieni l'esame e vedi i risultati", body: "Modalità pratica per imparare, modalità esame per simulare. Invia per una revisione domanda per domanda." },
    ],
    formatsH: "Per gli esami che sostieni", formatsSub: "Dai board internazionali agli esami di abilitazione regionali.",
    formatsAll: "{count} formati d'esame coperti. Vedi tutti →",
    regions: [
      { region: "USA", takeaway: "USMLE Step 1 / 2 CK / 3" },
      { region: "Royal Colleges (Regno Unito)", takeaway: "MRCP, MRCS, MRCOG, MRCPCH, FRCS, PLAB" },
      { region: "Board Europei (UEMS)", takeaway: "EBSQ, FEBVS, EDAIC, EBC, EBO" },
      { region: "Medio Oriente / Golfo", takeaway: "Prometric (Arabia/EAU/Qatar/Oman/Bahrein), DHA, DOH" },
      { region: "Egitto", takeaway: "Fellowship Egiziano, Board, Diploma, Master, MD" },
    ],
    specialtiesH: "Specialità coperte", specialtiesSub: "Scegli tra {count} specialità mediche o aggiungi il tuo argomento.",
    finalH: "Pronto a studiare meglio?", finalSub: "Prova il piano gratuito oggi — 1 esame, senza carta. Esegui l'upgrade quando vuoi.",
    finalCreate: "Crea account gratuito", finalCompare: "Confronta piani",
  },
  signup: { title: "Crea il tuo account", subtitle: "Inizia con il piano gratuito. 1 esame IA al mese, nessuna carta richiesta.",
    name: "Nome", email: "E-mail", password: "Password", passwordHint: "Almeno 8 caratteri.",
    submit: "Crea account", submitLoading: "Creazione account…", haveAccount: "Hai già un account?", signin: "Accedi" },
  login: { title: "Accedi", email: "E-mail", password: "Password",
    submit: "Accedi", submitLoading: "Accesso in corso…", noAccount: "Non hai un account?", signup: "Registrati" },
  plans: { title: "Scegli il tuo piano", subtitle: "Prova gratuita, poi upgrade quando il tuo studio cresce.",
    current: "Piano attuale", signUp: "Registrati", upgrade: "Upgrade", goDashboard: "Vai alla dashboard",
    badgePopular: "Più popolare", badgeValue: "Miglior valore", perMonth: "/mese", currencyShort: "EGP", free: "Gratis",
    perPlan: {
      FREE: { label: "Gratis", description: "Una prova di 1 esame al mese — prova l'IA prima di passare a pagamento.",
        features: ["1 esame IA al mese (prova)", "Fino a 10 domande per esame", "Per specialità o formato d'esame", "Modalità pratica ed esame"] },
      BASIC: { label: "Basic", description: "Per pratica regolare e studenti di medicina.",
        features: ["Tutto del piano Gratis", "15 esami IA al mese", "Fino a 25 domande per esame", "Storico esami"] },
      PRO: { label: "Pro", description: "Per chi prepara esami con volume e domande da file.",
        features: ["Tutto del piano Basic", "50 esami IA al mese (fino a 1.500 domande)", "Fino a 30 domande per esame", "Carica fino a 2 file / mese (presto)"] },
      PREMIUM: { label: "Premium", description: "Per specialisti, consulenti ed educatori.",
        features: ["Tutto del piano Pro", "100 esami IA al mese (fino a 4.000 domande)", "Fino a 40 domande per esame", "Carica fino a 10 file / mese (presto)", "Analitica avanzata (presto)"] },
    },
  },
};

const pt = {
  nav: { plans: "Planos", dashboard: "Painel", generate: "Gerar exame", signin: "Entrar", signup: "Começar grátis", signout: "Sair", languageMenuLabel: "Mudar idioma" },
  footer: "MedExam Hub é apenas para fins educacionais médicos. Sempre verifique decisões clínicas com fontes autoritativas.",
  whatsapp: "Conversar no WhatsApp",
  home: {
    badge: "Feito para médicos, residentes e estudantes de medicina",
    title: "Aprendizado médico e exames mais inteligentes, movidos a IA",
    subtitle: "Gere MCQ clínicas para USMLE, MRCS, MRCP, Fellowship Egípcio, Prometric e mais — em 10 idiomas, em qualquer dificuldade, com explicações e pontos-chave.",
    ctaStart: "Comece grátis — 1 exame, sem cartão",
    ctaPlans: "Ver planos a partir de {price} EGP/mês",
    trustLine: "41 formatos de exame · 10 idiomas · 7 níveis de dificuldade · 20+ especialidades",
    whyH: "Por que MedExam Hub", whySub: "Feito para como médicos realmente estudam.",
    features: feats({
      f1: { title: "Gerador de IA adaptativo", body: "Escolha uma especialidade ou exame, defina dificuldade e quantidade. A IA escreve MCQ com uma resposta correta, distratores plausíveis e explicações detalhadas." },
      f2: { title: "Pratique no seu idioma", body: "Gere perguntas em 10 idiomas. Acrônimos médicos universais (ECG, NSTEMI, NICE) ficam na forma padrão." },
      f3: { title: "Se ajusta ao seu exame real", body: "USMLE parece USMLE. MRCS Part B parece OSCE. O Fellowship Egípcio parece o Fellowship Egípcio." },
      f4: { title: "Modo prática ou exame", body: "Modo prática mostra respostas conforme você avança. Modo exame as oculta e ativa um cronômetro." },
      f5: { title: "Acompanhe seu progresso", body: "Pontuação média, histórico de exames e sugestões de áreas fracas mostram o que revisar." },
      f6: { title: "Privado e seguro", body: "Seus dados de estudo são seus. Pagamentos via Paymob — nunca vemos seu cartão." },
    }),
    howH: "Como funciona", howSub: "Do cadastro aos resultados em menos de cinco minutos.",
    steps: [
      { title: "Escolha seu exame", body: "Por especialidade ou formato. Defina dificuldade e idioma." },
      { title: "Gere as questões", body: "A IA cria 1–100 questões personalizadas, cada uma com resposta correta, distratores, explicação e ponto de aprendizado." },
      { title: "Faça o exame e veja os resultados", body: "Modo prática para aprender, modo exame para simular. Envie para uma revisão por questão." },
    ],
    formatsH: "Feito para os exames que você faz", formatsSub: "De boards internacionais a exames de licenciamento regionais.",
    formatsAll: "{count} formatos de exame cobertos. Ver todos →",
    regions: [
      { region: "EUA", takeaway: "USMLE Step 1 / 2 CK / 3" },
      { region: "Royal Colleges (Reino Unido)", takeaway: "MRCP, MRCS, MRCOG, MRCPCH, FRCS, PLAB" },
      { region: "Boards Europeus (UEMS)", takeaway: "EBSQ, FEBVS, EDAIC, EBC, EBO" },
      { region: "Oriente Médio / Golfo", takeaway: "Prometric (Arábia/EAU/Catar/Omã/Bahrein), DHA, DOH" },
      { region: "Egito", takeaway: "Fellowship Egípcio, Board, Diploma, Mestrado, MD" },
    ],
    specialtiesH: "Especialidades cobertas", specialtiesSub: "Escolha entre {count} especialidades médicas ou adicione seu próprio tema.",
    finalH: "Pronto para estudar com mais inteligência?", finalSub: "Experimente grátis hoje — 1 exame, sem cartão. Faça upgrade quando quiser.",
    finalCreate: "Criar conta grátis", finalCompare: "Comparar planos",
  },
  signup: { title: "Crie sua conta", subtitle: "Comece com o plano grátis. 1 exame de IA por mês, sem cartão.",
    name: "Nome", email: "E-mail", password: "Senha", passwordHint: "Pelo menos 8 caracteres.",
    submit: "Criar conta", submitLoading: "Criando conta…", haveAccount: "Já tem uma conta?", signin: "Entrar" },
  login: { title: "Entrar", email: "E-mail", password: "Senha",
    submit: "Entrar", submitLoading: "Entrando…", noAccount: "Precisa de uma conta?", signup: "Cadastre-se" },
  plans: { title: "Escolha seu plano", subtitle: "Teste grátis, depois faça upgrade conforme seu volume de estudo.",
    current: "Plano atual", signUp: "Cadastre-se", upgrade: "Upgrade", goDashboard: "Ir para o painel",
    badgePopular: "Mais popular", badgeValue: "Melhor custo-benefício", perMonth: "/mês", currencyShort: "EGP", free: "Grátis",
    perPlan: {
      FREE: { label: "Grátis", description: "1 exame de teste por mês — conheça a IA antes de fazer upgrade.",
        features: ["1 exame IA por mês (teste)", "Até 10 questões por exame", "Por especialidade ou formato", "Modos prática e exame"] },
      BASIC: { label: "Básico", description: "Para prática regular e estudantes de medicina.",
        features: ["Tudo do Grátis", "15 exames IA por mês", "Até 25 questões por exame", "Histórico de exames"] },
      PRO: { label: "Pro", description: "Para candidatos que precisam de volume e questões a partir de arquivos.",
        features: ["Tudo do Básico", "50 exames IA por mês (até 1.500 questões)", "Até 30 questões por exame", "Upload de até 2 arquivos / mês (em breve)"] },
      PREMIUM: { label: "Premium", description: "Para especialistas, consultores e educadores.",
        features: ["Tudo do Pro", "100 exames IA por mês (até 4.000 questões)", "Até 40 questões por exame", "Upload de até 10 arquivos / mês (em breve)", "Análise avançada (em breve)"] },
    },
  },
};

const tr = {
  nav: { plans: "Planlar", dashboard: "Panel", generate: "Sınav oluştur", signin: "Giriş", signup: "Ücretsiz başla", signout: "Çıkış", languageMenuLabel: "Dili değiştir" },
  footer: "MedExam Hub yalnızca tıbbi eğitim içindir. Klinik kararları her zaman yetkili kaynaklarla doğrulayın.",
  whatsapp: "WhatsApp'ta sohbet et",
  home: {
    badge: "Doktorlar, asistanlar ve tıp öğrencileri için",
    title: "YZ destekli daha akıllı tıbbi öğrenme ve sınavlar",
    subtitle: "USMLE, MRCS, MRCP, Egyptian Fellowship, Prometric ve daha fazlası için klinik MCQ üretin — 10 dilde, her zorlukta, açıklamalar ve öğrenme noktalarıyla.",
    ctaStart: "Ücretsiz başla — 1 sınav, kart yok",
    ctaPlans: "Planlar {price} EGP/ay'dan başlar",
    trustLine: "41 sınav formatı · 10 dil · 7 zorluk seviyesi · 20+ uzmanlık",
    whyH: "Neden MedExam Hub", whySub: "Doktorların gerçekten çalıştığı şekilde tasarlandı.",
    features: feats({
      f1: { title: "Uyarlanabilir YZ soru üretici", body: "Bir uzmanlık veya sınav, zorluk ve sayı seçin. YZ tek doğru yanıtlı MCQ'lar, makul çeldiriciler ve ayrıntılı açıklamalar yazar." },
      f2: { title: "Kendi dilinde pratik yap", body: "10 dilde soru üretin. Evrensel tıbbi kısaltmalar (ECG, NSTEMI, NICE) standart formda kalır." },
      f3: { title: "Gerçek sınavınla eşleşir", body: "USMLE, USMLE gibi hissettirir. MRCS Part B, OSCE gibi hissettirir. Egyptian Fellowship, Egyptian Fellowship gibi hissettirir." },
      f4: { title: "Pratik veya sınav modu", body: "Pratik modu yanıtları anında gösterir. Sınav modu onları gizler ve süre sayar." },
      f5: { title: "İlerlemeni takip et", body: "Ortalama puan, sınav geçmişi ve zayıf alan önerileri neyin tekrar edileceğini gösterir." },
      f6: { title: "Özel ve güvenli", body: "Çalışma verileriniz size aittir. Ödemeler Paymob ile işlenir — kart numaranızı asla görmeyiz." },
    }),
    howH: "Nasıl çalışır", howSub: "Kayıttan değerlendirilmiş sonuçlara beş dakikadan kısa sürede.",
    steps: [
      { title: "Sınavını seç", body: "Uzmanlığa veya sınav formatına göre. Zorluk ve dili ayarlayın." },
      { title: "MCQ'ları üret", body: "YZ, girdilerine göre 1–100 soru yazar; her birinde doğru yanıt, çeldiriciler, açıklama ve öğrenme noktası bulunur." },
      { title: "Sınava gir, sonuçları gör", body: "Öğrenmek için pratik modu, simülasyon için sınav modu. Soru başına inceleme ve puan için gönder." },
    ],
    formatsH: "Girdiğin sınavlar için tasarlandı", formatsSub: "Uluslararası kurullardan bölgesel lisans sınavlarına.",
    formatsAll: "{count} sınav formatı destekleniyor. Hepsine gözat →",
    regions: [
      { region: "ABD", takeaway: "USMLE Step 1 / 2 CK / 3" },
      { region: "Birleşik Krallık Royal Colleges", takeaway: "MRCP, MRCS, MRCOG, MRCPCH, FRCS, PLAB" },
      { region: "Avrupa Boardları (UEMS)", takeaway: "EBSQ, FEBVS, EDAIC, EBC, EBO" },
      { region: "Orta Doğu / Körfez", takeaway: "Prometric (Suudi/BAE/Katar/Umman/Bahreyn), DHA, DOH" },
      { region: "Mısır", takeaway: "Egyptian Fellowship, Board, Diploma, Master, MD" },
    ],
    specialtiesH: "Desteklenen uzmanlıklar", specialtiesSub: "{count} tıbbi uzmanlık arasından seçin veya kendi konunuzu ekleyin.",
    finalH: "Daha akıllı çalışmaya hazır mısın?", finalSub: "Bugün ücretsiz dene — 1 sınav, kart yok. Hazır olunca yükselt.",
    finalCreate: "Ücretsiz hesap oluştur", finalCompare: "Planları karşılaştır",
  },
  signup: { title: "Hesabını oluştur", subtitle: "Ücretsiz planla başla. Ayda 1 YZ sınavı, kart gerekmiyor.",
    name: "Ad", email: "E-posta", password: "Parola", passwordHint: "En az 8 karakter.",
    submit: "Hesap oluştur", submitLoading: "Hesap oluşturuluyor…", haveAccount: "Zaten hesabın var mı?", signin: "Giriş yap" },
  login: { title: "Giriş yap", email: "E-posta", password: "Parola",
    submit: "Giriş yap", submitLoading: "Giriş yapılıyor…", noAccount: "Hesabın yok mu?", signup: "Kayıt ol" },
  plans: { title: "Planını seç", subtitle: "Ücretsiz dene, çalışma yoğunluğun arttıkça yükselt.",
    current: "Mevcut plan", signUp: "Kayıt ol", upgrade: "Yükselt", goDashboard: "Panele git",
    badgePopular: "En popüler", badgeValue: "En iyi değer", perMonth: "/ay", currencyShort: "EGP", free: "Ücretsiz",
    perPlan: {
      FREE: { label: "Ücretsiz", description: "Ayda 1 sınavlık deneme — yükseltmeden önce YZ'yi tanı.",
        features: ["Ayda 1 YZ sınavı (deneme)", "Sınav başına en fazla 10 soru", "Uzmanlığa veya sınav türüne göre", "Pratik ve sınav modları"] },
      BASIC: { label: "Basic", description: "Düzenli pratik ve tıp öğrencileri için.",
        features: ["Ücretsiz plandaki her şey", "Ayda 15 YZ sınavı", "Sınav başına en fazla 25 soru", "Sınav geçmişi"] },
      PRO: { label: "Pro", description: "Hacme ve dosya tabanlı sorulara ihtiyaç duyan adaylar için.",
        features: ["Basic'teki her şey", "Ayda 50 YZ sınavı (en fazla 1.500 soru)", "Sınav başına en fazla 30 soru", "Ayda en fazla 2 dosya yükleme (yakında)"] },
      PREMIUM: { label: "Premium", description: "Uzmanlar, danışmanlar ve eğitmenler için.",
        features: ["Pro'daki her şey", "Ayda 100 YZ sınavı (en fazla 4.000 soru)", "Sınav başına en fazla 40 soru", "Ayda en fazla 10 dosya yükleme (yakında)", "Gelişmiş analizler (yakında)"] },
    },
  },
};

const ur = {
  nav: { plans: "پلانز", dashboard: "ڈیش بورڈ", generate: "امتحان بنائیں", signin: "سائن ان", signup: "مفت شروع کریں", signout: "سائن آؤٹ", languageMenuLabel: "زبان تبدیل کریں" },
  footer: "MedExam Hub صرف طبی تعلیم کے لیے ہے۔ طبی فیصلوں کی ہمیشہ مستند ذرائع سے تصدیق کریں۔",
  whatsapp: "واٹس ایپ پر چیٹ کریں",
  home: {
    badge: "ڈاکٹرز، ریزیڈنٹس اور میڈیکل طلبہ کے لیے بنایا گیا",
    title: "AI سے چلنے والی ذہین طبی تعلیم اور بہتر امتحانات",
    subtitle: "USMLE، MRCS، MRCP، مصری فیلوشپ، پرومیٹرک اور دیگر کے لیے طبی MCQs بنائیں — 10 زبانوں میں، کسی بھی مشکل سطح پر، تشریحات اور سیکھنے کے نکات کے ساتھ۔",
    ctaStart: "مفت شروع کریں — 1 امتحان، کوئی کارڈ نہیں",
    ctaPlans: "پلانز {price} EGP/ماہ سے دیکھیں",
    trustLine: "41 امتحانی فارمیٹس · 10 زبانیں · 7 مشکل کی سطحیں · 20+ تخصصات",
    whyH: "MedExam Hub کیوں", whySub: "ڈاکٹر حقیقت میں جس طرح پڑھتے ہیں اس کے لیے بنایا گیا۔",
    features: feats({
      f1: { title: "موافقت پذیر AI سوال جنریٹر", body: "ایک تخصص یا امتحان، مشکل کی سطح اور تعداد منتخب کریں۔ AI ایک درست جواب والے MCQs، قابلِ یقین خلفشار اور تفصیلی تشریحات لکھتا ہے۔" },
      f2: { title: "اپنی زبان میں مشق کریں", body: "10 زبانوں میں سوالات بنائیں۔ عالمی طبی مخففات (ECG، NSTEMI، NICE) معیاری شکل میں رہتے ہیں۔" },
      f3: { title: "آپ کے حقیقی امتحان سے میل کھاتا ہے", body: "USMLE، USMLE جیسا محسوس ہوتا ہے۔ MRCS Part B، OSCE جیسا۔ مصری فیلوشپ، مصری فیلوشپ جیسی۔" },
      f4: { title: "مشق یا امتحان موڈ", body: "مشق موڈ میں جوابات فوراً دکھائی دیتے ہیں۔ امتحان موڈ انھیں چھپا کر ٹائمر چلاتا ہے۔" },
      f5: { title: "اپنی پیشرفت کی نگرانی کریں", body: "اوسط اسکور، امتحانی تاریخ اور کمزور علاقوں کی تجاویز ظاہر کرتی ہیں کہ کیا دہرانا ہے۔" },
      f6: { title: "نجی اور محفوظ", body: "آپ کا مطالعاتی ڈیٹا آپ کا ہے۔ ادائیگی Paymob کے ذریعے — ہم آپ کا کارڈ کبھی نہیں دیکھتے۔" },
    }),
    howH: "یہ کیسے کام کرتا ہے", howSub: "سائن اپ سے نتائج تک پانچ منٹ سے کم میں۔",
    steps: [
      { title: "اپنا امتحان منتخب کریں", body: "تخصص یا امتحانی فارمیٹ کے لحاظ سے۔ مشکل کی سطح اور زبان مقرر کریں۔" },
      { title: "MCQs تیار کریں", body: "AI آپ کے ان پٹ کے مطابق 1–100 سوالات لکھتا ہے، ہر ایک میں درست جواب، خلفشار، تشریح اور سیکھنے کا نکتہ۔" },
      { title: "امتحان دیں اور نتائج دیکھیں", body: "سیکھنے کے لیے مشق موڈ، تخفیف کے لیے امتحان موڈ۔ ہر سوال کے جائزے اور اپنے اسکور کے لیے جمع کریں۔" },
    ],
    formatsH: "آپ کے امتحانات کے لیے بنایا گیا", formatsSub: "بین الاقوامی بورڈز سے علاقائی لائسنسنگ امتحانات تک۔",
    formatsAll: "{count} امتحانی فارمیٹس شامل ہیں۔ سب دیکھیں ←",
    regions: [
      { region: "امریکہ", takeaway: "USMLE Step 1 / 2 CK / 3" },
      { region: "برطانوی رائل کالجز", takeaway: "MRCP, MRCS, MRCOG, MRCPCH, FRCS, PLAB" },
      { region: "یورپی بورڈز (UEMS)", takeaway: "EBSQ, FEBVS, EDAIC, EBC, EBO" },
      { region: "مشرقِ وسطیٰ / خلیج", takeaway: "Prometric (سعودی/اماراتی/قطری/عمانی/بحرینی)، DHA، DOH" },
      { region: "مصر", takeaway: "مصری فیلوشپ، بورڈ، ڈپلومہ، ماسٹرز، ایم ڈی" },
    ],
    specialtiesH: "شامل تخصصات", specialtiesSub: "{count} طبی تخصصات میں سے انتخاب کریں یا اپنا موضوع شامل کریں۔",
    finalH: "بہتر مطالعہ کے لیے تیار ہیں؟", finalSub: "آج مفت آزمائش آزمائیں — 1 امتحان، کوئی کارڈ نہیں۔ تیار ہونے پر اپ گریڈ کریں۔",
    finalCreate: "مفت اکاؤنٹ بنائیں", finalCompare: "پلانز کا موازنہ کریں",
  },
  signup: { title: "اپنا اکاؤنٹ بنائیں", subtitle: "مفت پلان سے شروع کریں۔ ماہانہ 1 AI امتحان، کارڈ کی ضرورت نہیں۔",
    name: "نام", email: "ای میل", password: "پاس ورڈ", passwordHint: "کم از کم 8 حروف۔",
    submit: "اکاؤنٹ بنائیں", submitLoading: "اکاؤنٹ بنایا جا رہا ہے…", haveAccount: "پہلے سے اکاؤنٹ ہے؟", signin: "سائن ان" },
  login: { title: "سائن ان", email: "ای میل", password: "پاس ورڈ",
    submit: "سائن ان", submitLoading: "سائن ان ہو رہا ہے…", noAccount: "اکاؤنٹ چاہیے؟", signup: "سائن اپ" },
  plans: { title: "اپنا پلان منتخب کریں", subtitle: "مفت آزمائش، پھر مطالعہ بڑھنے کے ساتھ اپ گریڈ کریں۔",
    current: "موجودہ پلان", signUp: "سائن اپ", upgrade: "اپ گریڈ", goDashboard: "ڈیش بورڈ پر جائیں",
    badgePopular: "سب سے مقبول", badgeValue: "بہترین قیمت", perMonth: "/ماہ", currencyShort: "EGP", free: "مفت",
    perPlan: {
      FREE: { label: "مفت", description: "ماہانہ 1 امتحانی آزمائش — اپ گریڈ سے پہلے AI کا تجربہ کریں۔",
        features: ["ماہانہ 1 AI امتحان (آزمائش)", "فی امتحان 10 سوالات تک", "تخصص یا امتحانی نوع کے لحاظ سے", "مشق اور امتحان موڈ"] },
      BASIC: { label: "بیسک", description: "مستقل مشق اور میڈیکل طلبہ کے لیے۔",
        features: ["مفت پلان میں موجود سب کچھ", "ماہانہ 15 AI امتحانات", "فی امتحان 25 سوالات تک", "امتحانی تاریخ"] },
      PRO: { label: "پرو", description: "حجم اور فائل پر مبنی سوالات کی ضرورت رکھنے والے امیدواروں کے لیے۔",
        features: ["بیسک میں موجود سب کچھ", "ماہانہ 50 AI امتحانات (1,500 سوالات تک)", "فی امتحان 30 سوالات تک", "ماہانہ 2 فائلز تک اپ لوڈ (جلد آرہا ہے)"] },
      PREMIUM: { label: "پریمیم", description: "تخصصین، مشیرین اور معلمین کے لیے۔",
        features: ["پرو میں موجود سب کچھ", "ماہانہ 100 AI امتحانات (4,000 سوالات تک)", "فی امتحان 40 سوالات تک", "ماہانہ 10 فائلز تک اپ لوڈ (جلد آرہا ہے)", "اعلیٰ تجزیات (جلد آرہا ہے)"] },
    },
  },
};

const fa = {
  nav: { plans: "پلن‌ها", dashboard: "داشبورد", generate: "ساخت آزمون", signin: "ورود", signup: "شروع رایگان", signout: "خروج", languageMenuLabel: "تغییر زبان" },
  footer: "MedExam Hub فقط برای آموزش پزشکی است. تصمیم‌های بالینی را همیشه با منابع معتبر تأیید کنید.",
  whatsapp: "گفت‌وگو در واتساپ",
  home: {
    badge: "برای پزشکان، رزیدنت‌ها و دانشجویان پزشکی",
    title: "یادگیری پزشکی و آزمون‌های هوشمندتر، با هوش مصنوعی",
    subtitle: "سؤالات چندگزینه‌ای بالینی برای USMLE، MRCS، MRCP، فلوشیپ مصری، پرومتریک و موارد دیگر تولید کنید — به ۱۰ زبان، هر سطح سختی، با توضیحات و نکات یادگیری.",
    ctaStart: "شروع رایگان — ۱ آزمون، بدون کارت",
    ctaPlans: "پلن‌ها از {price} EGP/ماه",
    trustLine: "۴۱ قالب آزمون · ۱۰ زبان · ۷ سطح سختی · بیش از ۲۰ تخصص",
    whyH: "چرا MedExam Hub", whySub: "بر اساس روشی که پزشکان واقعاً درس می‌خوانند ساخته شده.",
    features: feats({
      f1: { title: "تولیدکنندهٔ سؤال هوشمند و سازگار", body: "تخصص یا آزمون، سطح سختی و تعداد را انتخاب کنید. هوش مصنوعی سؤالات تک‌گزینه‌ای صحیح با گزینه‌های منحرف‌کنندهٔ منطقی و توضیحات کامل می‌نویسد." },
      f2: { title: "به زبان خود تمرین کنید", body: "سؤالات را به ۱۰ زبان تولید کنید. اختصارات پزشکی جهانی (ECG، NSTEMI، NICE) به شکل استاندارد باقی می‌مانند." },
      f3: { title: "متناسب با آزمون واقعی شما", body: "USMLE، حس USMLE دارد. MRCS Part B، حس OSCE. فلوشیپ مصری، حس فلوشیپ مصری." },
      f4: { title: "حالت تمرین یا آزمون", body: "حالت تمرین پاسخ‌ها را همان لحظه نشان می‌دهد. حالت آزمون آن‌ها را پنهان و تایمر را فعال می‌کند." },
      f5: { title: "پیشرفت خود را پیگیری کنید", body: "میانگین نمرات، تاریخچه آزمون‌ها و پیشنهاد نقاط ضعف نشان می‌دهد چه چیزی را مرور کنید." },
      f6: { title: "خصوصی و امن", body: "اطلاعات مطالعهٔ شما متعلق به شماست. پرداخت‌ها از طریق Paymob — ما هرگز شمارهٔ کارت شما را نمی‌بینیم." },
    }),
    howH: "چگونه کار می‌کند", howSub: "از ثبت‌نام تا نتایج در کمتر از پنج دقیقه.",
    steps: [
      { title: "آزمون خود را انتخاب کنید", body: "بر اساس تخصص یا قالب آزمون. سطح سختی و زبان را تنظیم کنید." },
      { title: "سؤالات را تولید کنید", body: "هوش مصنوعی ۱ تا ۱۰۰ سؤال متناسب با ورودی شما می‌نویسد، هرکدام با پاسخ صحیح، گزینه‌های منحرف‌کننده، توضیح و نکتهٔ یادگیری." },
      { title: "آزمون بدهید و نتایج را ببینید", body: "حالت تمرین برای یادگیری، حالت آزمون برای شبیه‌سازی. ارسال کنید تا مرور سؤال‌به‌سؤال و نمرهٔ خود را ببینید." },
    ],
    formatsH: "برای آزمون‌هایی که می‌دهید", formatsSub: "از مجامع بین‌المللی تا آزمون‌های صدور پروانهٔ منطقه‌ای.",
    formatsAll: "{count} قالب آزمون پشتیبانی می‌شود. مشاهدهٔ همه ←",
    regions: [
      { region: "ایالات متحده", takeaway: "USMLE Step 1 / 2 CK / 3" },
      { region: "کالج‌های سلطنتی بریتانیا", takeaway: "MRCP, MRCS, MRCOG, MRCPCH, FRCS, PLAB" },
      { region: "بُردهای اروپایی (UEMS)", takeaway: "EBSQ, FEBVS, EDAIC, EBC, EBO" },
      { region: "خاورمیانه / خلیج", takeaway: "Prometric (عربستان/امارات/قطر/عُمان/بحرین)، DHA، DOH" },
      { region: "مصر", takeaway: "فلوشیپ مصری، بُرد، دیپلم، کارشناسی ارشد، MD" },
    ],
    specialtiesH: "تخصص‌های پشتیبانی‌شده", specialtiesSub: "از بین {count} تخصص پزشکی انتخاب کنید یا موضوع خود را اضافه کنید.",
    finalH: "آمادهٔ مطالعهٔ هوشمندانه‌تر هستید؟", finalSub: "امروز نسخهٔ رایگان را امتحان کنید — ۱ آزمون، بدون کارت. هر زمان خواستید ارتقا دهید.",
    finalCreate: "ساخت حساب رایگان", finalCompare: "مقایسهٔ پلن‌ها",
  },
  signup: { title: "حساب خود را بسازید", subtitle: "با پلن رایگان شروع کنید. ۱ آزمون هوش مصنوعی در ماه، بدون کارت.",
    name: "نام", email: "ایمیل", password: "گذرواژه", passwordHint: "حداقل ۸ کاراکتر.",
    submit: "ساخت حساب", submitLoading: "در حال ساخت حساب…", haveAccount: "قبلاً حساب دارید؟", signin: "ورود" },
  login: { title: "ورود", email: "ایمیل", password: "گذرواژه",
    submit: "ورود", submitLoading: "در حال ورود…", noAccount: "حساب ندارید؟", signup: "ثبت‌نام" },
  plans: { title: "پلن خود را انتخاب کنید", subtitle: "آزمایش رایگان، سپس با افزایش حجم مطالعه ارتقا دهید.",
    current: "پلن فعلی", signUp: "ثبت‌نام", upgrade: "ارتقا", goDashboard: "رفتن به داشبورد",
    badgePopular: "محبوب‌ترین", badgeValue: "بهترین ارزش", perMonth: "/ماه", currencyShort: "EGP", free: "رایگان",
    perPlan: {
      FREE: { label: "رایگان", description: "هر ماه یک آزمون آزمایشی — قبل از ارتقا با هوش مصنوعی آشنا شوید.",
        features: ["۱ آزمون هوش مصنوعی در ماه (آزمایشی)", "حداکثر ۱۰ سؤال در هر آزمون", "بر اساس تخصص یا قالب آزمون", "حالت تمرین و آزمون"] },
      BASIC: { label: "پایه", description: "برای تمرین منظم و دانشجویان پزشکی.",
        features: ["تمام امکانات رایگان", "۱۵ آزمون هوش مصنوعی در ماه", "حداکثر ۲۵ سؤال در هر آزمون", "تاریخچه آزمون‌ها"] },
      PRO: { label: "حرفه‌ای", description: "برای داوطلبان آزمونی که به حجم و سؤالات از فایل نیاز دارند.",
        features: ["تمام امکانات پایه", "۵۰ آزمون هوش مصنوعی در ماه (تا ۱٬۵۰۰ سؤال)", "حداکثر ۳۰ سؤال در هر آزمون", "بارگذاری تا ۲ فایل در ماه (به‌زودی)"] },
      PREMIUM: { label: "پریمیوم", description: "برای متخصصان، مشاوران و آموزشگران.",
        features: ["تمام امکانات حرفه‌ای", "۱۰۰ آزمون هوش مصنوعی در ماه (تا ۴٬۰۰۰ سؤال)", "حداکثر ۴۰ سؤال در هر آزمون", "بارگذاری تا ۱۰ فایل در ماه (به‌زودی)", "تحلیل پیشرفته (به‌زودی)"] },
    },
  },
};

type Extras = Pick<Translations, "dashboard" | "banner" | "newExam">;

const SAMPLE_QUESTION = {
  question: "A 58-year-old diabetic patient presents with a plantar neuropathic ulcer under the first metatarsal head. Pedal pulses are palpable and there is no clinical infection. What is the most appropriate initial offloading strategy?",
  optionA: "Daily dressing only",
  optionB: "Removable ankle boot without follow-up",
  optionC: "Non-removable knee-high offloading device",
  optionD: "Immediate minor amputation",
  correct: "C",
  explanation: "For a neuropathic plantar forefoot ulcer without severe ischemia or infection, a non-removable knee-high offloading device is the preferred option when not contraindicated.",
};

const HOME_EXTRAS: Record<Locale, Translations["homeExtra"]> = {
  en: {
    trustBadges: ["Doctor-built", "Aligned with USMLE / MRCS standards", "Clinically reviewed", "10 languages"],
    demoLabel: "Sample question — Diabetic Foot · Specialist",
    demoQuestion: SAMPLE_QUESTION.question,
    demoOptionA: SAMPLE_QUESTION.optionA, demoOptionB: SAMPLE_QUESTION.optionB,
    demoOptionC: SAMPLE_QUESTION.optionC, demoOptionD: SAMPLE_QUESTION.optionD,
    demoCorrect: SAMPLE_QUESTION.correct, demoExplanation: SAMPLE_QUESTION.explanation,
    testimonialsH: "What doctors say",
    testimonialsSub: "Early users from across the region.",
    testimonials: [
      { quote: "This is the closest thing to real MRCS questions I've seen.", author: "Dr. Ahmed M.", role: "Surgical Resident, Cairo" },
      { quote: "I generate exam-style questions on whatever I'm reviewing. Saves me hours every week.", author: "Dr. Sara H.", role: "Internal Medicine, Saudi Arabia" },
      { quote: "Arabic-language questions are a game-changer for my study group.", author: "Dr. Omar K.", role: "Family Medicine, Egypt" },
    ],
    specialtiesSearch: "Search specialties…",
    specialtiesNoResults: "No specialties match your search.",
  },
  ar: {
    trustBadges: ["من بناء أطباء", "متوافق مع معايير USMLE / MRCS", "مراجَع سريريًا", "10 لغات"],
    demoLabel: "نموذج سؤال — القدم السكرية · مستوى أخصائي",
    demoQuestion: "مريض سكري يبلغ 58 عامًا يعاني من قرحة عصبية أخمصية تحت رأس مشط القدم الأول. النبضات القدمية محسوسة ولا توجد عدوى سريرية. ما هي استراتيجية تخفيف الضغط الأنسب كخطوة أولى؟",
    demoOptionA: "تغيير الضمادة يوميًا فقط",
    demoOptionB: "حذاء كاحل قابل للإزالة دون متابعة",
    demoOptionC: "جهاز تخفيف ضغط غير قابل للإزالة بطول الركبة",
    demoOptionD: "بتر صغير فوري",
    demoCorrect: "C",
    demoExplanation: "في حالة قرحة عصبية أخمصية في مقدمة القدم بدون نقص تروية شديد أو عدوى، يُعد جهاز تخفيف الضغط غير القابل للإزالة بطول الركبة الخيار الأنسب عند عدم وجود موانع.",
    testimonialsH: "ماذا يقول الأطباء",
    testimonialsSub: "مستخدمون أوائل من أنحاء المنطقة.",
    testimonials: [
      { quote: "هذا أقرب شيء رأيته لأسئلة MRCS الحقيقية.", author: "د. أحمد م.", role: "مقيم جراحة، القاهرة" },
      { quote: "أنشئ أسئلة بأسلوب الامتحان لأي موضوع أراجعه. يوفر لي ساعات كل أسبوع.", author: "د. سارة ح.", role: "باطنة، السعودية" },
      { quote: "الأسئلة باللغة العربية نقلة نوعية لمجموعة دراستي.", author: "د. عمر ك.", role: "طب الأسرة، مصر" },
    ],
    specialtiesSearch: "ابحث في التخصصات…",
    specialtiesNoResults: "لا توجد تخصصات تطابق بحثك.",
  },
  fr: {
    trustBadges: ["Conçu par des médecins", "Aligné sur USMLE / MRCS", "Revu cliniquement", "10 langues"],
    demoLabel: "Exemple de question — Pied diabétique · Spécialiste",
    demoQuestion: "Un patient diabétique de 58 ans présente un ulcère neuropathique plantaire sous la tête du premier métatarse. Les pouls pédieux sont palpables et il n'y a pas d'infection clinique. Quelle est la stratégie de décharge initiale la plus appropriée ?",
    demoOptionA: "Pansement quotidien seulement",
    demoOptionB: "Botte de cheville amovible sans suivi",
    demoOptionC: "Dispositif de décharge non amovible jusqu'au genou",
    demoOptionD: "Amputation mineure immédiate",
    demoCorrect: "C",
    demoExplanation: "Pour un ulcère neuropathique plantaire de l'avant-pied sans ischémie sévère ni infection, un dispositif de décharge non amovible jusqu'au genou est l'option recommandée en absence de contre-indication.",
    testimonialsH: "Ce que disent les médecins",
    testimonialsSub: "Premiers utilisateurs de toute la région.",
    testimonials: [
      { quote: "C'est ce qui se rapproche le plus des vraies questions MRCS que j'aie vues.", author: "Dr Ahmed M.", role: "Résident en chirurgie, Le Caire" },
      { quote: "Je génère des questions sur tout ce que je révise. Cela m'économise des heures.", author: "Dr Sara H.", role: "Médecine interne, Arabie Saoudite" },
      { quote: "Les questions en arabe ont révolutionné mon groupe d'étude.", author: "Dr Omar K.", role: "Médecine de famille, Égypte" },
    ],
    specialtiesSearch: "Rechercher des spécialités…",
    specialtiesNoResults: "Aucune spécialité ne correspond.",
  },
  es: {
    trustBadges: ["Hecho por médicos", "Alineado con USMLE / MRCS", "Revisado clínicamente", "10 idiomas"],
    demoLabel: "Pregunta de ejemplo — Pie diabético · Especialista",
    demoQuestion: "Un paciente diabético de 58 años presenta una úlcera neuropática plantar bajo la cabeza del primer metatarsiano. Los pulsos pedios son palpables y no hay infección clínica. ¿Cuál es la estrategia de descarga inicial más apropiada?",
    demoOptionA: "Cura diaria solamente",
    demoOptionB: "Bota de tobillo removible sin seguimiento",
    demoOptionC: "Dispositivo de descarga no removible hasta la rodilla",
    demoOptionD: "Amputación menor inmediata",
    demoCorrect: "C",
    demoExplanation: "Para una úlcera neuropática plantar del antepié sin isquemia severa ni infección, un dispositivo de descarga no removible hasta la rodilla es la opción preferida cuando no hay contraindicaciones.",
    testimonialsH: "Lo que dicen los médicos",
    testimonialsSub: "Primeros usuarios de toda la región.",
    testimonials: [
      { quote: "Es lo más cercano a preguntas reales de MRCS que he visto.", author: "Dr. Ahmed M.", role: "Residente de Cirugía, El Cairo" },
      { quote: "Genero preguntas tipo examen sobre lo que reviso. Me ahorra horas cada semana.", author: "Dra. Sara H.", role: "Medicina Interna, Arabia Saudita" },
      { quote: "Las preguntas en árabe son un cambio total para mi grupo de estudio.", author: "Dr. Omar K.", role: "Medicina Familiar, Egipto" },
    ],
    specialtiesSearch: "Buscar especialidades…",
    specialtiesNoResults: "Ninguna especialidad coincide.",
  },
  de: {
    trustBadges: ["Von Ärzten gebaut", "An USMLE / MRCS ausgerichtet", "Klinisch geprüft", "10 Sprachen"],
    demoLabel: "Beispielfrage — Diabetischer Fuß · Facharzt",
    demoQuestion: "Ein 58-jähriger Diabetespatient stellt sich mit einem plantaren neuropathischen Ulkus unter dem Köpfchen des ersten Mittelfußknochens vor. Fußpulse sind tastbar, keine klinische Infektion. Welche initiale Entlastungsstrategie ist am angemessensten?",
    demoOptionA: "Nur tägliche Verbandwechsel",
    demoOptionB: "Abnehmbarer Knöchelstiefel ohne Nachsorge",
    demoOptionC: "Nicht abnehmbares kniehohes Entlastungsgerät",
    demoOptionD: "Sofortige kleinere Amputation",
    demoCorrect: "C",
    demoExplanation: "Bei einem neuropathischen plantaren Vorfußulkus ohne schwere Ischämie oder Infektion ist ein nicht abnehmbares kniehohes Entlastungsgerät die bevorzugte Option, sofern keine Kontraindikation besteht.",
    testimonialsH: "Was Ärzte sagen",
    testimonialsSub: "Frühe Nutzer aus der gesamten Region.",
    testimonials: [
      { quote: "Das ist das Realistischste, was ich an MRCS-Fragen gesehen habe.", author: "Dr. Ahmed M.", role: "Chirurgie-Assistenzarzt, Kairo" },
      { quote: "Ich generiere Fragen zu allem, was ich gerade lerne. Spart mir Stunden pro Woche.", author: "Dr. Sara H.", role: "Innere Medizin, Saudi-Arabien" },
      { quote: "Arabische Fragen sind ein Game-Changer für meine Lerngruppe.", author: "Dr. Omar K.", role: "Allgemeinmedizin, Ägypten" },
    ],
    specialtiesSearch: "Fachgebiete suchen…",
    specialtiesNoResults: "Keine Fachgebiete gefunden.",
  },
  it: {
    trustBadges: ["Costruito da medici", "Allineato a USMLE / MRCS", "Rivisto clinicamente", "10 lingue"],
    demoLabel: "Domanda di esempio — Piede diabetico · Specialista",
    demoQuestion: "Un paziente diabetico di 58 anni presenta un'ulcera neuropatica plantare sotto la testa del primo metatarso. I polsi pedidi sono palpabili e non vi è infezione clinica. Qual è la strategia di scarico iniziale più appropriata?",
    demoOptionA: "Solo medicazione giornaliera",
    demoOptionB: "Tutore di caviglia rimovibile senza follow-up",
    demoOptionC: "Dispositivo di scarico non rimovibile fino al ginocchio",
    demoOptionD: "Amputazione minore immediata",
    demoCorrect: "C",
    demoExplanation: "Per un'ulcera neuropatica plantare dell'avampiede senza ischemia severa o infezione, un dispositivo di scarico non rimovibile fino al ginocchio è l'opzione preferita se non controindicato.",
    testimonialsH: "Cosa dicono i medici",
    testimonialsSub: "Primi utenti di tutta la regione.",
    testimonials: [
      { quote: "È la cosa più vicina alle vere domande MRCS che abbia visto.", author: "Dr. Ahmed M.", role: "Specializzando in Chirurgia, Il Cairo" },
      { quote: "Genero domande in stile esame su tutto ciò che ripasso. Mi fa risparmiare ore ogni settimana.", author: "Dott.ssa Sara H.", role: "Medicina Interna, Arabia Saudita" },
      { quote: "Le domande in arabo sono una svolta per il mio gruppo di studio.", author: "Dr. Omar K.", role: "Medicina di Famiglia, Egitto" },
    ],
    specialtiesSearch: "Cerca specialità…",
    specialtiesNoResults: "Nessuna specialità corrisponde.",
  },
  pt: {
    trustBadges: ["Feito por médicos", "Alinhado com USMLE / MRCS", "Revisado clinicamente", "10 idiomas"],
    demoLabel: "Questão de exemplo — Pé diabético · Especialista",
    demoQuestion: "Um paciente diabético de 58 anos apresenta uma úlcera neuropática plantar sob a cabeça do primeiro metatarso. Os pulsos pedais são palpáveis e não há infecção clínica. Qual é a estratégia de descarga inicial mais apropriada?",
    demoOptionA: "Apenas curativo diário",
    demoOptionB: "Bota de tornozelo removível sem acompanhamento",
    demoOptionC: "Dispositivo de descarga não removível até o joelho",
    demoOptionD: "Amputação menor imediata",
    demoCorrect: "C",
    demoExplanation: "Para uma úlcera neuropática plantar de antepé sem isquemia severa ou infecção, um dispositivo de descarga não removível até o joelho é a opção preferida quando não contraindicado.",
    testimonialsH: "O que os médicos dizem",
    testimonialsSub: "Primeiros usuários de toda a região.",
    testimonials: [
      { quote: "É o mais próximo de questões reais de MRCS que já vi.", author: "Dr. Ahmed M.", role: "Residente de Cirurgia, Cairo" },
      { quote: "Gero questões estilo exame sobre o que estou revisando. Economiza horas por semana.", author: "Dra. Sara H.", role: "Medicina Interna, Arábia Saudita" },
      { quote: "As questões em árabe são um divisor de águas para meu grupo de estudo.", author: "Dr. Omar K.", role: "Medicina de Família, Egito" },
    ],
    specialtiesSearch: "Buscar especialidades…",
    specialtiesNoResults: "Nenhuma especialidade encontrada.",
  },
  tr: {
    trustBadges: ["Doktorlar tarafından yapıldı", "USMLE / MRCS standartlarıyla uyumlu", "Klinik olarak gözden geçirildi", "10 dil"],
    demoLabel: "Örnek soru — Diyabetik ayak · Uzman seviyesi",
    demoQuestion: "58 yaşındaki diyabetik bir hasta, birinci metatars başının altında plantar nöropatik ülser ile başvuruyor. Pedal nabızlar palpe ediliyor ve klinik enfeksiyon yok. En uygun ilk yük dağıtma stratejisi hangisidir?",
    demoOptionA: "Sadece günlük pansuman",
    demoOptionB: "Çıkarılabilir ayak bileği botu, takip yok",
    demoOptionC: "Çıkarılamaz, diz altı yük dağıtma cihazı",
    demoOptionD: "Hemen küçük amputasyon",
    demoCorrect: "C",
    demoExplanation: "Şiddetli iskemi veya enfeksiyon olmayan nöropatik ön ayak ülserinde, kontrendikasyon yoksa çıkarılamaz diz altı yük dağıtma cihazı tercih edilen seçenektir.",
    testimonialsH: "Doktorlar ne diyor",
    testimonialsSub: "Bölgenin her yerinden erken kullanıcılar.",
    testimonials: [
      { quote: "Gerçek MRCS sorularına en yakın gördüğüm şey.", author: "Dr. Ahmed M.", role: "Cerrahi Asistanı, Kahire" },
      { quote: "Çalıştığım her konuda sınav stilinde sorular üretiyorum. Haftada saatler kazandırıyor.", author: "Dr. Sara H.", role: "Dahiliye, Suudi Arabistan" },
      { quote: "Arapça sorular çalışma grubum için oyun değiştirici.", author: "Dr. Omar K.", role: "Aile Hekimliği, Mısır" },
    ],
    specialtiesSearch: "Uzmanlık ara…",
    specialtiesNoResults: "Eşleşen uzmanlık yok.",
  },
  ur: {
    trustBadges: ["ڈاکٹرز نے بنایا", "USMLE / MRCS معیار کے مطابق", "طبی جائزہ شدہ", "10 زبانیں"],
    demoLabel: "نمونہ سوال — ذیابیطی پاؤں · اسپیشلسٹ سطح",
    demoQuestion: "58 سالہ ذیابیطی مریض پہلے میٹا ٹارسل ہیڈ کے نیچے پلانٹر نیوروپیتھک السر کے ساتھ آیا۔ پیڈل نبضیں محسوس ہوتی ہیں اور کوئی طبی انفیکشن نہیں۔ سب سے مناسب ابتدائی آف لوڈنگ حکمت عملی کیا ہے؟",
    demoOptionA: "صرف روزانہ ڈریسنگ",
    demoOptionB: "پیروی کے بغیر ہٹانے والا ٹخنہ بوٹ",
    demoOptionC: "گھٹنے تک نہ ہٹایا جانے والا آف لوڈنگ ڈیوائس",
    demoOptionD: "فوری چھوٹا کٹنا",
    demoCorrect: "C",
    demoExplanation: "شدید اسکیمیا یا انفیکشن کے بغیر نیوروپیتھک پلانٹر فور فٹ السر کے لیے، گھٹنے تک نہ ہٹایا جانے والا آف لوڈنگ ڈیوائس بہترین اختیار ہے جب تک کہ ممنوع نہ ہو۔",
    testimonialsH: "ڈاکٹرز کیا کہتے ہیں",
    testimonialsSub: "خطے بھر سے ابتدائی صارفین۔",
    testimonials: [
      { quote: "یہ MRCS کے حقیقی سوالات کے سب سے قریب ہے جو میں نے دیکھا ہے۔", author: "ڈاکٹر احمد م۔", role: "سرجری ریزیڈنٹ، قاہرہ" },
      { quote: "جو بھی پڑھ رہا ہوں اس پر سوالات بناتا ہوں۔ ہر ہفتے گھنٹوں بچاتا ہے۔", author: "ڈاکٹر سارہ ح۔", role: "اندرونی طب، سعودی عرب" },
      { quote: "عربی زبان کے سوالات میرے سٹڈی گروپ کے لیے انقلاب ہیں۔", author: "ڈاکٹر عمر ک۔", role: "خاندانی طب، مصر" },
    ],
    specialtiesSearch: "تخصصات تلاش کریں…",
    specialtiesNoResults: "کوئی تخصص نہیں ملا۔",
  },
  fa: {
    trustBadges: ["ساخته‌شده توسط پزشکان", "هم‌راستا با استانداردهای USMLE / MRCS", "بررسی‌شده بالینی", "۱۰ زبان"],
    demoLabel: "سؤال نمونه — پای دیابتی · سطح متخصص",
    demoQuestion: "بیمار دیابتی ۵۸ ساله با زخم نوروپاتیک کف پایی زیر سر متاتارس اول مراجعه می‌کند. نبض‌های پدال قابل لمس هستند و عفونت بالینی وجود ندارد. مناسب‌ترین استراتژی اولیه کاهش فشار چیست؟",
    demoOptionA: "فقط پانسمان روزانه",
    demoOptionB: "بوت مچ پا قابل برداشت بدون پیگیری",
    demoOptionC: "دستگاه کاهش فشار غیرقابل برداشت تا زانو",
    demoOptionD: "قطع کوچک فوری",
    demoCorrect: "C",
    demoExplanation: "برای زخم نوروپاتیک کف پایی پیش‌پا بدون ایسکمی شدید یا عفونت، دستگاه کاهش فشار غیرقابل برداشت تا زانو در صورت نبود منع، گزینه ترجیحی است.",
    testimonialsH: "پزشکان چه می‌گویند",
    testimonialsSub: "کاربران اولیه از سراسر منطقه.",
    testimonials: [
      { quote: "نزدیک‌ترین چیز به سؤالات واقعی MRCS که دیده‌ام.", author: "دکتر احمد م.", role: "رزیدنت جراحی، قاهره" },
      { quote: "روی هر چیزی که مرور می‌کنم سؤال می‌سازم. در هفته ساعت‌ها صرفه‌جویی می‌کند.", author: "دکتر سارا ح.", role: "داخلی، عربستان سعودی" },
      { quote: "سؤالات عربی نقطه عطفی برای گروه مطالعه من بود.", author: "دکتر عمر ک.", role: "پزشکی خانواده، مصر" },
    ],
    specialtiesSearch: "جستجوی تخصص…",
    specialtiesNoResults: "هیچ تخصصی پیدا نشد.",
  },
};

const ACCOUNTS: Record<Locale, Translations["account"]> = {
  en: {
    title: "Subscription", manageLink: "Manage subscription",
    yourPlan: "Your plan", status: "Status",
    statusActive: "Active", statusCancelled: "Cancelled", statusExpired: "Expired", statusFree: "Free trial",
    startedOn: "Started on", expiresOn: "Expires on", daysRemaining: "{n} days remaining",
    cancelledNotice: "Your subscription is cancelled. You'll keep access until {date}, then drop to Free.",
    renew: "Renew now", cancel: "Cancel subscription",
    cancelConfirm: "Cancel your subscription? You'll keep access until {date}, then drop to Free.",
    cancelConfirmImmediate: "Cancel your subscription? Your account will drop to the Free plan immediately.",
    reactivate: "Reactivate subscription",
    upgradeOptions: "Upgrade options", noUpgrades: "You're on the highest tier.",
    freeUpgradeNote: "Upgrade to a paid plan to unlock more exams.",
    paymentHistory: "Payment history", paymentEmpty: "No payments yet.",
    colDate: "Date", colPlan: "Plan", colAmount: "Amount", colStatus: "Status",
    paidStatus: "Paid", pendingStatus: "Pending", failedStatus: "Failed",
    backToDashboard: "Back to dashboard",
  },
  ar: {
    title: "الاشتراك", manageLink: "إدارة الاشتراك",
    yourPlan: "خطتك", status: "الحالة",
    statusActive: "نشط", statusCancelled: "ملغى", statusExpired: "منتهي", statusFree: "تجربة مجانية",
    startedOn: "بدأ في", expiresOn: "ينتهي في", daysRemaining: "{n} يومًا متبقيًا",
    cancelledNotice: "تم إلغاء اشتراكك. ستحتفظ بالوصول حتى {date}، ثم تنتقل إلى الخطة المجانية.",
    renew: "تجديد الآن", cancel: "إلغاء الاشتراك",
    cancelConfirm: "هل تريد إلغاء اشتراكك؟ ستحتفظ بالوصول حتى {date}، ثم تنتقل إلى الخطة المجانية.",
    cancelConfirmImmediate: "هل تريد إلغاء اشتراكك؟ سينتقل حسابك إلى الخطة المجانية فورًا.",
    reactivate: "إعادة تفعيل الاشتراك",
    upgradeOptions: "خيارات الترقية", noUpgrades: "أنت على أعلى خطة.",
    freeUpgradeNote: "ارقِ إلى خطة مدفوعة للحصول على المزيد من الامتحانات.",
    paymentHistory: "سجل المدفوعات", paymentEmpty: "لا توجد مدفوعات بعد.",
    colDate: "التاريخ", colPlan: "الخطة", colAmount: "المبلغ", colStatus: "الحالة",
    paidStatus: "مدفوع", pendingStatus: "قيد الانتظار", failedStatus: "فشل",
    backToDashboard: "الرجوع إلى لوحة التحكم",
  },
  fr: {
    title: "Abonnement", manageLink: "Gérer l'abonnement",
    yourPlan: "Votre forfait", status: "Statut",
    statusActive: "Actif", statusCancelled: "Annulé", statusExpired: "Expiré", statusFree: "Essai gratuit",
    startedOn: "Commencé le", expiresOn: "Expire le", daysRemaining: "{n} jours restants",
    cancelledNotice: "Votre abonnement est annulé. Vous gardez l'accès jusqu'au {date}, puis vous passerez au forfait gratuit.",
    renew: "Renouveler maintenant", cancel: "Annuler l'abonnement",
    cancelConfirm: "Annuler votre abonnement ? Vous gardez l'accès jusqu'au {date}, puis vous passerez au forfait gratuit.",
    cancelConfirmImmediate: "Annuler votre abonnement ? Votre compte passera immédiatement au forfait gratuit.",
    reactivate: "Réactiver l'abonnement",
    upgradeOptions: "Options d'amélioration", noUpgrades: "Vous êtes au niveau le plus élevé.",
    freeUpgradeNote: "Passez à un forfait payant pour débloquer plus d'examens.",
    paymentHistory: "Historique des paiements", paymentEmpty: "Aucun paiement pour le moment.",
    colDate: "Date", colPlan: "Forfait", colAmount: "Montant", colStatus: "Statut",
    paidStatus: "Payé", pendingStatus: "En attente", failedStatus: "Échoué",
    backToDashboard: "Retour au tableau de bord",
  },
  es: {
    title: "Suscripción", manageLink: "Gestionar suscripción",
    yourPlan: "Tu plan", status: "Estado",
    statusActive: "Activo", statusCancelled: "Cancelado", statusExpired: "Expirado", statusFree: "Prueba gratuita",
    startedOn: "Comenzó el", expiresOn: "Expira el", daysRemaining: "{n} días restantes",
    cancelledNotice: "Tu suscripción está cancelada. Conservarás el acceso hasta el {date}, luego pasarás al plan gratuito.",
    renew: "Renovar ahora", cancel: "Cancelar suscripción",
    cancelConfirm: "¿Cancelar tu suscripción? Conservarás el acceso hasta el {date}, luego pasarás al plan gratuito.",
    cancelConfirmImmediate: "¿Cancelar tu suscripción? Tu cuenta pasará al plan gratuito de inmediato.",
    reactivate: "Reactivar suscripción",
    upgradeOptions: "Opciones de mejora", noUpgrades: "Estás en el nivel más alto.",
    freeUpgradeNote: "Mejora a un plan de pago para desbloquear más exámenes.",
    paymentHistory: "Historial de pagos", paymentEmpty: "Aún no hay pagos.",
    colDate: "Fecha", colPlan: "Plan", colAmount: "Monto", colStatus: "Estado",
    paidStatus: "Pagado", pendingStatus: "Pendiente", failedStatus: "Fallido",
    backToDashboard: "Volver al panel",
  },
  de: {
    title: "Abonnement", manageLink: "Abonnement verwalten",
    yourPlan: "Ihr Tarif", status: "Status",
    statusActive: "Aktiv", statusCancelled: "Gekündigt", statusExpired: "Abgelaufen", statusFree: "Kostenlose Testversion",
    startedOn: "Gestartet am", expiresOn: "Läuft ab am", daysRemaining: "{n} Tage verbleibend",
    cancelledNotice: "Ihr Abonnement ist gekündigt. Sie behalten den Zugriff bis zum {date}, danach wechseln Sie auf den kostenlosen Tarif.",
    renew: "Jetzt verlängern", cancel: "Abonnement kündigen",
    cancelConfirm: "Abonnement kündigen? Sie behalten den Zugriff bis zum {date}, danach wechseln Sie auf den kostenlosen Tarif.",
    cancelConfirmImmediate: "Abonnement kündigen? Ihr Konto wechselt sofort auf den kostenlosen Tarif.",
    reactivate: "Abonnement reaktivieren",
    upgradeOptions: "Upgrade-Optionen", noUpgrades: "Sie haben den höchsten Tarif.",
    freeUpgradeNote: "Wechseln Sie zu einem kostenpflichtigen Tarif für mehr Prüfungen.",
    paymentHistory: "Zahlungsverlauf", paymentEmpty: "Noch keine Zahlungen.",
    colDate: "Datum", colPlan: "Tarif", colAmount: "Betrag", colStatus: "Status",
    paidStatus: "Bezahlt", pendingStatus: "Ausstehend", failedStatus: "Fehlgeschlagen",
    backToDashboard: "Zurück zum Dashboard",
  },
  it: {
    title: "Abbonamento", manageLink: "Gestisci abbonamento",
    yourPlan: "Il tuo piano", status: "Stato",
    statusActive: "Attivo", statusCancelled: "Annullato", statusExpired: "Scaduto", statusFree: "Prova gratuita",
    startedOn: "Iniziato il", expiresOn: "Scade il", daysRemaining: "{n} giorni rimasti",
    cancelledNotice: "Il tuo abbonamento è stato annullato. Manterrai l'accesso fino al {date}, poi passerai al piano gratuito.",
    renew: "Rinnova ora", cancel: "Annulla abbonamento",
    cancelConfirm: "Annullare l'abbonamento? Manterrai l'accesso fino al {date}, poi passerai al piano gratuito.",
    cancelConfirmImmediate: "Annullare l'abbonamento? Il tuo account passerà subito al piano gratuito.",
    reactivate: "Riattiva abbonamento",
    upgradeOptions: "Opzioni di upgrade", noUpgrades: "Sei sul livello più alto.",
    freeUpgradeNote: "Passa a un piano a pagamento per sbloccare più esami.",
    paymentHistory: "Cronologia pagamenti", paymentEmpty: "Nessun pagamento ancora.",
    colDate: "Data", colPlan: "Piano", colAmount: "Importo", colStatus: "Stato",
    paidStatus: "Pagato", pendingStatus: "In sospeso", failedStatus: "Fallito",
    backToDashboard: "Torna alla dashboard",
  },
  pt: {
    title: "Assinatura", manageLink: "Gerenciar assinatura",
    yourPlan: "Seu plano", status: "Status",
    statusActive: "Ativo", statusCancelled: "Cancelado", statusExpired: "Expirado", statusFree: "Teste grátis",
    startedOn: "Iniciado em", expiresOn: "Expira em", daysRemaining: "{n} dias restantes",
    cancelledNotice: "Sua assinatura foi cancelada. Você manterá o acesso até {date}, depois voltará ao plano gratuito.",
    renew: "Renovar agora", cancel: "Cancelar assinatura",
    cancelConfirm: "Cancelar sua assinatura? Você manterá o acesso até {date}, depois voltará ao plano gratuito.",
    cancelConfirmImmediate: "Cancelar sua assinatura? Sua conta voltará ao plano gratuito imediatamente.",
    reactivate: "Reativar assinatura",
    upgradeOptions: "Opções de upgrade", noUpgrades: "Você está no nível mais alto.",
    freeUpgradeNote: "Faça upgrade para um plano pago para desbloquear mais exames.",
    paymentHistory: "Histórico de pagamentos", paymentEmpty: "Ainda sem pagamentos.",
    colDate: "Data", colPlan: "Plano", colAmount: "Valor", colStatus: "Status",
    paidStatus: "Pago", pendingStatus: "Pendente", failedStatus: "Falhou",
    backToDashboard: "Voltar ao painel",
  },
  tr: {
    title: "Abonelik", manageLink: "Aboneliği yönet",
    yourPlan: "Planınız", status: "Durum",
    statusActive: "Aktif", statusCancelled: "İptal edildi", statusExpired: "Süresi doldu", statusFree: "Ücretsiz deneme",
    startedOn: "Başlangıç", expiresOn: "Bitiş", daysRemaining: "{n} gün kaldı",
    cancelledNotice: "Aboneliğiniz iptal edildi. {date} tarihine kadar erişiminiz devam edecek, sonrasında ücretsize geçeceksiniz.",
    renew: "Şimdi yenile", cancel: "Aboneliği iptal et",
    cancelConfirm: "Aboneliği iptal etmek istiyor musunuz? {date} tarihine kadar erişiminiz devam eder, sonra ücretsize geçer.",
    cancelConfirmImmediate: "Aboneliği iptal etmek istiyor musunuz? Hesabınız hemen ücretsiz plana geçecek.",
    reactivate: "Aboneliği yeniden etkinleştir",
    upgradeOptions: "Yükseltme seçenekleri", noUpgrades: "En üst kademeye sahipsiniz.",
    freeUpgradeNote: "Daha fazla sınav için ücretli bir plana yükseltin.",
    paymentHistory: "Ödeme geçmişi", paymentEmpty: "Henüz ödeme yok.",
    colDate: "Tarih", colPlan: "Plan", colAmount: "Tutar", colStatus: "Durum",
    paidStatus: "Ödendi", pendingStatus: "Beklemede", failedStatus: "Başarısız",
    backToDashboard: "Panele dön",
  },
  ur: {
    title: "سبسکرپشن", manageLink: "سبسکرپشن منظم کریں",
    yourPlan: "آپ کا پلان", status: "حالت",
    statusActive: "فعال", statusCancelled: "منسوخ", statusExpired: "ختم", statusFree: "مفت آزمائش",
    startedOn: "شروع ہوا", expiresOn: "ختم ہوگا", daysRemaining: "{n} دن باقی",
    cancelledNotice: "آپ کا سبسکرپشن منسوخ ہو گیا ہے۔ آپ {date} تک رسائی برقرار رکھیں گے، پھر مفت پلان میں منتقل ہو جائیں گے۔",
    renew: "ابھی تجدید کریں", cancel: "سبسکرپشن منسوخ کریں",
    cancelConfirm: "اپنا سبسکرپشن منسوخ کریں؟ آپ {date} تک رسائی رکھیں گے، پھر مفت پلان میں منتقل ہوں گے۔",
    cancelConfirmImmediate: "اپنا سبسکرپشن منسوخ کریں؟ آپ کا اکاؤنٹ فوراً مفت پلان میں منتقل ہو جائے گا۔",
    reactivate: "سبسکرپشن دوبارہ فعال کریں",
    upgradeOptions: "اپ گریڈ کے اختیارات", noUpgrades: "آپ سب سے بلند درجے پر ہیں۔",
    freeUpgradeNote: "مزید امتحانات کے لیے ادائیگی والے پلان پر اپ گریڈ کریں۔",
    paymentHistory: "ادائیگی کی تاریخ", paymentEmpty: "ابھی تک کوئی ادائیگی نہیں۔",
    colDate: "تاریخ", colPlan: "پلان", colAmount: "رقم", colStatus: "حالت",
    paidStatus: "ادا کیا گیا", pendingStatus: "زیر التواء", failedStatus: "ناکام",
    backToDashboard: "ڈیش بورڈ پر واپس",
  },
  fa: {
    title: "اشتراک", manageLink: "مدیریت اشتراک",
    yourPlan: "پلن شما", status: "وضعیت",
    statusActive: "فعال", statusCancelled: "لغو شده", statusExpired: "منقضی شده", statusFree: "آزمایش رایگان",
    startedOn: "شروع شده در", expiresOn: "انقضا در", daysRemaining: "{n} روز باقی‌مانده",
    cancelledNotice: "اشتراک شما لغو شده است. تا {date} دسترسی خواهید داشت، سپس به پلن رایگان منتقل می‌شوید.",
    renew: "تمدید کن", cancel: "لغو اشتراک",
    cancelConfirm: "اشتراک خود را لغو می‌کنید؟ تا {date} دسترسی خواهید داشت، سپس به پلن رایگان منتقل می‌شوید.",
    cancelConfirmImmediate: "اشتراک خود را لغو می‌کنید؟ حساب شما بلافاصله به پلن رایگان منتقل می‌شود.",
    reactivate: "فعال‌سازی مجدد اشتراک",
    upgradeOptions: "گزینه‌های ارتقا", noUpgrades: "شما در بالاترین سطح هستید.",
    freeUpgradeNote: "برای دسترسی به آزمون‌های بیشتر به یک پلن پولی ارتقا دهید.",
    paymentHistory: "تاریخچه پرداخت", paymentEmpty: "هنوز پرداختی انجام نشده است.",
    colDate: "تاریخ", colPlan: "پلن", colAmount: "مبلغ", colStatus: "وضعیت",
    paidStatus: "پرداخت‌شده", pendingStatus: "در انتظار", failedStatus: "ناموفق",
    backToDashboard: "بازگشت به داشبورد",
  },
};

const EXTRAS: Record<Locale, Extras> = {
  en: {
    dashboard: {
      welcome: "Welcome back, {name}", planSuffix: "plan", freeTrial: "Free trial",
      activeUntil: "Active until {date}", generateNew: "Generate new exam",
      examsThisMonth: "Questions this month", remaining: "{n} remaining",
      examsCreated: "Exams created", completedShort: "{n} completed",
      averageScore: "Average score", acrossCompleted: "across completed exams",
      recentExams: "Recent exams", noExams: "No exams yet.", generateFirst: "Generate your first exam",
      status: { generating: "generating", ready: "ready", inProgress: "in progress", completed: "completed", failed: "failed" },
      guideHeadings: { FREE: "Getting started", BASIC: "Make the most of Basic", PRO: "Pro tips", PREMIUM: "Premium toolkit" },
      guideTips: {
        FREE: ["Pick the exam style (USMLE, MRCS, MRCP, Egyptian Fellowship, Prometric, etc.) so questions match the format you'll see in the real exam.", "Free trial is 1 exam per month with up to 10 questions. Upgrade to Basic for 15 exams per month.", "Use Practice mode to learn — explanations show after each answer."],
        BASIC: ["You have {monthlyExams} exams per month. Spread them across specialties or focus on one for depth.", "Switch to Exam mode (timer on) when simulating real test conditions.", "Going beyond Basic? Pro adds file upload — generate questions from your own lecture notes or guidelines."],
        PRO: ["{monthlyExams} exams a month, up to {maxQ} questions each — plenty for daily practice.", "File upload allowance: {files} files per month (feature shipping soon).", "Track your weak topics on the dashboard and re-generate exams targeting those areas."],
        PREMIUM: ["{monthlyExams} exams a month with up to {maxQ} questions each — ideal for board-prep marathons.", "{files} file uploads per month (feature shipping soon).", "Advanced analytics will surface accuracy by topic and recommended revision plans (coming)."],
      },
    },
    banner: {
      dismiss: "Dismiss",
      perPlan: {
        FREE: { title: "You're on the Free trial — 1 exam per month", body: "Upgrade to Basic for 15 exams a month and 25 questions per exam (699 EGP / month).", cta: "Upgrade to Basic" },
        BASIC: { title: "Need more exams or longer ones?", body: "Pro gives you 50 exams a month, 30 questions per exam, and file uploads (1,500 EGP / month).", cta: "Upgrade to Pro" },
        PRO: { title: "Going bigger?", body: "Premium unlocks 100 exams a month, 40 questions per exam, and 10 file uploads (2,500 EGP / month).", cta: "Upgrade to Premium" },
      },
    },
    newExam: {
      pageTitle: "Generate a new exam", remainingLine: "{remaining} of {limit} questions remaining this month on the {plan} plan.",
      bySpecialty: "By specialty", byExam: "By exam type",
      specialty: "Specialty", topic: "Topic", topicPlaceholder: "e.g. Offloading neuropathic forefoot ulcers",
      exam: "Exam", specialtyOptional: "Specialty (optional)", topicOptional: "Topic (optional)",
      topicOptionalPlaceholder: "leave blank for mixed", any: "Any",
      difficulty: "Difficulty",
      difficulties: { BEGINNER: "Beginner", STUDENT: "Medical student", INTERN: "Intern", RESIDENT: "Resident", SPECIALIST: "Specialist", CONSULTANT: "Consultant", BOARD: "Board exam" },
      mode: "Mode", modePractice: "Practice (no timer)", modeExam: "Exam (timed)",
      questionsMax: "Questions (max {n})", timeLimit: "Time limit (minutes, optional)", timeLimitPlaceholder: "e.g. 20",
      questionLanguage: "Question language", languageHint: "Defaults to your site language. AI writes questions, options, and explanations in this language.",
      generate: "Generate exam", generateLoading: "Generating exam (this can take 20–60s)…",
      disclaimer: "Questions are AI-generated for educational use. Always verify against authoritative sources.",
    },
  },
  ar: {
    dashboard: {
      welcome: "مرحبًا بعودتك، {name}", planSuffix: "الخطة", freeTrial: "تجربة مجانية",
      activeUntil: "نشطة حتى {date}", generateNew: "إنشاء امتحان جديد",
      examsThisMonth: "الأسئلة هذا الشهر", remaining: "{n} متبقٍّ",
      examsCreated: "امتحانات تم إنشاؤها", completedShort: "{n} مكتملة",
      averageScore: "متوسط الدرجة", acrossCompleted: "عبر الامتحانات المكتملة",
      recentExams: "أحدث الامتحانات", noExams: "لا توجد امتحانات بعد.", generateFirst: "أنشئ أول امتحان لك",
      status: { generating: "قيد الإنشاء", ready: "جاهز", inProgress: "قيد التنفيذ", completed: "مكتمل", failed: "فشل" },
      guideHeadings: { FREE: "ابدأ هنا", BASIC: "استفد من الخطة الأساسية", PRO: "نصائح Pro", PREMIUM: "أدوات Premium" },
      guideTips: {
        FREE: ["اختر صيغة الامتحان (USMLE، MRCS، MRCP، الزمالة المصرية، Prometric…) لتتوافق الأسئلة مع شكل الامتحان الفعلي.", "النسخة المجانية امتحان واحد شهريًا بحد أقصى 10 أسئلة. ارقِ إلى Basic للحصول على 15 امتحانًا شهريًا.", "استخدم وضع التدريب للتعلم — تظهر الشروح بعد كل إجابة."],
        BASIC: ["لديك {monthlyExams} امتحانات شهريًا. وزّعها على عدة تخصصات أو ركّز على تخصص واحد للتعمق.", "بدّل إلى وضع الامتحان (المؤقت مفعّل) لمحاكاة الاختبار الحقيقي.", "تحتاج المزيد؟ Pro يضيف رفع الملفات — أنشئ أسئلة من ملاحظاتك أو الإرشادات."],
        PRO: ["{monthlyExams} امتحان شهريًا، حتى {maxQ} سؤالاً لكل امتحان — كافٍ للتدريب اليومي.", "حصة رفع الملفات: {files} ملفات شهريًا (الميزة قريبًا).", "تابع مواضيعك الضعيفة في لوحة التحكم وأنشئ امتحانات تستهدفها."],
        PREMIUM: ["{monthlyExams} امتحان شهريًا حتى {maxQ} سؤالاً — مثالي لاستعداد البورد.", "{files} ملف يمكن رفعه شهريًا (قريبًا).", "تحليلات متقدمة ستظهر دقتك حسب الموضوع وخطط مراجعة موصى بها (قريبًا)."],
      },
    },
    banner: {
      dismiss: "إخفاء",
      perPlan: {
        FREE: { title: "أنت على النسخة المجانية — امتحان واحد شهريًا", body: "ارقِ إلى Basic للحصول على 15 امتحانًا شهريًا و25 سؤالاً لكل امتحان (699 ج.م./شهر).", cta: "ترقية إلى Basic" },
        BASIC: { title: "تحتاج امتحانات أكثر أو أطول؟", body: "Pro يمنحك 50 امتحانًا شهريًا و30 سؤالاً لكل امتحان ورفع الملفات (1,500 ج.م./شهر).", cta: "ترقية إلى Pro" },
        PRO: { title: "تخطط لتوسعة أكبر؟", body: "Premium يفتح لك 100 امتحان شهريًا و40 سؤالاً لكل امتحان و10 ملفات يمكن رفعها (2,500 ج.م./شهر).", cta: "ترقية إلى Premium" },
      },
    },
    newExam: {
      pageTitle: "إنشاء امتحان جديد", remainingLine: "{remaining} من {limit} سؤال متبقٍّ هذا الشهر على خطة {plan}.",
      bySpecialty: "حسب التخصص", byExam: "حسب نوع الامتحان",
      specialty: "التخصص", topic: "الموضوع", topicPlaceholder: "مثال: تخفيف الضغط في القرحة العصبية للقدم الأمامية",
      exam: "الامتحان", specialtyOptional: "التخصص (اختياري)", topicOptional: "الموضوع (اختياري)",
      topicOptionalPlaceholder: "اتركه فارغًا لمزج المواضيع", any: "أي تخصص",
      difficulty: "مستوى الصعوبة",
      difficulties: { BEGINNER: "مبتدئ", STUDENT: "طالب طب", INTERN: "امتياز", RESIDENT: "مقيم", SPECIALIST: "أخصائي", CONSULTANT: "استشاري", BOARD: "امتحان بورد" },
      mode: "النمط", modePractice: "تدريب (بدون مؤقت)", modeExam: "امتحان (بمؤقت)",
      questionsMax: "عدد الأسئلة (الحد الأقصى {n})", timeLimit: "الحد الزمني (دقائق، اختياري)", timeLimitPlaceholder: "مثال: 20",
      questionLanguage: "لغة الأسئلة", languageHint: "افتراضيًا لغة الموقع. يكتب الذكاء الاصطناعي الأسئلة والخيارات والشروح بهذه اللغة.",
      generate: "إنشاء الامتحان", generateLoading: "جارٍ إنشاء الامتحان (قد يستغرق 20–60 ثانية)…",
      disclaimer: "الأسئلة مولّدة بالذكاء الاصطناعي للأغراض التعليمية. تحقّق دائمًا من المصادر الموثوقة.",
    },
  },
  fr: {
    dashboard: {
      welcome: "Bon retour, {name}", planSuffix: "plan", freeTrial: "Essai gratuit",
      activeUntil: "Actif jusqu'au {date}", generateNew: "Créer un examen",
      examsThisMonth: "Examens ce mois-ci", remaining: "{n} restants",
      examsCreated: "Examens créés", completedShort: "{n} complétés",
      averageScore: "Score moyen", acrossCompleted: "sur les examens complétés",
      recentExams: "Examens récents", noExams: "Aucun examen pour le moment.", generateFirst: "Créez votre premier examen",
      status: { generating: "génération", ready: "prêt", inProgress: "en cours", completed: "complété", failed: "échec" },
      guideHeadings: { FREE: "Pour commencer", BASIC: "Tirer le meilleur de Basique", PRO: "Astuces Pro", PREMIUM: "Boîte à outils Premium" },
      guideTips: {
        FREE: ["Choisissez le format d'examen (USMLE, MRCS, MRCP, Fellowship égyptien, Prometric…) pour que les questions ressemblent à l'examen réel.", "L'essai gratuit donne 1 examen/mois jusqu'à 10 questions. Passez à Basique pour 15 examens/mois.", "Utilisez le mode Entraînement pour apprendre — les explications apparaissent après chaque réponse."],
        BASIC: ["Vous avez {monthlyExams} examens par mois. Répartissez-les entre spécialités ou concentrez-vous sur une.", "Passez en mode Examen (chrono activé) pour simuler les conditions réelles.", "Besoin de plus ? Pro ajoute le téléversement de fichiers — générez des questions à partir de vos notes."],
        PRO: ["{monthlyExams} examens par mois, jusqu'à {maxQ} questions chacun — parfait pour l'entraînement quotidien.", "Quota de fichiers : {files} fichiers par mois (bientôt disponible).", "Suivez vos sujets faibles dans le tableau de bord et regénérez des examens ciblés."],
        PREMIUM: ["{monthlyExams} examens par mois jusqu'à {maxQ} questions — idéal pour la préparation aux boards.", "{files} téléversements de fichiers par mois (bientôt).", "Les analyses avancées montreront la précision par sujet et un plan de révision recommandé (à venir)."],
      },
    },
    banner: {
      dismiss: "Ignorer",
      perPlan: {
        FREE: { title: "Vous êtes en essai gratuit — 1 examen par mois", body: "Passez à Basique pour 15 examens par mois et 25 questions par examen (699 EGP/mois).", cta: "Passer à Basique" },
        BASIC: { title: "Besoin de plus d'examens ou plus longs ?", body: "Pro vous donne 50 examens par mois, 30 questions par examen et le téléversement de fichiers (1 500 EGP/mois).", cta: "Passer à Pro" },
        PRO: { title: "Plus encore ?", body: "Premium débloque 100 examens par mois, 40 questions par examen et 10 fichiers (2 500 EGP/mois).", cta: "Passer à Premium" },
      },
    },
    newExam: {
      pageTitle: "Créer un nouvel examen", remainingLine: "{remaining} sur {limit} questions restantes ce mois-ci sur le forfait {plan}.",
      bySpecialty: "Par spécialité", byExam: "Par type d'examen",
      specialty: "Spécialité", topic: "Sujet", topicPlaceholder: "ex. Décharge des ulcères neuropathiques du pied",
      exam: "Examen", specialtyOptional: "Spécialité (facultatif)", topicOptional: "Sujet (facultatif)",
      topicOptionalPlaceholder: "laissez vide pour mélangé", any: "Toutes",
      difficulty: "Difficulté",
      difficulties: { BEGINNER: "Débutant", STUDENT: "Étudiant en médecine", INTERN: "Interne", RESIDENT: "Résident", SPECIALIST: "Spécialiste", CONSULTANT: "Consultant", BOARD: "Examen du board" },
      mode: "Mode", modePractice: "Entraînement (sans chrono)", modeExam: "Examen (chronométré)",
      questionsMax: "Questions (max {n})", timeLimit: "Limite de temps (minutes, facultatif)", timeLimitPlaceholder: "ex. 20",
      questionLanguage: "Langue des questions", languageHint: "Par défaut, la langue du site. L'IA écrit les questions, options et explications dans cette langue.",
      generate: "Créer l'examen", generateLoading: "Création de l'examen (peut prendre 20–60s)…",
      disclaimer: "Les questions sont générées par IA à des fins éducatives. Vérifiez toujours auprès de sources autorisées.",
    },
  },
  es: {
    dashboard: {
      welcome: "Bienvenido de nuevo, {name}", planSuffix: "plan", freeTrial: "Prueba gratuita",
      activeUntil: "Activo hasta {date}", generateNew: "Crear examen",
      examsThisMonth: "Exámenes este mes", remaining: "{n} restantes",
      examsCreated: "Exámenes creados", completedShort: "{n} completados",
      averageScore: "Puntaje promedio", acrossCompleted: "en exámenes completados",
      recentExams: "Exámenes recientes", noExams: "Aún no hay exámenes.", generateFirst: "Crea tu primer examen",
      status: { generating: "generando", ready: "listo", inProgress: "en curso", completed: "completado", failed: "fallido" },
      guideHeadings: { FREE: "Empezar", BASIC: "Aprovecha Básico", PRO: "Consejos Pro", PREMIUM: "Herramientas Premium" },
      guideTips: {
        FREE: ["Elige el formato de examen (USMLE, MRCS, MRCP, Fellowship Egipcio, Prometric…) para que las preguntas se parezcan al real.", "La prueba gratuita es 1 examen al mes con hasta 10 preguntas. Mejora a Básico para 15 exámenes al mes.", "Usa el modo Práctica para aprender — las explicaciones aparecen tras cada respuesta."],
        BASIC: ["Tienes {monthlyExams} exámenes al mes. Distribúyelos entre especialidades o concéntrate en una.", "Cambia al modo Examen (con cronómetro) para simular condiciones reales.", "¿Más allá de Básico? Pro añade subida de archivos — genera preguntas desde tus apuntes."],
        PRO: ["{monthlyExams} exámenes al mes, hasta {maxQ} preguntas cada uno — ideal para la práctica diaria.", "Cuota de archivos: {files} archivos al mes (próximamente).", "Sigue tus temas débiles en el panel y regenera exámenes enfocados."],
        PREMIUM: ["{monthlyExams} exámenes al mes hasta {maxQ} preguntas — ideal para preparación de boards.", "{files} subidas de archivos al mes (próximamente).", "Analítica avanzada mostrará precisión por tema y planes de repaso recomendados (próximamente)."],
      },
    },
    banner: {
      dismiss: "Descartar",
      perPlan: {
        FREE: { title: "Estás en la prueba gratuita — 1 examen al mes", body: "Mejora a Básico para 15 exámenes al mes y 25 preguntas por examen (699 EGP/mes).", cta: "Mejorar a Básico" },
        BASIC: { title: "¿Necesitas más exámenes o más largos?", body: "Pro te da 50 exámenes al mes, 30 preguntas por examen y subida de archivos (1.500 EGP/mes).", cta: "Mejorar a Pro" },
        PRO: { title: "¿Aún más?", body: "Premium desbloquea 100 exámenes al mes, 40 preguntas por examen y 10 archivos (2.500 EGP/mes).", cta: "Mejorar a Premium" },
      },
    },
    newExam: {
      pageTitle: "Crear un nuevo examen", remainingLine: "{remaining} de {limit} preguntas restantes este mes en el plan {plan}.",
      bySpecialty: "Por especialidad", byExam: "Por tipo de examen",
      specialty: "Especialidad", topic: "Tema", topicPlaceholder: "ej. Descarga de úlceras neuropáticas del pie",
      exam: "Examen", specialtyOptional: "Especialidad (opcional)", topicOptional: "Tema (opcional)",
      topicOptionalPlaceholder: "déjalo en blanco para mixto", any: "Cualquiera",
      difficulty: "Dificultad",
      difficulties: { BEGINNER: "Principiante", STUDENT: "Estudiante de medicina", INTERN: "Interno", RESIDENT: "Residente", SPECIALIST: "Especialista", CONSULTANT: "Consultor", BOARD: "Examen del board" },
      mode: "Modo", modePractice: "Práctica (sin cronómetro)", modeExam: "Examen (cronometrado)",
      questionsMax: "Preguntas (máx {n})", timeLimit: "Límite de tiempo (minutos, opcional)", timeLimitPlaceholder: "ej. 20",
      questionLanguage: "Idioma de preguntas", languageHint: "Por defecto el idioma del sitio. La IA escribe preguntas, opciones y explicaciones en este idioma.",
      generate: "Crear examen", generateLoading: "Creando examen (puede tardar 20–60s)…",
      disclaimer: "Las preguntas son generadas por IA con fines educativos. Verifica siempre con fuentes autorizadas.",
    },
  },
  de: {
    dashboard: {
      welcome: "Willkommen zurück, {name}", planSuffix: "Tarif", freeTrial: "Kostenlose Testversion",
      activeUntil: "Aktiv bis {date}", generateNew: "Prüfung erstellen",
      examsThisMonth: "Prüfungen diesen Monat", remaining: "{n} verbleibend",
      examsCreated: "Erstellte Prüfungen", completedShort: "{n} abgeschlossen",
      averageScore: "Durchschnittsnote", acrossCompleted: "über abgeschlossene Prüfungen",
      recentExams: "Letzte Prüfungen", noExams: "Noch keine Prüfungen.", generateFirst: "Erstellen Sie Ihre erste Prüfung",
      status: { generating: "wird erstellt", ready: "bereit", inProgress: "läuft", completed: "abgeschlossen", failed: "fehlgeschlagen" },
      guideHeadings: { FREE: "Erste Schritte", BASIC: "Basic optimal nutzen", PRO: "Pro-Tipps", PREMIUM: "Premium-Werkzeuge" },
      guideTips: {
        FREE: ["Wählen Sie das Prüfungsformat (USMLE, MRCS, MRCP, Egyptian Fellowship, Prometric…), damit Fragen zur echten Prüfung passen.", "Kostenlose Testversion: 1 Prüfung pro Monat mit bis zu 10 Fragen. Upgraden Sie auf Basic für 15 Prüfungen pro Monat.", "Übungsmodus zum Lernen — Erklärungen erscheinen nach jeder Antwort."],
        BASIC: ["Sie haben {monthlyExams} Prüfungen pro Monat. Verteilen Sie sie auf Fachgebiete oder vertiefen Sie eines.", "Wechseln Sie in den Prüfungsmodus (Timer an) zur echten Simulation.", "Mehr nötig? Pro fügt Datei-Upload hinzu — Fragen aus Ihren Notizen generieren."],
        PRO: ["{monthlyExams} Prüfungen pro Monat, bis zu {maxQ} Fragen je — genug für tägliches Üben.", "Datei-Upload: {files} Dateien pro Monat (bald verfügbar).", "Verfolgen Sie schwache Themen im Dashboard und erstellen Sie zielgerichtete Prüfungen."],
        PREMIUM: ["{monthlyExams} Prüfungen pro Monat bis zu {maxQ} Fragen — ideal für Board-Vorbereitung.", "{files} Datei-Uploads pro Monat (bald).", "Erweiterte Analytik zeigt Genauigkeit pro Thema und empfohlene Wiederholungspläne (bald)."],
      },
    },
    banner: {
      dismiss: "Schließen",
      perPlan: {
        FREE: { title: "Sie nutzen die kostenlose Version — 1 Prüfung pro Monat", body: "Upgraden Sie auf Basic für 15 Prüfungen pro Monat und 25 Fragen pro Prüfung (699 EGP/Monat).", cta: "Auf Basic upgraden" },
        BASIC: { title: "Mehr Prüfungen oder längere?", body: "Pro bietet 50 Prüfungen/Monat, 30 Fragen pro Prüfung und Datei-Upload (1.500 EGP/Monat).", cta: "Auf Pro upgraden" },
        PRO: { title: "Noch mehr?", body: "Premium schaltet 100 Prüfungen/Monat, 40 Fragen pro Prüfung und 10 Datei-Uploads frei (2.500 EGP/Monat).", cta: "Auf Premium upgraden" },
      },
    },
    newExam: {
      pageTitle: "Neue Prüfung erstellen", remainingLine: "{remaining} von {limit} Fragen diesen Monat im Tarif {plan} verfügbar.",
      bySpecialty: "Nach Fachgebiet", byExam: "Nach Prüfungstyp",
      specialty: "Fachgebiet", topic: "Thema", topicPlaceholder: "z. B. Entlastung neuropathischer Vorfußulzera",
      exam: "Prüfung", specialtyOptional: "Fachgebiet (optional)", topicOptional: "Thema (optional)",
      topicOptionalPlaceholder: "leer lassen für gemischt", any: "Beliebig",
      difficulty: "Schwierigkeit",
      difficulties: { BEGINNER: "Anfänger", STUDENT: "Medizinstudent", INTERN: "Praktikant", RESIDENT: "Assistenzarzt", SPECIALIST: "Facharzt", CONSULTANT: "Oberarzt", BOARD: "Board-Prüfung" },
      mode: "Modus", modePractice: "Übung (ohne Timer)", modeExam: "Prüfung (mit Timer)",
      questionsMax: "Fragen (max. {n})", timeLimit: "Zeitlimit (Minuten, optional)", timeLimitPlaceholder: "z. B. 20",
      questionLanguage: "Sprache der Fragen", languageHint: "Standard ist die Seitensprache. Die KI schreibt Fragen, Optionen und Erklärungen in dieser Sprache.",
      generate: "Prüfung erstellen", generateLoading: "Prüfung wird erstellt (kann 20–60s dauern)…",
      disclaimer: "Fragen werden von KI für Bildungszwecke generiert. Überprüfen Sie immer mit autorisierten Quellen.",
    },
  },
  it: {
    dashboard: {
      welcome: "Bentornato, {name}", planSuffix: "piano", freeTrial: "Prova gratuita",
      activeUntil: "Attivo fino al {date}", generateNew: "Crea esame",
      examsThisMonth: "Esami questo mese", remaining: "{n} rimanenti",
      examsCreated: "Esami creati", completedShort: "{n} completati",
      averageScore: "Punteggio medio", acrossCompleted: "su esami completati",
      recentExams: "Esami recenti", noExams: "Ancora nessun esame.", generateFirst: "Crea il tuo primo esame",
      status: { generating: "creazione", ready: "pronto", inProgress: "in corso", completed: "completato", failed: "fallito" },
      guideHeadings: { FREE: "Per iniziare", BASIC: "Sfrutta al meglio Basic", PRO: "Consigli Pro", PREMIUM: "Strumenti Premium" },
      guideTips: {
        FREE: ["Scegli il formato d'esame (USMLE, MRCS, MRCP, Fellowship Egiziano, Prometric…) per avere domande coerenti con l'esame reale.", "La prova gratuita è 1 esame al mese fino a 10 domande. Passa a Basic per 15 esami al mese.", "Usa la modalità Pratica per imparare — le spiegazioni compaiono dopo ogni risposta."],
        BASIC: ["Hai {monthlyExams} esami al mese. Distribuiscili tra specialità o concentrati su una.", "Passa alla modalità Esame (timer attivo) per simulare condizioni reali.", "Hai bisogno di più? Pro aggiunge il caricamento file — genera domande dai tuoi appunti."],
        PRO: ["{monthlyExams} esami al mese, fino a {maxQ} domande ciascuno — perfetto per la pratica quotidiana.", "Quota file: {files} file al mese (in arrivo).", "Monitora gli argomenti deboli nella dashboard e rigenera esami mirati."],
        PREMIUM: ["{monthlyExams} esami al mese fino a {maxQ} domande — ideale per la preparazione ai board.", "{files} caricamenti file al mese (in arrivo).", "L'analitica avanzata mostrerà l'accuratezza per argomento e piani di ripasso (in arrivo)."],
      },
    },
    banner: {
      dismiss: "Chiudi",
      perPlan: {
        FREE: { title: "Sei nella prova gratuita — 1 esame al mese", body: "Passa a Basic per 15 esami al mese e 25 domande per esame (699 EGP/mese).", cta: "Passa a Basic" },
        BASIC: { title: "Ti servono più esami o più lunghi?", body: "Pro ti dà 50 esami al mese, 30 domande per esame e caricamento file (1.500 EGP/mese).", cta: "Passa a Pro" },
        PRO: { title: "Vuoi di più?", body: "Premium sblocca 100 esami al mese, 40 domande per esame e 10 caricamenti file (2.500 EGP/mese).", cta: "Passa a Premium" },
      },
    },
    newExam: {
      pageTitle: "Crea un nuovo esame", remainingLine: "{remaining} su {limit} domande rimanenti questo mese sul piano {plan}.",
      bySpecialty: "Per specialità", byExam: "Per tipo di esame",
      specialty: "Specialità", topic: "Argomento", topicPlaceholder: "es. Scarico di ulcere neuropatiche dell'avampiede",
      exam: "Esame", specialtyOptional: "Specialità (opzionale)", topicOptional: "Argomento (opzionale)",
      topicOptionalPlaceholder: "lascia vuoto per misto", any: "Qualunque",
      difficulty: "Difficoltà",
      difficulties: { BEGINNER: "Principiante", STUDENT: "Studente di medicina", INTERN: "Tirocinante", RESIDENT: "Specializzando", SPECIALIST: "Specialista", CONSULTANT: "Consulente", BOARD: "Esame del board" },
      mode: "Modalità", modePractice: "Pratica (senza timer)", modeExam: "Esame (cronometrato)",
      questionsMax: "Domande (max {n})", timeLimit: "Limite di tempo (minuti, opzionale)", timeLimitPlaceholder: "es. 20",
      questionLanguage: "Lingua delle domande", languageHint: "Predefinita la lingua del sito. L'IA scrive domande, opzioni e spiegazioni in questa lingua.",
      generate: "Crea esame", generateLoading: "Creazione esame (può richiedere 20–60s)…",
      disclaimer: "Le domande sono generate dall'IA a scopo educativo. Verifica sempre con fonti autorevoli.",
    },
  },
  pt: {
    dashboard: {
      welcome: "Bem-vindo de volta, {name}", planSuffix: "plano", freeTrial: "Teste grátis",
      activeUntil: "Ativo até {date}", generateNew: "Gerar exame",
      examsThisMonth: "Exames este mês", remaining: "{n} restantes",
      examsCreated: "Exames criados", completedShort: "{n} concluídos",
      averageScore: "Pontuação média", acrossCompleted: "em exames concluídos",
      recentExams: "Exames recentes", noExams: "Ainda sem exames.", generateFirst: "Crie seu primeiro exame",
      status: { generating: "gerando", ready: "pronto", inProgress: "em andamento", completed: "concluído", failed: "falhou" },
      guideHeadings: { FREE: "Começando", BASIC: "Aproveite o Básico", PRO: "Dicas Pro", PREMIUM: "Ferramentas Premium" },
      guideTips: {
        FREE: ["Escolha o formato (USMLE, MRCS, MRCP, Fellowship Egípcio, Prometric…) para que as questões coincidam com o exame real.", "Teste grátis: 1 exame por mês com até 10 questões. Mude para Básico para 15 exames/mês.", "Use o modo Prática para aprender — explicações aparecem após cada resposta."],
        BASIC: ["Você tem {monthlyExams} exames por mês. Distribua entre especialidades ou foque numa.", "Mude para o modo Exame (com cronômetro) para simular o teste real.", "Precisa de mais? Pro adiciona upload de arquivos — gere questões a partir das suas anotações."],
        PRO: ["{monthlyExams} exames por mês, até {maxQ} questões cada — bom para prática diária.", "Cota de arquivos: {files} arquivos por mês (em breve).", "Acompanhe áreas fracas no painel e regenere exames focados nelas."],
        PREMIUM: ["{monthlyExams} exames por mês até {maxQ} questões — ideal para preparar boards.", "{files} uploads de arquivos por mês (em breve).", "Análise avançada mostrará precisão por tema e planos de revisão recomendados (em breve)."],
      },
    },
    banner: {
      dismiss: "Dispensar",
      perPlan: {
        FREE: { title: "Você está no teste grátis — 1 exame por mês", body: "Mude para Básico para 15 exames por mês e 25 questões por exame (699 EGP/mês).", cta: "Mudar para Básico" },
        BASIC: { title: "Precisa de mais exames ou maiores?", body: "Pro oferece 50 exames por mês, 30 questões por exame e upload de arquivos (1.500 EGP/mês).", cta: "Mudar para Pro" },
        PRO: { title: "Indo maior?", body: "Premium desbloqueia 100 exames por mês, 40 questões por exame e 10 uploads (2.500 EGP/mês).", cta: "Mudar para Premium" },
      },
    },
    newExam: {
      pageTitle: "Criar novo exame", remainingLine: "{remaining} de {limit} questões restantes este mês no plano {plan}.",
      bySpecialty: "Por especialidade", byExam: "Por tipo de exame",
      specialty: "Especialidade", topic: "Tema", topicPlaceholder: "ex. Descarga de úlceras neuropáticas do antepé",
      exam: "Exame", specialtyOptional: "Especialidade (opcional)", topicOptional: "Tema (opcional)",
      topicOptionalPlaceholder: "deixe em branco para mistura", any: "Qualquer",
      difficulty: "Dificuldade",
      difficulties: { BEGINNER: "Iniciante", STUDENT: "Estudante de medicina", INTERN: "Internato", RESIDENT: "Residente", SPECIALIST: "Especialista", CONSULTANT: "Consultor", BOARD: "Exame de board" },
      mode: "Modo", modePractice: "Prática (sem cronômetro)", modeExam: "Exame (cronometrado)",
      questionsMax: "Questões (máx {n})", timeLimit: "Tempo limite (minutos, opcional)", timeLimitPlaceholder: "ex. 20",
      questionLanguage: "Idioma das questões", languageHint: "Padrão é o idioma do site. A IA escreve questões, opções e explicações nesse idioma.",
      generate: "Gerar exame", generateLoading: "Gerando exame (pode levar 20–60s)…",
      disclaimer: "As questões são geradas por IA para fins educacionais. Sempre verifique com fontes autoritativas.",
    },
  },
  tr: {
    dashboard: {
      welcome: "Tekrar hoş geldin, {name}", planSuffix: "plan", freeTrial: "Ücretsiz deneme",
      activeUntil: "{date} tarihine kadar aktif", generateNew: "Sınav oluştur",
      examsThisMonth: "Bu ay sınavlar", remaining: "{n} kaldı",
      examsCreated: "Oluşturulan sınavlar", completedShort: "{n} tamamlandı",
      averageScore: "Ortalama puan", acrossCompleted: "tamamlanan sınavlarda",
      recentExams: "Son sınavlar", noExams: "Henüz sınav yok.", generateFirst: "İlk sınavını oluştur",
      status: { generating: "oluşturuluyor", ready: "hazır", inProgress: "devam ediyor", completed: "tamamlandı", failed: "başarısız" },
      guideHeadings: { FREE: "Başlangıç", BASIC: "Basic'ten en iyi şekilde yararlan", PRO: "Pro ipuçları", PREMIUM: "Premium araçlar" },
      guideTips: {
        FREE: ["Sınav formatını seçin (USMLE, MRCS, MRCP, Egyptian Fellowship, Prometric…) — sorular gerçek sınavla eşleşsin.", "Ücretsiz deneme ayda 1 sınav, en fazla 10 soru. Basic'e geçerek ayda 15 sınav alın.", "Öğrenmek için Pratik modunu kullanın — her yanıttan sonra açıklamalar görünür."],
        BASIC: ["Ayda {monthlyExams} sınavınız var. Uzmanlıklara yayın veya bir alana odaklanın.", "Gerçek sınav koşullarını simüle etmek için Sınav moduna (zamanlayıcı açık) geçin.", "Daha fazlası mı? Pro dosya yüklemeyi ekler — kendi notlarınızdan sorular üretin."],
        PRO: ["Ayda {monthlyExams} sınav, her biri en fazla {maxQ} soru — günlük pratik için bol bol.", "Dosya kotanız: ayda {files} dosya (yakında geliyor).", "Panodan zayıf konuları takip edin ve hedefli sınavlar üretin."],
        PREMIUM: ["Ayda {monthlyExams} sınav, en fazla {maxQ} soru — board hazırlığı için ideal.", "Ayda {files} dosya yükleme (yakında).", "Gelişmiş analizler konuya göre doğruluğu ve önerilen tekrar planını gösterecek (yakında)."],
      },
    },
    banner: {
      dismiss: "Kapat",
      perPlan: {
        FREE: { title: "Ücretsiz denemedesiniz — ayda 1 sınav", body: "Basic'e geçerek ayda 15 sınav ve sınav başına 25 soru (699 EGP/ay).", cta: "Basic'e yükselt" },
        BASIC: { title: "Daha fazla veya daha uzun sınav mı?", body: "Pro ayda 50 sınav, sınav başına 30 soru ve dosya yükleme verir (1.500 EGP/ay).", cta: "Pro'ya yükselt" },
        PRO: { title: "Daha da büyük mü?", body: "Premium ayda 100 sınav, sınav başına 40 soru ve 10 dosya yüklemenin kilidini açar (2.500 EGP/ay).", cta: "Premium'a yükselt" },
      },
    },
    newExam: {
      pageTitle: "Yeni sınav oluştur", remainingLine: "Bu ay {plan} planında {remaining}/{limit} soru kaldı.",
      bySpecialty: "Uzmanlığa göre", byExam: "Sınav türüne göre",
      specialty: "Uzmanlık", topic: "Konu", topicPlaceholder: "örn. Nöropatik ön ayak ülserlerinde yük dağıtımı",
      exam: "Sınav", specialtyOptional: "Uzmanlık (isteğe bağlı)", topicOptional: "Konu (isteğe bağlı)",
      topicOptionalPlaceholder: "karışık için boş bırakın", any: "Herhangi",
      difficulty: "Zorluk",
      difficulties: { BEGINNER: "Başlangıç", STUDENT: "Tıp öğrencisi", INTERN: "İntern", RESIDENT: "Asistan", SPECIALIST: "Uzman", CONSULTANT: "Danışman", BOARD: "Board sınavı" },
      mode: "Mod", modePractice: "Pratik (zamanlayıcı yok)", modeExam: "Sınav (zamanlayıcı açık)",
      questionsMax: "Sorular (en fazla {n})", timeLimit: "Süre sınırı (dakika, isteğe bağlı)", timeLimitPlaceholder: "örn. 20",
      questionLanguage: "Soru dili", languageHint: "Varsayılan site dilidir. YZ soruları, seçenekleri ve açıklamaları bu dilde yazar.",
      generate: "Sınav oluştur", generateLoading: "Sınav oluşturuluyor (20–60sn sürebilir)…",
      disclaimer: "Sorular eğitim amaçlı YZ tarafından oluşturulur. Her zaman yetkili kaynaklarla doğrulayın.",
    },
  },
  ur: {
    dashboard: {
      welcome: "خوش آمدید، {name}", planSuffix: "پلان", freeTrial: "مفت آزمائش",
      activeUntil: "{date} تک فعال", generateNew: "نیا امتحان بنائیں",
      examsThisMonth: "اس مہینے کے امتحانات", remaining: "{n} باقی ہیں",
      examsCreated: "بنائے گئے امتحانات", completedShort: "{n} مکمل",
      averageScore: "اوسط اسکور", acrossCompleted: "مکمل امتحانات میں",
      recentExams: "حالیہ امتحانات", noExams: "ابھی تک کوئی امتحان نہیں۔", generateFirst: "اپنا پہلا امتحان بنائیں",
      status: { generating: "بنایا جا رہا ہے", ready: "تیار", inProgress: "جاری ہے", completed: "مکمل", failed: "ناکام" },
      guideHeadings: { FREE: "آغاز کریں", BASIC: "Basic سے بھرپور فائدہ اٹھائیں", PRO: "Pro نکات", PREMIUM: "Premium ٹولز" },
      guideTips: {
        FREE: ["امتحانی نوع منتخب کریں (USMLE، MRCS، MRCP، مصری فیلوشپ، Prometric…) تاکہ سوالات حقیقی امتحان سے میل کھائیں۔", "مفت آزمائش ماہانہ 1 امتحان، 10 سوالات تک ہے۔ Basic پر اپ گریڈ کرکے ماہانہ 15 امتحانات حاصل کریں۔", "سیکھنے کے لیے مشق موڈ استعمال کریں — ہر جواب کے بعد تشریحات ظاہر ہوتی ہیں۔"],
        BASIC: ["آپ کے پاس ماہانہ {monthlyExams} امتحانات ہیں۔ تخصصات میں تقسیم کریں یا ایک پر گہرا فوکس کریں۔", "حقیقی امتحان کی نقل کے لیے امتحان موڈ (ٹائمر آن) پر سوئچ کریں۔", "مزید چاہیے؟ Pro فائل اپ لوڈ شامل کرتا ہے — اپنے نوٹس سے سوالات بنائیں۔"],
        PRO: ["ماہانہ {monthlyExams} امتحانات، ہر ایک میں {maxQ} سوالات تک — روزانہ مشق کے لیے کافی۔", "فائل اپ لوڈ حد: ماہانہ {files} فائلیں (جلد آرہا ہے)۔", "ڈیش بورڈ پر اپنی کمزور چیزیں ٹریک کریں اور ان پر مرکوز امتحانات دوبارہ بنائیں۔"],
        PREMIUM: ["ماہانہ {monthlyExams} امتحانات حد سے زیادہ {maxQ} سوالات — بورڈ کی تیاری کے لیے مثالی۔", "ماہانہ {files} فائل اپ لوڈز (جلد)۔", "اعلیٰ تجزیات موضوع کے حساب سے درستگی اور تجویز کردہ نظر ثانی کے منصوبے دکھائیں گے (جلد)۔"],
      },
    },
    banner: {
      dismiss: "بند کریں",
      perPlan: {
        FREE: { title: "آپ مفت آزمائش پر ہیں — ماہانہ 1 امتحان", body: "Basic پر اپ گریڈ کریں — ماہانہ 15 امتحانات اور فی امتحان 25 سوالات (699 EGP/ماہ)۔", cta: "Basic پر اپ گریڈ" },
        BASIC: { title: "زیادہ یا طویل امتحانات چاہئیں؟", body: "Pro آپ کو ماہانہ 50 امتحانات، فی امتحان 30 سوالات اور فائل اپ لوڈ دیتا ہے (1,500 EGP/ماہ)۔", cta: "Pro پر اپ گریڈ" },
        PRO: { title: "اور بڑا چاہیے؟", body: "Premium ماہانہ 100 امتحانات، فی امتحان 40 سوالات اور 10 فائل اپ لوڈز کھولتا ہے (2,500 EGP/ماہ)۔", cta: "Premium پر اپ گریڈ" },
      },
    },
    newExam: {
      pageTitle: "نیا امتحان بنائیں", remainingLine: "{plan} پلان پر اس مہینے {limit} میں سے {remaining} سوالات باقی ہیں۔",
      bySpecialty: "تخصص کے لحاظ سے", byExam: "امتحان کی نوع کے لحاظ سے",
      specialty: "تخصص", topic: "موضوع", topicPlaceholder: "مثلاً پیر کے نیوروپیتھک السر کا بوجھ کم کرنا",
      exam: "امتحان", specialtyOptional: "تخصص (اختیاری)", topicOptional: "موضوع (اختیاری)",
      topicOptionalPlaceholder: "ملا جلا چاہیے تو خالی چھوڑیں", any: "کوئی بھی",
      difficulty: "مشکل",
      difficulties: { BEGINNER: "ابتدائی", STUDENT: "میڈیکل طالبعلم", INTERN: "انٹرن", RESIDENT: "ریزیڈنٹ", SPECIALIST: "اسپیشلسٹ", CONSULTANT: "کنسلٹنٹ", BOARD: "بورڈ امتحان" },
      mode: "موڈ", modePractice: "مشق (ٹائمر کے بغیر)", modeExam: "امتحان (ٹائمر کے ساتھ)",
      questionsMax: "سوالات (زیادہ سے زیادہ {n})", timeLimit: "وقت کی حد (منٹس، اختیاری)", timeLimitPlaceholder: "مثلاً 20",
      questionLanguage: "سوال کی زبان", languageHint: "پہلے سے سائٹ کی زبان۔ AI سوالات، اختیارات اور تشریحات اسی زبان میں لکھتا ہے۔",
      generate: "امتحان بنائیں", generateLoading: "امتحان بنایا جا رہا ہے (20–60 سیکنڈ لگ سکتے ہیں)…",
      disclaimer: "سوالات تعلیمی استعمال کے لیے AI سے بنائے گئے ہیں۔ ہمیشہ مستند ذرائع سے تصدیق کریں۔",
    },
  },
  fa: {
    dashboard: {
      welcome: "خوش آمدید، {name}", planSuffix: "پلن", freeTrial: "آزمایش رایگان",
      activeUntil: "فعال تا {date}", generateNew: "ایجاد آزمون",
      examsThisMonth: "آزمون‌های این ماه", remaining: "{n} باقی‌مانده",
      examsCreated: "آزمون‌های ساخته‌شده", completedShort: "{n} تکمیل‌شده",
      averageScore: "میانگین نمره", acrossCompleted: "در آزمون‌های تکمیل‌شده",
      recentExams: "آزمون‌های اخیر", noExams: "هنوز آزمونی نیست.", generateFirst: "اولین آزمون خود را بسازید",
      status: { generating: "در حال ساخت", ready: "آماده", inProgress: "در جریان", completed: "تکمیل‌شده", failed: "ناموفق" },
      guideHeadings: { FREE: "شروع به کار", BASIC: "بهره‌گیری از پلن پایه", PRO: "نکات حرفه‌ای", PREMIUM: "ابزارهای پریمیوم" },
      guideTips: {
        FREE: ["قالب آزمون را انتخاب کنید (USMLE، MRCS، MRCP، فلوشیپ مصری، Prometric…) تا سؤالات با آزمون واقعی شما هم‌خوان باشد.", "آزمایش رایگان ماهی ۱ آزمون با حداکثر ۱۰ سؤال است. به پایه ارتقا دهید تا ماهی ۱۵ آزمون داشته باشید.", "از حالت تمرین برای یادگیری استفاده کنید — توضیحات پس از هر پاسخ ظاهر می‌شوند."],
        BASIC: ["شما ماهی {monthlyExams} آزمون دارید. بین تخصص‌ها پخش کنید یا روی یکی متمرکز شوید.", "برای شبیه‌سازی شرایط واقعی، حالت آزمون (تایمر روشن) را انتخاب کنید.", "بیشتر می‌خواهید؟ پلن حرفه‌ای امکان آپلود فایل را اضافه می‌کند — از یادداشت‌های خود سؤال بسازید."],
        PRO: ["ماهی {monthlyExams} آزمون، تا {maxQ} سؤال در هر کدام — مناسب تمرین روزانه.", "سهمیهٔ آپلود فایل: ماهی {files} فایل (به‌زودی).", "موضوعات ضعیف خود را در داشبورد دنبال کنید و آزمون‌های هدفمند بسازید."],
        PREMIUM: ["ماهی {monthlyExams} آزمون، حداکثر {maxQ} سؤال — ایده‌آل برای آماده‌سازی بُرد.", "ماهی {files} آپلود فایل (به‌زودی).", "تحلیل پیشرفته دقت بر اساس موضوع و برنامه‌های مرور پیشنهادی را نشان می‌دهد (به‌زودی)."],
      },
    },
    banner: {
      dismiss: "بستن",
      perPlan: {
        FREE: { title: "شما در آزمایش رایگان هستید — ماهی ۱ آزمون", body: "به پلن پایه ارتقا دهید — ماهی ۱۵ آزمون و هر آزمون ۲۵ سؤال (۶۹۹ EGP/ماه).", cta: "ارتقا به پایه" },
        BASIC: { title: "آزمون‌های بیشتر یا طولانی‌تر می‌خواهید؟", body: "پلن حرفه‌ای ماهی ۵۰ آزمون، ۳۰ سؤال در هر آزمون و آپلود فایل به شما می‌دهد (۱٬۵۰۰ EGP/ماه).", cta: "ارتقا به حرفه‌ای" },
        PRO: { title: "می‌خواهید بزرگ‌تر شوید؟", body: "پلن پریمیوم ماهی ۱۰۰ آزمون، ۴۰ سؤال در هر آزمون و ۱۰ آپلود فایل را باز می‌کند (۲٬۵۰۰ EGP/ماه).", cta: "ارتقا به پریمیوم" },
      },
    },
    newExam: {
      pageTitle: "ساخت آزمون جدید", remainingLine: "این ماه در پلن {plan}، {remaining} از {limit} سؤال باقی مانده.",
      bySpecialty: "بر اساس تخصص", byExam: "بر اساس نوع آزمون",
      specialty: "تخصص", topic: "موضوع", topicPlaceholder: "مثال: کاهش فشار در زخم نوروپاتیک پیش‌پا",
      exam: "آزمون", specialtyOptional: "تخصص (اختیاری)", topicOptional: "موضوع (اختیاری)",
      topicOptionalPlaceholder: "برای ترکیبی خالی بگذارید", any: "هر",
      difficulty: "سطح سختی",
      difficulties: { BEGINNER: "مبتدی", STUDENT: "دانشجوی پزشکی", INTERN: "اینترن", RESIDENT: "رزیدنت", SPECIALIST: "متخصص", CONSULTANT: "مشاور", BOARD: "آزمون بُرد" },
      mode: "حالت", modePractice: "تمرین (بدون تایمر)", modeExam: "آزمون (با تایمر)",
      questionsMax: "تعداد سؤالات (حداکثر {n})", timeLimit: "محدودیت زمان (دقیقه، اختیاری)", timeLimitPlaceholder: "مثال: ۲۰",
      questionLanguage: "زبان سؤالات", languageHint: "پیش‌فرض زبان سایت است. هوش مصنوعی سؤالات، گزینه‌ها و توضیحات را به این زبان می‌نویسد.",
      generate: "ایجاد آزمون", generateLoading: "در حال ایجاد آزمون (۲۰ تا ۶۰ ثانیه طول می‌کشد)…",
      disclaimer: "سؤالات با هوش مصنوعی برای اهداف آموزشی تولید می‌شوند. همیشه با منابع معتبر بررسی کنید.",
    },
  },
};

const DICT: Record<Locale, Translations> = Object.fromEntries(
  LOCALES.map((l) => [l, {
    ...({ en, ar, fr, es, de, it, pt, tr, ur, fa } as Record<Locale, Omit<Translations, keyof Extras | "account" | "homeExtra">>)[l],
    ...EXTRAS[l],
    account: ACCOUNTS[l],
    homeExtra: HOME_EXTRAS[l],
  }])
) as Record<Locale, Translations>;

export function getTranslations(locale: Locale): Translations {
  return DICT[locale] ?? DICT.en;
}
