export interface Profile {
  id: string;
  userId: string;
  bio?: string;
  isVerified: boolean;
  description?: string;
  coverSrc?: string;
  cityId?: string;
  dateOfBirth?: Date;
  gender?: string;
  address?: string;
  timezone?: string;
  createdAt: Date;
  updatedAt: Date;
}
