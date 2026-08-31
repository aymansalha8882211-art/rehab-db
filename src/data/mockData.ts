export type Role = 'admin' | 'supervisor' | 'data_entry' | 'viewer' | 'nursing' | 'psychology' | 'physiotherapy';
// ─── Project registry ────────────────────────────────────────────────────────
// One entry per project. `forms` decides which session form and which
// assessment variant the project uses, so a new project inherits a whole
// workflow instead of needing its own branch in every page that renders it.
//
// To add a project: add a line here. Nothing else in the UI is hardcoded to a
// project name any more -- dropdowns, filters, charts and role assignment all
// read this list.
export interface ProjectDef {
  readonly code: string;
  readonly label: string;
  readonly badgeClass: string;
  /**
   * Which form set the project uses. Every project is on 'cbm' today; 'church'
   * stays supported because sessions recorded under the old Church form are
   * still in the database and still have to render.
   */
  readonly forms: 'cbm' | 'church';
  /** Inline CSS for printed reports, which render outside Tailwind. */
  readonly printStyle: string;
}

export const PROJECTS = [
  { code: 'CBM',    label: 'CBM',                     badgeClass: 'bg-blue-100 text-blue-700',       forms: 'cbm'   , printStyle: 'background:#dbeafe;color:#1e40af' },
  { code: 'Church', label: 'Church – Rehabilitation', badgeClass: 'bg-emerald-100 text-emerald-700', forms: 'cbm'   , printStyle: 'background:#d1fae5;color:#065f46' },
  { code: 'HelpAge', label: 'Help Age',                 badgeClass: 'bg-amber-100 text-amber-700',     forms: 'cbm'   , printStyle: 'background:#fef3c7;color:#92400e' },
  { code: 'Caritas', label: 'Caritas',                  badgeClass: 'bg-purple-100 text-purple-700',   forms: 'cbm'   , printStyle: 'background:#f3e8ff;color:#6b21a8' },
] as const satisfies readonly ProjectDef[];

export type ProjectCode = typeof PROJECTS[number]['code'];

export const PROJECT_CODES = PROJECTS.map(p => p.code) as [ProjectCode, ...ProjectCode[]];

/** Falls back to the first project so an unknown code renders rather than crashing. */
export function getProject(code: string | undefined | null) {
  return PROJECTS.find(p => p.code === code) ?? PROJECTS[0];
}
export type Gender = 'male' | 'female';
export type CaseStatus = 'open' | 'active' | 'closed' | 'inactive';
export type AlertType = 'follow_up_needed' | 'device_needed' | 'missing_data';
export type AlertPriority = 'high' | 'medium' | 'low';

// ─── Permissions ──────────────────────────────────────────────────────────────
export interface UserPermissions {
  canAddSession:       boolean;
  canEditSession:      boolean;
  canDeleteSession:    boolean;
  canAddBeneficiary:  boolean;
  canEditBeneficiary: boolean;
  canCloseCase:       boolean;
  canTransferCase:    boolean;
  canViewReports:     boolean;
  canViewStats:       boolean;
  canManageUsers:     boolean;
  allowedServiceTypes: string[];
}

export const DEFAULT_PERMISSIONS: Record<Role, UserPermissions> = {
  admin: {
    canAddSession: true, canEditSession: true, canDeleteSession: true,
    canAddBeneficiary: true, canEditBeneficiary: true,
    canCloseCase: true, canTransferCase: true,
    canViewReports: true, canViewStats: true, canManageUsers: true,
    allowedServiceTypes: [],
  },
  supervisor: {
    canAddSession: false, canEditSession: false, canDeleteSession: false,
    canAddBeneficiary: false, canEditBeneficiary: false,
    canCloseCase: false, canTransferCase: false,
    canViewReports: true, canViewStats: true, canManageUsers: false,
    allowedServiceTypes: [],
  },
  data_entry: {
    canAddSession: true, canEditSession: true, canDeleteSession: false,
    canAddBeneficiary: true, canEditBeneficiary: false,
    canCloseCase: false, canTransferCase: false,
    canViewReports: false, canViewStats: false, canManageUsers: false,
    allowedServiceTypes: [],
  },
  viewer: {
    canAddSession: false, canEditSession: false, canDeleteSession: false,
    canAddBeneficiary: false, canEditBeneficiary: false,
    canCloseCase: false, canTransferCase: false,
    canViewReports: false, canViewStats: false, canManageUsers: false,
    allowedServiceTypes: [],
  },
  nursing: {
    canAddSession: true, canEditSession: true, canDeleteSession: true,
    canAddBeneficiary: false, canEditBeneficiary: false,
    canCloseCase: false, canTransferCase: false,
    canViewReports: false, canViewStats: false, canManageUsers: false,
    allowedServiceTypes: ['تمريض'],
  },
  psychology: {
    canAddSession: true, canEditSession: true, canDeleteSession: true,
    canAddBeneficiary: false, canEditBeneficiary: false,
    canCloseCase: false, canTransferCase: false,
    canViewReports: false, canViewStats: false, canManageUsers: false,
    allowedServiceTypes: ['دعم نفسي'],
  },
  physiotherapy: {
    canAddSession: true, canEditSession: true, canDeleteSession: true,
    canAddBeneficiary: false, canEditBeneficiary: false,
    canCloseCase: false, canTransferCase: false,
    canViewReports: false, canViewStats: false, canManageUsers: false,
    allowedServiceTypes: ['علاج طبيعي', 'علاج وظيفي'],
  },
};

export const ROLE_LABELS: Record<Role, string> = {
  admin:          'مدير النظام',
  supervisor:     'مشرف',
  data_entry:     'مدخل بيانات',
  viewer:         'مشاهد',
  nursing:        'تمريض',
  psychology:     'دعم نفسي',
  physiotherapy:  'علاج طبيعي',
};

