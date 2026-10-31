import { writeFile } from "node:fs/promises";

export async function getToken(
    authority: string,
    audience: string,
    clientId: string,
    clientSecret: string,
    scope: string,
): Promise<string> {
    const response = await fetch(new URL("/oauth/token", authority), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            grant_type: "client_credentials",
            audience,
            client_id: clientId,
            client_secret: clientSecret,
            scope,
        }),
    });
    if (!response.ok)
        throw new Error(
            `Dohvat tokena: HTTP ${response.status} ${response.statusText}`,
        );
    const data = (await response.json().catch(() => {
        throw new Error(
            `Dohvat tokena: HTTP ${response.status}, odgovor nije valjan JSON.`,
        );
    })) as { access_token?: unknown } | null;
    if (typeof data?.access_token !== "string" || !data.access_token) {
        throw new Error(
            `Dohvat tokena: HTTP ${response.status}, odgovor nema access_token.`,
        );
    }
    return data.access_token;
}

export async function issuePass(
    url: string,
    token: string,
    name: string,
    document: string,
): Promise<void> {
    const response = await fetch(url, {
        method: "POST",
        headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
        },
        body: JSON.stringify({ name, document }),
    });
    if (!response.ok)
        throw new Error(
            `Izdavanje propusnice: HTTP ${response.status} ${response.statusText}`,
        );
    const location = response.headers.get("Location");
    if (!location)
        throw new Error(
            `Izdavanje propusnice: HTTP ${response.status}, nema Location zaglavlja.`,
        );
    const id = new URL(location, url).pathname.split("/").pop();
    if (!id || !/^[a-zA-Z0-9_-]+$/.test(id)) {
        throw new Error(
            `Izdavanje propusnice: HTTP ${response.status}, neispravan identifikator u Location.`,
        );
    }
    if (
        response.headers.get("Content-Type")?.split(";")[0].trim() !==
        "image/png"
    ) {
        throw new Error(
            `Izdavanje propusnice: HTTP ${response.status}, odgovor nije image/png.`,
        );
    }
    const image = Buffer.from(await response.arrayBuffer());
    await writeFile(`${id}.png`, image);
}
