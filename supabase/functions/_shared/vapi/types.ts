export interface VapiWebhookPayload {
  message?: {
    type?: string;
    call?: {
      id: string;
      customer?: {
        number?: string;
      };
      status?: string;
      endedReason?: string;
    };
    endedReason?: string;
    transcript?: string;
    summary?: string;
    structuredData?: {
      name?: string;
      whatsapp?: string;
      idea_description?: string;
      problem_solving?: string;
      target_customer?: string;
      stage?: string;
      excitement_reason?: string;
      background?: string;
      core_skills?: string[];
      previous_founder?: boolean;
      superpower?: string;
      weaknesses_blindspots?: string[];
      timeline_start?: string;
      urgency_level?: string;
      seeking_skills?: string[];
      cofounder_type?: string;
      location_preference?: string;
      commitment_level?: string;
      working_style?: string;
      non_negotiables?: string[];
      deal_breakers?: string[];
      equity_thoughts?: string;
      seriousness_score?: number;
      match_frequency_preference?: string;
      success_criteria?: string;
      willingness_to_pay?: string;
    };
  };
}
