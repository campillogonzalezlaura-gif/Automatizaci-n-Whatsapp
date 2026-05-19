export interface Message {
  role: "user" | "model";
  text: string;
}

export interface ChatHistoryItem {
  role: "user" | "model";
  parts: [{ text: string }];
}