// ─── Shared Gaza Areas ────────────────────────────────────────────────────────
export const GAZA_AREAS = ['مدينة غزة', 'شمال غزة', 'الوسطى', 'خانيونس', 'رفح'] as const;
export type GazaArea = typeof GAZA_AREAS[number];

// ─── Shared Injury Types ──────────────────────────────────────────────────────
export const INJURY_TYPES = [
  'بتر طرف علوي', 'بتر طرف سفلي', 'إصابة عصبية', 'كسور معقدة',
  'اضطراب نفسي', 'تحديات سلوكية', 'إصابات متعددة', 'حروق', 'شلل', 'أخرى',
] as const;
export type InjuryType = typeof INJURY_TYPES[number];

// ─── CBM-specific ─────────────────────────────────────────────────────────────
export const BENEFICIARY_CLASSIFICATIONS = [
  'ذكر أكبر من 18 عام لا يعاني من إعاقة',
  'ذكر أكبر من 18 عام يعاني من إعاقة',
  'أنثى أكبر من 18 عام لا تعاني من إعاقة',
  'أنثى أكبر من 18 عام تعاني من إعاقة',
  'ذكر أقل من 18 عام لا يعاني من إعاقة',
  'ذكر أقل من 18 عام يعاني من إعاقة',
  'أنثى أقل من 18 عام تعاني من إعاقة',
  'أنثى أقل من 18 عام لا تعاني من إعاقة',
] as const;
export type BeneficiaryClassification = typeof BENEFICIARY_CLASSIFICATIONS[number];

export const CBM_SERVICE_TYPES = [
  'علاج طبيعي', 'علاج وظيفي', 'تمريض', 'دعم نفسي', 'توجيه أسري', 'أخرى',
] as const;

export const CBM_SERVICE_PROVIDERS = [
  'نور الدلو', 'دنيا عابد', 'نوال القرم', 'جيانا قاعود', 'أخرى',
] as const;

export const SESSION_NUMBERS = [
  '1', '2', '3', '4', '5', '6', '7', '8', '9', '10',
  '11', '12', '13', '14', '15', '16', '17', '18', '19', '20',
] as const;
export type SessionNumber = typeof SESSION_NUMBERS[number];

export const SESSION_DURATIONS = [
  'نصف ساعة', 'ساعة واحدة', 'ساعة ونصف', 'ساعتين', '3 ساعات', '4 ساعات', 'أخرى',
] as const;
export type SessionDuration = typeof SESSION_DURATIONS[number];

export const FAMILY_GUIDANCE_TOPICS = [
  'رعاية الطفل داخل المنزل', 'التعامل مع الإعاقة', 'الالتزام بالخطة العلاجية',
  'التعامل مع الإصابات داخل المنزل', 'العنف القائم على النوع الاجتماعي – GBV',
  'العنف القائم على الإعاقة – DBV', 'أخرى',
] as const;

export const FUNCTIONAL_STATUS = ['مستقر', 'تحسن نسبي', 'بحاجة لتدخل', 'حالة معقدة', 'أخرى'] as const;
export type FunctionalStatus = typeof FUNCTIONAL_STATUS[number];

export const SESSION_RESPONSE = ['تحسن ملحوظ', 'تحسن بسيط', 'بدون تحسن', 'تدهور'] as const;
export type SessionResponse = typeof SESSION_RESPONSE[number];

export const IMPROVEMENT_TYPES = ['الحركة', 'الاستقلالية', 'الألم', 'التكيف النفسي', 'أخرى'] as const;

export const TOTAL_SESSIONS_PLANNED = [
  'هذه الجلسة الأولى والأخيرة', 'جلستين', '3 جلسات', '4 جلسات',
  '5 جلسات أو أكثر', 'هذه الجلسة الأخيرة',
] as const;

export const CBM_NEXT_SESSION_SERVICES = [
  'لا يحتاج إلى تدخل الفريق', 'العلاج الطبيعي', 'العلاج الوظيفي',
  'التمريض', 'الدعم النفسي', 'التوجيه الأسري',
  'المصاب بحاجة إلى تحويل إلى جهة أخرى', 'أخرى',
] as const;

export const FAMILY_COOPERATION = ['جيد', 'متوسط', 'ضعيف'] as const;
export type FamilyCooperation = typeof FAMILY_COOPERATION[number];

// ─── Church-specific ──────────────────────────────────────────────────────────
export const CHURCH_SERVICE_TYPES = ['علاج طبيعي', 'تمريض', 'دعم نفسي'] as const;

export const CHURCH_SERVICE_PROVIDERS = [
  'مصطفى نعيم', 'غسان العيماوي', 'خالد حمودة', 'محمود أبو عمشة', 'محمود عابد',
  'محمود شمالي', 'آية أبو شرخ', 'مرفت أبو شدق', 'حنان أبو عيطة', 'محمد أبو ريالة',
  'مرام عبيد', 'شيماء البواب', 'رندة أبو ظاهر', 'يافا ساقاهلل', 'محمود صيام',
  'محمود فرج', 'حماد دردس', 'شيماء شبات', 'إيمان سعادة', 'مصطفى سمارة',
  'أمل فلفل', 'خديجة البطش',
] as const;

export const AGE_CLASSIFICATIONS = ['أقل من 18 سنة', 'أكبر من 18 سنة'] as const;
export type AgeClassification = typeof AGE_CLASSIFICATIONS[number];

export const WOUND_STATUS = [
  'سليم', 'الجرح مفتوح', 'الجرح مغلق', 'وجود التهاب',
  'وجود تورم', 'وجود نتوءات', 'وجود رقعة جراحية', 'تشوهات', 'أخرى',
] as const;

