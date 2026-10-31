require("dotenv").config({ quiet: true });
const { createPool, migrate } = require("../src/database");

async function main() {
    if (!process.env.DATABASE_URL) throw new Error("Postavi DATABASE_URL.");
    const pool = createPool(process.env.DATABASE_URL);
    try {
        await migrate(pool);
        console.log("Shema baze je spremna.");
    } finally {
        await pool.end();
    }
}

main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
});
