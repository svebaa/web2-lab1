require("dotenv").config({ quiet: true });

function loadConfig(env = process.env) {
    const baseURL = (env.BASE_URL || "http://localhost:3000").replace(
        /\/+$/,
        "",
    );
    const parsedURL = new URL(baseURL);
    if (parsedURL.pathname !== "/" || parsedURL.search || parsedURL.hash) {
        throw new Error(
            "BASE_URL mora biti osnovna adresa bez dodatne putanje.",
        );
    }
    const config = {
        port: Number(env.PORT || 3000),
        baseURL,
        databaseURL: env.DATABASE_URL,
        issuerBaseURL: env.AUTH0_ISSUER_BASE_URL?.replace(/\/+$/, ""),
        audience: env.AUTH0_AUDIENCE,
        clientID: env.AUTH0_CLIENT_ID,
        clientSecret: env.AUTH0_CLIENT_SECRET,
        sessionSecret: env.SESSION_SECRET,
        production: env.NODE_ENV === "production",
    };
    if (!config.databaseURL)
        throw new Error("Postavi DATABASE_URL u .env ili okruženju.");
    config.authConfigured = Boolean(
        config.issuerBaseURL &&
        config.audience &&
        config.clientID &&
        config.clientSecret &&
        config.sessionSecret,
    );
    if (config.authConfigured && config.sessionSecret.length < 32) {
        throw new Error("SESSION_SECRET mora imati najmanje 32 znaka.");
    }
    if (
        config.production &&
        (!config.authConfigured || parsedURL.protocol !== "https:")
    ) {
        throw new Error(
            "Produkcija zahtijeva sve Auth0 postavke i HTTPS BASE_URL.",
        );
    }
    return config;
}

module.exports = { loadConfig };