export const NURSING_INTERVENTIONS = [
  'لا يحتاج', 'غيار على الجرح', 'تنظيف المنطقة المحيطة بالجرح',
  'غرز جراحية', 'التثقيف الصحي', 'أخرى',
] as const;

export const PHYSIO_ASSESSMENT = [
  'ألم', 'ضعف في العضلات', 'قصور في الأوتار أو الأربطة', 'ندوبات جراحية',
  'قلة مدى حركة المفصل', 'شكل أو مكان البتر غير طبيعي',
  'الإحساس بوجود العضو المبتور', 'المشي غير طبيعي', 'لا يوجد أي أعراض', 'أخرى',
] as const;

export const CHURCH_NEXT_SESSION_SERVICES = [
  'العلاج الطبيعي', 'التمريض', 'الدعم النفسي',
  'لا يحتاج إلى تدخل الفريق', 'المصاب بحاجة إلى تحويل إلى جهة أخرى',
] as const;

// ─── Shared (both projects) ───────────────────────────────────────────────────
export const NEEDED_DEVICES = [
  'كرسي متحرك', 'عكاز كوع', 'عكاز ابط', 'Walker', 'طرف صناعي',
  'لا يحتاج أي أداة مساعدة', 'أخرى',
] as const;

export const PHYSIO_INTERVENTIONS = [
  'لا يحتاج تدخل', 'تخفيف الألم', 'تعزيز مستوى الإحساس', 'تقوية العضلات',
  'زيادة مدى الحركة للمفصل', 'تخفيف الندوبات الجراحية',
  'التدخل لتحسين شكل مكان البتر', 'أخرى',
] as const;

export const PHYSIO_MODALITIES = [
  'لا يحتاج تدخل', 'TENS', 'تمارين تقوية العضلات',
  'تمارين الطالة الأوتار والأربطة', 'التدرب على المشي الصحيح',
  'ICE packs', 'Therapand', 'أخرى',
] as const;

export const PSYCH_STATES = [
  'طبيعي', 'قلق', 'إنكار', 'انهيار', 'صراخ', 'صمت', 'نوبة بكاء', 'تبلد عاطفي', 'أخرى',
] as const;

export const TRAUMA_LEVELS = ['خفيفة', 'متوسطة', 'شديدة'] as const;
export type TraumaLevel = typeof TRAUMA_LEVELS[number];

export const PSYCH_INTERVENTIONS = [
  'لا يحتاج تدخل', 'استماع نشط', 'تهدئة وتطبيع المشاعر',
  'شرح طبيعة الحالة والأعراض', 'دعم أفراد الأسرة',
  'إحالة لمختص نفسي/اجتماعي', 'متابعة في الجلسة القادمة', 'أخرى',
] as const;

export const SERVICE_TYPES = [
  'علاج طبيعي', 'علاج وظيفي', 'تمريض', 'دعم نفسي', 'توجيه أسري', 'أخرى',
] as const;
export type ServiceType = typeof SERVICE_TYPES[number];

// ─── Assessment Constants (مطابقة للكوبو بالضبط) ────────────────────────────

// FIM - 6 مستويات حسب الكوبو
export const FIM_SCALE = [
  'Dependence',
  'Minimal Assistance',
  'Moderate',
  'Maximal',
  'Supervision',
  'Independence',
] as const;

// جانب البتر - مشترك
export const AMPUTATION_SIDES = ['Right', 'Left', 'Both'] as const;
export const AMPUTATION_SIDES_CHURCH = ['Right', 'Left', 'Both', 'Other'] as const;

// مستوى البتر - CBM
export const AMPUTATION_LEVELS_CBM = [
  'Above Knee', 'Below Knee', 'Above Elbow', 'Below Elbow',
  'Contralateral', 'Both upper limbs', 'Both lower limbs',
] as const;

// مستوى البتر - Church (فيه Disarticulation و Other إضافة)
export const AMPUTATION_LEVELS_CHURCH = [
  'Above Knee', 'Below Knee', 'Above Elbow', 'Below Elbow',
  'Contralateral', 'Both upper limbs', 'Both lower limbs',
  'Disarticulation', 'Other',
] as const;

// مستوى البتر - مشترك (Union)
export const AMPUTATION_LEVELS = [
  'Above Knee', 'Below Knee', 'Above Elbow', 'Below Elbow',
  'Contralateral', 'Both upper limbs', 'Both lower limbs',
  'Disarticulation', 'Other',
] as const;

// حالة الجذع - مشترك (مطابق للكوبو)
export const STUMP_CONDITIONS = [
  'No Problem',
  'Swelling / Edema',
  'Wound',
  'Infection',
  'Scars',
  'Skin & soft tissue Laceration',
  'Hotness',
  'Tenderness',
  'Phantom Limb Sensation',
  'Phantom Pain',
  'Other',
] as const;

// شكل الجذع - مشترك
export const STUMP_SHAPES = ['Cylindrical', 'Conical', 'Bulbous', 'Other'] as const;

// الأجهزة المساعدة المستخدمة حالياً
export const ASSISTIVE_TYPES = [
  'Wheel chair', 'Elbow Crutches', 'Axillary Crutches', 'Walker', 'Other',
] as const;

// الأجهزة المساعدة المطلوبة
export const ASSISTIVE_DEVICE_NEEDS = [
  'No Need', 'Wheel chair', 'Elbow Crutches', 'Axillary Crutches', 'Walker', 'Other',
] as const;

// وصف الألم - مطابق للكوبو
export const PAIN_DESCRIPTIONS = [
  'Pins & needles', 'Numbness', 'Burning', 'Other',
] as const;

