import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { type User } from "../../user.js";
import { ClientAPI, type CreateEventRequest, type SubmitScoreRequest } from "../api.js";

function createMockUser(): User {
  return {
    userId: "test-user",
    userLocale: "en-US",
    username: "testuser",
    isHost: false,
  };
}

describe("ClientAPI", () => {
  let api: ClientAPI;
  let mockUser: User;
  let fetchSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    mockUser = createMockUser();
    api = new ClientAPI("https://api.test.com", mockUser, "test-app");
    fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ data: { result: "success" } }),
      status: 200,
      statusText: "OK",
    } as Response) as ReturnType<typeof vi.spyOn>;
  });

  afterEach(() => {
    fetchSpy.mockRestore();
  });

  describe("constructor", () => {
    it("should remove trailing slash from base URL", () => {
      const apiWithSlash = new ClientAPI("https://api.test.com/", mockUser);
      expect((apiWithSlash as unknown as { baseUrl: string }).baseUrl).toBe("https://api.test.com");
    });
  });

  describe("setAuthToken", () => {
    it("should include Authorization header when auth token is set", async () => {
      api.setAuthToken("test-token");
      await api.getAppData("2025-07-01");

      expect(fetchSpy).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: "Bearer test-token",
          }),
        })
      );
    });
  });

  describe("setAppId", () => {
    it("should update the app ID", () => {
      const apiNoApp = new ClientAPI("https://api.test.com", mockUser);
      apiNoApp.setAppId("new-app");
      expect(() => apiNoApp.getAppData("2025-07-01")).not.toThrow();
    });
  });

  describe("getAppData", () => {
    it("should call the correct URL without key", async () => {
      await api.getAppData("2025-07-01");

      expect(fetchSpy).toHaveBeenCalledWith(
        "https://api.test.com/app-data/test-app/2025-07-01",
        expect.objectContaining({ method: "GET" })
      );
    });

    it("should call the correct URL with key", async () => {
      await api.getAppData("2025-07-01", "settings");

      expect(fetchSpy).toHaveBeenCalledWith(
        "https://api.test.com/app-data/test-app/2025-07-01/settings",
        expect.objectContaining({ method: "GET" })
      );
    });
  });

  describe("createEvent", () => {
    it("should POST to the events endpoint", async () => {
      const request: CreateEventRequest = {
        appId: "test-app",
        eventKey: "click",
        value: { x: 1, y: 2 },
      };

      await api.createEvent(request);

      expect(fetchSpy).toHaveBeenCalledWith(
        "https://api.test.com/events/test-app",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify(request),
        })
      );
    });
  });

  describe("getEvents", () => {
    it("should GET events for a specific day", async () => {
      await api.getEvents("2025-07-01");

      expect(fetchSpy).toHaveBeenCalledWith(
        "https://api.test.com/events/test-app/2025-07-01",
        expect.objectContaining({ method: "GET" })
      );
    });
  });

  describe("submitScore", () => {
    it("should POST to the leaderboard score endpoint", async () => {
      const request: SubmitScoreRequest = {
        score: 100,
        appData: { level: 5 },
      };

      await api.submitScore(request);

      expect(fetchSpy).toHaveBeenCalledWith(
        "https://api.test.com/leaderboard/score",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({ appId: "test-app", ...request }),
        })
      );
    });
  });

  describe("getLeaderboard", () => {
    it("should GET leaderboard with default type", async () => {
      await api.getLeaderboard();

      expect(fetchSpy).toHaveBeenCalledWith(
        "https://api.test.com/leaderboard/test-app?type=global",
        expect.objectContaining({ method: "GET" })
      );
    });

    it("should GET leaderboard with friends type", async () => {
      await api.getLeaderboard("friends");

      expect(fetchSpy).toHaveBeenCalledWith(
        "https://api.test.com/leaderboard/test-app?type=friends",
        expect.objectContaining({ method: "GET" })
      );
    });
  });

  describe("getI18nData", () => {
    it("should GET i18n data for a locale", async () => {
      await api.getI18nData("en-US");

      expect(fetchSpy).toHaveBeenCalledWith(
        "https://api.test.com/i18n/test-app/en-US",
        expect.objectContaining({ method: "GET" })
      );
    });
  });

  describe("error handling", () => {
    it("should throw on non-OK response", async () => {
      fetchSpy.mockResolvedValue({
        ok: false,
        status: 500,
        statusText: "Internal Server Error",
        json: () => Promise.resolve({}),
      } as Response);

      await expect(api.getAppData("2025-07-01")).rejects.toThrow("HTTP 500");
    });

    it("should throw on network error", async () => {
      fetchSpy.mockRejectedValue(new Error("Network error"));

      await expect(api.getAppData("2025-07-01")).rejects.toThrow("Network error");
    });
  });

  describe("getAppId", () => {
    it("should throw when app ID is not set", async () => {
      const apiNoApp = new ClientAPI("https://api.test.com", mockUser);
      await expect(apiNoApp.getAppData("2025-07-01")).rejects.toThrow("App ID not set");
    });
  });
});
