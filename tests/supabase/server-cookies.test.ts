import { describe, expect, it, vi } from "vitest";

vi.mock("next/headers", () => ({
  cookies: vi.fn(),
}));

vi.mock("@supabase/ssr", () => ({
  createServerClient: vi.fn((_url: string, _key: string, options: unknown) => options),
}));

describe("createClient — setAll cookie write", () => {
  it("não propaga exceção quando cookieStore.set falha (contexto de Server Component)", async () => {
    const { cookies } = await import("next/headers");
    const set = vi.fn(() => {
      throw new Error("Cookies can only be modified in a Server Action or Route Handler");
    });
    (cookies as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      getAll: vi.fn(() => []),
      set,
    });

    const { createClient } = await import("../../src/lib/supabase/server");
    const options = (await createClient()) as {
      cookies: { setAll: (cookies: { name: string; value: string; options: object }[]) => void };
    };

    expect(() =>
      options.cookies.setAll([{ name: "a", value: "1", options: {} }])
    ).not.toThrow();
    expect(set).toHaveBeenCalledTimes(1);
  });

  it("escreve cada cookie normalmente quando cookieStore.set funciona (Server Action/Route Handler)", async () => {
    const { cookies } = await import("next/headers");
    const set = vi.fn();
    (cookies as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      getAll: vi.fn(() => []),
      set,
    });

    const { createClient } = await import("../../src/lib/supabase/server");
    const options = (await createClient()) as {
      cookies: { setAll: (cookies: { name: string; value: string; options: object }[]) => void };
    };

    options.cookies.setAll([
      { name: "a", value: "1", options: {} },
      { name: "b", value: "2", options: {} },
    ]);

    expect(set).toHaveBeenCalledTimes(2);
    expect(set).toHaveBeenCalledWith("a", "1", {});
    expect(set).toHaveBeenCalledWith("b", "2", {});
  });
});
