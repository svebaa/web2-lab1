const express = require("express");
const helmet = require("helmet");
const path = require("node:path");
const { randomUUID } = require("node:crypto");
const { auth: oidcAuth, requiresAuth } = require("express-openid-connect");
const {
    auth: bearerAuth,
    requiredScopes,
} = require("express-oauth2-jwt-bearer");
const QRCode = require("qrcode");

function createApp(config, repository) {
    const app = express();
    app.disable("x-powered-by");
    if (config.production) app.set("trust proxy", 1);
    app.set("view engine", "ejs");
    app.set("views", path.join(__dirname, "../views"));
    app.use(helmet({ strictTransportSecurity: config.production }));
    app.use("/assets", express.static(path.join(__dirname, "../public")));

    app.get("/health", async (req, res) => {
        await repository.health();
        res.json({ status: "ok" });
    });

    const unavailable = (req, res) =>
        res.status(503).render("error", {
            title: "Prijava nije dostupna",
            message: "Prijava i zaštićene radnje trenutačno nisu dostupne.",
        });
    let checkToken = unavailable;
    let checkUser = unavailable;
    if (config.authConfigured) {
        app.use(
            oidcAuth({
                authRequired: false,
                auth0Logout: true,
                issuerBaseURL: config.issuerBaseURL,
                baseURL: config.baseURL,
                clientID: config.clientID,
                clientSecret: config.clientSecret,
                secret: config.sessionSecret,
                authorizationParams: {
                    response_type: "code",
                    scope: "openid profile email",
                },
                session: {
                    cookie: { secure: config.production, sameSite: "Lax" },
                },
            }),
        );
        checkToken = bearerAuth({
            issuerBaseURL: config.issuerBaseURL,
            audience: config.audience,
            tokenSigningAlg: "RS256",
        });
        checkUser = requiresAuth();
    } else {
        app.get(["/login", "/logout", "/callback"], unavailable);
    }

    app.use((req, res, next) => {
        res.locals.authConfigured = config.authConfigured;
        res.locals.user = req.oidc?.isAuthenticated() ? req.oidc.user : null;
        res.locals.formatDate = (date) =>
            new Intl.DateTimeFormat("hr-HR", {
                dateStyle: "medium",
                timeStyle: "short",
                timeZone: "Europe/Zagreb",
            }).format(new Date(date));
        next();
    });

    app.get("/", async (req, res) => {
        res.set("Cache-Control", "no-store");
        res.render("home", { counts: await repository.counts() });
    });

    app.get("/info/:id", async (req, res) => {
        const pass = await repository.find(req.params.id);
        if (!pass)
            return res.status(404).render("error", {
                title: "Propusnica nije pronađena",
                message: "Tražena propusnica ne postoji ili je obrisana.",
            });
        res.set("Cache-Control", "no-store");
        res.render("pass", { pass });
    });

    app.get(
        "/passes/:id",
        checkToken,
        requiredScopes("read:passes"),
        async (req, res) => {
            const pass = await repository.find(req.params.id);
            if (!pass)
                return res
                    .status(404)
                    .json({ error: "Propusnica nije pronađena." });
            res.set("Cache-Control", "no-store").json(pass);
        },
    );

    app.post(
        "/passes",
        checkToken,
        requiredScopes("create:passes"),
        express.json({ limit: "16kb" }),
        async (req, res) => {
            const { name, document } = req.body || {};
            if (
                typeof name !== "string" ||
                typeof document !== "string" ||
                !name.trim() ||
                !document.trim()
            ) {
                return res.status(400).json({
                    error: "Polja name i document moraju biti neprazni tekstovi.",
                });
            }
            const id = randomUUID();
            const image = await QRCode.toBuffer(
                `${config.baseURL}/info/${id}`,
                { type: "png", width: 400 },
            );
            await repository.create(id, name, document);
            res.status(201)
                .location(`${config.baseURL}/passes/${id}`)
                .set("Cache-Control", "no-store")
                .type("png")
                .send(image);
        },
    );

    app.get("/manage", checkUser, async (req, res) => {
        res.set("Cache-Control", "no-store");
        res.render("manage", {
            passes: await repository.list(),
        });
    });
    for (const action of ["cancel", "delete"]) {
        app.post(
            `/manage/:id/${action}`,
            checkUser,
            async (req, res) => {
                const changed =
                    action === "cancel"
                        ? await repository.cancel(req.params.id)
                        : await repository.remove(req.params.id);
                if (!changed)
                    return res.status(404).render("error", {
                        title: "Propusnica nije pronađena",
                        message: "Propusnica više nije dostupna.",
                    });
                res.redirect(303, "/manage");
            },
        );
    }

    app.use((req, res) =>
        res.status(404).render("error", {
            title: "Stranica nije pronađena",
            message: "Provjeri adresu ili se vrati na početnu stranicu.",
        }),
    );
    app.use((error, req, res, next) => {
        if (res.headersSent) return next(error);
        const status = error.statusCode || error.status || 500;
        if (status >= 500)
            console.error("Zahtjev nije uspio:", error.code || error.name);
        if (error.headers) res.set(error.headers);
        if (req.path === "/passes" || req.path.startsWith("/passes/")) {
            const messages = {
                400: "Neispravan zahtjev.",
                401: "Nedostaje valjan token.",
                403: "Nedostaje potreban scope.",
            };
            return res
                .status(status)
                .json({ error: messages[status] || "Zahtjev nije uspio." });
        }
        res.status(status).render("error", {
            title: "Zahtjev nije uspio",
            message:
                status >= 500
                    ? "Pokušaj ponovno kasnije."
                    : "Provjeri zahtjev i pokušaj ponovno.",
        });
    });
    return app;
}

module.exports = { createApp };
