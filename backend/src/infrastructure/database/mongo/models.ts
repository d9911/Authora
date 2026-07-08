import mongoose, { Schema, InferSchemaType, model } from 'mongoose';

const userSchema = new Schema(
  {
    name: String,
    email: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
    password: String,
    nickname: String,
    phoneNumber: String,
    telegramId: { type: String, index: true, sparse: true },
    avatarUrl: String,
    emailVerified: { type: Boolean, default: false },
    twoFactorEnabled: { type: Boolean, default: false },
    twoFactorSecret: String,
    githubId: { type: String, index: true, sparse: true },
  },
  { timestamps: true },
);

const profileSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true, index: true },
    bio: String,
    isVerified: { type: Boolean, default: false },
    description: String,
    coverSrc: String,
    cityId: { type: Schema.Types.ObjectId, ref: 'City' },
    dateOfBirth: Date,
    gender: String,
    address: String,
    timezone: String,
  },
  { timestamps: true },
);

const profileImageSchema = new Schema(
  {
    userId: { type: String, required: true, index: true },
    kind: { type: String, enum: ['avatar', 'cover'], required: true },
    contentType: { type: String, required: true },
    data: { type: Buffer, required: true },
    sizeBytes: { type: Number, required: true },
    width: { type: Number, required: true },
    height: { type: Number, required: true },
    etag: { type: String, required: true },
  },
  { timestamps: true },
);
profileImageSchema.index({ userId: 1, kind: 1 }, { unique: true });

const refreshTokenSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    tokenHash: { type: String, required: true, index: true },
    expiresAt: { type: Date, required: true },
    revokedAt: Date,
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

const emailTokenSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    tokenHash: { type: String, required: true, index: true },
    type: { type: String, enum: ['verify_email', 'reset_password'], required: true },
    expiresAt: { type: Date, required: true },
    usedAt: Date,
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

const countrySchema = new Schema(
  { name: { type: String, required: true }, code: String },
  { timestamps: true },
);

const regionSchema = new Schema(
  {
    name: { type: String, required: true },
    countryId: { type: Schema.Types.ObjectId, ref: 'Country', required: true, index: true },
  },
  { timestamps: true },
);

const citySchema = new Schema(
  {
    name: { type: String, required: true },
    countryId: { type: Schema.Types.ObjectId, ref: 'Country', index: true },
    regionId: { type: Schema.Types.ObjectId, ref: 'Region', index: true },
  },
  { timestamps: true },
);

export type UserDoc = InferSchemaType<typeof userSchema>;
export type ProfileDoc = InferSchemaType<typeof profileSchema>;

export const UserModel = mongoose.models.User || model('User', userSchema);
export const ProfileModel = mongoose.models.Profile || model('Profile', profileSchema);
export const ProfileImageModel =
  mongoose.models.ProfileImage || model('ProfileImage', profileImageSchema);
export const RefreshTokenModel =
  mongoose.models.RefreshToken || model('RefreshToken', refreshTokenSchema);
export const EmailTokenModel = mongoose.models.EmailToken || model('EmailToken', emailTokenSchema);
export const CountryModel = mongoose.models.Country || model('Country', countrySchema);
export const RegionModel = mongoose.models.Region || model('Region', regionSchema);
export const CityModel = mongoose.models.City || model('City', citySchema);