// الخدمات المطلوبة - مطابق للكوبو
export const SERVICES_REQUIRED = [
  'Physiotherapy', 'Nursing', 'Psychosocial support',
  'Prosthesis', 'Referral', 'Assistive Devices', 'Others',
] as const;

// الأهداف قصيرة المدى - مطابق للكوبو
export const SHORT_TERM_GOALS = [
  'Stump care & Dressing',
  'Control Pain & Swelling',
  'Maintain/Increase Muscle Power',
  'Improve ROM',
  'Raise Awareness related to amputation issues',
  'Desensitization',
  'Enhance Psychological Status',
] as const;

// الأهداف طويلة المدى - مطابق للكوبو
export const LONG_TERM_GOALS = [
  'Rehabilitation for Prosthesis',
  'Rehabilitation for Normal Gait & ADLs',
  'Maintain good psychological status',
] as const;

// خطة العلاج - مطابق للكوبو
export const TREATMENT_PLAN = [
  'Cryotherapy', 'Strengthening Exercise', 'Stretching Exercise',
  'Positioning', 'Gait Training', 'Counseling',
] as const;

// التحسن منذ آخر زيارة - CBM (PHISP + PSS) و Church
export const IMPROVEMENT_STATUS = ['Improved', 'No change', 'Deteriorated', 'Discharge'] as const;
export const IMPROVEMENT_STATUS_CHURCH = ['Improved', 'No change', 'Deteriorated'] as const;

// الحالات الصحية - مشترك
export const HEALTH_CONDITIONS = [
  'Non', 'Cardiovascular Disease', 'Respiratory illness',
  'Hypertension', 'Diabetics', 'Cancer',
  'Loss of Weight at the last month', 'Signs of Malnutrition', 'Others',
] as const;

// نوع الإعاقة - CBM فقط
export const DISABILITY_TYPES_CBM = [
  'Physical (حركية)', 'Hearing (سمعية)', 'Visual (بصرية)',
  'Intellectual (ذهنية)', 'Other',
] as const;

// الإصابة الأخيرة - CBM فقط
export const INJURY_RECENT = [
  'نعم، إصابة خطيرة (تحتاج علاج مستمر)',
  'نعم، إصابة بسيطة (تعافى منها)',
  'نعم، إصابة بسيطة (لم يتعافى منها)',
  'لا',
] as const;

// العمل - Church فقط
export const JOB_STATUS = ['He works', 'Not working'] as const;

// العلاقة بالمستفيد - CBM فقط
export const RELATIONSHIPS = [
  'Father', 'Mother', 'Brother', 'Sister', 'Son', 'Daughter',
  'Husband', 'Wife', 'Uncle', 'Aunt', 'Grandfather', 'Grandmother',
  'Cousin', 'Guardian', 'Caregiver', 'Other',
] as const;

// مناطق الإقامة / النزوح
export const RESIDENCE_REGIONS = [
  'No Displacement', 'Gaza', 'North Gaza', 'Middle', 'Khan Younis', 'Rafah',
] as const;

export const DISPLACEMENT_CHARS = ['No Displacement', 'House', 'Shelter', 'Others'] as const;

// مجموعات الكوبو CBM
export const CBM_ASSESSMENT_GROUPS = [
  'grp_demographics',
  'Parents_care_Data',
  'grp_health',
  'grp_amputation',
  'grp_fim',
  'grp_edu',
  'grp_psych',
  'grp_goals',
  'disability_section',
  'sdq_section',
] as const;

export const CBM_ASSESSMENT_GROUPS_LABELS: Record<string, string> = {
  grp_demographics:   '1. بيانات المريض والموافقة',
  Parents_care_Data:  'بيانات ولي الأمر / مقدم الرعاية',
  grp_health:         '2. الصحة العامة',
  grp_amputation:     '3. تقييم البتر',
  grp_fim:            '4. مقياس الاستقلالية الوظيفية (FIM)',
  grp_edu:            '5. التثقيف الصحي',
  grp_psych:          '6. التقييم النفسي (GAD-7)',
  grp_goals:          '7. الأهداف وخطة التأهيل',
  disability_section: '8. الإعاقة والإصابات',
  sdq_section:        '9. مقياس SDQ للأطفال',
};

// توقيع الفريق - CBM
export const CBM_SIGNATURE = [
  'Jeyana Qaoud', 'Nour Al-Dalou', 'Nawal Al-Qarm',
  'Ibrahem Sendoqa', 'Waaed Amsha', 'Dunia Abed',
] as const;

// توقيع الفريق - Church
export const CHURCH_SIGNATURE = [
  'Amal Felfel', 'Aya Abu Shurkh', 'Eman Saada', 'Ghassan Al-Amawi',
  'Hamad Dardas', 'Hanan Eita', 'Khaled Hamouda', 'Khadija Batsh',
  'Mahmoud Abed', 'Mahmoud Abu Amsha', 'Mahmoud Al-Shamali', 'Mahmoud Farraj',
  'Mahmoud Sayam', 'Maram Obeid', 'Mervat Abushadek', 'Mohammad Abu Rayala',
  'Mostafa Samara', 'Mustafa Naeem', 'Randa Abu Zaher', 'Shaima Al-Bawab',
  'Shima Shabat', 'Yafa Saqallah', 'Hadi Emawi',
] as const;

// للتوافق مع الكود القديم
export const ASSESSMENT_GROUPS = ['Physiotherapy', 'Nursing', 'Psychosocial Support'] as const;
export const DISABILITY_TYPES = ['Hearing', 'Physical', 'Intellectual', 'Speech', 'Visual'] as const;

// ─── Attachment Type ──────────────────────────────────────────────────────────
export type AttachmentCategory = 'case' | 'session';
export type AttachmentFileType = 'image' | 'pdf' | 'document';

