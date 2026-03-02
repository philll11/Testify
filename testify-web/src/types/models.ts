// Global Base Entity Interface
export interface BaseEntity {
  id: string;
  recordId: string;
  isActive: boolean;
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
}
