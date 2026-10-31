const { loadConfig } = require("./config");
const { createPool, createRepository, migrate } = require("./database");
const { createApp } = require("./app");

async function main() {
    const config = loadConfig();
    const pool = createPool(config.databaseURL);
    try {
        await migrate(pool);
        const app = createApp(config, createRepository(pool));
        const server = app.listen(config.port, "0.0.0.0", () => {
            console.log(`Aplikacija je pokrenuta: ${config.baseURL}`);
            if (!config.authConfigured)
                console.log(
                    "Dopuni Auth0 postavke za prijavu i zaštićeni API.",
                );
        });
        const shutdown = () =>
            server.close(() => pool.end().then(() => process.exit(0)));
        process.on("SIGINT", shutdown);
        process.on("SIGTERM", shutdown);
        server.on("error", (error) => {
            console.error("Pokretanje nije uspjelo:", error.code);
            pool.end().finally(() => {
                process.exitCode = 1;
            });
        });
    } catch (error) {
        await pool.end();
        throw error;
    }
}

main().catch((error) => {
    console.error("Pokretanje nije uspjelo:", error.message);
    process.exitCode = 1;
});
