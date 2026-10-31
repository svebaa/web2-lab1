# Digitalne propusnice - WEB2

Aplikacija: [web2-propusnice-2vtp.onrender.com](https://web2-propusnice-2vtp.onrender.com).

Node.js + Express, EJS stranice, PostgreSQL, Auth0 OIDC prijava i OAuth2 Client
Credentials API. Automat je TypeScript modul u `src/task2/automat.ts`.

## Lokalno pokretanje

Potrebni su Node.js 20.19+ (Render je postavljen na Node.js 24) i PostgreSQL.

```sh
npm install
cp .env.example .env
```

Ako `.env` već postoji, zadrži postojeću datoteku. Postavi `DATABASE_URL` na svoju
lokalnu bazu i generiraj `SESSION_SECRET` naredbom iz `.env.example`.

```sh
npm run dev
```

Otvori `http://localhost:3000`. Server sam inicijalizira tablicu propusnica pri
pokretanju; shemu možeš zasebno pripremiti i s `npm run db:migrate`.

Bez dovršene Auth0 konfiguracije u razvojnom načinu rade javne stranice i baza.
Prijava i zaštićene radnje vraćaju 503 dok se ne unesu svi Auth0 podaci. Nema
razvojne prijave koja zaobilazi autentifikaciju. U produkciji se server neće ni
pokrenuti bez Auth0 konfiguracije i HTTPS osnovne adrese.

Na ovom računalu pripremljena je zasebna lokalna PostgreSQL instanca u `.local/`,
na adresi `127.0.0.1:55432`; `.env` sadrži njezinu vezu. `.local/` i `.env` nisu u Gitu.
Ako je zaustavljena, pokreni je iz korijena projekta:

```sh
pg_ctl -D .local/postgres -l .local/postgres.log start
```

Zaustavljanje:

```sh
pg_ctl -D .local/postgres stop
```

Ova lokalna instanca nije dio objave na Render niti mijenja postojeći PostgreSQL
na portu 5432.

## Stranice i API

| Putanja                                      | Namjena                                | Pristup                       |
| -------------------------------------------- | -------------------------------------- | ----------------------------- |
| `GET /`                                      | Ukupan broj i broj aktivnih propusnica | Javno                         |
| `GET /info/:id`                              | Podaci i status propusnice             | Javno                         |
| `GET /login`, `GET /callback`, `GET /logout` | OIDC prijava i odjava                  | Auth0                         |
| `GET /manage`                                | Pregled propusnica                     | Prijavljen korisnik           |
| `POST /manage/:id/cancel`                    | Poništavanje                           | Prijavljen korisnik           |
| `POST /manage/:id/delete`                    | Brisanje                               | Prijavljen korisnik           |
| `GET /passes/:id`                            | JSON propusnice                        | Bearer token, `read:passes`   |
| `POST /passes`                               | Izdavanje i PNG QR slika               | Bearer token, `create:passes` |
| `GET /health`                                | Provjera dostupnosti baze              | Javno                         |

POST prima JSON `name` i `document`, vraća PNG i status 201. QR sadrži URL javne
stranice `/info/:id`, a `Location` sadrži URL zaštićenog API-ja `/passes/:id`.
API vraća 400 za prazne obavezne podatke, 401 za nevaljan/nedostajući token,
403 za nedostajući scope te 404 za nepostojeću propusnicu.

Osnovna adresa ove izvedbe nema prefiks poput `/app`; aplikacija se objavljuje
izravno na korijenu Render domene. To je dopušteno zadatkom.

## Automat

U lokalnom `.env` postavi M2M podatke, Auth0 issuer/audience i `BASE_URL` aplikacije
koju pozivaš. Zatim:

```sh
npm run automat -- "Pero Perić" "HR-123456789"
```

Automat dohvaća token s opsegom `create:passes` i sprema sliku u radni direktorij
kao `<id>.png`. Token i tajna ne ispisuju se. Sam modul koristi samo ugrađene
`fetch`, `Buffer` i `node:fs/promises`; pomoćna naredba koristi `tsx` za TypeScript.
Za drugo pitanje predaje se sadržaj `src/task2/automat.ts`.
