import { inquiryDraftMockConfig, type InquiryDraftData, type InquiryFormData } from './reportConfig';

const draftStore = new Map<string, InquiryDraftData | null>();

if (inquiryDraftMockConfig.hasStoredDraftOnLoad) {
  draftStore.set(inquiryDraftMockConfig.mockUserKey, inquiryDraftMockConfig.seedDraft);
}

function delay(durationMs: number) {
  return new Promise<void>((resolve) => {
    window.setTimeout(resolve, durationMs);
  });
}

export async function getInquiryDraft(userKey: string) {
  await delay(inquiryDraftMockConfig.networkDelayMs);
  return draftStore.get(userKey) ?? null;
}

export async function saveInquiryDraft(userKey: string, draftData: InquiryDraftData) {
  await delay(inquiryDraftMockConfig.networkDelayMs);
  draftStore.set(userKey, draftData);
  return draftData;
}

export async function clearInquiryDraft(userKey: string) {
  await delay(inquiryDraftMockConfig.networkDelayMs / 2);
  draftStore.delete(userKey);
}

export async function submitInquiry(formData: InquiryFormData) {
  await delay(inquiryDraftMockConfig.networkDelayMs);
  return {
    ok: true,
    submittedAt: new Date().toISOString(),
    payload: formData,
  } as const;
}