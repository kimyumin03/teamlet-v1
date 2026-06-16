// 인정·피드백(recognition) 모듈 타입 — 원본 packages/modules/src/recognition/index.ts 의 타입만 추출.
// 액션은 lib/actions/recognition.ts 에서 drizzle 로 구현.

export type RecognitionKindValue = "RECOGNITION" | "FEEDBACK";

export type ReceivedRecognition = {
  id: string;
  kind: RecognitionKindValue;
  message: string;
  senderName: string;
  isRead: boolean;
  createdAt: Date;
};
