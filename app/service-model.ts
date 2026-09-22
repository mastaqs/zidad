export type ServiceAnswer = string | number | string[];
export type ServiceAnswers = Record<string, ServiceAnswer>;

export type ServiceCondition = {
  field: string;
  equals?: string | number;
  anyOf?: Array<string | number>;
  gte?: number;
  lte?: number;
};

export type ServiceChoice = {
  id: string;
  label: string;
  description?: string;
  recommended?: boolean;
  quoteOnly?: boolean;
};

export type ServiceField = {
  id: string;
  type: 'choice' | 'multi-choice' | 'text' | 'textarea' | 'number' | 'date';
  label: string;
  hint?: string;
  placeholder?: string;
  optional?: boolean;
  choices?: ServiceChoice[];
  visibleWhen?: ServiceCondition[];
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
  defaultValue?: ServiceAnswer;
  minSelections?: number;
  maxSelections?: number;
  minDateOffset?: number;
  maxDateOffset?: number;
  attachedTo?: {
    field: string;
    choice: string;
  };
};

export type ServicePriceRule = {
  id: string;
  label: string;
  kind: 'execution' | 'external';
  amount?: number;
  displayAmount?: string;
  cadence?: 'شهريًا' | 'سنويًا' | 'مرة واحدة';
  when?: ServiceCondition[];
};

export type ProviderOffer = {
  id: string;
  name: string;
  role: string;
  priceDelta: number;
  days: number;
  rating: string;
  completed: number;
  badge?: string;
  supports?: ServiceCondition[];
};

export type ServiceWork = {
  id: string;
  title: string;
  image: string;
  providerId: string;
  provider: string;
  need: string;
  result: string;
  scope: string[];
  gallery?: string[];
};

export type ServiceConfiguration = {
  intro: string;
  fields: ServiceField[];
  priceRules?: ServicePriceRule[];
  quoteRules?: Array<{when: ServiceCondition[]}>;
  requirements?: string[];
  exclusions?: string[];
  works?: ServiceWork[];
};

export function conditionsMatch(answers: ServiceAnswers, conditions?: ServiceCondition[]) {
  if (!conditions?.length) return true;
  return conditions.every((condition) => {
    const answer = answers[condition.field];
    if (condition.equals !== undefined) return Array.isArray(answer) ? answer.includes(String(condition.equals)) : answer === condition.equals;
    if (condition.anyOf) return Array.isArray(answer) ? answer.some((item) => condition.anyOf?.includes(item)) : condition.anyOf.includes(answer as string | number);
    if (condition.gte !== undefined && Number(answer) < condition.gte) return false;
    if (condition.lte !== undefined && Number(answer) > condition.lte) return false;
    return hasAnswer(answer);
  });
}

export function hasAnswer(answer: ServiceAnswer | undefined) {
  if (Array.isArray(answer)) return answer.length > 0;
  if (typeof answer === 'number') return Number.isFinite(answer);
  return Boolean(answer?.trim());
}

export function getVisibleFields(configuration: ServiceConfiguration | undefined, answers: ServiceAnswers) {
  if (!configuration) return [];
  return configuration.fields.filter((field) => conditionsMatch(answers, field.visibleWhen));
}

export function cleanHiddenAnswers(configuration: ServiceConfiguration | undefined, answers: ServiceAnswers) {
  if (!configuration) return answers;
  let next = { ...answers };
  for (let pass = 0; pass < configuration.fields.length; pass += 1) {
    const visible = new Set(getVisibleFields(configuration, next).map((field) => field.id));
    const cleaned = Object.fromEntries(Object.entries(next).filter(([id]) => visible.has(id)));
    if (Object.keys(cleaned).length === Object.keys(next).length) break;
    next = cleaned;
  }
  return next;
}

export function getActivePriceRules(configuration: ServiceConfiguration | undefined, answers: ServiceAnswers) {
  return (configuration?.priceRules ?? []).filter((rule) => conditionsMatch(answers, rule.when));
}

export function getChoiceLabel(field: ServiceField, value: ServiceAnswer) {
  if (Array.isArray(value)) return value.map((item) => field.choices?.find((choice) => choice.id === item)?.label ?? item).join('، ');
  if (field.type === 'number') return `${value}${field.unit ? ` ${field.unit}` : ''}`;
  return field.choices?.find((choice) => choice.id === value)?.label ?? String(value);
}

export function summarizeAnswers(configuration: ServiceConfiguration | undefined, answers: ServiceAnswers) {
  return getVisibleFields(configuration, answers)
    .filter((field) => hasAnswer(answers[field.id]))
    .map((field) => `${field.label}: ${getChoiceLabel(field, answers[field.id])}`);
}

export function requiresCustomQuote(configuration: ServiceConfiguration | undefined, answers: ServiceAnswers) {
  return (configuration?.quoteRules ?? []).some((rule) => conditionsMatch(answers, rule.when));
}
