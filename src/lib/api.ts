// artifacts/rehab-db/src/lib/api.ts
// طبقة الوصول للبيانات — Supabase
import { supabase } from './supabaseClient';
import type { Beneficiary, Session, User, Alert, Assessment } from '@/data/mockData';

// ─── Helpers ──────────────────────────────────────────────
function mapBeneficiary(row: any): Beneficiary {
  return {
    id:                    row.id,
    nationalId:            row.national_id,
    fullName:              row.full_name,
    gender:                row.gender,
    dateOfBirth:           row.date_of_birth,
    injuryDate:            row.injury_date,
    hasDisability:         row.has_disability,
    classification:        row.classification,
    phone:                 row.phone,
    alternativePhone:      row.alternative_phone,
    residenceArea:         row.residence_area,
    caregiverName:         row.caregiver_name,
    injuryType:            row.injury_type,
    disabilityDescription: row.disability_description,
    generalNotes:          row.general_notes,
    createdBy:             row.created_by,
    createdAt:             row.created_at,
    project:               row.project,
    caseStatus:            row.case_status,
    registrationDate:      row.registration_date,
    closureReason:         row.closure_reason,
    closureDate:           row.closure_date,
    closureNote:           row.closure_note,
  };
}

function mapSession(row: any): Session {
  return {
    id:                   row.id,
    beneficiaryId:        row.beneficiary_id,
    formType:             row.form_type,
    serviceTypes:         row.service_types || [],
    serviceDate:          row.service_date,
    serviceArea:          row.service_area,
    exactLocation:        row.exact_location,
    providerName:         row.provider_name,
    injuryType:           row.injury_type,
    painLevel:            row.pain_level,
    availableDevices:     row.available_devices,
    neededDevices:        row.needed_devices || [],
    physioInterventions:  row.physio_interventions || [],
    physioModalities:     row.physio_modalities || [],
    psychState:           row.psych_state || [],
    traumaLevel:          row.trauma_level,
    psychInterventions:   row.psych_interventions || [],
    psychNotes:           row.psych_notes,
    nextSessionServices:  row.next_session_services || [],
    recommendations:      row.recommendations,
    createdBy:            row.created_by,
    createdAt:            row.created_at,
    sessionNumber:        row.session_number,
    sessionType:          row.session_type,
    functionalStatus:     row.functional_status,
    familyGuidanceTopics: row.family_guidance_topics || [],
    beneficiaryCount:     row.beneficiary_count,
    sessionDuration:      row.session_duration,
    sessionResponse:      row.session_response,
    improvementTypes:     row.improvement_types || [],
    familyCooperation:    row.family_cooperation,
    totalSessionsPlanned: row.total_sessions_planned,
    referralMade:         row.referral_made,
    referralDetails:      row.referral_details,
    photoConsent:         row.photo_consent,
    protectionRisks:      row.protection_risks,
    gbvDbvReferral:       row.gbv_dbv_referral,
    ageClassification:    row.age_classification,
    woundStatus:          row.wound_status || [],
    nursingInterventions: row.nursing_interventions || [],
    physioAssessment:     row.physio_assessment || [],
    eventDescription:     row.event_description,
    beneficiaryChallenges:row.beneficiary_challenges,
  };
}

function mapUser(row: any): User {
  return {
    id:       row.id,
    fullName: row.full_name,
    username: row.username,
    password: row.password,
    role:     row.role,
    projects: row.projects || [],
    status:   row.status,
  };
}

function mapAlert(row: any): Alert {
  return {
    id:                  row.id,
    beneficiaryId:       row.beneficiary_id,
    alertType:           row.alert_type,
    alertMessage:        row.alert_message,
    priority:            row.priority,
    isResolved:          row.is_resolved,
    resolvedBy:          row.resolved_by,
    resolvedAt:          row.resolved_at,
    createdAt:           row.created_at,
    createdBy:           row.created_by,
    createdByName:       row.created_by_name,
    assignedToUserId:    row.assigned_to_user_id,
    assignedToUserName:  row.assigned_to_user_name,
  };
}