export interface Attachment {
  id: string;
  beneficiaryId: string;
  sessionId?: string;
  category: AttachmentCategory;
  fileName: string;
  fileType: AttachmentFileType;
  mimeType: string;
  sizeBytes: number;
  dataUrl: string;
  uploadedBy: string;
  uploadedByName: string;
  uploadedAt: string;
  notes?: string;
}

// ─── Entity Types ─────────────────────────────────────────────────────────────
export interface User {
  id: string;
  fullName: string;
  username: string;
  password: string;
  role: Role;
  projects: ProjectCode[];
  status: 'active' | 'inactive';
  permissions?: Partial<UserPermissions>;
  assignedStaff?: string[];
}

export interface RehabGoal {
  id: string;
  text: string;
  status: 'pending' | 'achieved' | 'cancelled';
  targetDate?: string;
  createdAt: string;
}

export interface Beneficiary {
  id: string;
  nationalId: string;
  fullName: string;
  gender: Gender;
  dateOfBirth: string;
  injuryDate: string;
  hasDisability: boolean;
  classification: BeneficiaryClassification;
  phone: string;
  alternativePhone: string;
  residenceArea: GazaArea;
  caregiverName: string;
  injuryType: InjuryType;
  disabilityDescription: string;
  generalNotes: string;
  createdBy: string;
  createdAt: string;
  project: ProjectCode;
  caseStatus: CaseStatus;
  registrationDate: string;
  closureReason?: string;
  closureDate?: string;
  closureNote?: string;
  goals?: RehabGoal[];
}

export interface Session {
  id: string;
  beneficiaryId: string;
  formType: 'CBM' | 'Church';
  serviceTypes: string[];
  serviceDate: string;
  serviceArea: GazaArea;
  exactLocation: string;
  providerName: string;
  injuryType: string;
  painLevel: number;
  availableDevices: string;
  neededDevices: string[];
  physioInterventions: string[];
  physioModalities: string[];
  psychState: string[];
  traumaLevel: string;
  psychInterventions: string[];
  psychNotes: string;
  nextSessionServices: string[];
  recommendations: string;
  createdBy: string;
  createdAt: string;
  sessionNumber?: string;
  sessionType?: 'علاج فردي' | 'توجيه أسري';
  functionalStatus?: string;
  familyGuidanceTopics?: string[];
  beneficiaryCount?: number;
  sessionDuration?: string;
  sessionResponse?: string;
  improvementTypes?: string[];
  familyCooperation?: string;
  totalSessionsPlanned?: string;
  referralMade?: boolean;
  referralDetails?: string;
  photoConsent?: boolean;
  protectionRisks?: boolean;
  gbvDbvReferral?: boolean;
  successStory?: boolean;
  successStoryText?: string;
  ageClassification?: string;
  woundStatus?: string[];
  nursingInterventions?: string[];
  physioAssessment?: string[];
  eventDescription?: string;
  beneficiaryChallenges?: string;
}

export interface Alert {
  id: string;
  beneficiaryId: string;
  alertType: AlertType;
  alertMessage: string;
  priority: AlertPriority;
  isResolved: boolean;
  resolvedBy?: string;
  resolvedAt?: string;
  createdAt: string;
  createdBy?: string;
  createdByName?: string;
  assignedToUserId?: string;
  assignedToUserName?: string;
}

// ─── Assessment Interface (مطابق للكوبو بالكامل) ─────────────────────────────
export interface Assessment {
  id: string;
  beneficiaryId: string;
  project: ProjectCode;
  assessmentDate: string;
  sessionNumber?: string;
  photoConsent?: boolean;

  // ── مشترك: الصحة العامة ──
  healthConditions?: string[];
  healthOther?: string;

  // ── مشترك: البتر ──
  amputationSide?: string;
  amputationOther?: string;       // Church فقط
  amputationDate?: string;
  hasProsthesis?: boolean;
  assistiveNow?: boolean;         // هل يستخدم أجهزة مساعدة؟
  assistiveTypes?: string[];      // نوع الأجهزة المستخدمة
  assistiveDeviceNeeds?: string[]; // الأجهزة المطلوبة
  assistiveDeviceSize?: string;   // مقاس الجهاز
  amputationLevel?: string[];
  amputationLevelOther?: string;
  amputationPart?: string;        // CBM فقط
  stumpCondition?: string[];
  stumpConditionOther?: string;
  stumpShape?: string;
  stumpShapeOther?: string;
  stumpCircumference?: number;

  // ── مشترك: الألم ──
  painPresent?: boolean;
  painLocation?: string;
  painDescription?: string[];
  painDescOther?: string;
  painIncreases?: string;
  painDecreases?: string;
  painScore?: number;

  // ── مشترك: العلاج الطبيعي ──
  jointRom?: string;
  romRestricted?: boolean;
  muscleTest?: string;
  musclePower?: number;
  balance?: boolean;

  // ── مشترك: FIM ──
  fimBedChair?: string;
  fimToilet?: string;
  fimTubShower?: string;
  fimWalkWheelchair?: string;
  fimStairs?: string;

  // ── مشترك: التثقيف الصحي ──
  eduAmputation?: boolean;
  eduInfectionPrevention?: boolean;
  eduDiet?: boolean;
  eduPhysiotherapy?: boolean;
  eduMobilityTransfer?: boolean;
  eduNeedMore?: boolean;
  eduTopicsNeeded?: string;

  // ── مشترك: GAD-7 ──
  gad1?: number; gad2?: number; gad3?: number; gad4?: number;
  gad5?: number; gad6?: number; gad7?: number;
  gadTotal?: number;

