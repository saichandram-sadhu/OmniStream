import { create } from "zustand";

interface UserState {
  sessionId: string | null;
  phoneNumber: string | null;
  setSessionId: (sessionId: string) => void;
  setPhoneNumber: (phone: string) => void;
  logout: () => void;
}

const SESSION_KEY = "tg_session_id";

export const useUserStore = create<UserState>((set, get) => ({
  sessionId: localStorage.getItem(SESSION_KEY),
  phoneNumber: null,
  setSessionId: (sessionId) => {
    localStorage.setItem(SESSION_KEY, sessionId);
    set({ sessionId });
  },
  setPhoneNumber: (phone) => set({ phoneNumber: phone }),
  logout: () => {
    const sessionId = get().sessionId;
    if (sessionId) {
      fetch("/api/telegram/session/logout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId }),
      }).catch(() => undefined);
    }
    localStorage.removeItem(SESSION_KEY);
    set({ sessionId: null, phoneNumber: null });
  },
}));