function mapAssessment(row: any): Assessment {
  return {
    id: row.id,
    beneficiaryId: row.beneficiary_id,
    project: row.project,
    assessmentDate: row.assessment_date,
    sessionNumber: row.session_number,
    groups: row.groups,
    photoConsent: row.photo_consent,
    amputationSide: row.amputation_side,
    amputationOther: row.amputation_other,
    amputationDate: row.amputation_date,
    hasProsthesis: row.has_prosthesis,
    amputationLevel: row.amputation_level,
    amputationPart: row.amputation_part,
    stumpCondition: row.stump_condition,
    stumpShape: row.stump_shape,
    stumpCircumference: row.stump_circumference,
    painPresent: row.pain_present,
    painLocation: row.pain_location,
    painDescription: row.pain_description,
    painDescOther: row.pain_desc_other,
    painIncreases: row.pain_increases,
    painDecreases: row.pain_decreases,
    painScore: row.pain_score,
    jointRom: row.joint_rom,
    romRestricted: row.rom_restricted,
    muscleTest: row.muscle_test,
    musclePower: row.muscle_power,
    balance: row.balance,
    fimBedChair: row.fim_bed_chair,
    fimToilet: row.fim_toilet,
    fimTubShower: row.fim_tub_shower,
    fimWalkWheelchair: row.fim_walk_wheelchair,
    fimStairs: row.fim_stairs,
    eduAmputation: row.edu_amputation,
    eduInfectionPrevention: row.edu_infection_prevention,
    eduDiet: row.edu_diet,
    eduPhysiotherapy: row.edu_physiotherapy,
    eduMobilityTransfer: row.edu_mobility_transfer,
    eduNeedMore: row.edu_need_more,
    eduTopicsNeeded: row.edu_topics_needed,
    gad1: row.gad1, gad2: row.gad2, gad3: row.gad3, gad4: row.gad4,
    gad5: row.gad5, gad6: row.gad6, gad7: row.gad7,
    gadTotal: row.gad_total,
    sdqQ1: row.sdq_q1, sdqQ2: row.sdq_q2, sdqQ3: row.sdq_q3, sdqQ4: row.sdq_q4, sdqQ5: row.sdq_q5,
    sdqQ6: row.sdq_q6, sdqQ7: row.sdq_q7, sdqQ8: row.sdq_q8, sdqQ9: row.sdq_q9, sdqQ10: row.sdq_q10,
    sdqQ11: row.sdq_q11, sdqQ12: row.sdq_q12, sdqQ13: row.sdq_q13, sdqQ14: row.sdq_q14, sdqQ15: row.sdq_q15,
    sdqQ16: row.sdq_q16, sdqQ17: row.sdq_q17, sdqQ18: row.sdq_q18, sdqQ19: row.sdq_q19, sdqQ20: row.sdq_q20,
    sdqQ21: row.sdq_q21, sdqQ22: row.sdq_q22, sdqQ23: row.sdq_q23, sdqQ24: row.sdq_q24, sdqQ25: row.sdq_q25,
    sdqTotal: row.sdq_total,
    sdqCategory: row.sdq_category,
    majorProblems: row.major_problems,
    servicesRequired: row.services_required,
    servicesReferral: row.services_referral,
    servicesOther: row.services_other,
    shortTermGoals: row.short_term_goals,
    longTermGoals: row.long_term_goals,
    planOfTreatment: row.plan_of_treatment,
    improvementSinceLast: row.improvement_since_last,
    improvementSinceLastPss: row.improvement_since_last_pss,
    dischargeDate: row.discharge_date,
    notes: row.notes,
    signature: row.signature,
    createdBy: row.created_by,
    createdAt: row.created_at,
  };
}

function beneficiaryToRow(b: Beneficiary) {
  return {
    id:                    b.id,
    national_id:           b.nationalId,
    full_name:             b.fullName,
    gender:                b.gender,
    date_of_birth:         b.dateOfBirth,
    injury_date:           b.injuryDate,
    has_disability:        b.hasDisability,
    classification:        b.classification,
    phone:                 b.phone,
    alternative_phone:     b.alternativePhone,
    residence_area:        b.residenceArea,
    caregiver_name:        b.caregiverName,
    injury_type:           b.injuryType,
    disability_description:b.disabilityDescription,
    general_notes:         b.generalNotes,
    created_by:            b.createdBy,
    created_at:            b.createdAt,
    project:               b.project,
    case_status:           b.caseStatus,
    registration_date:     b.registrationDate,
    closure_reason:        b.closureReason,
    closure_date:          b.closureDate,
    closure_note:          b.closureNote,
  };
}