  // ── مشترك: المخرجات ──
  majorProblems?: string;
  servicesRequired?: string[];
  servicesReferral?: string;
  servicesOther?: string;
  shortTermGoals?: string[];
  longTermGoals?: string[];
  planOfTreatment?: string[];
  notes?: string;

  // ── CBM فقط: التحسن (PHISP + PSS منفصلان) ──
  groups?: string[];              // الأقسام المختارة في CBM
  improvementSinceLast?: string;  // PHISP
  improvementSinceLastPss?: string; // PSS
  dischargeDatePhisp?: string;
  dischargeDatePss?: string;
  signature?: string[];           // في النهاية للـ CBM

  // ── CBM فقط: قسم الإعاقة ──
  hasDisabilityAssess?: 'yes' | 'no';
  disabilityType?: string[];
  injuryRecent?: string;
  hasAmputation?: 'yes' | 'no';

  // ── CBM فقط: SDQ ──
  sdqQ1?: number;  sdqQ2?: number;  sdqQ3?: number;  sdqQ4?: number;  sdqQ5?: number;
  sdqQ6?: number;  sdqQ7?: number;  sdqQ8?: number;  sdqQ9?: number;  sdqQ10?: number;
  sdqQ11?: number; sdqQ12?: number; sdqQ13?: number; sdqQ14?: number; sdqQ15?: number;
  sdqQ16?: number; sdqQ17?: number; sdqQ18?: number; sdqQ19?: number; sdqQ20?: number;
  sdqQ21?: number; sdqQ22?: number; sdqQ23?: number; sdqQ24?: number; sdqQ25?: number;
  sdqTotal?: number;
  sdqEmotional?: number;
  sdqConduct?: number;
  sdqHyperactivity?: number;
  sdqPeer?: number;
  sdqProsocial?: number;
  sdqCategory?: string;

  // ── CBM فقط: بيانات ولي الأمر ──
  caregiverFirstName?: string;
  caregiverFathersName?: string;
  caregiverGrandfathersName?: string;
  caregiverFamilyName?: string;
  caregiverId?: string;
  caregiverMobile?: string;
  caregiverAltMobile?: string;
  caregiverRelationship?: string;
  caregiverRelationshipOther?: string;

  // ── CBM فقط: بيانات ديموغرافية إضافية ──
  origResidence?: string;
  currentDisplacement?: string;
  dispChar?: string;
  numDisplacements?: number;

  // ── Church فقط: التحسن (واحد فقط) ──
  improvementSinceLastChurch?: string;
  dischargeDateChurch?: string;
  signatureChurch?: string[];     // في النهاية للـ Church

  // ── Church فقط: العمل ──
  job?: string;

  // ── metadata ──
  createdBy: string;
  createdAt: string;
}

// ─── Mock Data ────────────────────────────────────────────────────────────────
export const mockUsers: User[] = [
  { id: 'u1', fullName: 'أيمن صالحة', username: 'admin', password: 'admin123', role: 'admin', projects: ['CBM', 'Church'], status: 'active' },
  { id: 'u2', fullName: 'نور الدلو', username: 'supervisor1', password: 'pass123', role: 'supervisor', projects: ['CBM'], status: 'active' },
  { id: 'u3', fullName: 'دنيا عابد', username: 'entry1', password: 'pass123', role: 'data_entry', projects: ['CBM'], status: 'active' },
  { id: 'u4', fullName: 'نوال القرم', username: 'entry2', password: 'pass123', role: 'data_entry', projects: ['Church'], status: 'active' },
  { id: 'u5', fullName: 'جيانا قاعود', username: 'viewer1', password: 'pass123', role: 'viewer', projects: ['CBM', 'Church'], status: 'active' },
];

