import "dotenv/config";
import { getToken, issuePass } from "../src/task2/automat";

async function main() {
    const [name, document] = process.argv.slice(2);
    if (!name || !document)
        throw new Error('Uporaba: npm run automat -- "Ime Prezime" "HR-123"');
    const required = [
        "AUTH0_ISSUER_BASE_URL",
        "AUTH0_AUDIENCE",
        "M2M_CLIENT_ID",
        "M2M_CLIENT_SECRET",
        "BASE_URL",
    ] as const;
    for (const key of required) {
        if (!process.env[key]) throw new Error(`Postavi ${key} u .env.`);
    }
    const token = await getToken(
        process.env.AUTH0_ISSUER_BASE_URL!,
        process.env.AUTH0_AUDIENCE!,
        process.env.M2M_CLIENT_ID!,
        process.env.M2M_CLIENT_SECRET!,
        "create:passes",
    );
    await issuePass(
        `${process.env.BASE_URL!.replace(/\/+$/, "")}/passes`,
        token,
        name,
        document,
    );
    console.log("Propusnica je izdana. PNG je spremljen u trenutni direktorij.");
}

main().catch((error: Error) => {
    console.error(error.message);
    process.exitCode = 1;
});