function sessionToRow(s: Session) {
  return {
    id:                    s.id,
    beneficiary_id:        s.beneficiaryId,
    form_type:             s.formType,
    service_types:         s.serviceTypes,
    service_date:          s.serviceDate,
    service_area:          s.serviceArea,
    exact_location:        s.exactLocation,
    provider_name:         s.providerName,
    injury_type:           s.injuryType,
    pain_level:            s.painLevel,
    available_devices:     s.availableDevices,
    needed_devices:        s.neededDevices,
    physio_interventions:  s.physioInterventions,
    physio_modalities:     s.physioModalities,
    psych_state:           s.psychState,
    trauma_level:          s.traumaLevel,
    psych_interventions:   s.psychInterventions,
    psych_notes:           s.psychNotes,
    next_session_services: s.nextSessionServices,
    recommendations:       s.recommendations,
    created_by:            s.createdBy,
    created_at:            s.createdAt,
    session_number:        s.sessionNumber,
    session_type:          s.sessionType,
    functional_status:     s.functionalStatus,
    family_guidance_topics:s.familyGuidanceTopics,
    beneficiary_count:     s.beneficiaryCount,
    session_duration:      s.sessionDuration,
    session_response:      s.sessionResponse,
    improvement_types:     s.improvementTypes,
    family_cooperation:    s.familyCooperation,
    total_sessions_planned:s.totalSessionsPlanned,
    referral_made:         s.referralMade,
    referral_details:      s.referralDetails,
    photo_consent:         s.photoConsent,
    protection_risks:      s.protectionRisks,
    gbv_dbv_referral:      s.gbvDbvReferral,
    age_classification:    s.ageClassification,
    wound_status:          s.woundStatus,
    nursing_interventions: s.nursingInterventions,
    physio_assessment:     s.physioAssessment,
    event_description:     s.eventDescription,
    beneficiary_challenges:s.beneficiaryChallenges,
  };
}

function alertToRow(a: Alert) {
  return {
    id:                   a.id,
    beneficiary_id:       a.beneficiaryId,
    alert_type:           a.alertType,
    alert_message:        a.alertMessage,
    priority:             a.priority,
    is_resolved:          a.isResolved,
    resolved_by:          a.resolvedBy,
    resolved_at:          a.resolvedAt,
    created_at:           a.createdAt,
    created_by:           a.createdBy,
    created_by_name:      a.createdByName,
    assigned_to_user_id:  a.assignedToUserId,
    assigned_to_user_name:a.assignedToUserName,
  };
}