export const mockBeneficiaries: Beneficiary[] = [
  {
    id: 'b1', nationalId: '1234567890', fullName: 'محمد عبدالله أبو ناصر',
    gender: 'male', dateOfBirth: '1985-03-15', injuryDate: '2023-10-20',
    hasDisability: true, classification: 'ذكر أكبر من 18 عام يعاني من إعاقة',
    phone: '0599123456', alternativePhone: '0598765432',
    residenceArea: 'خانيونس', caregiverName: 'أم محمد',
    injuryType: 'بتر طرف سفلي', disabilityDescription: 'بتر الطرف السفلي الأيسر تحت الركبة',
    generalNotes: 'يحتاج جلسات علاج طبيعي مكثفة وطرف صناعي',
    createdBy: 'u3', createdAt: '2024-01-10',
    project: 'CBM', caseStatus: 'active', registrationDate: '2024-01-10',
  },
  {
    id: 'b2', nationalId: '2345678901', fullName: 'فاطمة حسن الجمل',
    gender: 'female', dateOfBirth: '1992-07-22', injuryDate: '2023-11-05',
    hasDisability: true, classification: 'أنثى أكبر من 18 عام تعاني من إعاقة',
    phone: '0597234567', alternativePhone: '',
    residenceArea: 'رفح', caregiverName: 'أخوها علي',
    injuryType: 'شلل', disabilityDescription: 'شلل جزئي في الطرف العلوي الأيمن',
    generalNotes: 'تحتاج دعم نفسي مكثف وعلاج وظيفي',
    createdBy: 'u3', createdAt: '2024-01-15',
    project: 'CBM', caseStatus: 'active', registrationDate: '2024-01-15',
  },
  {
    id: 'b3', nationalId: '3456789012', fullName: 'خالد عمر أبو سالم',
    gender: 'male', dateOfBirth: '1978-11-08', injuryDate: '2024-01-03',
    hasDisability: false, classification: 'ذكر أكبر من 18 عام لا يعاني من إعاقة',
    phone: '0596345678', alternativePhone: '0595111222',
    residenceArea: 'مدينة غزة', caregiverName: 'زوجته',
    injuryType: 'كسور معقدة', disabilityDescription: 'كسر مركب في الساق اليمنى',
    generalNotes: '',
    createdBy: 'u4', createdAt: '2024-02-01',
    project: 'Church', caseStatus: 'active', registrationDate: '2024-02-01',
  },
  {
    id: 'b4', nationalId: '4567890123', fullName: 'لينا سعد أبو رمضان',
    gender: 'female', dateOfBirth: '2010-05-30', injuryDate: '2023-12-15',
    hasDisability: true, classification: 'أنثى أقل من 18 عام تعاني من إعاقة',
    phone: '0594456789', alternativePhone: '',
    residenceArea: 'الوسطى', caregiverName: 'والدها سعد',
    injuryType: 'إصابة عصبية', disabilityDescription: 'إصابة في العمود الفقري الرقبي',
    generalNotes: 'حالة تحتاج متابعة مستمرة ودعم أسري',
    createdBy: 'u3', createdAt: '2024-02-10',
    project: 'CBM', caseStatus: 'active', registrationDate: '2024-02-10',
  },
  {
    id: 'b5', nationalId: '5678901234', fullName: 'يوسف أحمد العسلي',
    gender: 'male', dateOfBirth: '1990-09-12', injuryDate: '2024-01-20',
    hasDisability: false, classification: 'ذكر أكبر من 18 عام لا يعاني من إعاقة',
    phone: '0593567890', alternativePhone: '0592999888',
    residenceArea: 'شمال غزة', caregiverName: 'أخوه',
    injuryType: 'بتر طرف علوي', disabilityDescription: 'بتر الطرف العلوي الأيمن فوق المرفق',
    generalNotes: '',
    createdBy: 'u4', createdAt: '2024-02-20',
    project: 'Church', caseStatus: 'active', registrationDate: '2024-02-20',
  },
  {
    id: 'b6', nationalId: '6789012345', fullName: 'ريم محمود الحجار',
    gender: 'female', dateOfBirth: '1975-01-25', injuryDate: '2023-10-30',
    hasDisability: false, classification: 'أنثى أكبر من 18 عام لا تعاني من إعاقة',
    phone: '0591678901', alternativePhone: '',
    residenceArea: 'خانيونس', caregiverName: 'ابنها',
    injuryType: 'حروق', disabilityDescription: 'حروق درجة ثانية في الوجه واليدين',
    generalNotes: 'تحسن ملحوظ، الجلسة الأخيرة',
    createdBy: 'u3', createdAt: '2024-03-05',
    project: 'CBM', caseStatus: 'closed', registrationDate: '2024-03-05',
  },
];

