export interface Message {
  role: "user" | "model";
  text: string;
}

export interface ChatHistoryItem {
  role: "user" | "model";
  parts: [{ text: string }];
}

export interface Appointment {
  id: string;
  patientName: string;
  treatment: string;
  date: string;
  time: string;
  status: "Pendiente" | "Confirmada" | "Cancelada";
  createdAt: string;
}
