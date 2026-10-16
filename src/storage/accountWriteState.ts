const blocked = new Set<string>();
export const blockAccountWrites = (id: string) => { blocked.add(id); };
export const allowAccountWrites = (id: string) => { blocked.delete(id); };
export const accountWritesBlocked = (id: string) => blocked.has(id);