export const mockSessions: Session[] = [
  {
    id: 's1', beneficiaryId: 'b1', formType: 'CBM',
    sessionNumber: '1',
    serviceTypes: ['علاج طبيعي'],
    serviceDate: '2024-04-05', serviceArea: 'خانيونس',
    exactLocation: 'عيادة مخيم خانيونس',
    sessionType: 'علاج فردي', providerName: 'دنيا عابد',
    injuryType: 'بتر طرف سفلي', functionalStatus: 'بحاجة لتدخل',
    painLevel: 7, availableDevices: 'عكاز ابط',
    neededDevices: ['طرف صناعي'],
    physioInterventions: ['تقوية العضلات', 'التدخل لتحسين شكل مكان البتر'],
    physioModalities: ['تمارين تقوية العضلات', 'TENS'],
    psychState: [], traumaLevel: '', psychInterventions: [], psychNotes: '',
    familyGuidanceTopics: [], beneficiaryCount: 1,
    nextSessionServices: ['العلاج الطبيعي'], sessionDuration: 'ساعة واحدة',
    sessionResponse: 'تحسن بسيط', improvementTypes: [],
    familyCooperation: 'جيد', totalSessionsPlanned: '5 جلسات أو أكثر',
    referralMade: false, referralDetails: '',
    photoConsent: true, protectionRisks: false, gbvDbvReferral: false, successStory: false,
    recommendations: 'مواصلة الجلسات وتوفير الطرف الصناعي',
    createdBy: 'u3', createdAt: '2024-04-05',
  },
  {
    id: 's2', beneficiaryId: 'b1', formType: 'CBM',
    sessionNumber: '2',
    serviceTypes: ['علاج طبيعي'],
    serviceDate: '2024-04-12', serviceArea: 'خانيونس',
    exactLocation: 'خيمة المستفيد - مخيم خانيونس',
    sessionType: 'علاج فردي', providerName: 'دنيا عابد',
    injuryType: 'بتر طرف سفلي', functionalStatus: 'تحسن نسبي',
    painLevel: 5, availableDevices: 'عكاز ابط',
    neededDevices: ['طرف صناعي'],
    physioInterventions: ['تقوية العضلات', 'زيادة مدى الحركة للمفصل'],
    physioModalities: ['تمارين تقوية العضلات', 'تمارين الطالة الأوتار والأربطة'],
    psychState: [], traumaLevel: '', psychInterventions: [], psychNotes: '',
    familyGuidanceTopics: [], beneficiaryCount: 1,
    nextSessionServices: ['العلاج الطبيعي'], sessionDuration: 'ساعة واحدة',
    sessionResponse: 'تحسن ملحوظ', improvementTypes: ['الحركة', 'الألم'],
    familyCooperation: 'جيد', totalSessionsPlanned: '5 جلسات أو أكثر',
    referralMade: false, referralDetails: '',
    photoConsent: true, protectionRisks: false, gbvDbvReferral: false, successStory: false,
    recommendations: '',
    createdBy: 'u3', createdAt: '2024-04-12',
  },
  {
    id: 's3', beneficiaryId: 'b2', formType: 'CBM',
    sessionNumber: '1',
    serviceTypes: ['دعم نفسي', 'علاج وظيفي'],
    serviceDate: '2024-04-08', serviceArea: 'رفح',
    exactLocation: 'نقطة الخدمة – رفح',
    sessionType: 'علاج فردي', providerName: 'نوال القرم',
    injuryType: 'شلل', functionalStatus: 'بحاجة لتدخل',
    painLevel: 4, availableDevices: 'لا يوجد',
    neededDevices: ['كرسي متحرك'],
    physioInterventions: ['تعزيز مستوى الإحساس', 'تقوية العضلات'],
    physioModalities: ['Therapand', 'تمارين تقوية العضلات'],
    psychState: ['قلق', 'نوبة بكاء'], traumaLevel: 'شديدة',
    psychInterventions: ['استماع نشط', 'تهدئة وتطبيع المشاعر'],
    psychNotes: 'تحتاج متابعة مكثفة. استجابة جيدة للتدخل الأولي',
    familyGuidanceTopics: [], beneficiaryCount: 1,
    nextSessionServices: ['الدعم النفسي', 'العلاج الوظيفي'], sessionDuration: 'ساعة ونصف',
    sessionResponse: 'تحسن بسيط', improvementTypes: ['التكيف النفسي'],
    familyCooperation: 'متوسط', totalSessionsPlanned: '5 جلسات أو أكثر',
    referralMade: false, referralDetails: '',
    photoConsent: false, protectionRisks: false, gbvDbvReferral: false, successStory: false,
    recommendations: 'متابعة الجلسات أسبوعياً',
    createdBy: 'u4', createdAt: '2024-04-08',
  },
  {
    id: 's4', beneficiaryId: 'b3', formType: 'Church',
    serviceTypes: ['علاج طبيعي', 'تمريض'],
    serviceDate: '2024-04-10', serviceArea: 'مدينة غزة',
    exactLocation: 'مخيم الشاطئ - نقطة الخدمة',
    providerName: 'مصطفى نعيم',
    injuryType: 'كسور معقدة',
    painLevel: 6, availableDevices: 'لا يوجد',
    ageClassification: 'أكبر من 18 سنة',
    neededDevices: ['Walker'],
    woundStatus: ['الجرح مفتوح', 'وجود التهاب'],
    nursingInterventions: ['غيار على الجرح', 'تنظيف المنطقة المحيطة بالجرح'],
    physioAssessment: ['ألم', 'ضعف في العضلات', 'قلة مدى حركة المفصل'],
    physioInterventions: ['تخفيف الألم', 'تقوية العضلات'],
    physioModalities: ['TENS', 'تمارين تقوية العضلات'],
    psychState: [], traumaLevel: '', psychInterventions: [], psychNotes: '',
    eventDescription: '', beneficiaryChallenges: 'صعوبة في التنقل بسبب الجرح',
    nextSessionServices: ['العلاج الطبيعي', 'التمريض'],
    recommendations: 'متابعة الجرح وتغيير الضمادة يومياً',
    createdBy: 'u4', createdAt: '2024-04-10',
  },
  {
    id: 's5', beneficiaryId: 'b5', formType: 'Church',
    serviceTypes: ['دعم نفسي'],
    serviceDate: '2024-04-15', serviceArea: 'شمال غزة',
    exactLocation: 'عيادة جباليا',
    providerName: 'حنان أبو عيطة',
    injuryType: 'بتر طرف علوي',
    painLevel: 3, availableDevices: 'عكاز ابط',
    ageClassification: 'أكبر من 18 سنة',
    neededDevices: ['لا يحتاج أي أداة مساعدة'],
    woundStatus: [], nursingInterventions: [],
    physioAssessment: [],
    physioInterventions: [], physioModalities: [],
    psychState: ['قلق', 'إنكار'], traumaLevel: 'متوسطة',
    psychInterventions: ['استماع نشط', 'شرح طبيعة الحالة والأعراض'],
    psychNotes: 'المصاب يرفض الحديث عن الحادثة في البداية، تحسن تدريجي',
    eventDescription: 'فقد ذراعه أثناء غارة جوية، شهد وفاة أصدقائه',
    beneficiaryChallenges: 'صعوبة في التكيف مع فقدان الطرف، عزلة اجتماعية',
    nextSessionServices: ['الدعم النفسي'],
    recommendations: 'استمرار الجلسات النفسية الأسبوعية',
    createdBy: 'u4', createdAt: '2024-04-15',
  },
];

export const mockAlerts: Alert[] = [
  { id: 'a1', beneficiaryId: 'b2', alertType: 'device_needed', alertMessage: 'الحالة تحتاج كرسي متحرك ولم تستلمه بعد', priority: 'high', isResolved: false, createdAt: '2024-04-10' },
  { id: 'a2', beneficiaryId: 'b5', alertType: 'device_needed', alertMessage: 'الحالة تحتاج طرف صناعي علوي', priority: 'high', isResolved: false, createdAt: '2024-04-17' },
  { id: 'a3', beneficiaryId: 'b4', alertType: 'follow_up_needed', alertMessage: 'لم تتم زيارة الحالة منذ 14 يوماً', priority: 'medium', isResolved: false, createdAt: '2024-04-28' },
  { id: 'a5', beneficiaryId: 'b1', alertType: 'device_needed', alertMessage: 'الطرف الصناعي مطلوب منذ أكثر من شهر', priority: 'high', isResolved: false, createdAt: '2024-04-05' },
  { id: 'a6', beneficiaryId: 'b6', alertType: 'follow_up_needed', alertMessage: 'متابعة ما بعد الإغلاق', priority: 'low', isResolved: true, resolvedBy: 'أحمد سلحة', resolvedAt: '2024-04-20', createdAt: '2024-04-15' },
];