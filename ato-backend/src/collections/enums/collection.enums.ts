export enum CollectionStatus {
    DRAFT = 'DRAFT',
    AWAITING_SELECTION = 'AWAITING_SELECTION',
    EXECUTING = 'EXECUTING',
    COMPLETED = 'COMPLETED',
    FAILED = 'FAILED',
}

export enum CollectionType {
    TARGETS = 'TARGETS',
    TESTS = 'TESTS',
}

export enum CollectionItemSourceType {
    ARG = 'ARG',
    DISCOVERED = 'DISCOVERED',
}