function assessmentToRow(a: Assessment) {
  return {
    id: a.id, beneficiary_id: a.beneficiaryId, project: a.project,
    assessment_date: a.assessmentDate, session_number: a.sessionNumber,
    groups: a.groups, photo_consent: a.photoConsent,
    amputation_side: a.amputationSide, amputation_other: a.amputationOther,
    amputation_date: a.amputationDate, has_prosthesis: a.hasProsthesis,
    amputation_level: a.amputationLevel, amputation_part: a.amputationPart,
    stump_condition: a.stumpCondition, stump_shape: a.stumpShape,
    stump_circumference: a.stumpCircumference,
    pain_present: a.painPresent, pain_location: a.painLocation,
    pain_description: a.painDescription, pain_desc_other: a.painDescOther,
    pain_increases: a.painIncreases, pain_decreases: a.painDecreases,
    pain_score: a.painScore,
    joint_rom: a.jointRom, rom_restricted: a.romRestricted,
    muscle_test: a.muscleTest, muscle_power: a.musclePower, balance: a.balance,
    fim_bed_chair: a.fimBedChair, fim_toilet: a.fimToilet,
    fim_tub_shower: a.fimTubShower, fim_walk_wheelchair: a.fimWalkWheelchair,
    fim_stairs: a.fimStairs,
    edu_amputation: a.eduAmputation, edu_infection_prevention: a.eduInfectionPrevention,
    edu_diet: a.eduDiet, edu_physiotherapy: a.eduPhysiotherapy,
    edu_mobility_transfer: a.eduMobilityTransfer, edu_need_more: a.eduNeedMore,
    edu_topics_needed: a.eduTopicsNeeded,
    gad1: a.gad1, gad2: a.gad2, gad3: a.gad3, gad4: a.gad4,
    gad5: a.gad5, gad6: a.gad6, gad7: a.gad7, gad_total: a.gadTotal,
    sdq_q1: a.sdqQ1, sdq_q2: a.sdqQ2, sdq_q3: a.sdqQ3, sdq_q4: a.sdqQ4, sdq_q5: a.sdqQ5,
    sdq_q6: a.sdqQ6, sdq_q7: a.sdqQ7, sdq_q8: a.sdqQ8, sdq_q9: a.sdqQ9, sdq_q10: a.sdqQ10,
    sdq_q11: a.sdqQ11, sdq_q12: a.sdqQ12, sdq_q13: a.sdqQ13, sdq_q14: a.sdqQ14, sdq_q15: a.sdqQ15,
    sdq_q16: a.sdqQ16, sdq_q17: a.sdqQ17, sdq_q18: a.sdqQ18, sdq_q19: a.sdqQ19, sdq_q20: a.sdqQ20,
    sdq_q21: a.sdqQ21, sdq_q22: a.sdqQ22, sdq_q23: a.sdqQ23, sdq_q24: a.sdqQ24, sdq_q25: a.sdqQ25,
    sdq_total: a.sdqTotal, sdq_category: a.sdqCategory,
    major_problems: a.majorProblems, services_required: a.servicesRequired,
    services_referral: a.servicesReferral, services_other: a.servicesOther,
    short_term_goals: a.shortTermGoals, long_term_goals: a.longTermGoals,
    plan_of_treatment: a.planOfTreatment,
    improvement_since_last: a.improvementSinceLast,
    improvement_since_last_pss: a.improvementSinceLastPss,
    discharge_date: a.dischargeDate, notes: a.notes, signature: a.signature,
    created_by: a.createdBy, created_at: a.createdAt,
  };
}

// ─── Maintenance ─────────────────────────────────────────
export async function getMaintenanceStatus(): Promise<{ enabled: boolean; message: string }> {
  try {
    const { data, error } = await supabase
      .from('settings')
      .select('key, value')
      .in('key', ['maintenance_mode', 'maintenance_message']);
    if (error || !data) return { enabled: false, message: 'الموقع تحت الصيانة، يرجى المحاولة لاحقاً.' };
    const mode = data.find(r => r.key === 'maintenance_mode')?.value;
    const msg  = data.find(r => r.key === 'maintenance_message')?.value ?? 'الموقع تحت الصيانة، يرجى المحاولة لاحقاً.';
    return { enabled: mode === 'true', message: msg };
  } catch {
    return { enabled: false, message: 'الموقع تحت الصيانة، يرجى المحاولة لاحقاً.' };
  }
}

export async function loginWithEdgeFunction(username: string, password: string) {
  const { data, error } = await supabase.functions.invoke('hyper-action', {
    body: { username, password }
  });
  
  // لو فيه error من الشبكة
  if (error) {
    // حاول تقرأ الرسالة من الـ context
    const msg = (error as any)?.context?.error || (error as any)?.message || '';
    if (msg) throw new Error(msg);
    throw new Error('فشل تسجيل الدخول');
  }
  
  // لو الـ response فيه error (403 معطّل)
  if (data?.error) throw new Error(data.error);
  if (!data?.user) throw new Error('فشل تسجيل الدخول');
  
  return { token: data.token, user: data.user };
}

