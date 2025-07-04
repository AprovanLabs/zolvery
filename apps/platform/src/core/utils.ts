import { ENVIRONMENT, ORG_ID, PROJECT_ID, REGION_SHORT_CODE } from "./constants";

const sanitizeName = (name: string): string => name.toLowerCase().replace(/[^a-z0-9]/g, '-');
const toDatabaseName = (name: string): string => name.replace(/-/g, '_');

export type NamerOptions = {
    universal?: boolean // If true, the name will be prefixed with the organization ID
    database?: boolean // If true, the name will be formatted for database usage (e.g., replacing dashes with underscores)
    global?: boolean // If true, the name will use 'glb' instead of the region short code
}

/**
 * Generates a standardized name for resources based on organization, project, environment, and region.
 * The name is sanitized to ensure it is lowercase and contains only alphanumeric characters and hyph
 * 
 * [ORG_ID]-PROJECT_ID-ENVIRONMENT-[REGION_SHORT_CODE | glb]-[NAME | main]
 * 
 * - `PROJECT_ID`: Project identifier
 * - `ENVIRONMENT`: Environment identifier (e.g., dev, stg, prd)
 * - `REGION_SHORT_CODE`: Short code for the AWS region (e.g., use1, use2, glb)
 * - `NAME`: Custom name provided by the user. Defaults to 'main'
 */
const getId = (parts: string[], opts: NamerOptions): string => {
    const partsWithDefault = parts.length ? parts : ['main'];
    const id = sanitizeName(
        [
            ...(opts.universal ? [ORG_ID] : []),
            PROJECT_ID,
            ENVIRONMENT,
            opts.global ? 'glb' : REGION_SHORT_CODE,
            ...partsWithDefault
        ].join('-')
    )

    if (opts.database) {
        return toDatabaseName(id);
    }

    return id;
}

export class Namer {
    public constructor(private opts: NamerOptions = {}) {}

    public regional(...parts: string[]): string {
        return getId(parts, { ...this.opts, global: false });
    }

    public global(...parts: string[]): string {
        return getId(parts, { ...this.opts, global: true });
    }

    public universal(...parts: string[]): string {
        return getId(parts, { ...this.opts, universal: true });
    }
}

export const namer = (opts: NamerOptions = {}): Namer => new Namer(opts);
