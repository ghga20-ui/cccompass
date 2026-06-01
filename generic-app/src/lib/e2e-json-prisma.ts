import { randomUUID } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import type { PrismaClient } from "@prisma/client";

type JsonRecord = Record<string, unknown>;
type SelectMap = Record<string, boolean>;
type FindArgs = { where: Record<string, string>; select?: SelectMap };
type CreateArgs = { data: JsonRecord };
type UpdateArgs = { where: Record<string, string>; data: JsonRecord; select?: SelectMap };
type UpsertArgs = {
  where: Record<string, string>;
  create: JsonRecord;
  update: JsonRecord;
  select?: SelectMap;
};

type DraftRecord = JsonRecord & {
  id: string;
  schoolName: string;
  status: string;
  editToken: string;
  createdAt: string;
  updatedAt: string;
};

type PublicationRecord = JsonRecord & {
  draftId: string;
  schoolName: string;
  shareToken: string;
  editToken: string;
  createdAt: string;
  updatedAt: string;
};

type Store = {
  drafts: DraftRecord[];
  publications: PublicationRecord[];
};

function readStore(path: string): Store {
  if (!existsSync(path)) {
    return { drafts: [], publications: [] };
  }

  return JSON.parse(readFileSync(path, "utf8")) as Store;
}

function writeStore(path: string, store: Store) {
  writeFileSync(path, JSON.stringify(store, null, 2));
}

function nowIso() {
  return new Date().toISOString();
}

function materialize<T extends JsonRecord>(record: T, select?: SelectMap) {
  const withDates = Object.fromEntries(
    Object.entries(record).map(([key, value]) => [
      key,
      key.endsWith("At") && typeof value === "string" ? new Date(value) : value,
    ]),
  );

  if (!select) {
    return withDates;
  }

  return Object.fromEntries(
    Object.entries(select)
      .filter(([, include]) => include)
      .map(([key]) => [key, withDates[key]]),
  );
}

function findByWhere<T extends JsonRecord>(records: T[], where: Record<string, string>) {
  return records.find((record) =>
    Object.entries(where).every(([key, value]) => record[key] === value),
  );
}

export function createE2eJsonPrisma(path: string): PrismaClient {
  const api = {
    curriculumDraft: {
      async deleteMany() {
        const store = readStore(path);
        store.drafts = [];
        writeStore(path, store);
        return { count: 0 };
      },
      async create(args: CreateArgs) {
        const store = readStore(path);
        const timestamp = nowIso();
        const data = args.data;
        const draft: DraftRecord = {
          id: typeof data.id === "string" ? data.id : randomUUID(),
          schoolName: String(data.schoolName),
          status: typeof data.status === "string" ? data.status : "draft",
          curriculumJson: data.curriculumJson,
          parsedText: String(data.parsedText ?? ""),
          warnings: data.warnings ?? [],
          sourceSnippets: data.sourceSnippets ?? [],
          editToken: String(data.editToken),
          createdAt: timestamp,
          updatedAt: timestamp,
        };

        store.drafts.push(draft);

        const nestedPublication = data.publication as { create?: JsonRecord } | undefined;
        if (nestedPublication?.create) {
          store.publications.push({
            draftId: draft.id,
            schoolName: String(nestedPublication.create.schoolName),
            curriculumJson: nestedPublication.create.curriculumJson,
            shareToken: String(nestedPublication.create.shareToken),
            editToken: String(nestedPublication.create.editToken),
            createdAt: timestamp,
            updatedAt: timestamp,
          });
        }

        writeStore(path, store);
        return materialize(draft);
      },
      async findUnique(args: FindArgs) {
        const record = findByWhere(readStore(path).drafts, args.where);
        return record ? materialize(record, args.select) : null;
      },
      async update(args: UpdateArgs) {
        const store = readStore(path);
        const record = findByWhere(store.drafts, args.where);

        if (!record) {
          throw new Error("E2E draft record not found");
        }

        Object.assign(record, args.data, { updatedAt: nowIso() });
        writeStore(path, store);
        return materialize(record, args.select);
      },
    },
    curriculumPublication: {
      async deleteMany() {
        const store = readStore(path);
        store.publications = [];
        writeStore(path, store);
        return { count: 0 };
      },
      async findUnique(args: FindArgs) {
        const record = findByWhere(readStore(path).publications, args.where);
        return record ? materialize(record, args.select) : null;
      },
      async upsert(args: UpsertArgs) {
        const store = readStore(path);
        let record = findByWhere(store.publications, args.where);

        if (record) {
          Object.assign(record, args.update, { updatedAt: nowIso() });
        } else {
          const timestamp = nowIso();
          record = {
            draftId: String(args.create.draftId),
            schoolName: String(args.create.schoolName),
            curriculumJson: args.create.curriculumJson,
            shareToken: String(args.create.shareToken),
            editToken: String(args.create.editToken),
            createdAt: timestamp,
            updatedAt: timestamp,
          };
          store.publications.push(record);
        }

        writeStore(path, store);
        return materialize(record, args.select);
      },
    },
    async $transaction<T>(operations: Promise<T>[]) {
      return Promise.all(operations);
    },
    async $disconnect() {
      return Promise.resolve();
    },
  };

  return api as unknown as PrismaClient;
}
