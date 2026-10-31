const { Pool } = require("pg");
const { readFile } = require("node:fs/promises");
const path = require("node:path");

function createPool(connectionString) {
    return new Pool({
        connectionString,
        max: 5,
        connectionTimeoutMillis: 10000,
    });
}

async function migrate(pool) {
    const sql = await readFile(
        path.join(__dirname, "../db/001-passes.sql"),
        "utf8",
    );
    await pool.query(sql);
}

function createRepository(pool) {
    const columns = 'id, name, document, issued_at AS "issuedAt", status';
    const validId = (id) =>
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
            id,
        );
    return {
        async counts() {
            const { rows } = await pool.query(`SELECT count(*)::int AS total,
                count(*) FILTER (WHERE status = 'ACTIVE')::int AS active FROM passes`);
            return rows[0];
        },
        async list() {
            const { rows } = await pool.query(
                `SELECT ${columns} FROM passes ORDER BY issued_at DESC, id`,
            );
            return rows;
        },
        async find(id) {
            if (!validId(id)) return null;
            const { rows } = await pool.query(
                `SELECT ${columns} FROM passes WHERE id = $1`,
                [id],
            );
            return rows[0] || null;
        },
        async create(id, name, document) {
            const { rows } = await pool.query(
                `INSERT INTO passes (id, name, document)
                VALUES ($1, $2, $3) RETURNING ${columns}`,
                [id, name, document],
            );
            return rows[0];
        },
        async cancel(id) {
            if (!validId(id)) return false;
            const result = await pool.query(
                "UPDATE passes SET status = 'CANCELLED' WHERE id = $1",
                [id],
            );
            return result.rowCount > 0;
        },
        async remove(id) {
            if (!validId(id)) return false;
            const result = await pool.query(
                "DELETE FROM passes WHERE id = $1",
                [id],
            );
            return result.rowCount > 0;
        },
        async health() {
            await pool.query("SELECT 1");
        },
    };
}

module.exports = { createPool, migrate, createRepository };