// ─── Main API ─────────────────────────────────────────────
export const api = {
  // ── Beneficiaries
  async getBeneficiaries(): Promise<Beneficiary[]> {
    const { data, error } = await supabase.from('beneficiaries').select('*').order('registration_date', { ascending: false });
    if (error) throw error;
    return (data || []).map(mapBeneficiary);
  },
  async addBeneficiary(b: Beneficiary): Promise<void> {
    const { error } = await supabase.from('beneficiaries').insert(beneficiaryToRow(b));
    if (error) throw error;
  },
  async updateBeneficiary(b: Beneficiary): Promise<void> {
    const { error } = await supabase.from('beneficiaries').update(beneficiaryToRow(b)).eq('id', b.id);
    if (error) throw error;
  },
  async deleteBeneficiary(id: string): Promise<void> {
    const { error } = await supabase.from('beneficiaries').delete().eq('id', id);
    if (error) throw error;
  },

  // ── Sessions
  async getSessions(): Promise<Session[]> {
    const { data, error } = await supabase.from('sessions').select('*').order('service_date', { ascending: false });
    if (error) throw error;
    return (data || []).map(mapSession);
  },
  async addSession(s: Session): Promise<void> {
    const { error } = await supabase.from('sessions').insert(sessionToRow(s));
    if (error) throw error;
  },
  async updateSession(s: Session): Promise<void> {
    const { error } = await supabase.from('sessions').update(sessionToRow(s)).eq('id', s.id);
    if (error) throw error;
  },
  async deleteSession(id: string): Promise<void> {
    const { error } = await supabase.from('sessions').delete().eq('id', id);
    if (error) throw error;
  },

  // ── Assessments
  async getAssessments(beneficiaryId: string): Promise<Assessment[]> {
    const { data, error } = await supabase
      .from('assessments').select('*')
      .eq('beneficiary_id', beneficiaryId)
      .order('assessment_date', { ascending: false });
    if (error) throw error;
    return (data || []).map(mapAssessment);
  },
  async addAssessment(a: Assessment): Promise<void> {
    const { error } = await supabase.from('assessments').insert(assessmentToRow(a));
    if (error) throw error;
  },
  async updateAssessment(a: Assessment): Promise<void> {
    const { error } = await supabase.from('assessments').update(assessmentToRow(a)).eq('id', a.id);
    if (error) throw error;
  },
  async deleteAssessment(id: string): Promise<void> {
    const { error } = await supabase.from('assessments').delete().eq('id', id);
    if (error) throw error;
  },

  // ── Users
  async getUsers(): Promise<User[]> {
    const { data, error } = await supabase.from('users').select('*');
    if (error) throw error;
    return (data || []).map(mapUser);
  },
  async addUser(u: User): Promise<void> {
    const { error } = await supabase.from('users').insert({
      id: u.id, full_name: u.fullName, username: u.username,
      password: u.password, role: u.role, projects: u.projects, status: u.status,
    });
    if (error) throw error;
  },
  async updateUser(u: User): Promise<void> {
    const { error } = await supabase.from('users').update({
      full_name: u.fullName, username: u.username, password: u.password,
      role: u.role, projects: u.projects, status: u.status,
    }).eq('id', u.id);
    if (error) throw error;
  },
  async deleteUser(id: string): Promise<void> {
    const { error } = await supabase.from('users').delete().eq('id', id);
    if (error) throw error;
  },

  // ── Alerts
  async getAlerts(): Promise<Alert[]> {
    const { data, error } = await supabase.from('alerts').select('*').order('created_at', { ascending: false });
    if (error) throw error;
    return (data || []).map(mapAlert);
  },
  async addAlert(a: Alert): Promise<void> {
    const { error } = await supabase.from('alerts').insert(alertToRow(a));
    if (error) throw error;
  },
  async updateAlert(a: Alert): Promise<void> {
    const { error } = await supabase.from('alerts').update(alertToRow(a)).eq('id', a.id);
    if (error) throw error;
  },
  async resolveAlert(id: string, resolvedBy: string): Promise<void> {
    const { error } = await supabase.from('alerts').update({
      is_resolved: true,
      resolved_by: resolvedBy,
      resolved_at: new Date().toISOString().split('T')[0],
    }).eq('id', id);
    if (error) throw error;
  },

  // ── تحقق من وجود تنبيه تلقائي لحالة معينة
  async checkAutoAlert(beneficiaryId: string): Promise<boolean> {
    const { data } = await supabase
      .from('alerts')
      .select('id')
      .eq('beneficiary_id', beneficiaryId)
      .eq('alert_type', 'follow_up_needed')
      .eq('is_resolved', false)
      .eq('created_by', 'system')
      .limit(1);
    return (data?.length ?? 0) > 0;
  },
};

export function setToken(token: string) {
  localStorage.setItem('token', token);
}

export function clearToken() {
  localStorage.removeItem('token');
}